import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgClass } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { ConfirmationCodeComponent } from './components/confirmation-code/confirmation-code.component';
import { ForgotPwdComponent } from './components/forgot-pwd/forgot-pwd.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { AuthService } from './services/auth.service';
import { NotificationService } from './services/notification.service';
import { SidenavService } from './services/sidenav.service';

// Application shell: toolbar, login/sign-up forms on the home page, routed pages
@Component({
  selector: 'app-root',
  imports: [
    NgClass,
    RouterLink,
    RouterOutlet,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatMenuModule,
    MatToolbarModule,
    LoginComponent,
    RegisterComponent,
  ],
  templateUrl: './app.component.html',
})
export class AppComponent {
  protected readonly auth = inject(AuthService);
  protected readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);
  private readonly sidenavService = inject(SidenavService);

  protected showLogin = true;
  protected sidenavOpened = false;

  constructor() {
    this.sidenavService.toggle$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.sidenavOpened = !this.sidenavOpened;
    });
  }

  toggleForm(): void {
    this.showLogin = !this.showLogin;
  }

  toggleSidenav(): void {
    this.sidenavService.toggle();
  }

  logout(): void {
    this.auth.logout().subscribe(() => {
      this.sidenavOpened = false;
      this.notification.show('Ciao, alla prossima!');
      this.router.navigate(['/']);
    });
  }

  openConfirmationDialog(): void {
    this.dialog
      .open(ConfirmationCodeComponent, { width: '420px', height: '350px' })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.notification.show('Account confermato, ora puoi accedere');
        }
      });
  }

  openForgotPwdDialog(): void {
    this.dialog
      .open(ForgotPwdComponent, { width: '450px', autoFocus: false })
      .afterClosed()
      .subscribe((reset) => {
        if (reset) {
          this.notification.show('Password reimpostata con successo!');
        }
      });
  }
}
