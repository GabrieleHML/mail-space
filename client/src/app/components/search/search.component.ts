import { Component, ElementRef, HostListener, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { EmailFilters } from '../../models/email';
import { NotificationService } from '../../services/notification.service';

// Search bar with an advanced panel; it only emits the criteria, the mail viewer
// combines them with the tag filters and loads the e-mails
@Component({
  selector: 'app-search',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  templateUrl: './search.component.html',
})
export class SearchComponent {
  private readonly notification = inject(NotificationService);
  private readonly elementRef = inject(ElementRef);

  readonly filtersChange = output<EmailFilters>();

  protected searchText = '';
  protected sender = '';
  protected subject = '';
  protected words = '';
  protected dropdownOpen = false;

  // Closes the advanced panel when clicking outside the component
  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.dropdownOpen = false;
    }
  }

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

  // Free-text search; an empty text clears the search
  onSearch(): void {
    this.filtersChange.emit({ text: this.searchText.trim() });
  }

  onAdvancedSearch(): void {
    const filters = {
      sender: this.sender.trim(),
      subject: this.subject.trim(),
      words: this.words.trim(),
    };
    if (!filters.sender && !filters.subject && !filters.words) {
      this.notification.show('Compila almeno un campo della ricerca avanzata');
      return;
    }
    this.dropdownOpen = false;
    this.filtersChange.emit(filters);
  }
}
