import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { catchError, finalize, map, Observable, of, shareReplay, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  username: string;
  email: string;
}

interface Tokens {
  idToken: string;
  accessToken: string;
  refreshToken?: string;
}

const STORAGE_KEYS = {
  idToken: 'idToken',
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
};

// Session management with Amazon Cognito tokens (issued through the API):
// the ID token authenticates API calls, the refresh token renews it when it expires.
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/auth`;
  private readonly currentUser = signal<User | null>(
    this.userFromToken(localStorage.getItem(STORAGE_KEYS.idToken)),
  );
  private refreshInFlight$: Observable<string> | null = null;

  readonly user = this.currentUser.asReadonly();
  readonly isLoggedIn = computed(() => this.currentUser() !== null);

  get idToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.idToken);
  }

  get hasRefreshToken(): boolean {
    return localStorage.getItem(STORAGE_KEYS.refreshToken) !== null;
  }

  login(username: string, password: string): Observable<void> {
    return this.http
      .post<Tokens>(`${this.url}/login`, { username, password })
      .pipe(map((tokens) => this.storeTokens(tokens)));
  }

  // Gets a new ID token; concurrent callers share the same request
  refresh(): Observable<string> {
    const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token'));
    }
    this.refreshInFlight$ ??= this.http.post<Tokens>(`${this.url}/refresh`, { refreshToken }).pipe(
      tap((tokens) => this.storeTokens(tokens)),
      map((tokens) => tokens.idToken),
      finalize(() => (this.refreshInFlight$ = null)),
      shareReplay(1),
    );
    return this.refreshInFlight$;
  }

  // Revokes the refresh token on Cognito; the local session is cleared in any case
  logout(): Observable<void> {
    const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
    this.clearSession();
    if (!refreshToken) {
      return of(undefined);
    }
    return this.http
      .post<void>(`${this.url}/logout`, { refreshToken })
      .pipe(catchError(() => of(undefined)));
  }

  signUp(username: string, email: string, password: string): Observable<void> {
    return this.http.post<void>(`${this.url}/signup`, { username, email, password });
  }

  confirmSignUp(username: string, code: string): Observable<void> {
    return this.http.post<void>(`${this.url}/confirm`, { username, code });
  }

  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${this.url}/forgot-password`, { email });
  }

  resetPassword(email: string, code: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.url}/reset-password`, { email, code, newPassword });
  }

  changePassword(oldPassword: string, newPassword: string): Observable<void> {
    const accessToken = localStorage.getItem(STORAGE_KEYS.accessToken);
    return this.http.post<void>(`${this.url}/change-password`, {
      accessToken,
      oldPassword,
      newPassword,
    });
  }

  clearSession(): void {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    this.currentUser.set(null);
  }

  private storeTokens(tokens: Tokens): void {
    localStorage.setItem(STORAGE_KEYS.idToken, tokens.idToken);
    localStorage.setItem(STORAGE_KEYS.accessToken, tokens.accessToken);
    if (tokens.refreshToken) {
      localStorage.setItem(STORAGE_KEYS.refreshToken, tokens.refreshToken);
    }
    this.currentUser.set(this.userFromToken(tokens.idToken));
  }

  private userFromToken(idToken: string | null): User | null {
    if (!idToken) return null;
    try {
      const claims = jwtDecode<{ email: string; 'cognito:username': string }>(idToken);
      return { username: claims['cognito:username'], email: claims.email };
    } catch {
      return null;
    }
  }
}
