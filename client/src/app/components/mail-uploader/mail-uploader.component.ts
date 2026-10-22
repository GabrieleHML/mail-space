import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { apiErrorMessage } from '../../core/api-error';
import { EmailService } from '../../services/email.service';
import { NotificationService } from '../../services/notification.service';

// Form to add an e-mail by typing sender, subject and text
@Component({
  selector: 'app-mail-uploader',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './mail-uploader.component.html',
})
export class MailUploaderComponent {
  private readonly emailService = inject(EmailService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly form = new FormGroup({
    sender: new FormControl('', { nonNullable: true, validators: Validators.required }),
    subject: new FormControl('', { nonNullable: true, validators: Validators.required }),
    body: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });

  uploadMail(): void {
    this.emailService.create(this.form.getRawValue()).subscribe({
      next: (email) => {
        const message = email.classified
          ? 'Email caricata e classificata con successo!'
          : 'Email caricata, ma la classificazione automatica non è disponibile';
        // The message is shown by the mail viewer after the navigation
        this.router.navigate(['/mails'], { state: { message } });
      },
      error: (error) =>
        this.notification.show(
          apiErrorMessage(error, 'Errore nel caricamento della mail, riprova'),
          'Chiudi',
        ),
    });
  }
}
