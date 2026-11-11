import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  type ApiErrorBody,
  type ApiErrorCode,
  ApiException,
} from '../errors/api-exception.js';

/** Turns every exception into the API error envelope, so the client parses one shape. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const body = toApiErrorBody(exception);

    if (body.statusCode >= 500 && !(exception instanceof ApiException)) {
      // Unplanned failures only. Never log request headers or axios errors here:
      // their config carries the Apollo key.
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }
    if (body.retryAfterSeconds !== undefined) {
      response.setHeader('Retry-After', String(body.retryAfterSeconds));
    }
    response.status(body.statusCode).json(body);
  }
}

export function toApiErrorBody(exception: unknown): ApiErrorBody {
  if (exception instanceof ApiException) {
    return exception.body;
  }
  if (exception instanceof HttpException) {
    const statusCode = exception.getStatus();
    return {
      statusCode,
      code: codeForStatus(statusCode),
      message: messageOf(exception),
    };
  }
  // Body-parser errors (malformed JSON, payload too large) follow the http-errors convention.
  if (isClientHttpError(exception)) {
    return {
      statusCode: exception.status,
      code: codeForStatus(exception.status),
      message: exception.message,
    };
  }
  // The real message stays in the log: it can contain internals.
  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    code: 'INTERNAL_ERROR',
    message: 'Something went wrong on the LeadForge server.',
  };
}

function codeForStatus(status: number): ApiErrorCode {
  if (status === 400 || status === 422) {
    return 'VALIDATION_FAILED';
  }
  if (status === 404) {
    return 'NOT_FOUND';
  }
  return 'INTERNAL_ERROR';
}

function messageOf(exception: HttpException): string {
  const response = exception.getResponse();
  if (typeof response === 'string') {
    return response;
  }
  // Nest's validation pipe reports one message per invalid field.
  const message = (response as { message?: unknown }).message;
  if (Array.isArray(message)) {
    return message.join('; ');
  }
  return typeof message === 'string' ? message : exception.message;
}

function isClientHttpError(
  value: unknown,
): value is { status: number; message: string } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { status, expose, message } = value as Record<string, unknown>;
  return (
    typeof status === 'number' &&
    status >= 400 &&
    status < 500 &&
    expose === true &&
    typeof message === 'string'
  );
}
