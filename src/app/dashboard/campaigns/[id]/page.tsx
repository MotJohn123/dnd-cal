'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, Calendar, MapPin, Clock, Plus, Edit, Trash2, X } from 'lucide-react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { EditCampaignModal, EditSessionModal, UniqueDatesModal } from '@/components/CampaignModals';

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
  campaignId: string | { _id: string; name: string };
  name?: string;
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
  const [uniqueDates, setUniqueDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showEditCampaignModal, setShowEditCampaignModal] = useState(false);
  const [showEditSessionModal, setShowEditSessionModal] = useState(false);
  const [showUniqueDatesModal, setShowUniqueDatesModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

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
      
      const [campaignRes, sessionsRes, availRes, uniqueDatesRes] = await Promise.all([
        fetch(`/api/campaigns/${params.id}`),
        fetch(`/api/sessions?campaignId=${params.id}`),
        fetch(`/api/availability/campaign/${params.id}?startDate=${today.toISOString()}&endDate=${next30Days.toISOString()}`),
        fetch(`/api/campaigns/${params.id}/unique-dates`),
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
        // API returns 'availability' not 'availabilities'
        setAvailabilities(availData.availability || []);
      } else {
        console.error('Failed to fetch availability:', await availRes.text());
      }

      if (uniqueDatesRes.ok) {
        const uniqueDatesData = await uniqueDatesRes.json();
        setUniqueDates(uniqueDatesData.uniqueDates.map((d: string) => new Date(d)));
      }
    } catch (error) {
      console.error('Error fetching campaign details:', error);
    } finally {
      setLoading(false);
    }
  };

  const isDM = session?.user?.id === campaign?.dmId._id;

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to cancel this session? All players will be notified.')) {
      return;
    }

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Session cancelled successfully. Players have been notified.');
        fetchCampaignDetails();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to cancel session');
      }
    } catch (error) {
      console.error('Error cancelling session:', error);
      alert('Failed to cancel session');
    }
  };

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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Campaign Details</h2>
                {isDM && (
                  <button
                    onClick={() => setShowEditCampaignModal(true)}
                    className="text-purple-600 hover:text-purple-700 transition"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                )}
              </div>
              
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
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-500">Special Dates</p>
                    {isDM && (
                      <button
                        onClick={() => setShowUniqueDatesModal(true)}
                        className="text-purple-600 hover:text-purple-700 text-xs px-2 py-1"
                      >
                        <Plus className="w-4 h-4 inline" /> Add
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {uniqueDates.length > 0 ? (
                      uniqueDates.map((date, idx) => (
                        <div key={idx} className="text-sm text-gray-700 flex items-center justify-between bg-blue-50 px-2 py-1 rounded">
                          <span>📅 {format(new Date(date), 'dd/MM/yyyy')}</span>
                          {isDM && (
                            <button
                              onClick={async () => {
                                try {
                                  await fetch(`/api/campaigns/${params.id}/unique-dates`, {
                                    method: 'DELETE',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      date: format(new Date(date), 'yyyy-MM-dd'),
                                    }),
                                  });
                                  fetchCampaignDetails();
                                } catch (error) {
                                  console.error('Error removing unique date:', error);
                                }
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No special dates</p>
                    )}
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
              {sessions.filter(s => {
                const cId = typeof s.campaignId === 'object' ? s.campaignId._id : s.campaignId;
                return cId === campaign._id;
              }).length === 0 ? (
                <p className="text-gray-600 text-sm">No sessions scheduled yet</p>
              ) : (
                <div className="space-y-3">
                  {sessions.filter(s => {
                    const cId = typeof s.campaignId === 'object' ? s.campaignId._id : s.campaignId;
                    return cId === campaign._id;
                  }).map((session) => (
                    <div key={session._id} className="border-l-4 border-purple-600 pl-3 pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {session.name || 'Session'}
                          </p>
                          <p className="text-sm text-gray-700">
                            {format(parseISO(session.date), 'dd/MM/yyyy')}
                          </p>
                          <p className="text-sm text-gray-600">{session.time}</p>
                          <p className="text-sm text-gray-600">{session.location}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {session.confirmedPlayerIds.length} players confirmed
                          </p>
                        </div>
                        {isDM && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedSession(session);
                                setShowEditSessionModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-700 transition"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSession(session._id)}
                              className="text-red-600 hover:text-red-700 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
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
                sessions={sessions}
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

      {/* Edit Campaign Modal */}
      {showEditCampaignModal && (
        <EditCampaignModal
          campaign={campaign}
          onClose={() => setShowEditCampaignModal(false)}
          onSuccess={() => {
            setShowEditCampaignModal(false);
            fetchCampaignDetails();
          }}
        />
      )}

      {/* Edit Session Modal */}
      {showEditSessionModal && selectedSession && (
        <EditSessionModal
          session={selectedSession}
          campaign={campaign}
          onClose={() => {
            setShowEditSessionModal(false);
            setSelectedSession(null);
          }}
          onSuccess={() => {
            setShowEditSessionModal(false);
            setSelectedSession(null);
            fetchCampaignDetails();
          }}
        />
      )}

      {/* Unique Dates Modal */}
      {showUniqueDatesModal && (
        <UniqueDatesModal
          campaignId={params.id as string}
          onClose={() => setShowUniqueDatesModal(false)}
          onSuccess={() => {
            setShowUniqueDatesModal(false);
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
  sessions,
}: {
  campaign: Campaign;
  availabilities: AvailabilityRecord[];
  sessions: Session[];
}) {
  const [daysToShow, setDaysToShow] = useState(60); // Start with 60 days
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  
  const today = new Date();
  const futureDays = eachDayOfInterval({
    start: today,
    end: addDays(today, daysToShow),
  }).filter((date) => {
    const dayName = format(date, 'EEEE');
    return campaign.availableDays.includes(dayName);
  });

  console.log('AvailabilityGrid - Total availabilities:', availabilities.length);
  console.log('AvailabilityGrid - Sample availability:', availabilities[0]);
  console.log('AvailabilityGrid - Players:', campaign.playerIds.map(p => ({ id: p._id, name: p.username })));

  // Check if there's a session on a specific date
  const getSessionForDate = (date: Date) => {
    return sessions.find((s) => isSameDay(parseISO(s.date), date));
  };
  const getStatusForPlayerAndDate = (userId: string, date: Date) => {
    const avail = availabilities.find((a) => {
      const availUserId = typeof a.userId === 'object' ? a.userId._id : a.userId;
      return availUserId === userId && isSameDay(parseISO(a.date), date);
    });
    return avail?.status || "Don't know";
  };

  const getPlayersAvailableForDate = (date: Date) => {
    // Cache status lookups to avoid multiple calls per player
    const playerStatuses = campaign.playerIds.map(player => ({
      player,
      status: getStatusForPlayerAndDate(player._id, date)
    }));
    
    const available = playerStatuses.filter(ps => ps.status === 'Sure').length;
    const maybe = playerStatuses.filter(ps => ps.status === 'Maybe').length;
    const notAvailable = playerStatuses.filter(ps => ps.status === 'Not available').length;
    
    return { available, maybe, notAvailable, total: campaign.playerIds.length };
  };

  const handleDateClick = (date: Date) => {
    // Don't allow scheduling if there's already a session
    const existingSession = getSessionForDate(date);
    if (existingSession) {
      return; // Column is locked
    }
    setSelectedDate(date);
    setShowScheduleModal(true);
  };

  const statusColors = {
    Sure: 'bg-green-200 text-green-800',
    Maybe: 'bg-yellow-200 text-yellow-800',
    'Not available': 'bg-red-200 text-red-800',
    "Don't know": 'bg-gray-200 text-gray-800',
  };

  return (
    <>
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing next {futureDays.length} campaign days
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setDaysToShow(Math.max(30, daysToShow - 30))}
              disabled={daysToShow <= 30}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Show Less
            </button>
            <button
              onClick={() => setDaysToShow(daysToShow + 30)}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              Show More (+30 days)
            </button>
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                  Player
                </th>
                {futureDays.map((date) => {
                  const stats = getPlayersAvailableForDate(date);
                  const session = getSessionForDate(date);
                  const isLocked = !!session;
                  
                  return (
                    <th
                      key={date.toISOString()}
                      onClick={() => handleDateClick(date)}
                      className={`px-2 py-2 text-center text-xs font-medium uppercase tracking-wider transition ${
                        isLocked
                          ? 'bg-purple-200 cursor-not-allowed'
                          : 'text-gray-500 cursor-pointer hover:bg-purple-50'
                      }`}
                      title={
                        isLocked
                          ? `Session scheduled at ${session.time}\nLocation: ${session.location}`
                          : `Click to schedule session\n${stats.available} available, ${stats.maybe} maybe, ${stats.notAvailable} not available`
                      }
                    >
                      <div>{format(date, 'EEE')}</div>
                      <div className="font-bold">{format(date, 'dd/MM')}</div>
                      {isLocked ? (
                        <div className="text-[10px] text-purple-800 font-bold">
                          🎲 {session.time}
                        </div>
                      ) : (
                        <div className="text-[10px] text-green-600 font-semibold">
                          {stats.available}/{stats.total} ✓
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {campaign.playerIds.map((player) => (
                <tr key={player._id}>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                    {player.username}
                  </td>
                  {futureDays.map((date) => {
                    const status = getStatusForPlayerAndDate(player._id, date);
                    const session = getSessionForDate(date);
                    const isLocked = !!session;
                    
                    return (
                      <td 
                        key={date.toISOString()} 
                        className={`px-2 py-2 transition ${
                          isLocked
                            ? 'bg-purple-100 cursor-not-allowed'
                            : 'cursor-pointer hover:ring-2 hover:ring-purple-400 hover:ring-inset'
                        }`}
                        onClick={() => handleDateClick(date)}
                      >
                        <div
                          className={`text-xs px-2 py-1 rounded text-center ${
                            isLocked
                              ? 'bg-purple-300 text-purple-900 font-bold'
                              : statusColors[status as keyof typeof statusColors]
                          }`}
                        >
                          {isLocked ? '🎲' : status === 'Sure' ? '✓' : status === 'Maybe' ? '?' : status === 'Not available' ? '✗' : '−'}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded p-3">
          💡 <strong>Tip:</strong> Click on any date column header or cell to schedule a session for that day.
          <strong className="text-purple-600"> Purple columns with 🎲</strong> indicate scheduled sessions (locked).
          The green numbers show how many players confirmed they&apos;re available.
        </div>
      </div>

      {/* Quick Schedule Modal */}
      {showScheduleModal && selectedDate && (
        <QuickScheduleModal
          campaign={campaign}
          selectedDate={selectedDate}
          onClose={() => {
            setShowScheduleModal(false);
            setSelectedDate(null);
          }}
          onSuccess={() => {
            setShowScheduleModal(false);
            setSelectedDate(null);
            window.location.reload(); // Reload to show new session
          }}
        />
      )}
    </>
  );
}

function QuickScheduleModal({
  campaign,
  selectedDate,
  onClose,
  onSuccess,
}: {
  campaign: Campaign;
  selectedDate: Date;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [time, setTime] = useState('19:00');
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
          name: name || undefined,
          date: format(selectedDate, 'yyyy-MM-dd'),
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
              Session Name <span className="text-gray-400">(Optional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., The Dragon's Lair, Session 5"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="text"
              value={format(selectedDate, 'EEEE, dd/MM/yyyy')}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700 font-semibold"
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
              Time (Prague/Berlin timezone - CET/CEST)
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
