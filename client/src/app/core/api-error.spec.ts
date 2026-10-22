import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorMessage } from './api-error';

const httpError = (status: number, body: unknown = null) =>
  new HttpErrorResponse({ status, error: body });

describe('apiErrorMessage', () => {
  it('translates the error codes returned by the API', () => {
    expect(apiErrorMessage(httpError(409, { code: 'UsernameExistsException' }), 'fallback')).toBe(
      'Username già in uso',
    );
  });

  it('explains network errors and rate limiting', () => {
    expect(apiErrorMessage(httpError(0), 'fallback')).toContain('Server non raggiungibile');
    expect(apiErrorMessage(httpError(429), 'fallback')).toContain('Troppe richieste');
  });

  it('uses the fallback for unknown errors', () => {
    expect(apiErrorMessage(httpError(500, { message: 'Internal server error' }), 'Errore')).toBe(
      'Errore',
    );
    expect(apiErrorMessage(new Error('boom'), 'Errore')).toBe('Errore');
  });
});
