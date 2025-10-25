import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

interface CalendarEventParams {
  summary: string;
  description: string;
  location: string;
  date: Date;
  time: string;
  attendees: string[];
}

export async function createGoogleCalendarEvent(
  params: CalendarEventParams
): Promise<string | null> {
  try {
    // Note: In a production app, you would store OAuth tokens for each user
    // This is a simplified version that assumes the app has access to create events
    
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.warn('Google Calendar API not configured');
      return null;
    }

    const { summary, description, location, date, time, attendees } = params;

    // Parse time (format: HH:MM)
    const [hours, minutes] = time.split(':').map(Number);
    const startDateTime = new Date(date);
    startDateTime.setHours(hours, minutes, 0, 0);

    // Assume 3-hour session duration
    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(startDateTime.getHours() + 3);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const event = {
      summary,
      description,
      location,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'UTC', // Should be user's timezone in production
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'UTC',
      },
      attendees: attendees.map((email) => ({ email })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 60 }, // 1 hour before
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      sendUpdates: 'all',
    });

    return response.data.id || null;
  } catch (error) {
    console.error('Failed to create Google Calendar event:', error);
    return null;
  }
}

export async function deleteGoogleCalendarEvent(eventId: string): Promise<void> {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return;
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
      sendUpdates: 'all',
    });
  } catch (error) {
    console.error('Failed to delete Google Calendar event:', error);
  }
}
