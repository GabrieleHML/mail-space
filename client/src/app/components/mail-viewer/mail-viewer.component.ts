import { AfterViewInit, Component, DestroyRef, inject, OnInit, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { apiErrorMessage } from '../../core/api-error';
import { Email, EmailFilters } from '../../models/email';
import { Folder } from '../../models/folder';
import { EmailService } from '../../services/email.service';
import { FolderService } from '../../services/folder.service';
import { LabelsService } from '../../services/labels.service';
import { NotificationService } from '../../services/notification.service';
import { SidenavService } from '../../services/sidenav.service';
import { AddFolderComponent } from '../add-folder/add-folder.component';
import { SearchComponent } from '../search/search.component';

// Main page: e-mail list with search, tag filters, pagination, selection and folders
@Component({
  selector: 'app-mail-viewer',
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    MatChipsModule,
    MatExpansionModule,
    MatIconModule,
    MatListModule,
    MatMenuModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSidenavModule,
    MatToolbarModule,
    MatTooltipModule,
    SearchComponent,
  ],
  templateUrl: './mail-viewer.component.html',
})
export class MailViewerComponent implements OnInit, AfterViewInit {
  private readonly emailService = inject(EmailService);
  private readonly folderService = inject(FolderService);
  private readonly labelsService = inject(LabelsService);
  private readonly notification = inject(NotificationService);
  private readonly sidenavService = inject(SidenavService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('sidenav') sidenav!: MatSidenav;

  protected emails: Email[] = [];
  protected paginatedEmails: Email[] = [];
  protected selectedIds = new Set<number>();
  protected pageSize = 5;
  protected pageIndex = 0;
  protected isLoadingEmails = false;

  protected folders: Folder[] = [];
  protected selectedFolder: Folder | null = null;
  protected isLoadingFolders = false;

  // Tag filters and search criteria, combined when loading the e-mails
  protected labels: string[] = [];
  protected selectedLabels: string[] = [];
  protected matchAll = false;
  private searchFilters: EmailFilters = {};

  ngOnInit(): void {
    this.showNavigationMessage();
    this.loadEmails();
    this.loadFolders();
    this.labelsService.get().subscribe({
      next: (labels) => (this.labels = labels),
      error: () => this.notification.show('Impossibile caricare le etichette'),
    });
  }

  ngAfterViewInit(): void {
    this.sidenavService.toggle$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.sidenav.toggle());
  }

  get allSelected(): boolean {
    return (
      this.paginatedEmails.length > 0 &&
      this.paginatedEmails.every((email) => this.selectedIds.has(email.id))
    );
  }

  // --- Loading and filtering ---

  loadEmails(): void {
    const request: Observable<Email[]> = this.selectedFolder
      ? this.folderService.emails(this.selectedFolder.id)
      : this.emailService.search({
          ...this.searchFilters,
          labels: this.selectedLabels,
          matchAll: this.matchAll,
        });

    this.isLoadingEmails = true;
    request.subscribe({
      next: (emails) => this.setEmails(emails),
      error: (error) => {
        this.isLoadingEmails = false;
        this.notification.show(apiErrorMessage(error, 'Errore durante il recupero delle email'));
      },
    });
  }

  onSearch(filters: EmailFilters): void {
    this.searchFilters = filters;
    this.selectedFolder = null;
    this.loadEmails();
  }

  onLabelsChange(): void {
    this.selectedFolder = null;
    this.loadEmails();
  }

  onMatchModeChange(mode: 'any' | 'all'): void {
    this.matchAll = mode === 'all';
    if (this.selectedLabels.length > 0) {
      this.loadEmails();
    }
  }

  resetLabels(): void {
    this.selectedLabels = [];
    this.matchAll = false;
    this.loadEmails();
  }

