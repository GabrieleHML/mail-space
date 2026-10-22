import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmailFilters } from '../../models/email';
import { NotificationService } from '../../services/notification.service';
import { SearchComponent } from './search.component';

describe('SearchComponent', () => {
  let fixture: ComponentFixture<SearchComponent>;
  let emitted: EmailFilters[];
  const notification = { show: vi.fn() };

  const input = (selector: string) =>
    fixture.nativeElement.querySelector(selector) as HTMLInputElement;
  const type = (element: HTMLInputElement, value: string) => {
    element.value = value;
    element.dispatchEvent(new Event('input'));
  };

  beforeEach(async () => {
    notification.show.mockClear();
    await TestBed.configureTestingModule({
      imports: [SearchComponent],
      providers: [{ provide: NotificationService, useValue: notification }],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchComponent);
    emitted = [];
    fixture.componentInstance.filtersChange.subscribe((filters) => emitted.push(filters));
    fixture.detectChanges();
  });

  it('emits the free text when Enter is pressed', () => {
    const search = input('input[placeholder="Inserisci il testo da cercare"]');
    type(search, '  Roma ');
    search.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }));

    expect(emitted).toEqual([{ text: 'Roma' }]);
  });

  it('emits the advanced criteria and closes the panel', async () => {
    fixture.nativeElement.querySelector('button[aria-label="Opzioni avanzate"]').click();
    fixture.detectChanges();
    await fixture.whenStable();

    const [sender, subject, words] =
      fixture.nativeElement.querySelectorAll('.custom-dropdown input');
    type(sender, 'azienda');
    type(words, 'treno, hotel');
    fixture.nativeElement.querySelector('.custom-dropdown button').click();
    fixture.detectChanges();

    expect(subject.value).toBe('');
    expect(emitted).toEqual([{ sender: 'azienda', subject: '', words: 'treno, hotel' }]);
    expect(fixture.nativeElement.querySelector('.custom-dropdown')).toBeNull();
  });

  it('does not search with an empty advanced form', async () => {
    fixture.nativeElement.querySelector('button[aria-label="Opzioni avanzate"]').click();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.nativeElement.querySelector('.custom-dropdown button').click();

    expect(emitted).toEqual([]);
    expect(notification.show).toHaveBeenCalled();
  });
});
