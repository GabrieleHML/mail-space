import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { fakeIdToken } from '../../testing/fake-token';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  const runGuard = () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient()] });
    return TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
  };

  beforeEach(() => localStorage.clear());

  it('lets logged-in users through', () => {
    localStorage.setItem('idToken', fakeIdToken('alice'));

    expect(runGuard()).toBe(true);
  });

  it('redirects anonymous users to the login page', () => {
    const result = runGuard();

    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/');
  });
});
