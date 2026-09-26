export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, 'VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

export class MissingIdempotencyKeyError extends AppError {
  constructor() {
    super(
      400,
      'MISSING_IDEMPOTENCY_KEY',
      'The Idempotency-Key header is required for this endpoint.',
    );
    this.name = 'MissingIdempotencyKeyError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(404, 'NOT_FOUND', `${resource} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}

export class IdempotencyConflictError extends AppError {
  constructor(message: string) {
    super(409, 'IDEMPOTENCY_CONFLICT', message);
    this.name = 'IdempotencyConflictError';
  }
}

export class RequestMismatchError extends AppError {
  constructor() {
    super(
      409,
      'REQUEST_MISMATCH',
      'The Idempotency-Key has already been used with a different request body.',
    );
    this.name = 'RequestMismatchError';
  }
}

export class PaymentInProgressError extends AppError {
  constructor() {
    super(
      409,
      'PAYMENT_IN_PROGRESS',
      'A payment with this idempotency key is currently being processed. ' +
      'Retry after a few seconds once the current request completes.',
    );
    this.name = 'PaymentInProgressError';
  }
}

export class PaymentFailedError extends AppError {
  constructor(reason: string) {
    super(422, 'PAYMENT_FAILED', reason);
    this.name = 'PaymentFailedError';
  }
}

export class InternalError extends AppError {
  constructor(message = 'An unexpected error occurred.') {
    super(500, 'INTERNAL_ERROR', message);
    this.name = 'InternalError';
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

export function getPrismaErrorCode(err: unknown): string | undefined {
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as { code: unknown }).code === 'string'
  ) {
    return (err as { code: string }).code;
  }
  return undefined;
}
