import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { apiErrorMessage } from '../../core/api-error';
import { passwordValidators } from '../../core/password';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { ConfirmationCodeComponent } from '../confirmation-code/confirmation-code.component';

@Component({
  selector: 'app-register',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  protected readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    username: new FormControl('', { nonNullable: true, validators: Validators.required }),
    password: new FormControl('', { nonNullable: true, validators: passwordValidators }),
    confirm: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });

  onSignUp(): void {
    const { email, username, password, confirm } = this.form.getRawValue();
    if (password !== confirm) {
      this.notification.show('Le password non corrispondono', 'Chiudi');
      return;
    }

    this.auth.signUp(username, email, password).subscribe({
      next: () => this.openConfirmationDialog(username),
      error: (error) =>
        this.notification.show(
          apiErrorMessage(error, 'Errore durante la registrazione, riprova'),
          'Chiudi',
        ),
    });
  }

  // Cognito sends a verification code by e-mail: the account is active once confirmed
  private openConfirmationDialog(username: string): void {
    this.dialog
      .open(ConfirmationCodeComponent, { width: '400px', height: '400px', data: { username } })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.notification.show('Account confermato, ora puoi accedere', 'Chiudi');
        }
      });
  }
}
