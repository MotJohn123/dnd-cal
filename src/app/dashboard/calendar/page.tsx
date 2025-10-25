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
  availableDays: string[];
}

export default function CalendarPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
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

      const [availRes, campaignsRes] = await Promise.all([
        fetch(`/api/availability?startDate=${start.toISOString()}&endDate=${end.toISOString()}`),
        fetch('/api/campaigns'),
      ]);

      if (availRes.ok) {
        const data = await availRes.json();
        setAvailability(data.availability);
      }

      if (campaignsRes.ok) {
        const data = await campaignsRes.json();
        setCampaigns(data.campaigns);
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
    return campaigns.filter((c) => c.availableDays.includes(dayName));
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
      <div className="grid grid-cols-7 gap-2">
        {/* Day headers */}
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="text-center font-semibold text-gray-700 py-2">
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
          const hasCampaigns = dayCampaigns.length > 0;
          const canEdit = !isPast && hasCampaigns;

          return (
            <div key={day.toISOString()} className="aspect-square">
              <div className={`h-full flex flex-col p-1 border-2 rounded ${hasCampaigns ? 'border-purple-400 bg-purple-50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="text-sm text-gray-600 text-center mb-1 flex items-center justify-center gap-1">
                  {format(day, 'd')}
                  {hasCampaigns && (
                    <span className="text-xs text-purple-600 font-bold" title={dayCampaigns.map(c => c.name).join(', ')}>
                      ({dayCampaigns.length})
                    </span>
                  )}
                </div>
                {canEdit && (
                  <select
                    value={status}
                    onChange={(e) => setDayAvailability(day, e.target.value as AvailabilityStatus)}
                    className={`flex-1 text-xs rounded border-0 text-white text-center cursor-pointer ${getStatusColor(status)}`}
                  >
                    <option value="Don't know">?</option>
                    <option value="Sure">✓</option>
                    <option value="Maybe">~</option>
                    <option value="Not available">✗</option>
                  </select>
                )}
                {isPast && (
                  <div className="flex-1 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">
                    Past
                  </div>
                )}
                {!isPast && !hasCampaigns && (
                  <div className="flex-1 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
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
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <ChevronLeft className="w-6 h-6 text-gray-600" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <ChevronRight className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-6 pb-6 border-b">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-700">Sure (✓)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-yellow-500 rounded"></div>
              <span className="text-sm text-gray-700">Maybe (~)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-red-500 rounded"></div>
              <span className="text-sm text-gray-700">Not available (✗)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-300 rounded"></div>
              <span className="text-sm text-gray-700">Don&apos;t know (?)</span>
            </div>
          </div>

          {/* Calendar */}
          {renderCalendar()}

          {/* Info */}
          <div className="mt-6 pt-6 border-t space-y-3">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 border-2 border-purple-400 bg-purple-50 rounded flex-shrink-0"></div>
              <p className="text-sm text-gray-600">
                <strong>Purple bordered days</strong> are campaign days where you can set your availability. The number shows how many campaigns have sessions on that day of the week.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 border-2 border-gray-200 bg-gray-50 rounded flex-shrink-0"></div>
              <p className="text-sm text-gray-600">
                <strong>Gray days</strong> are not part of any campaign schedule. You cannot set availability for these days.
              </p>
            </div>
            <p className="text-sm text-gray-600">
              💡 <strong>Tip:</strong> Your availability is shared across all campaigns. When you set your availability here,
              all DMs in your campaigns can see it. Only set availability for campaign days (purple bordered)!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
