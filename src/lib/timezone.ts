// Timezone configuration for the application
// Prague/Berlin use the same timezone: Central European Time (CET/CEST)
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';

export const APP_TIMEZONE = 'Europe/Prague';

/**
 * Parse a date string (YYYY-MM-DD) as a date in Prague timezone
 * Returns a Date object that represents midnight in Prague on that date
 */
export function parseDateInPrague(dateString: string): Date {
  const parts = dateString.split('-');
  if (parts.length !== 3) {
    throw new Error('Date must be in YYYY-MM-DD format');
  }
  const [year, month, day] = parts.map(Number);
  
  // Create a date object that represents midnight on this date in Prague timezone
  // fromZonedTime converts a "local" time in the given timezone to UTC
  return fromZonedTime(new Date(year, month - 1, day, 0, 0, 0, 0), APP_TIMEZONE);
}

/**
 * Format a date in the app's timezone (Prague)
 */
export function formatInAppTimezone(date: Date, formatStr: string): string {
  return formatInTimeZone(date, APP_TIMEZONE, formatStr);
}

/**
 * Get the date string (YYYY-MM-DD) for a Date object in Prague timezone
 */
export function getDateStringInPrague(date: Date): string {
  return formatInTimeZone(date, APP_TIMEZONE, 'yyyy-MM-dd');
}

// Get timezone offset info
export function getTimezoneInfo() {
  return {
    timezone: APP_TIMEZONE,
    name: 'Central European Time',
    abbreviation: 'CET/CEST',
    utcOffset: '+01:00 (CET) / +02:00 (CEST)',
  };
}
