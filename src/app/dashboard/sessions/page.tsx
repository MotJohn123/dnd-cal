'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, MapPin, Clock, Users } from 'lucide-react';
import { format, parseISO, isPast, isFuture } from 'date-fns';

interface Session {
  _id: string;
  campaignId: {
    _id: string;
    name: string;
    dmId: string;
  };
  date: string;
  time: string;
  location: string;
  confirmedPlayerIds: { _id: string; username: string; email: string }[];
  createdAt: string;
}

export default function SessionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
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
      const data = await response.json();
      if (response.ok) {
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const upcomingSessions = sessions.filter((s) => isFuture(parseISO(s.date)));
  const pastSessions = sessions.filter((s) => isPast(parseISO(s.date)));

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
            <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upcoming Sessions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Upcoming Sessions ({upcomingSessions.length})
          </h2>
          {upcomingSessions.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No upcoming sessions scheduled</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingSessions.map((session) => (
                <SessionCard key={session._id} session={session} />
              ))}
            </div>
          )}
        </div>

        {/* Past Sessions */}
        {pastSessions.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Past Sessions ({pastSessions.length})
            </h2>
            <div className="space-y-4 opacity-75">
              {pastSessions.map((session) => (
                <SessionCard key={session._id} session={session} isPast />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function SessionCard({ session, isPast = false }: { session: Session; isPast?: boolean }) {
  const sessionDate = parseISO(session.date);

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${isPast ? 'grayscale' : ''}`}>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-semibold text-gray-900">
              {session.campaignId.name}
            </h3>
            {isPast && (
              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                Past
              </span>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>{format(sessionDate, 'EEEE, dd/MM/yyyy')}</span>
            </div>

            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span>{session.time}</span>
            </div>

            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>{session.location}</span>
            </div>

            <div className="flex items-center gap-2 text-gray-600">
              <Users className="w-4 h-4" />
              <span>{session.confirmedPlayerIds.length} players confirmed</span>
            </div>
          </div>

          {/* Players List */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium text-gray-700 mb-2">Players:</p>
            <div className="flex flex-wrap gap-2">
              {session.confirmedPlayerIds.map((player) => (
                <span
                  key={player._id}
                  className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded"
                >
                  {player.username}
                </span>
              ))}
            </div>
          </div>
        </div>

        {!isPast && (
          <div className="text-right">
            <div className="text-sm text-gray-500">
              In {Math.ceil((sessionDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
