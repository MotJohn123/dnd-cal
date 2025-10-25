'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Calendar, Users, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

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
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 transition"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <Users className="w-12 h-12 text-purple-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">My Campaigns</h2>
            <p className="text-gray-600">View and manage your campaigns</p>
            <p className="text-sm text-gray-500 mt-2">(Coming soon)</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <Calendar className="w-12 h-12 text-purple-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Calendar</h2>
            <p className="text-gray-600">Set your availability and view sessions</p>
            <p className="text-sm text-gray-500 mt-2">(Coming soon)</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <Calendar className="w-12 h-12 text-purple-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Upcoming Sessions</h2>
            <p className="text-gray-600">View all scheduled sessions</p>
            <p className="text-sm text-gray-500 mt-2">(Coming soon)</p>
          </div>
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
