import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { fakeIdToken } from '../../testing/fake-token';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let httpMock: HttpTestingController;

  const createService = () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.inject(AuthService);
  };

  beforeEach(() => localStorage.clear());
  afterEach(() => httpMock.verify());

  it('restores the user from the stored ID token', () => {
    localStorage.setItem('idToken', fakeIdToken('alice'));

    const auth = createService();

    expect(auth.isLoggedIn()).toBe(true);
    expect(auth.user()).toEqual({ username: 'alice', email: 'alice@example.com' });
  });

  it('logs in and stores the Cognito tokens', () => {
    const auth = createService();

    auth.login('alice', 'Password1!').subscribe();
    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.body).toEqual({ username: 'alice', password: 'Password1!' });
    req.flush({ idToken: fakeIdToken('alice'), accessToken: 'access', refreshToken: 'refresh' });

    expect(auth.user()?.username).toBe('alice');
    expect(localStorage.getItem('refreshToken')).toBe('refresh');
  });

  it('clears the session and revokes the refresh token on logout, even if the API fails', () => {
    localStorage.setItem('idToken', fakeIdToken('alice'));
    localStorage.setItem('refreshToken', 'refresh');
    const auth = createService();
    let completed = false;

    auth.logout().subscribe({ complete: () => (completed = true) });

    expect(auth.isLoggedIn()).toBe(false);
    expect(localStorage.length).toBe(0);
    const req = httpMock.expectOne('/api/auth/logout');
    expect(req.request.body).toEqual({ refreshToken: 'refresh' });
    req.flush(null, { status: 500, statusText: 'Server Error' });
    expect(completed).toBe(true);
  });

  it('sends the access token to change the password', () => {
    localStorage.setItem('accessToken', 'access');
    const auth = createService();

    auth.changePassword('Old1!pass', 'New1!pass').subscribe();

    expect(httpMock.expectOne('/api/auth/change-password').request.body).toEqual({
      accessToken: 'access',
      oldPassword: 'Old1!pass',
      newPassword: 'New1!pass',
    });
  });
});
