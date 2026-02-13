import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Availability from '@/models/Availability';
import Campaign from '@/models/Campaign';
import Session from '@/models/Session';
import { parseDateInPrague, getDateStringInPrague, APP_TIMEZONE } from '@/lib/timezone';
import { formatInTimeZone } from 'date-fns-tz';

/**
 * POST /api/admin/migrate-dates - Migrate old dates stored as UTC midnight to Prague midnight
 * 
 * Old data problem: dates like "2026-02-13" were stored as 2026-02-13T00:00:00.000Z (UTC midnight)
 * New correct format: 2026-02-13 should be stored as 2026-02-12T23:00:00.000Z (Prague midnight in UTC, CET)
 * 
 * This migration detects dates at exact UTC midnight (HH:MM:SS = 00:00:00) that are NOT
 * already Prague-midnight-shifted, and re-stores them correctly.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const results = {
      availability: { checked: 0, migrated: 0, errors: 0, details: [] as string[] },
      campaigns: { checked: 0, migrated: 0, errors: 0, details: [] as string[] },
      sessions: { checked: 0, migrated: 0, errors: 0, details: [] as string[] },
    };

    // --- Migrate Availability dates ---
    const allAvailability = await Availability.find({});
    results.availability.checked = allAvailability.length;

    for (const avail of allAvailability) {
      try {
        const date = new Date(avail.date);
        // Check if this date is at exact UTC midnight (old format)
        // Old format: 2026-02-13T00:00:00.000Z means user meant Feb 13
        // New format: 2026-02-12T23:00:00.000Z (CET) or 2026-02-12T22:00:00.000Z (CEST) means user meant Feb 13
        const hours = date.getUTCHours();
        const minutes = date.getUTCMinutes();
        const seconds = date.getUTCSeconds();
        const ms = date.getUTCMilliseconds();
        
        if (hours === 0 && minutes === 0 && seconds === 0 && ms === 0) {
          // This is old format (UTC midnight) - the UTC date IS the intended date
          const intendedDateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
          const correctedDate = parseDateInPrague(intendedDateStr);
          
          // Only migrate if the dates are actually different
          if (date.getTime() !== correctedDate.getTime()) {
            // Check if there's already a correct record for this user+date
            const existing = await Availability.findOne({
              userId: avail.userId,
              date: correctedDate,
              _id: { $ne: avail._id },
            });

            if (existing) {
              // A correct record already exists, remove the old one
              await Availability.deleteOne({ _id: avail._id });
              results.availability.details.push(`Deleted duplicate old record for ${intendedDateStr} (user ${avail.userId})`);
            } else {
              avail.date = correctedDate;
              await avail.save();
              results.availability.details.push(`Migrated ${intendedDateStr} for user ${avail.userId}`);
            }
            results.availability.migrated++;
          }
        }
      } catch (err: any) {
        results.availability.errors++;
        results.availability.details.push(`Error: ${err.message}`);
      }
    }

    // --- Migrate Campaign uniqueDates ---
    const allCampaigns = await Campaign.find({ uniqueDates: { $exists: true, $ne: [] } });
    results.campaigns.checked = allCampaigns.length;

    for (const campaign of allCampaigns) {
      try {
        let changed = false;
        const newDates: Date[] = [];

        for (const d of campaign.uniqueDates) {
          const date = new Date(d);
          const hours = date.getUTCHours();
          const minutes = date.getUTCMinutes();
          const seconds = date.getUTCSeconds();
          const ms = date.getUTCMilliseconds();

          if (hours === 0 && minutes === 0 && seconds === 0 && ms === 0) {
            const intendedDateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
            const correctedDate = parseDateInPrague(intendedDateStr);
            
            if (date.getTime() !== correctedDate.getTime()) {
              newDates.push(correctedDate);
              changed = true;
              results.campaigns.details.push(`Campaign ${campaign.name}: migrated unique date ${intendedDateStr}`);
            } else {
              newDates.push(date);
            }
          } else {
            newDates.push(date);
          }
        }

        if (changed) {
          // Deduplicate by Prague date string
          const seen = new Set<string>();
          const dedupedDates: Date[] = [];
          for (const d of newDates) {
            const key = getDateStringInPrague(d);
            if (!seen.has(key)) {
              seen.add(key);
              dedupedDates.push(d);
            }
          }
          campaign.uniqueDates = dedupedDates;
          await campaign.save();
          results.campaigns.migrated++;
        }
      } catch (err: any) {
        results.campaigns.errors++;
        results.campaigns.details.push(`Error: ${err.message}`);
      }
    }

    // --- Migrate Session dates ---
    const allSessions = await Session.find({});
    results.sessions.checked = allSessions.length;

    for (const sessionDoc of allSessions) {
      try {
        const date = new Date(sessionDoc.date);
        const hours = date.getUTCHours();
        const minutes = date.getUTCMinutes();
        const seconds = date.getUTCSeconds();
        const ms = date.getUTCMilliseconds();

        if (hours === 0 && minutes === 0 && seconds === 0 && ms === 0) {
          const intendedDateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
          const correctedDate = parseDateInPrague(intendedDateStr);
          
          if (date.getTime() !== correctedDate.getTime()) {
            sessionDoc.date = correctedDate;
            await sessionDoc.save();
            results.sessions.migrated++;
            results.sessions.details.push(`Migrated session date ${intendedDateStr}`);
          }
        }
      } catch (err: any) {
        results.sessions.errors++;
        results.sessions.details.push(`Error: ${err.message}`);
      }
    }

    return NextResponse.json(
      {
        message: 'Date migration completed',
        results,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Date migration error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to migrate dates' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/migrate-dates - Preview what would be migrated (dry run)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const preview = {
      availability: [] as { id: string; userId: string; oldDate: string; newDate: string; intendedDate: string }[],
      campaigns: [] as { id: string; name: string; dates: { old: string; new: string; intended: string }[] }[],
      sessions: [] as { id: string; oldDate: string; newDate: string; intendedDate: string }[],
    };

    // Preview Availability
    const allAvailability = await Availability.find({});
    for (const avail of allAvailability) {
      const date = new Date(avail.date);
      if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0) {
        const intendedDateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
        const correctedDate = parseDateInPrague(intendedDateStr);
        if (date.getTime() !== correctedDate.getTime()) {
          preview.availability.push({
            id: String(avail._id),
            userId: avail.userId.toString(),
            oldDate: date.toISOString(),
            newDate: correctedDate.toISOString(),
            intendedDate: intendedDateStr,
          });
        }
      }
    }

    // Preview Campaign uniqueDates
    const allCampaigns = await Campaign.find({ uniqueDates: { $exists: true, $ne: [] } });
    for (const campaign of allCampaigns) {
      const datesToMigrate: { old: string; new: string; intended: string }[] = [];
      for (const d of campaign.uniqueDates) {
        const date = new Date(d);
        if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0) {
          const intendedDateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
          const correctedDate = parseDateInPrague(intendedDateStr);
          if (date.getTime() !== correctedDate.getTime()) {
            datesToMigrate.push({
              old: date.toISOString(),
              new: correctedDate.toISOString(),
              intended: intendedDateStr,
            });
          }
        }
      }
      if (datesToMigrate.length > 0) {
        preview.campaigns.push({
          id: String(campaign._id),
          name: campaign.name,
          dates: datesToMigrate,
        });
      }
    }

    // Preview Sessions
    const allSessions = await Session.find({});
    for (const sessionDoc of allSessions) {
      const date = new Date(sessionDoc.date);
      if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0) {
        const intendedDateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
        const correctedDate = parseDateInPrague(intendedDateStr);
        if (date.getTime() !== correctedDate.getTime()) {
          preview.sessions.push({
            id: String(sessionDoc._id),
            oldDate: date.toISOString(),
            newDate: correctedDate.toISOString(),
            intendedDate: intendedDateStr,
          });
        }
      }
    }

    return NextResponse.json(
      {
        message: 'Dry run - no changes made',
        wouldMigrate: {
          availability: preview.availability.length,
          campaigns: preview.campaigns.length,
          sessions: preview.sessions.length,
        },
        preview,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Date migration preview error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to preview migration' },
      { status: 500 }
    );
  }
}