  // --- Pagination and selection ---

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.updatePage();
  }

  toggleAllSelection(checked: boolean): void {
    for (const email of this.paginatedEmails) {
      if (checked) this.selectedIds.add(email.id);
      else this.selectedIds.delete(email.id);
    }
  }

  toggleEmailSelection(id: number, checked: boolean): void {
    if (checked) this.selectedIds.add(id);
    else this.selectedIds.delete(id);
  }

  // --- E-mails ---

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allows selecting the same file again
    if (!file) {
      return;
    }
    if (!file.name.toLowerCase().endsWith('.eml')) {
      this.notification.show('Sono accettati solo file .eml');
      return;
    }

    this.emailService.upload(file).subscribe({
      next: (email) => {
        this.notification.show(
          email.classified
            ? 'File .eml caricato e classificato con successo!'
            : 'File caricato, ma la classificazione automatica non è disponibile',
        );
        this.loadEmails();
      },
      error: (error) =>
        this.notification.show(apiErrorMessage(error, 'Errore nel caricamento del file')),
    });
  }

  deleteEmails(): void {
    const ids = [...this.selectedIds];
    this.emailService.delete(ids).subscribe({
      next: () => {
        this.removeFromList(ids);
        this.notification.show('Email eliminate con successo!');
      },
      error: (error) =>
        this.notification.show(apiErrorMessage(error, "Errore durante l'eliminazione delle email")),
    });
  }

  // --- Folders ---

  loadFolders(): void {
    this.isLoadingFolders = true;
    this.folderService.list().subscribe({
      next: (folders) => {
        this.folders = folders;
        this.isLoadingFolders = false;
      },
      error: () => {
        this.isLoadingFolders = false;
        this.notification.show('Impossibile caricare le cartelle');
      },
    });
  }

  openFolder(folder: Folder): void {
    this.selectedFolder = folder;
    this.loadEmails();
  }

  closeFolder(): void {
    this.selectedFolder = null;
    this.loadEmails();
  }

  openAddFolderDialog(): void {
    this.dialog
      .open(AddFolderComponent, { width: '400px', height: '300px' })
      .afterClosed()
      .subscribe((created) => {
        if (created) this.loadFolders();
      });
  }

  deleteFolder(folder: Folder): void {
    this.folderService.delete(folder.id).subscribe({
      next: () => {
        this.folders = this.folders.filter((f) => f.id !== folder.id);
        if (this.selectedFolder?.id === folder.id) this.closeFolder();
        this.notification.show('Cartella eliminata con successo!');
      },
      error: (error) =>
        this.notification.show(
          apiErrorMessage(error, "Errore durante l'eliminazione della cartella"),
        ),
    });
  }

  addToFolder(folder: Folder): void {
    this.folderService.addEmails(folder.id, [...this.selectedIds]).subscribe({
      next: () => {
        this.selectedIds.clear();
        this.notification.show(`Email aggiunte alla cartella "${folder.name}"`);
      },
      error: (error) =>
        this.notification.show(
          apiErrorMessage(error, "Errore durante l'aggiunta delle email alla cartella"),
        ),
    });
  }

  removeFromFolder(): void {
    if (!this.selectedFolder) {
      return;
    }
    const ids = [...this.selectedIds];
    this.folderService.removeEmails(this.selectedFolder.id, ids).subscribe({
      next: () => {
        this.removeFromList(ids);
        this.notification.show('Email rimosse dalla cartella');
      },
      error: (error) =>
        this.notification.show(
          apiErrorMessage(error, 'Errore durante la rimozione delle email dalla cartella'),
        ),
    });
  }

  // --- Helpers ---

  private setEmails(emails: Email[]): void {
    this.emails = emails;
    this.selectedIds.clear();
    this.pageIndex = 0;
    this.updatePage();
    this.isLoadingEmails = false;
  }

  private removeFromList(ids: number[]): void {
    this.emails = this.emails.filter((email) => !ids.includes(email.id));
    this.selectedIds.clear();
    // Go back one page if the current one is now empty
    this.pageIndex = Math.min(
      this.pageIndex,
      Math.max(0, Math.ceil(this.emails.length / this.pageSize) - 1),
    );
    this.updatePage();
  }

  private updatePage(): void {
    const start = this.pageIndex * this.pageSize;
    this.paginatedEmails = this.emails.slice(start, start + this.pageSize);
  }

  // Message passed through the router state (e.g. after adding an e-mail)
  private showNavigationMessage(): void {
    const message = history.state?.message;
    if (message) {
      this.notification.show(message);
    }
  }
}
