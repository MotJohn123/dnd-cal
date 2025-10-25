import { google } from 'googleapis';

// For service account authentication (recommended for server-side)
let oauth2Client: any = null;

try {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    // Use service account
    console.log('Initializing Google Calendar with Service Account...');
    oauth2Client = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      undefined,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/calendar']
    );
  } else if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN) {
    // Use OAuth with refresh token
    console.log('Initializing Google Calendar with OAuth2...');
    console.log('Client ID:', process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...');
    console.log('Has Client Secret:', !!process.env.GOOGLE_CLIENT_SECRET);
    console.log('Has Refresh Token:', !!process.env.GOOGLE_REFRESH_TOKEN);
    console.log('Redirect URI:', process.env.GOOGLE_REDIRECT_URI);
    
    oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });
    console.log('Google Calendar OAuth2 client initialized successfully');
  } else {
    console.warn('Google Calendar not configured - missing environment variables');
    console.log('Has GOOGLE_CLIENT_ID:', !!process.env.GOOGLE_CLIENT_ID);
    console.log('Has GOOGLE_CLIENT_SECRET:', !!process.env.GOOGLE_CLIENT_SECRET);
    console.log('Has GOOGLE_REFRESH_TOKEN:', !!process.env.GOOGLE_REFRESH_TOKEN);
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
    
    // The date parameter is already set to the correct UTC moment that represents 
    // the desired Prague date at midnight. We just need to add the time offset.
    // 
    // Since we want the TIME to be interpreted in Prague timezone:
    // If we want 09:00 Prague time on a date, we need to:
    // 1. Take the UTC midnight we stored for that date
    // 2. Add 9 hours to it
    // 3. Send it with timeZone 'Europe/Prague'
    //
    // This way Google Calendar knows: "This UTC moment is when 09:00 Prague time occurs"
    
    const startDateTime = new Date(date);
    startDateTime.setHours(hours, minutes, 0, 0);

    // Assume 3-hour session duration
    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(startDateTime.getHours() + 3);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Use the date and time directly with the Prague timezone
    // This tells Google Calendar: "This datetime is in Prague timezone"
    const event = {
      summary,
      description,
      location,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'Europe/Prague', // Prague/Berlin timezone (CET/CEST)
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'Europe/Prague',
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

    console.log('Creating Google Calendar event:', { 
      summary, 
      inputDate: date,
      calculatedStart: startDateTime.toISOString(),
      time,
      timeZone: 'Europe/Prague',
      attendees,
    });

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      sendUpdates: 'all', // Send email invitations to all attendees
    });

    console.log('Google Calendar event created successfully:', response.data.id);
    console.log('Event link:', response.data.htmlLink);
    return response.data.id || null;
  } catch (error: any) {
    console.error('Failed to create Google Calendar event:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.code) {
      console.error('Error code:', error.code);
    }
    console.error('Full error:', error);
    return null;
  }
}

export async function updateGoogleCalendarEvent(
  eventId: string,
  params: CalendarEventParams
): Promise<void> {
  try {
    if (!oauth2Client) {
      console.warn('Google Calendar API not configured');
      return;
    }

    const { summary, description, location, date, time, attendees } = params;

    // Parse time (format: HH:MM)
    const [hours, minutes] = time.split(':').map(Number);
    
    // The date parameter is already set to the correct UTC moment that represents 
    // the desired Prague date at midnight. We just need to add the time offset.
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
        timeZone: 'Europe/Prague', // Prague/Berlin timezone (CET/CEST)
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'Europe/Prague',
      },
      attendees: attendees.map((email) => ({ email })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 60 },
        ],
      },
    };

    console.log('Updating Google Calendar event:', { eventId, summary, date: startDateTime });

    await calendar.events.update({
      calendarId: 'primary',
      eventId,
      requestBody: event,
      sendUpdates: 'all', // Send email updates to all attendees
    });

    console.log('Google Calendar event updated successfully:', eventId);
  } catch (error: any) {
    console.error('Failed to update Google Calendar event:', error.message);
    console.error('Error details:', error);
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
