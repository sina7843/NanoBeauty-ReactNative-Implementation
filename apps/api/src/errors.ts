import type { ErrorCode, ErrorEnvelope } from '@nano/contracts';

type Extra = Pick<ErrorEnvelope['error'], 'retryAfterSeconds' | 'attemptsLeft' | 'missingPermission'>;

/** Thrown by handlers; the app error handler turns it into the standard envelope. */
export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ErrorCode,
    message: string,
    readonly extra: Extra = {},
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
