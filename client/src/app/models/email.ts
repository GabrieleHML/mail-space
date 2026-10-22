export interface Email {
  id: number;
  sender: string;
  subject: string;
  body: string;
  labels: string[];
}

// Returned when an e-mail is stored: `classified` is false if Gemini was unavailable
export interface StoredEmail extends Email {
  classified: boolean;
}

// Search criteria; they are combined in AND, labels with "all" or "any" semantics
export interface EmailFilters {
  text?: string;
  sender?: string;
  subject?: string;
  words?: string;
  labels?: string[];
  matchAll?: boolean;
}
