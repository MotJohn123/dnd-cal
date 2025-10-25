# DnD Calendar - TTRPG Session Scheduler

This is a Next.js application for scheduling TTRPG campaigns with MongoDB, NextAuth, and Google Calendar integration.

## Project Structure

- `/src/app` - Next.js App Router pages and API routes
- `/src/components` - React components
- `/src/models` - Mongoose database models
- `/src/lib` - Utility functions and configurations

## Key Features

- User authentication with NextAuth.js
- Campaign management (DMs can create campaigns and add players)
- Availability tracking (players set availability once, synced across campaigns)
- Session scheduling with email and Google Calendar integration
- Automatic conflict prevention

## Development Commands

- `npm run dev` - Start development server on http://localhost:3000
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Environment Setup

Copy `.env.example` to `.env` and configure all required values.

## Database Models

- **User**: Username, email, password (hashed)
- **Campaign**: Name, DM, players, available days, description
- **Availability**: User, date, status (Don't know, Sure, Maybe, Not available)
- **Session**: Campaign, date, time, location, confirmed players, Google event ID

## API Documentation

See README.md for full API endpoint documentation.
