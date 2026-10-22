import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipEditedEvent, MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { apiErrorMessage } from '../../core/api-error';
import { AuthService } from '../../services/auth.service';
import { LabelsService } from '../../services/labels.service';
import { NotificationService } from '../../services/notification.service';
import { ResetPwdComponent } from '../reset-pwd/reset-pwd.component';

// Account details, password change and editing of the labels used by Gemini
@Component({
  selector: 'app-profile',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);
  private readonly labelsService = inject(LabelsService);
  protected readonly user = inject(AuthService).user;

  protected labels: string[] = [];
  protected saving = false;
  private savedLabels: string[] = [];
  protected readonly separatorKeysCodes = [ENTER, COMMA];

  ngOnInit(): void {
    this.labelsService.get().subscribe({
      next: (labels) => {
        this.labels = [...labels];
        this.savedLabels = labels;
      },
      error: () => this.notification.show('Impossibile caricare le etichette'),
    });
  }

  openResetPwdDialog(): void {
    this.dialog
      .open(ResetPwdComponent, { width: '500px', height: '600px' })
      .afterClosed()
      .subscribe((changed) => {
        if (changed) {
          this.notification.show('La password è stata modificata con successo!');
        }
      });
  }

  add(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value && !this.labels.includes(value)) {
      this.labels.push(value);
    }
    event.chipInput.clear();
  }

  remove(label: string): void {
    this.labels = this.labels.filter((l) => l !== label);
  }

  edit(label: string, event: MatChipEditedEvent): void {
    const value = event.value.trim();
    if (!value) {
      this.remove(label);
      return;
    }
    this.labels = this.labels.map((l) => (l === label ? value : l));
  }

  // Saving can take a while: Gemini re-classifies the existing e-mails with the new labels
  updateLabels(): void {
    const unchanged =
      this.labels.length === this.savedLabels.length &&
      this.labels.every((l) => this.savedLabels.includes(l));
    if (unchanged) {
      this.notification.show('Nessuna modifica alle etichette da salvare');
      return;
    }

    this.saving = true;
    this.labelsService.update(this.labels).subscribe({
      next: (result) => {
        this.saving = false;
        this.savedLabels = result.labels;
        this.notification.show(
          result.failed > 0
            ? `Etichette salvate, ma ${result.failed} email non sono state riclassificate`
            : 'Etichette salvate e email riclassificate',
        );
      },
      error: (error) => {
        this.saving = false;
        this.notification.show(apiErrorMessage(error, 'Errore nel salvataggio delle etichette'));
      },
    });
  }
}
