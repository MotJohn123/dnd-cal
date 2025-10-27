'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';

type AvailabilityStatus = "Don't know" | 'Sure' | 'Maybe' | 'Not available';

interface Availability {
  _id: string;
  date: string;
  status: AvailabilityStatus;
}

interface Campaign {
  _id: string;
  name: string;
  dmId: { _id: string };
  playerIds: { _id: string }[];
  availableDays: string[];
  uniqueDates?: string[];
}

interface Session {
  _id: string;
  campaignId: { _id: string; name: string };
  date: string;
  time: string;
  location: string;
}

export default function CalendarPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session, currentMonth]);

  const fetchData = async () => {
    try {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);

      const [availRes, campaignsRes, sessionsRes] = await Promise.all([
        fetch(`/api/availability?startDate=${start.toISOString()}&endDate=${end.toISOString()}`),
        fetch('/api/campaigns'),
        fetch('/api/sessions'),
      ]);

      if (availRes.ok) {
        const data = await availRes.json();
        setAvailability(data.availability);
      }

      if (campaignsRes.ok) {
        const data = await campaignsRes.json();
        // Filter out campaigns where the user is DM - DM doesn't need to set availability
        const playerCampaigns = data.campaigns.filter((c: Campaign) => 
          c.dmId._id !== session?.user?.id
        );
        setCampaigns(playerCampaigns);
      }

      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setDayAvailability = async (date: Date, status: AvailabilityStatus) => {
    try {
      const response = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: date.toISOString(),
          status,
        }),
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error setting availability:', error);
    }
  };

  const getCampaignsForDay = (date: Date): Campaign[] => {
    const dayName = format(date, 'EEEE');
    const dateString = format(date, 'yyyy-MM-dd');
    return campaigns.filter((c) => 
      c.availableDays.includes(dayName) || (c.uniqueDates?.includes(dateString))
    );
  };

  const getSessionsForDate = (date: Date): Session[] => {
    return sessions.filter((s) => isSameDay(new Date(s.date), date));
  };

  const getAvailabilityForDate = (date: Date): AvailabilityStatus => {
    const avail = availability.find((a) =>
      isSameDay(new Date(a.date), date)
    );
    return avail?.status || "Don't know";
  };

  const getStatusColor = (status: AvailabilityStatus) => {
    switch (status) {
      case 'Sure':
        return 'bg-green-500 hover:bg-green-600';
      case 'Maybe':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'Not available':
        return 'bg-red-500 hover:bg-red-600';
      default:
        return 'bg-gray-300 hover:bg-gray-400';
    }
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Add empty cells for days before the start of the month
    const startDay = monthStart.getDay();
    const emptyCells = Array(startDay === 0 ? 6 : startDay - 1).fill(null);

    return (
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {/* Day headers */}
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="text-center font-semibold text-xs sm:text-sm text-gray-700 py-1 sm:py-2">
            {day}
          </div>
        ))}

        {/* Empty cells */}
        {emptyCells.map((_, index) => (
          <div key={`empty-${index}`} className="aspect-square" />
        ))}

        {/* Calendar days */}
        {days.map((day) => {
          const status = getAvailabilityForDate(day);
          const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));
          const dayCampaigns = getCampaignsForDay(day);
          const daySessions = getSessionsForDate(day);
          const hasCampaigns = dayCampaigns.length > 0;
          const hasSessions = daySessions.length > 0;
          const canEdit = !isPast && hasCampaigns && !hasSessions;

          return (
            <div key={day.toISOString()} className="aspect-square">
              <div className={`h-full flex flex-col p-0.5 sm:p-1 border rounded sm:border-2 text-xs sm:text-sm ${
                hasSessions 
                  ? 'border-purple-600 bg-purple-200' 
                  : hasCampaigns 
                  ? 'border-purple-400 bg-purple-50' 
                  : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="text-xs sm:text-sm text-gray-600 text-center mb-0.5 sm:mb-1 flex items-center justify-center gap-0.5 sm:gap-1">
                  {format(day, 'd')}
                  {hasCampaigns && !hasSessions && (
                    <span className="text-[9px] sm:text-xs text-purple-600 font-bold" title={dayCampaigns.map(c => c.name).join(', ')}>
                      ({dayCampaigns.length})
                    </span>
                  )}
                  {hasSessions && (
                    <span className="text-[9px] sm:text-xs text-purple-900 font-bold" title={daySessions.map(s => `${s.campaignId.name} at ${s.time}`).join('\n')}>
                      🎲
                    </span>
                  )}
                </div>
                
                {/* Show sessions */}
                {hasSessions && (
                  <div className="flex-1 overflow-y-auto space-y-0.5 sm:space-y-1">
                    {daySessions.map((session) => (
                      <div
                        key={session._id}
                        className="bg-purple-600 text-white text-[8px] sm:text-[10px] px-0.5 sm:px-1 py-0.5 rounded"
                        title={`${session.campaignId.name}\n${session.time}\n${session.location}`}
                      >
                        <div className="font-bold truncate">{session.campaignId.name}</div>
                        <div className="hidden sm:block">{session.time}</div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Edit availability */}
                {canEdit && (
                  <select
                    value={status}
                    onChange={(e) => setDayAvailability(day, e.target.value as AvailabilityStatus)}
                    className={`flex-1 text-xs sm:text-sm rounded border-0 text-white text-center cursor-pointer ${getStatusColor(status)}`}
                  >
                    <option value="Don't know">?</option>
                    <option value="Sure">✓</option>
                    <option value="Maybe">~</option>
                    <option value="Not available">✗</option>
                  </select>
                )}
                
                {/* Past days */}
                {isPast && !hasSessions && (
                  <div className="flex-1 bg-gray-100 rounded flex items-center justify-center text-[9px] sm:text-xs text-gray-400">
                    Past
                  </div>
                )}
                
                {/* Non-campaign days */}
                {!isPast && !hasCampaigns && !hasSessions && (
                  <div className="flex-1 bg-gray-200 rounded flex items-center justify-center text-[9px] sm:text-xs text-gray-500">
                    −
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">My Availability</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="bg-white rounded-lg shadow p-3 sm:p-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <ChevronLeft className="w-5 sm:w-6 h-5 sm:h-6 text-gray-600" />
            </button>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <ChevronRight className="w-5 sm:w-6 h-5 sm:h-6 text-gray-600" />
            </button>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 sm:gap-4 mb-4 sm:mb-6 pb-4 sm:pb-6 border-b">
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-4 sm:w-6 h-4 sm:h-6 bg-purple-200 border-2 border-purple-600 rounded"></div>
              <span className="text-xs sm:text-sm text-gray-700"><strong>Session 🎲</strong></span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-4 sm:w-6 h-4 sm:h-6 bg-green-500 rounded"></div>
              <span className="text-xs sm:text-sm text-gray-700">Sure (✓)</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-4 sm:w-6 h-4 sm:h-6 bg-yellow-500 rounded"></div>
              <span className="text-xs sm:text-sm text-gray-700">Maybe (~)</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-4 sm:w-6 h-4 sm:h-6 bg-red-500 rounded"></div>
              <span className="text-xs sm:text-sm text-gray-700">Not (✗)</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-4 sm:w-6 h-4 sm:h-6 bg-gray-300 rounded"></div>
              <span className="text-xs sm:text-sm text-gray-700">? (?)</span>
            </div>
          </div>

          {/* Calendar */}
          {renderCalendar()}

          {/* Info */}
          <div className="mt-6 pt-6 border-t space-y-3">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 border-2 border-purple-600 bg-purple-200 rounded flex-shrink-0"></div>
              <p className="text-sm text-gray-600">
                <strong>Dark purple days with 🎲</strong> show scheduled sessions. Hover to see campaign name, time, and location. You cannot edit availability on session days.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 border-2 border-purple-400 bg-purple-50 rounded flex-shrink-0"></div>
              <p className="text-sm text-gray-600">
                <strong>Light purple bordered days</strong> are campaign days where you can set your availability. The number shows how many campaigns have sessions on that day of the week.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 border-2 border-gray-200 bg-gray-50 rounded flex-shrink-0"></div>
              <p className="text-sm text-gray-600">
                <strong>Gray days</strong> are not part of any campaign schedule. You cannot set availability for these days.
              </p>
            </div>
            <p className="text-sm text-gray-600">
              💡 <strong>Tip:</strong> When a session is scheduled, that day is automatically marked as &quot;Not available&quot; for all your other campaigns!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
