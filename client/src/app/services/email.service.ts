import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Email, EmailFilters, StoredEmail } from '../models/email';

@Injectable({ providedIn: 'root' })
export class EmailService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/emails`;

  search(filters: EmailFilters = {}): Observable<Email[]> {
    let params = new HttpParams();
    if (filters.text) params = params.set('q', filters.text);
    if (filters.sender) params = params.set('sender', filters.sender);
    if (filters.subject) params = params.set('subject', filters.subject);
    if (filters.words) params = params.set('words', filters.words);
    for (const label of filters.labels ?? []) params = params.append('labels', label);
    if (filters.matchAll) params = params.set('match', 'all');
    return this.http.get<Email[]>(this.url, { params });
  }

  create(email: { sender: string; subject: string; body: string }): Observable<StoredEmail> {
    return this.http.post<StoredEmail>(this.url, email);
  }

  upload(file: File): Observable<StoredEmail> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<StoredEmail>(`${this.url}/upload`, formData);
  }

  delete(ids: number[]): Observable<void> {
    return this.http.delete<void>(this.url, { body: { ids } });
  }
}
