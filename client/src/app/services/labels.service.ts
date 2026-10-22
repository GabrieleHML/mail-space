import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LabelUpdateResult {
  labels: string[];
  added: string[];
  removed: string[];
  // E-mails that Gemini could not re-classify with the new labels
  failed: number;
}

@Injectable({ providedIn: 'root' })
export class LabelsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/labels`;

  get(): Observable<string[]> {
    return this.http.get<string[]>(this.url);
  }

  // Replaces all the labels: the server re-classifies the e-mails with the new ones
  update(labels: string[]): Observable<LabelUpdateResult> {
    return this.http.put<LabelUpdateResult>(this.url, { labels });
  }
}
