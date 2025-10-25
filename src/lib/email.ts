import nodemailer from 'nodemailer';
import { format } from 'date-fns';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

interface SessionInviteParams {
  to: string;
  playerName: string;
  campaignName: string;
  date: Date;
  time: string;
  location: string;
}

interface SessionUpdateParams {
  to: string;
  playerName: string;
  campaignName: string;
  sessionName?: string;
  date: Date;
  time: string;
  location: string;
}

interface SessionCancellationParams {
  to: string;
  playerName: string;
  campaignName: string;
  sessionName?: string;
  date: Date;
  time: string;
}

export async function sendSessionInvite(params: SessionInviteParams) {
  const { to, playerName, campaignName, date, time, location } = params;

  const formattedDate = format(date, 'EEEE, MMMM d, yyyy');

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject: `New Session Scheduled: ${campaignName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">New TTRPG Session Scheduled!</h2>
        
        <p>Hello ${playerName},</p>
        
        <p>A new session has been scheduled for <strong>${campaignName}</strong>:</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 10px 0;"><strong>Date:</strong> ${formattedDate}</p>
          <p style="margin: 10px 0;"><strong>Time:</strong> ${time}</p>
          <p style="margin: 10px 0;"><strong>Location:</strong> ${location}</p>
        </div>
        
        <p>This event has been added to your Google Calendar (if you've connected your account).</p>
        
        <p>See you at the table!</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
        
        <p style="font-size: 12px; color: #6b7280;">
          You received this email because you are part of the ${campaignName} campaign.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Session invite sent to ${to}`);
  } catch (error) {
    console.error('Failed to send session invite:', error);
    throw error;
  }
}

export async function sendSessionUpdate(params: SessionUpdateParams) {
  const { to, playerName, campaignName, sessionName, date, time, location } = params;

  const formattedDate = format(date, 'EEEE, MMMM d, yyyy');
  const title = sessionName || campaignName;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject: `Session Updated: ${campaignName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">Session Updated!</h2>
        
        <p>Hello ${playerName},</p>
        
        <p>The session details for <strong>${title}</strong> have been updated:</p>
        
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="margin: 10px 0;"><strong>Date:</strong> ${formattedDate}</p>
          <p style="margin: 10px 0;"><strong>Time:</strong> ${time}</p>
          <p style="margin: 10px 0;"><strong>Location:</strong> ${location}</p>
        </div>
        
        <p>Please check your calendar for the updated details.</p>
        
        <p>See you at the table!</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
        
        <p style="font-size: 12px; color: #6b7280;">
          You received this email because you are part of the ${campaignName} campaign.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Session update sent to ${to}`);
  } catch (error) {
    console.error('Failed to send session update:', error);
    throw error;
  }
}

export async function sendSessionCancellation(params: SessionCancellationParams) {
  const { to, playerName, campaignName, sessionName, date, time } = params;

  const formattedDate = format(date, 'EEEE, MMMM d, yyyy');
  const title = sessionName || campaignName;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject: `Session Cancelled: ${campaignName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">Session Cancelled</h2>
        
        <p>Hello ${playerName},</p>
        
        <p>Unfortunately, the session for <strong>${title}</strong> has been cancelled:</p>
        
        <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <p style="margin: 10px 0;"><strong>Date:</strong> ${formattedDate}</p>
          <p style="margin: 10px 0;"><strong>Time:</strong> ${time}</p>
        </div>
        
        <p>The DM will let you know when the next session is scheduled.</p>
        
        <p>Until next time!</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
        
        <p style="font-size: 12px; color: #6b7280;">
          You received this email because you are part of the ${campaignName} campaign.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Session cancellation sent to ${to}`);
  } catch (error) {
    console.error('Failed to send session cancellation:', error);
    throw error;
  }
}
