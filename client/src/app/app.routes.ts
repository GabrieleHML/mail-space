import { Routes } from '@angular/router';

import { MailViewerComponent } from './components/mail-viewer/mail-viewer.component';
import { MailUploaderComponent } from './components/mail-uploader/mail-uploader.component';
import { ProfileComponent } from './components/profile/profile.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'mails', component: MailViewerComponent, canActivate: [authGuard] },
  { path: 'add-mail', component: MailUploaderComponent, canActivate: [authGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
];
