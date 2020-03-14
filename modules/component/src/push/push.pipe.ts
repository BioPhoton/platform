import { ChangeDetectorRef, NgZone, Pipe, PipeTransform } from '@angular/core';
import { NextObserver, Observable, PartialObserver, pipe, Subject } from 'rxjs';
import { distinctUntilChanged, map, tap, withLatestFrom } from 'rxjs/operators';
import {
  CdAware,
  // This will later on replaced by a new NgRxPushPipeConfig interface
  CoalescingConfig as NgRxPushPipeConfig,
  RemainHigherOrder,
} from '../core';

/**
 * @Pipe PushPipe
 * @description
 *
 * The `ngrxPush` pipe serves as a drop-in replacement for the `async` pipe.
 * It contains intelligent handling of change detection to enable us
 * running in zone-full as well as zone-less mode without any changes to the code.
 *
 * The current way of binding an observable to the view looks like that:

 *  ```htmlmixed
 *  {{observable$ | async}}
 * <ng-container *ngIf="observable$ | async as o">{{o}}</ng-container>
 * <component [value]="observable$ | async"></component>
 * ```
 *
 * The problem is `async` pipe just marks the component and all its ancestors as dirty.
 * It needs zone.js microtask queue to exhaust until `ApplicationRef.tick` is called to render all dirty marked components.
 *
 * Heavy dynamic and interactive UIs suffer from zones change detection a lot and can
 * lean to bad performance or even unusable applications, but the `async` pipe does not work in zone-less mode.
 *
 * `ngrxPush` pipe solves that problem.
 *
 * Included Features:
 *  - Take observables or promises, retrieve their values and render the value to the template
 *  - Handling null and undefined values in a clean unified/structured way
 *  - Triggers change-detection differently if `zone.js` is present or not (`detectChanges` or `markForCheck`)
 *  - Distinct same values in a row to increase performance
 *  - Coalescing of change detection calls to boost performance
 *
 * @usageNotes
 *
 * ### Examples
 *
 * `ngrxPush` pipe solves that problem. It can be used like shown here:
 * ```html
 * {{observable$ | ngrxPush}}
 * <ng-container *ngIf="observable$ | ngrxPush as o">{{o}}</ng-container>
 * <component [value]="observable$ | ngrxPush"></component>
 * ```
 *
 * @publicApi
 */
@Pipe({ name: 'ngrxPush', pure: false })
export class PushPipe extends CdAware implements PipeTransform {
  private renderedValue: any | null | undefined;

  private readonly configSubject = new Subject<NgRxPushPipeConfig>();
  private readonly config$ = this.configSubject
    .asObservable()
    .pipe(distinctUntilChanged());

  constructor(cdRef: ChangeDetectorRef, ngZone: NgZone) {
    super(cdRef, ngZone);
    this.subscription.add(this.observables$.subscribe());
  }

  transform<T>(potentialObservable: null, config?: NgRxPushPipeConfig): null;
  transform<T>(
    potentialObservable: undefined,
    config?: NgRxPushPipeConfig
  ): undefined;
  transform<T>(
    potentialObservable: Observable<T>,
    config?: NgRxPushPipeConfig
  ): T;
  transform<T>(
    potentialObservable: Observable<T> | null | undefined,
    config: NgRxPushPipeConfig = { optimized: true }
  ): T | null | undefined {
    this.configSubject.next(config);
    this.observablesSubject.next(potentialObservable);
    return this.renderedValue;
  }

  getConfigurableBehaviour<T>(): RemainHigherOrder<T> {
    return pipe(
      withLatestFrom(this.config$),
      map(([value$, config]) => {
        // As discussed with Brandon we keep it here because in the beta we implement configuration behavior here
        return !config.optimized
          ? value$.pipe(tap(() => this.work()))
          : value$.pipe(
              // @TODO Add coalesce operator here
              tap(() => this.work())
            );
      })
    );
  }

  getUpdateViewContextObserver(): PartialObserver<any> {
    return {
      // assign value that will get returned from the transform function on the next change detection
      next: (value: any) => (this.renderedValue = value),
    };
  }

  getResetContextObserver(): NextObserver<any> {
    return {
      next: _ => (this.renderedValue = undefined),
    };
  }
}
