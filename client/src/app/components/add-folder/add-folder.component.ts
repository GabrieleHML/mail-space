import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { apiErrorMessage } from '../../core/api-error';
import { FolderService } from '../../services/folder.service';
import { NotificationService } from '../../services/notification.service';

// Dialog to create a folder; closes with `true` when the folder is created
@Component({
  selector: 'app-add-folder',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './add-folder.component.html',
})
export class AddFolderComponent {
  private readonly dialogRef = inject(MatDialogRef<AddFolderComponent>);
  private readonly folderService = inject(FolderService);
  private readonly notification = inject(NotificationService);

  protected readonly form = new FormGroup({
    folderName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(255)],
    }),
  });

  onAddFolder(): void {
    if (this.form.invalid) {
      return;
    }
    this.folderService.create(this.form.getRawValue().folderName.trim()).subscribe({
      next: () => {
        this.notification.show('Cartella aggiunta con successo!');
        this.dialogRef.close(true);
      },
      error: (error) =>
        this.notification.show(apiErrorMessage(error, "Errore durante l'aggiunta della cartella")),
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
