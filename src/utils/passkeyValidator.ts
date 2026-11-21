import { PasskeyValidationResult } from '../types/alarm';

export const SPECIAL_CHAR_REGEX = /[^a-zA-Z0-9\s]/;
export const INTEGER_REGEX = /[0-9]/;
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function validatePasskey(key: string): PasskeyValidationResult {
  const length = key.length;
  const hasMinLength = length >= 5;
  const hasMaxLength = length <= 16;
  const hasInteger = INTEGER_REGEX.test(key);
  const hasSpecialChar = SPECIAL_CHAR_REGEX.test(key);

  const isValid = hasMinLength && hasMaxLength && hasInteger && hasSpecialChar;

  return {
    isValid,
    hasMinLength,
    hasMaxLength,
    hasInteger,
    hasSpecialChar,
  };
}

export function formatTimeDisplay(timeStr: string): { time: string; period: string } {
  const [hourStr, minuteStr] = timeStr.split(':');
  let hour = parseInt(hourStr, 10);
  const minute = minuteStr || '00';
  const period = hour >= 12 ? 'PM' : 'AM';

  hour = hour % 12;
  if (hour === 0) hour = 12;

  const formattedHour = hour < 10 ? `0${hour}` : `${hour}`;
  return {
    time: `${formattedHour}:${minute}`,
    period,
  };
}

export function formatDaysDisplay(days?: number[]): string {
  if (!days || days.length === 7) return 'Every day';
  if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return 'Weekdays';
  if (days.length === 2 && [0, 6].every((d) => days.includes(d))) return 'Weekends';
  if (days.length === 0) return 'Never';
  return days.map((d) => DAY_NAMES[d]).join(', ');
}
