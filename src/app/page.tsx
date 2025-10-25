import Link from "next/link";
import { Calendar, Users, Shield } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-purple-700 to-indigo-800 text-white">
      <main className="text-center px-4 max-w-4xl">
        <div className="mb-8">
          <Calendar className="w-20 h-20 mx-auto mb-4" />
          <h1 className="text-5xl font-bold mb-4">DnD Calendar</h1>
          <p className="text-xl mb-8">
            The ultimate TTRPG session scheduler for dungeon masters and players
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6">
            <Calendar className="w-12 h-12 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Smart Scheduling</h3>
            <p className="text-sm">
              Set your availability once and it syncs across all campaigns
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6">
            <Users className="w-12 h-12 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Multiple Campaigns</h3>
            <p className="text-sm">
              Manage multiple campaigns with different player groups easily
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6">
            <Shield className="w-12 h-12 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Auto Notifications</h3>
            <p className="text-sm">
              Automatic Google Calendar invites and email notifications
            </p>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <Link
            href="/auth/register"
            className="bg-white text-purple-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Get Started
          </Link>
          <Link
            href="/auth/login"
            className="bg-transparent border-2 border-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition"
          >
            Login
          </Link>
        </div>
      </main>

      <footer className="mt-16 text-sm text-white/70">
        <p>&copy; 2025 DnD Calendar. Built for TTRPG enthusiasts.</p>
      </footer>
    </div>
  );
}
