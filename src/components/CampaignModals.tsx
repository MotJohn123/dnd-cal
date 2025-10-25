import { useState, useEffect } from 'react';
import { X, UserPlus, UserMinus } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface User {
  _id: string;
  username: string;
  email: string;
}

interface Campaign {
  _id: string;
  name: string;
  description?: string;
  dmId: { _id: string; username: string };
  playerIds: { _id: string; username: string; email: string }[];
  availableDays: string[];
  emoji?: string;
}

interface Session {
  _id: string;
  campaignId: string;
  name?: string;
  date: string;
  time: string;
  location: string;
  confirmedPlayerIds: { _id: string; username: string }[];
}

export function EditCampaignModal({
  campaign,
  onClose,
  onSuccess,
}: {
  campaign: Campaign;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(campaign.name);
  const [description, setDescription] = useState(campaign.description || '');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>(
    campaign.playerIds.map((p) => p._id)
  );
  const [availableDays, setAvailableDays] = useState<string[]>(campaign.availableDays);
  const [emoji, setEmoji] = useState(campaign.emoji || '🎲');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Common emojis for campaigns
  const emojiOptions = ['🎲', '⚔️', '🗡️', '🛡️', '🐉', '👑', '🏰', '🔮', '📜', '🧙', '🗺️', '⛰️', '🌲', '🏞️', '🌙', '⭐', '💎', '🏅'];


  useEffect(() => {
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        // Filter out the DM from the list
        const users = data.users.filter((u: User) => u._id !== campaign.dmId._id);
        setAllUsers(users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlayer = (playerId: string) => {
    setSelectedPlayers((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  };

  const toggleDay = (day: string) => {
    setAvailableDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`/api/campaigns/${campaign._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          description,
          playerIds: selectedPlayers,
          availableDays: availableDays,
          emoji: emoji
        }),
      });

      if (response.ok) {
        alert('Campaign updated successfully!');
        onSuccess();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update campaign');
      }
    } catch (error) {
      console.error('Error updating campaign:', error);
      alert('Failed to update campaign');
    } finally {
      setSubmitting(false);
    }
  };

  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    const confirm = window.confirm('Are you sure you want to delete this campaign? This will remove all sessions and notify players. This action cannot be undone.');
    if (!confirm) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/campaigns/${campaign._id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        alert('Campaign deleted. Players have been notified and sessions removed.');
        onSuccess();
        onClose();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete campaign');
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      alert('Failed to delete campaign');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4 sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold text-gray-900">Edit Campaign</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
              required
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
              maxLength={500}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Campaign Emoji
            </label>
            <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-md bg-gray-50">
              {emojiOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setEmoji(option)}
                  className={`text-2xl p-2 rounded transition ${
                    emoji === option 
                      ? 'bg-purple-200 border-2 border-purple-600' 
                      : 'hover:bg-gray-200'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-2">Selected: {emoji}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Players
            </label>
            {loading ? (
              <div className="text-sm text-gray-600">Loading players...</div>
            ) : (
              <div className="border border-gray-300 rounded-md max-h-48 overflow-y-auto">
                {allUsers.length === 0 ? (
                  <div className="p-3 text-sm text-gray-600">No other users available</div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {allUsers.map((user) => {
                      const isSelected = selectedPlayers.includes(user._id);
                      return (
                        <label
                          key={user._id}
                          className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => togglePlayer(user._id)}
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {user.username}
                            </div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                          {isSelected ? (
                            <UserMinus className="w-4 h-4 text-red-500" />
                          ) : (
                            <UserPlus className="w-4 h-4 text-green-500" />
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            <div className="mt-2 text-xs text-gray-600">
              {selectedPlayers.length} player{selectedPlayers.length !== 1 ? 's' : ''} selected
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Available Days
            </label>
            <div className="grid grid-cols-2 gap-2">
              {daysOfWeek.map((day) => {
                const isSelected = availableDays.includes(day);
                return (
                  <label
                    key={day}
                    className={`
                      flex items-center gap-2 p-3 border rounded-md cursor-pointer transition
                      ${isSelected 
                        ? 'bg-purple-50 border-purple-300 text-purple-700' 
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleDay(day)}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium">{day}</span>
                  </label>
                );
              })}
            </div>
            <div className="mt-2 text-xs text-gray-600">
              {availableDays.length} day{availableDays.length !== 1 ? 's' : ''} selected
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
              disabled={submitting || deleting}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition disabled:opacity-50"
              disabled={deleting || submitting}
            >
              {deleting ? 'Deleting...' : 'Delete Campaign'}
            </button>

            <button
              type="submit"
              className="ml-auto px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition disabled:opacity-50"
              disabled={submitting || deleting}
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EditSessionModal({
  session,
  campaign,
  onClose,
  onSuccess,
}: {
  session: Session;
  campaign: Campaign;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(session.name || '');
  const [date, setDate] = useState(format(parseISO(session.date), 'yyyy-MM-dd'));
  const [time, setTime] = useState(session.time);
  const [location, setLocation] = useState(session.location);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`/api/sessions/${session._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || undefined,
          date,
          time,
          location,
        }),
      });

      if (response.ok) {
        alert('Session updated successfully! Players have been notified.');
        onSuccess();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update session');
      }
    } catch (error) {
      console.error('Error updating session:', error);
      alert('Failed to update session');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Edit Session</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Session Name (Optional)
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

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm text-yellow-800">
              All players will receive an email notification about the updated session details.
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
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? 'Updating...' : 'Update Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
