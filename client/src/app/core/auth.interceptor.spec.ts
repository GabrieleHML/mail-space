import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { fakeIdToken } from '../../testing/fake-token';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let router: Router;

  const unauthorized = { status: 401, statusText: 'Unauthorized' };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => httpMock.verify());

  it('sends the ID token to the API', () => {
    localStorage.setItem('idToken', 'token-1');

    http.get('/api/emails').subscribe();

    const req = httpMock.expectOne('/api/emails');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-1');
    req.flush([]);
  });

  it('does not send it to the public authentication endpoints or to other hosts', () => {
    localStorage.setItem('idToken', 'token-1');

    http.post('/api/auth/login', {}).subscribe();
    http.get('https://fonts.example.com/font.css').subscribe();

    expect(httpMock.expectOne('/api/auth/login').request.headers.has('Authorization')).toBe(false);
    expect(
      httpMock.expectOne('https://fonts.example.com/font.css').request.headers.has('Authorization'),
    ).toBe(false);
  });

  it('refreshes an expired token and retries the request once', () => {
    localStorage.setItem('idToken', 'expired');
    localStorage.setItem('refreshToken', 'refresh-1');
    const newToken = fakeIdToken('alice');
    let result: unknown;

    http.get('/api/emails').subscribe((emails) => (result = emails));
    httpMock.expectOne('/api/emails').flush({ code: 'InvalidToken' }, unauthorized);

    const refresh = httpMock.expectOne('/api/auth/refresh');
    expect(refresh.request.body).toEqual({ refreshToken: 'refresh-1' });
    refresh.flush({ idToken: newToken, accessToken: 'access-2' });

    const retry = httpMock.expectOne('/api/emails');
    expect(retry.request.headers.get('Authorization')).toBe(`Bearer ${newToken}`);
    retry.flush(['e-mail']);
    expect(result).toEqual(['e-mail']);
    expect(localStorage.getItem('idToken')).toBe(newToken);
  });

  it('uses a single refresh for concurrent requests', () => {
    localStorage.setItem('idToken', 'expired');
    localStorage.setItem('refreshToken', 'refresh-1');

    http.get('/api/emails').subscribe();
    http.get('/api/folders').subscribe();
    httpMock.expectOne('/api/emails').flush(null, unauthorized);
    httpMock.expectOne('/api/folders').flush(null, unauthorized);

    httpMock
      .expectOne('/api/auth/refresh')
      .flush({ idToken: fakeIdToken('alice'), accessToken: 'a' });
    httpMock.expectOne('/api/emails').flush([]);
    httpMock.expectOne('/api/folders').flush([]);
  });

  it('logs the user out when the refresh token is no longer valid', () => {
    localStorage.setItem('idToken', 'expired');
    localStorage.setItem('refreshToken', 'revoked');
    let failed = false;

    http.get('/api/emails').subscribe({ error: () => (failed = true) });
    httpMock.expectOne('/api/emails').flush(null, unauthorized);
    httpMock.expectOne('/api/auth/refresh').flush({ code: 'NotAuthorizedException' }, unauthorized);

    expect(failed).toBe(true);
    expect(localStorage.getItem('idToken')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('does not try to refresh other errors', () => {
    localStorage.setItem('idToken', 'token-1');
    localStorage.setItem('refreshToken', 'refresh-1');

    http.get('/api/emails').subscribe({ error: () => undefined });
    httpMock.expectOne('/api/emails').flush(null, { status: 500, statusText: 'Server Error' });

    httpMock.expectNone('/api/auth/refresh');
  });
});
