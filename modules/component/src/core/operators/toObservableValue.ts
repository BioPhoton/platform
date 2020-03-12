import { from, Observable, of } from 'rxjs';
import {
  ArgumentNotObservableError,
  isObservableGuard,
  isPromiseGuard,
} from '../utils';

export function toObservableValue<T>(
  potentialObservableValue$: Observable<T> | Promise<T> | undefined | null
): Observable<T | undefined | null> {
  if (
    // Comparing to the literal null value with the == operator covers both null and undefined values.
    potentialObservableValue$ == null
  ) {
    return of(potentialObservableValue$);
  }

  if (
    isPromiseGuard<T>(potentialObservableValue$) ||
    isObservableGuard<T>(potentialObservableValue$)
  ) {
    return from(potentialObservableValue$);
  }

  throw new ArgumentNotObservableError();
}
