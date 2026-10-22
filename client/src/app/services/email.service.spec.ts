import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EmailService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('turns the filters into query parameters, repeating the labels', () => {
    service.search({ text: 'Roma', labels: ['Viaggi', 'Lavoro'], matchAll: true }).subscribe();

    const req = httpMock.expectOne((r) => r.url === '/api/emails');
    expect(req.request.params.get('q')).toBe('Roma');
    expect(req.request.params.getAll('labels')).toEqual(['Viaggi', 'Lavoro']);
    expect(req.request.params.get('match')).toBe('all');
    expect(req.request.params.has('sender')).toBe(false);
  });

  it('sends no parameters without filters', () => {
    service.search().subscribe();

    expect(httpMock.expectOne('/api/emails').request.params.keys()).toEqual([]);
  });

  it('uploads a .eml file in the "file" field', () => {
    const file = new File(['From: a@example.com'], 'mail.eml');

    service.upload(file).subscribe();

    const req = httpMock.expectOne('/api/emails/upload');
    expect((req.request.body as FormData).get('file')).toBe(file);
  });

  it('deletes e-mails by id', () => {
    service.delete([1, 2]).subscribe();

    const req = httpMock.expectOne('/api/emails');
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toEqual({ ids: [1, 2] });
  });
});
