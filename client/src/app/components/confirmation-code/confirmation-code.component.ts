import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { apiErrorMessage } from '../../core/api-error';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

// Dialog to confirm a new account with the code sent by Cognito; closes with `true` on success
@Component({
  selector: 'app-confirmation-code',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './confirmation-code.component.html',
})
export class ConfirmationCodeComponent {
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly dialogRef = inject(MatDialogRef<ConfirmationCodeComponent>);
  private readonly data = inject<{ username?: string } | null>(MAT_DIALOG_DATA, { optional: true });

  protected readonly form = new FormGroup({
    username: new FormControl(this.data?.username ?? '', {
      nonNullable: true,
      validators: Validators.required,
    }),
    code: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });

  onConfirmSignUp(): void {
    if (this.form.invalid) {
      this.notification.show('Compila correttamente il modulo', 'Chiudi');
      return;
    }

    const { username, code } = this.form.getRawValue();
    this.auth.confirmSignUp(username, code.trim()).subscribe({
      next: () => this.dialogRef.close(true),
      error: (error) =>
        this.notification.show(
          apiErrorMessage(error, 'Errore durante la conferma, verifica il codice'),
          'Chiudi',
        ),
    });
  }
}
