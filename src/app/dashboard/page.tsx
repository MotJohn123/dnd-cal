'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Users, LogOut, Check, X, User, Shield } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, getDay, isBefore, isToday, startOfDay } from 'date-fns';

interface Session {
  _id: string;
  campaignId: { _id: string; name: string; emoji?: string };
  name?: string;
  date: string;
  time: string;
  location: string;
  confirmedPlayerIds: { _id: string; username: string }[];
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchSessions();
    }
  }, [session]);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/confirm`, {
        method: 'POST',
      });

      if (response.ok) {
        fetchSessions();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to confirm attendance');
      }
    } catch (error) {
      console.error('Error confirming:', error);
      alert('Failed to confirm attendance');
    }
  };

  const handleUnconfirm = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/unconfirm`, {
        method: 'POST',
      });

      if (response.ok) {
        fetchSessions();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to cancel attendance');
      }
    } catch (error) {
      console.error('Error unconfirming:', error);
      alert('Failed to cancel attendance');
    }
  };

  const isPlayerConfirmed = (sessionObj: Session) => {
    return sessionObj.confirmedPlayerIds.some(
      (player) => player._id === session?.user?.id
    );
  };

  const getCalendarDays = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    
    // Get the start of the week (Monday) for the first day of the month
    const calendarStart = startOfWeek(start, { weekStartsOn: 1 });
    // Get the end of the week (Sunday) for the last day of the month
    const calendarEnd = endOfWeek(end, { weekStartsOn: 1 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  };

  const getSessionsForDay = (day: Date) => {
    return sessions.filter((s) => isSameDay(parseISO(s.date), day));
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">DnD Calendar</h1>
            <p className="text-sm text-gray-600">Welcome, {session.user.name}!</p>
          </div>
          <div className="flex items-center gap-3">
            {(session.user as any)?.role === 'admin' && (
              <Link
                href="/admin"
                className="flex items-center gap-2 px-4 py-2 text-purple-700 hover:text-purple-900 border border-purple-300 rounded-md hover:bg-purple-50 transition"
              >
                <Shield className="w-4 h-4" />
                Admin
              </Link>
            )}
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 transition"
            >
              <User className="w-4 h-4" />
              Profile
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 transition"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Quick Links */}
          <div className="space-y-6">
            <div className="grid gap-6">
              <Link href="/dashboard/campaigns" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer">
                <Users className="w-12 h-12 text-purple-600 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">My Campaigns</h2>
                <p className="text-gray-600">View and manage your campaigns</p>
              </Link>

              <Link href="/dashboard/calendar" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer">
                <Calendar className="w-12 h-12 text-purple-600 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Availability Calendar</h2>
                <p className="text-gray-600">Set your availability and view sessions</p>
              </Link>

              <Link href="/dashboard/sessions" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer">
                <Calendar className="w-12 h-12 text-purple-600 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">All Sessions</h2>
                <p className="text-gray-600">View all scheduled sessions</p>
              </Link>
            </div>
          </div>

          {/* Calendar Preview */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  ←
                </button>
                <button
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  →
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-600">Loading sessions...</div>
            ) : (
              <div>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                    <div key={day} className="text-center text-xs font-medium text-gray-600 py-2">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {getCalendarDays().map((day, idx) => {
                    const daySessions = getSessionsForDay(day);
                    const hasSession = daySessions.length > 0;
                    const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                    const isToday_flag = isToday(day);
                    const isPast = isBefore(startOfDay(day), startOfDay(new Date())) && !isToday_flag;
                    
                    return (
                      <div
                        key={idx}
                        className={`
                          aspect-square p-1 border rounded
                          ${isToday_flag ? 'border-2 border-blue-500 bg-blue-50 font-bold' : 'border-gray-200'}
                          ${hasSession && !isPast ? 'bg-purple-50 border-purple-300' : ''}
                          ${isPast ? 'bg-gray-100 opacity-50' : ''}
                          ${!isCurrentMonth ? 'opacity-30' : ''}
                        `}
                      >
                        <div className={`text-xs font-medium ${isToday_flag ? 'text-blue-600' : isPast ? 'text-gray-500' : 'text-gray-700'}`}>
                          {format(day, 'd')}
                        </div>
                        {hasSession && (
                          <div className="flex flex-col gap-1 mt-1">
                            {daySessions.slice(0, 2).map((sess, idx) => {
                              const emoji = sess.campaignId.emoji || '🎲';
                              const initials = sess.campaignId.name
                                .split(' ')
                                .map(word => word[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2);
                              return (
                                <div key={idx} className={`text-xs font-semibold truncate flex items-center gap-0.5 ${isPast ? 'text-gray-500' : 'text-purple-700'}`}>
                                  <span className="text-sm">{emoji}</span>
                                  <span className="truncate">{initials}</span>
                                </div>
                              );
                            })}
                            {daySessions.length > 2 && (
                              <div className={`text-xs font-semibold ${isPast ? 'text-gray-500' : 'text-purple-600'}`}>
                                +{daySessions.length - 2} more
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Sessions with Confirmation */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Upcoming Sessions</h2>
          
          {loading ? (
            <div className="text-gray-600">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-gray-600">No upcoming sessions scheduled</div>
          ) : (
            <div className="space-y-4">
              {sessions.map((sessionObj) => {
                const isConfirmed = isPlayerConfirmed(sessionObj);
                
                return (
                  <div
                    key={sessionObj._id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {sessionObj.name || sessionObj.campaignId.name}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          Campaign: {sessionObj.campaignId.name}
                        </p>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-700">
                          <span>📅 {format(parseISO(sessionObj.date), 'dd/MM/yyyy')}</span>
                          <span>🕐 {sessionObj.time}</span>
                          <span>📍 {sessionObj.location}</span>
                        </div>
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-700 mb-1">
                            Confirmed Players ({sessionObj.confirmedPlayerIds.length}):
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {sessionObj.confirmedPlayerIds.length === 0 ? (
                              <span className="text-sm text-gray-500 italic">No confirmations yet</span>
                            ) : (
                              sessionObj.confirmedPlayerIds.map((player) => (
                                <span
                                  key={player._id}
                                  className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                                >
                                  {player.username}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        {isConfirmed ? (
                          <button
                            onClick={() => handleUnconfirm(sessionObj._id)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                        ) : (
                          <button
                            onClick={() => handleConfirm(sessionObj._id)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition"
                          >
                            <Check className="w-4 h-4" />
                            Confirm
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {isConfirmed && (
                      <div className="mt-3 bg-green-50 border border-green-200 rounded-md px-3 py-2 text-sm text-green-800">
                        ✓ You have confirmed attendance for this session
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Start Guide</h2>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Set Your Availability</h3>
                <p className="text-gray-600">Go to your calendar and mark which days you&apos;re available to play.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Create or Join Campaigns</h3>
                <p className="text-gray-600">As a DM, create campaigns and invite players. As a player, wait for invitations.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Schedule Sessions</h3>
                <p className="text-gray-600">DMs can view everyone&apos;s availability and schedule sessions. Players receive automatic invites!</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
