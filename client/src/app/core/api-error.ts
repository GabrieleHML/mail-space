import { HttpErrorResponse } from '@angular/common/http';

// Italian messages for the error codes returned by the API (mostly Cognito errors)
const MESSAGES: Record<string, string> = {
  NotAuthorizedException: 'Credenziali non valide',
  UserNotConfirmedException:
    'Account non ancora confermato: inserisci il codice ricevuto via email',
  UsernameExistsException: 'Username già in uso',
  InvalidPasswordException: 'La password non rispetta i requisiti di sicurezza',
  CodeMismatchException: 'Codice di verifica errato',
  ExpiredCodeException: 'Codice di verifica scaduto: richiedine uno nuovo',
  LimitExceededException: 'Troppi tentativi, riprova più tardi',
  TooManyRequests: 'Troppe richieste, riprova più tardi',
  FolderExists: 'Esiste già una cartella con questo nome',
  UnsupportedFile: 'Sono accettati solo file .eml',
  LIMIT_FILE_SIZE: 'Il file supera la dimensione massima di 10 MB',
};

// Returns a message to show to the user for a failed API call
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const code: string | undefined = error.error?.code;
    if (code && MESSAGES[code]) return MESSAGES[code];
    if (error.status === 0) return 'Server non raggiungibile, riprova più tardi';
    if (error.status === 429) return MESSAGES['TooManyRequests'];
  }
  return fallback;
}
