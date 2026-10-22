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

// Dialog to change the password of the logged-in user; closes with `true` on success
@Component({
  selector: 'app-reset-pwd',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './reset-pwd.component.html',
})
export class ResetPwdComponent {
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly dialogRef = inject(MatDialogRef<ResetPwdComponent>);

  protected readonly resetPwdForm = new FormGroup({
    oldPassword: new FormControl('', { nonNullable: true, validators: Validators.required }),
    newPassword: new FormControl('', { nonNullable: true, validators: passwordValidators }),
  });

  onSubmit(): void {
    if (this.resetPwdForm.invalid) {
      return;
    }

    const { oldPassword, newPassword } = this.resetPwdForm.getRawValue();
    this.auth.changePassword(oldPassword, newPassword).subscribe({
      next: () => this.dialogRef.close(true),
      // The dialog stays open so the user can correct the current password
      error: (error) =>
        this.notification.show(
          apiErrorMessage(error, 'Errore durante la modifica della password'),
          'Chiudi',
        ),
    });
  }
}
