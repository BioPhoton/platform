import {
  BehaviorSubject,
  combineLatest,
  EMPTY,
  NextObserver,
  Observable,
  PartialObserver,
  Subject,
  Subscribable,
  Subscription,
} from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  map,
  startWith,
  switchMap,
  tap,
} from 'rxjs/operators';
import {
  CdStrategy,
  DEFAULT_STRATEGY_NAME,
  StrategySelection,
} from './strategy';

export interface CdAware<U> extends Subscribable<U> {
  nextValue: (value: any) => void;
  nextConfig: (config: string) => void;
}

/**
 * class CdAware
 *
 * @description
 * This abstract class holds all the shared logic for the push pipe and the let directive
 * responsible for change detection
 * If you extend this class you need to implement how the update of the rendered value happens.
 * Also custom behaviour is something you need to implement in the extending class
 */
export function createCdAware<U>(cfg: {
  strategies: StrategySelection<U>;
  resetContextObserver: NextObserver<any>;
  updateViewContextObserver: PartialObserver<U> & NextObserver<U>;
}): CdAware<U | undefined | null> {
  const configSubject = new BehaviorSubject<string>(DEFAULT_STRATEGY_NAME);
  const config$: Observable<CdStrategy<U>> = configSubject.pipe(
    distinctUntilChanged(),
    map(
      (strategy: string): CdStrategy<U> =>
        cfg.strategies[strategy]
          ? cfg.strategies[strategy]
          : cfg.strategies.idle
    )
  );

  const observablesSubject = new Subject<Observable<U>>();
  const observablesFromTemplate$ = observablesSubject.pipe(
    distinctUntilChanged()
  );

  let prevObservable: Observable<U>;
  const renderSideEffect$ = combineLatest([
    observablesFromTemplate$,
    config$,
  ]).pipe(
    switchMap(([observable$, strategy]) => {
      if (observable$ == null) {
        cfg.updateViewContextObserver.next(observable$);
        strategy.render();
        return EMPTY;
      }

      prevObservable = observable$;
      cfg.resetContextObserver.next(observable$);
      strategy.render();

      return observable$.pipe(
        distinctUntilChanged(),
        tap(cfg.updateViewContextObserver),
        strategy.behaviour(),
        tap(() => strategy.render()),
        catchError(e => {
          console.error(e);
          return EMPTY;
        })
      );
    })
  );

  return {
    nextValue(value: any): void {
      observablesSubject.next(value);
    },
    nextConfig(nextConfig: string): void {
      configSubject.next(nextConfig);
    },
    subscribe(): Subscription {
      return renderSideEffect$.subscribe();
    },
  } as CdAware<U | undefined | null>;
}
