import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { apiErrorMessage } from '../../core/api-error';
import { passwordValidators } from '../../core/password';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

// Two-step password recovery: request a code by e-mail, then set a new password
@Component({
  selector: 'app-forgot-pwd',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './forgot-pwd.component.html',
})
export class ForgotPwdComponent {
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly dialogRef = inject(MatDialogRef<ForgotPwdComponent>);

  protected step: 1 | 2 = 1;

  protected readonly requestForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  protected readonly resetForm = new FormGroup({
    code: new FormControl('', { nonNullable: true, validators: Validators.required }),
    newPassword: new FormControl('', { nonNullable: true, validators: passwordValidators }),
  });

  onRequestCode(): void {
    if (this.requestForm.invalid) {
      this.notification.show('Inserisci un indirizzo email valido', 'Chiudi');
      return;
    }

    this.auth.forgotPassword(this.requestForm.getRawValue().email).subscribe({
      next: () => {
        this.step = 2;
        this.notification.show("Se l'account esiste, riceverai un codice via email", 'Chiudi');
      },
      error: (error) =>
        this.notification.show(
          apiErrorMessage(error, 'Errore durante la richiesta del codice, riprova'),
          'Chiudi',
        ),
    });
  }

  onSubmit(): void {
    if (this.resetForm.invalid) {
      this.notification.show('Compila correttamente il modulo', 'Chiudi');
      return;
    }

    const { email } = this.requestForm.getRawValue();
    const { code, newPassword } = this.resetForm.getRawValue();
    this.auth.resetPassword(email, code.trim(), newPassword).subscribe({
      next: () => this.dialogRef.close(true),
      error: (error) =>
        this.notification.show(
          apiErrorMessage(error, 'Errore durante la reimpostazione della password'),
          'Chiudi',
        ),
    });
  }
}
