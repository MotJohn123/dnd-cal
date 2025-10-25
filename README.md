# DnD Calendar - TTRPG Session Scheduler

A web application for organizing and scheduling TTRPG (Tabletop Role-Playing Game) sessions across multiple campaigns with intelligent availability tracking and automatic calendar integration.

## Features

- **User Authentication**: Secure registration and login system with email and password
- **Multiple Campaign Management**: Create and manage multiple campaigns as a Dungeon Master (DM)
- **Player Assignment**: Select players from registered users for each campaign
- **Availability Tracking**: Players set their availability once, visible across all campaigns
- **Smart Scheduling**: DMs see all player availability before scheduling sessions
- **Automatic Conflict Prevention**: When a session is confirmed, players are marked unavailable on that date in other campaigns
- **Email Notifications**: Automatic email invitations when sessions are scheduled
- **Google Calendar Integration**: Sessions automatically added to players' Google Calendars
- **Campaign-Specific Days**: Set which days of the week each campaign can occur

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (serverless functions)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: NextAuth.js with credentials provider
- **Email**: Nodemailer
- **Calendar**: Google Calendar API
- **Deployment**: Vercel (recommended)

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- MongoDB database (local or MongoDB Atlas)
- Gmail account (for email notifications)
- Google Cloud project (for Calendar API)

### Installation

1. **Clone the repository or extract the files**

2. **Install dependencies**:
   ```powershell
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**:
   - Copy `.env.example` to `.env`
   - Fill in all required values (see Configuration section below)

4. **Run the development server**:
   ```powershell
   npm run dev
   ```

5. **Open your browser** to [http://localhost:3000](http://localhost:3000)

## Configuration

### MongoDB Setup

**Option 1: MongoDB Atlas (Cloud)**
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Get your connection string
4. Add to `.env`: `MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dnd-calendar`

**Option 2: Local MongoDB**
1. Install MongoDB Community Edition
2. Start MongoDB service
3. Add to `.env`: `MONGODB_URI=mongodb://localhost:27017/dnd-calendar`

### NextAuth Setup

Generate a secret key:
```powershell
# Using PowerShell
$bytes = New-Object byte[] 32
[Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

Add to `.env`:
```
NEXTAUTH_SECRET=your-generated-secret
NEXTAUTH_URL=http://localhost:3000
```

### Email Setup (Gmail)

1. Go to your Google Account settings
2. Enable 2-Factor Authentication
3. Generate an App Password (Security > 2-Step Verification > App passwords)
4. Add to `.env`:
   ```
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   EMAIL_FROM=DnD Calendar <your-email@gmail.com>
   ```

### Google Calendar API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials:
   - Go to APIs & Services > Credentials
   - Create OAuth 2.0 Client ID
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Add to `.env`:
   ```
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google
   ```

## Usage Guide

### For Dungeon Masters (DMs)

1. **Register/Login** to your account
2. **Create a Campaign**:
   - Navigate to Dashboard
   - Click "Create Campaign"
   - Enter campaign name and description
   - Select which days of the week the campaign can occur
   - Add players from the user list
3. **View Player Availability**:
   - Open your campaign
   - View the calendar with all player availability
   - Colors indicate: Sure (green), Maybe (yellow), Not available (red), Don't know (gray)
4. **Schedule a Session**:
   - Select a date with good availability
   - Set the time and location
   - Confirm - all players receive email and calendar invites automatically

### For Players

1. **Register/Login** to your account
2. **Set Your Availability**:
   - Go to your personal calendar
   - Click on days to set availability (Sure, Maybe, Not available)
   - Your availability applies to all campaigns you're in
3. **View Campaigns**:
   - See all campaigns you're part of
   - View upcoming sessions
   - Check your calendar for scheduled games

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login (handled by NextAuth)

### Campaigns
- `GET /api/campaigns` - Get all campaigns for user
- `POST /api/campaigns` - Create new campaign (DM only)
- `GET /api/campaigns/[id]` - Get campaign details
- `PATCH /api/campaigns/[id]` - Update campaign (DM only)
- `DELETE /api/campaigns/[id]` - Delete campaign (DM only)

### Availability
- `GET /api/availability` - Get user's availability
- `POST /api/availability` - Set availability for a date
- `GET /api/availability/campaign/[id]` - Get availability for all players in campaign

### Sessions
- `GET /api/sessions` - Get all sessions for user's campaigns
- `POST /api/sessions` - Create new session (DM only)

### Users
- `GET /api/users` - Get all users (for player selection)

## Database Models

### User
```typescript
{
  username: string (unique)
  email: string (unique)
  password: string (hashed)
  createdAt: Date
  updatedAt: Date
}
```

### Campaign
```typescript
{
  name: string
  dmId: ObjectId (ref: User)
  playerIds: ObjectId[] (ref: User)
  availableDays: ('Monday' | 'Tuesday' | ... | 'Sunday')[]
  description?: string
  createdAt: Date
  updatedAt: Date
}
```

### Availability
```typescript
{
  userId: ObjectId (ref: User)
  date: Date
  status: 'Don\'t know' | 'Sure' | 'Maybe' | 'Not available'
  createdAt: Date
  updatedAt: Date
}
```

### Session
```typescript
{
  campaignId: ObjectId (ref: Campaign)
  date: Date
  time: string (HH:MM format)
  location: string
  confirmedPlayerIds: ObjectId[] (ref: User)
  googleEventId?: string
  createdAt: Date
  updatedAt: Date
}
```

## Deployment to Vercel

1. **Push your code to GitHub/GitLab/Bitbucket**

2. **Connect to Vercel**:
   - Go to [Vercel](https://vercel.com)
   - Import your repository
   - Vercel auto-detects Next.js configuration

3. **Add Environment Variables**:
   - In Vercel project settings, add all variables from `.env`
   - Update `NEXTAUTH_URL` to your production domain
   - Update Google OAuth redirect URI to production URL

4. **Deploy**:
   - Vercel automatically deploys on push to main branch
   - Each deployment gets a unique preview URL

## Security Considerations

- Passwords are hashed with bcrypt (12 salt rounds)
- NextAuth.js handles session management with JWT
- API routes verify authentication before processing requests
- Users can only access campaigns they're part of
- Only DMs can create/update/delete their campaigns
- MongoDB queries use proper access control

## Future Enhancements

- [ ] OAuth login (Google, Discord, etc.)
- [ ] Recurring session scheduling
- [ ] Session notes and recap features
- [ ] Character management per campaign
- [ ] Push notifications for mobile
- [ ] Dark mode toggle
- [ ] Multi-language support
- [ ] Campaign invite links
- [ ] Session reminders (24h, 1h before)
- [ ] Availability patterns (copy week to week)

## Troubleshooting

### PowerShell Script Execution Error
If you get a script execution error when running npm commands:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### MongoDB Connection Issues
- Verify connection string format
- Check IP whitelist in MongoDB Atlas
- Ensure MongoDB service is running (local)

### Email Not Sending
- Verify Gmail App Password (not regular password)
- Check 2FA is enabled on Google account
- Ensure "Less secure app access" is OFF (use App Passwords instead)

### Google Calendar Not Working
- Verify OAuth credentials are correct
- Check redirect URI matches exactly
- Ensure Calendar API is enabled in Google Cloud Console

## License

This project is open source and available for personal and educational use.

## Support

For issues, questions, or contributions, please open an issue on the project repository.

---

**Built with ❤️ for TTRPG enthusiasts**
