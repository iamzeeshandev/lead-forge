import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiException } from '../errors/api-exception.js';
import { toApiErrorBody } from './api-exception.filter.js';

describe('toApiErrorBody', () => {
  it('passes an ApiException body through unchanged', () => {
    const body = {
      statusCode: 429,
      code: 'PROVIDER_RATE_LIMITED' as const,
      message: 'Wait.',
      retryAfterSeconds: 60,
    };

    expect(toApiErrorBody(new ApiException(body))).toEqual(body);
  });

  it('joins the validation pipe’s messages', () => {
    const error = new BadRequestException([
      'domain: Enter a domain such as acme.com.',
      'page: Too small',
    ]);

    expect(toApiErrorBody(error)).toEqual({
      statusCode: 400,
      code: 'VALIDATION_FAILED',
      message: 'domain: Enter a domain such as acme.com.; page: Too small',
    });
  });

  it('maps Nest’s 404 for unknown routes', () => {
    expect(
      toApiErrorBody(new NotFoundException('Cannot GET /api/nope')),
    ).toEqual({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Cannot GET /api/nope',
    });
  });

  it('keeps body-parser errors as client errors', () => {
    const error = Object.assign(new SyntaxError('Unexpected token } in JSON'), {
      status: 400,
      expose: true,
    });

    expect(toApiErrorBody(error)).toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_FAILED',
    });
  });

  it('hides the message of unexpected errors', () => {
    const body = toApiErrorBody(
      new Error('connect ECONNREFUSED postgres://user:secret@db'),
    );

    expect(body).toEqual({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong on the LeadForge server.',
    });
  });
});
