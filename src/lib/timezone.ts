// Timezone configuration for the application
// Prague/Berlin use the same timezone: Central European Time (CET/CEST)
export const APP_TIMEZONE = 'Europe/Prague';

// Format a date in the app's timezone
export function formatInAppTimezone(date: Date, formatStr: string): string {
  // This is a placeholder - date-fns will use local time
  // For proper timezone handling in the browser, you might want to use date-fns-tz
  return formatStr;
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
