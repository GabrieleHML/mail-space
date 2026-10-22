import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

// Lets the toolbar (AppComponent) open and close the folders side panel of the mail viewer
@Injectable({ providedIn: 'root' })
export class SidenavService {
  private readonly toggleSubject = new Subject<void>();
  readonly toggle$ = this.toggleSubject.asObservable();

  toggle(): void {
    this.toggleSubject.next();
  }
}
