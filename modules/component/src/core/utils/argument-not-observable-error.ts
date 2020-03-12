// tslint:disable-next-line:no-empty-interface
export interface ArgumentNotObservableError extends Error {}

export interface ArgumentNotObservableErrorCtor {
  new (): ArgumentNotObservableError;
}

function ArgumentNotObservableErrorImpl(this: any) {
  Error.call(this);
  this.message =
    'Argument not observable. Only null/undefined or Promise/Observable-like values are allowed.';
  this.name = 'ArgumentNotObservableError';
  return this;
}

ArgumentNotObservableErrorImpl.prototype = Object.create(Error.prototype);

/**
 * An error thrown when an class has to render observables and get passed
 * something that is not observable.
 *
 *
 * ArgumentNotObservableError
 */
export const ArgumentNotObservableError: ArgumentNotObservableErrorCtor = ArgumentNotObservableErrorImpl as any;
