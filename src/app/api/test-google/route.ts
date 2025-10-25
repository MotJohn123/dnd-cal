import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET() {
  try {
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      envVars: {
        hasClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        hasRefreshToken: !!process.env.GOOGLE_REFRESH_TOKEN,
        hasRedirectUri: !!process.env.GOOGLE_REDIRECT_URI,
        clientIdPrefix: process.env.GOOGLE_CLIENT_ID?.substring(0, 20),
        redirectUri: process.env.GOOGLE_REDIRECT_URI,
      },
    };

    // Try to initialize OAuth client
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
      return NextResponse.json({
        success: false,
        error: 'Missing required Google OAuth environment variables',
        diagnostics,
      }, { status: 500 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    diagnostics.oauthClientInitialized = true;

    // Try to get an access token (this will refresh if needed)
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      diagnostics.accessTokenObtained = true;
      diagnostics.tokenExpiry = credentials.expiry_date;
      diagnostics.scopes = credentials.scope;
    } catch (tokenError: any) {
      diagnostics.accessTokenError = tokenError.message;
      diagnostics.tokenErrorDetails = {
        code: tokenError.code,
        status: tokenError.response?.status,
        statusText: tokenError.response?.statusText,
        data: tokenError.response?.data,
      };
      return NextResponse.json({
        success: false,
        error: 'Failed to refresh access token',
        diagnostics,
      }, { status: 500 });
    }

    // Try to list calendars (simple API test)
    try {
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const response = await calendar.calendarList.list({
        maxResults: 5,
      });
      
      diagnostics.calendarApiTest = {
        success: true,
        calendarsFound: response.data.items?.length || 0,
        primaryCalendar: response.data.items?.find(c => c.primary)?.summary,
      };
    } catch (apiError: any) {
      diagnostics.calendarApiTest = {
        success: false,
        error: apiError.message,
        code: apiError.code,
        status: apiError.response?.status,
        statusText: apiError.response?.statusText,
        data: apiError.response?.data,
      };
      return NextResponse.json({
        success: false,
        error: 'Calendar API test failed',
        diagnostics,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Google Calendar API is working correctly!',
      diagnostics,
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
