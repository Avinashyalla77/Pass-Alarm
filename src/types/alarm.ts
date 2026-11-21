export interface Alarm {
  id: string;
  time: string; // "HH:MM" in 24-hour format e.g. "08:31"
  days?: number[]; // [0, 1, 2, 3, 4, 5, 6] where 0=Sun, 1=Mon ... 6=Sat
  label: string;
  isEnabled: boolean;
  passkey: string;
  hint?: string;
  soundUri?: string | null;
  soundName?: string;
  createdAt: number;
}

export interface PasskeyValidationResult {
  isValid: boolean;
  hasMinLength: boolean;
  hasMaxLength: boolean;
  hasInteger: boolean;
  hasSpecialChar: boolean;
}
