import { google } from 'googleapis';

// For service account authentication (recommended for server-side)
let oauth2Client: any = null;

try {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    // Use service account
    oauth2Client = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      undefined,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/calendar']
    );
  } else if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN) {
    // Use OAuth with refresh token
    oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });
  }
} catch (error) {
  console.error('Failed to initialize Google OAuth client:', error);
}

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
    // Check if Google Calendar is configured
    if (!oauth2Client) {
      console.warn('Google Calendar API not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY, or GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN');
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

    console.log('Creating Google Calendar event:', { summary, date: startDateTime, attendees });

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      sendUpdates: 'all', // Send email invitations to all attendees
    });

    console.log('Google Calendar event created successfully:', response.data.id);
    return response.data.id || null;
  } catch (error: any) {
    console.error('Failed to create Google Calendar event:', error.message);
    console.error('Error details:', error);
    return null;
  }
}

export async function deleteGoogleCalendarEvent(eventId: string): Promise<void> {
  try {
    if (!oauth2Client) {
      return;
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
      sendUpdates: 'all',
    });
    
    console.log('Google Calendar event deleted successfully:', eventId);
  } catch (error: any) {
    console.error('Failed to delete Google Calendar event:', error.message);
  }
}
