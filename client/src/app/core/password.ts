import { Validators } from '@angular/forms';

// Same policy as the Cognito user pool: at least 8 characters with a digit,
// a special character, an upper-case and a lower-case letter
export const passwordValidators = [
  Validators.required,
  Validators.minLength(8),
  Validators.pattern(/(?=.*[0-9])(?=.*[!@#$%^&*])(?=.*[A-Z])(?=.*[a-z])/),
];
