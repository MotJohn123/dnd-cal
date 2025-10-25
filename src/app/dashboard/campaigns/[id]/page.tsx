'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, Calendar, MapPin, Clock, Plus } from 'lucide-react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';

interface Campaign {
  _id: string;
  name: string;
  dmId: { _id: string; username: string };
  playerIds: { _id: string; username: string; email: string }[];
  availableDays: string[];
  description?: string;
}

interface Session {
  _id: string;
  campaignId: string;
  date: string;
  time: string;
  location: string;
  confirmedPlayerIds: { _id: string; username: string }[];
}

interface AvailabilityRecord {
  _id: string;
  userId: { _id: string; username: string; email: string };
  date: string;
  status: string;
}

export default function CampaignDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [availabilities, setAvailabilities] = useState<AvailabilityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session && params.id) {
      fetchCampaignDetails();
    }
  }, [session, params.id]);

  const fetchCampaignDetails = async () => {
    try {
      const today = new Date();
      const next30Days = addDays(today, 30);
      
      const [campaignRes, sessionsRes, availRes] = await Promise.all([
        fetch(`/api/campaigns/${params.id}`),
        fetch(`/api/sessions?campaignId=${params.id}`),
        fetch(`/api/availability/campaign/${params.id}?startDate=${today.toISOString()}&endDate=${next30Days.toISOString()}`),
      ]);

      if (campaignRes.ok) {
        const campaignData = await campaignRes.json();
        setCampaign(campaignData.campaign);
      }

      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setSessions(sessionsData.sessions);
      }

      if (availRes.ok) {
        const availData = await availRes.json();
        console.log('Availability data received:', availData);
        setAvailabilities(availData.availabilities || []);
      } else {
        console.error('Failed to fetch availability:', await availRes.text());
      }
    } catch (error) {
      console.error('Error fetching campaign details:', error);
    } finally {
      setLoading(false);
    }
  };

  const isDM = session?.user?.id === campaign?.dmId._id;

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Campaign not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/campaigns" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
              <p className="text-sm text-gray-600">
                DM: {campaign.dmId.username} • {campaign.playerIds.length} players
              </p>
            </div>
            {isDM && (
              <button
                onClick={() => setShowScheduleModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition"
              >
                <Plus className="w-4 h-4" />
                Schedule Session
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Campaign Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Campaign Details</h2>
              
              {campaign.description && (
                <div className="mb-4">
                  <p className="text-gray-700">{campaign.description}</p>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">Available Days</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {campaign.availableDays.map((day) => (
                      <span key={day} className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                        {day}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Players</p>
                  <div className="space-y-1">
                    {campaign.playerIds.map((player) => (
                      <div key={player._id} className="text-sm text-gray-700">
                        • {player.username}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming Sessions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Sessions</h2>
              {sessions.length === 0 ? (
                <p className="text-gray-600 text-sm">No sessions scheduled yet</p>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div key={session._id} className="border-l-4 border-purple-600 pl-3">
                      <p className="font-medium text-gray-900">
                        {format(parseISO(session.date), 'MMM d, yyyy')}
                      </p>
                      <p className="text-sm text-gray-600">{session.time}</p>
                      <p className="text-sm text-gray-600">{session.location}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {session.confirmedPlayerIds.length} players confirmed
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Player Availability Grid */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Player Availability (Next 30 Days - Campaign Days Only)
              </h2>
              <AvailabilityGrid
                campaign={campaign}
                availabilities={availabilities}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Schedule Session Modal */}
      {showScheduleModal && (
        <ScheduleSessionModal
          campaign={campaign}
          onClose={() => setShowScheduleModal(false)}
          onSuccess={() => {
            setShowScheduleModal(false);
            fetchCampaignDetails();
          }}
        />
      )}
    </div>
  );
}

function AvailabilityGrid({
  campaign,
  availabilities,
}: {
  campaign: Campaign;
  availabilities: AvailabilityRecord[];
}) {
  const today = new Date();
  const next30Days = eachDayOfInterval({
    start: today,
    end: addDays(today, 30),
  }).filter((date) => {
    const dayName = format(date, 'EEEE');
    return campaign.availableDays.includes(dayName);
  });

  console.log('AvailabilityGrid - Total availabilities:', availabilities.length);
  console.log('AvailabilityGrid - Sample availability:', availabilities[0]);
  console.log('AvailabilityGrid - Players:', campaign.playerIds.map(p => ({ id: p._id, name: p.username })));

  const getStatusForPlayerAndDate = (userId: string, date: Date) => {
    const avail = availabilities.find((a) => {
      const availUserId = typeof a.userId === 'object' ? a.userId._id : a.userId;
      const matches = availUserId === userId && isSameDay(parseISO(a.date), date);
      if (matches) {
        console.log('Found match:', { userId, date: format(date, 'yyyy-MM-dd'), status: a.status });
      }
      return matches;
    });
    return avail?.status || "Don't know";
  };

  const statusColors = {
    Sure: 'bg-green-200 text-green-800',
    Maybe: 'bg-yellow-200 text-yellow-800',
    'Not available': 'bg-red-200 text-red-800',
    "Don't know": 'bg-gray-200 text-gray-800',
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
              Player
            </th>
            {next30Days.map((date) => (
              <th
                key={date.toISOString()}
                className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                <div>{format(date, 'EEE')}</div>
                <div>{format(date, 'M/d')}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {campaign.playerIds.map((player) => (
            <tr key={player._id}>
              <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white">
                {player.username}
              </td>
              {next30Days.map((date) => {
                const status = getStatusForPlayerAndDate(player._id, date);
                return (
                  <td key={date.toISOString()} className="px-2 py-2">
                    <div
                      className={`text-xs px-2 py-1 rounded text-center ${
                        statusColors[status as keyof typeof statusColors]
                      }`}
                    >
                      {status === 'Sure' ? '✓' : status === 'Maybe' ? '?' : status === 'Not available' ? '✗' : '−'}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScheduleSessionModal({
  campaign,
  onClose,
  onSuccess,
}: {
  campaign: Campaign;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign._id,
          date,
          time,
          location,
          confirmedPlayerIds: campaign.playerIds.map((p) => p._id),
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to schedule session');
      }
    } catch (error) {
      console.error('Error scheduling session:', error);
      alert('Failed to schedule session');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Schedule Session</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., John's house, Roll20, Discord"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
              required
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">
              All {campaign.playerIds.length} players will be added and receive email notifications.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? 'Scheduling...' : 'Schedule Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
