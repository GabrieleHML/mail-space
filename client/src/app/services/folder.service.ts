import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Email } from '../models/email';
import { Folder } from '../models/folder';

@Injectable({ providedIn: 'root' })
export class FolderService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/folders`;

  list(): Observable<Folder[]> {
    return this.http.get<Folder[]>(this.url);
  }

  create(name: string): Observable<Folder> {
    return this.http.post<Folder>(this.url, { name });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  emails(id: number): Observable<Email[]> {
    return this.http.get<Email[]>(`${this.url}/${id}/emails`);
  }

  addEmails(id: number, emailIds: number[]): Observable<{ added: number }> {
    return this.http.post<{ added: number }>(`${this.url}/${id}/emails`, { emailIds });
  }

  removeEmails(id: number, emailIds: number[]): Observable<{ removed: number }> {
    return this.http.delete<{ removed: number }>(`${this.url}/${id}/emails`, {
      body: { emailIds },
    });
  }
}
