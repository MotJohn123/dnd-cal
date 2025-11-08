'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Users, Sword, Edit, Trash2, X, Save, Key } from 'lucide-react';

interface User {
  _id: string;
  username: string;
  email: string;
  createdAt: string;
}

interface Campaign {
  _id: string;
  name: string;
  emoji?: string;
  dmId: { _id: string; username: string };
  playerIds: { _id: string; username: string }[];
  availableDays: string[];
  description?: string;
  createdAt: string;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'campaigns'>('users');
  
  // Edit user modal state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserForm, setEditUserForm] = useState({ username: '', email: '' });
  
  // Change password modal state
  const [changingPasswordUser, setChangingPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  
  // Edit campaign modal state
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [editCampaignForm, setEditCampaignForm] = useState({
    name: '',
    emoji: '',
    description: '',
    dmId: '',
    playerIds: [] as string[],
    availableDays: [] as string[],
  });
  const [allUsers, setAllUsers] = useState<User[]>([]);
  
  // Messages
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      // Check if user is admin
      if ((session?.user as any)?.role !== 'admin') {
        router.push('/dashboard');
      } else {
        fetchData();
      }
    }
  }, [status, session, router]);

  const fetchData = async () => {
    try {
      const [usersRes, campaignsRes, allUsersRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/campaigns'),
        fetch('/api/users'),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      }

      if (campaignsRes.ok) {
        const data = await campaignsRes.json();
        setCampaigns(data.campaigns || []);
      }

      if (allUsersRes.ok) {
        const data = await allUsersRes.json();
        setAllUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This will also delete all their campaigns and sessions.')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setMessage('User deleted successfully');
        setUsers(users.filter(u => u._id !== userId));
        fetchData(); // Refresh campaigns too
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete user');
      }
    } catch (err) {
      setError('Failed to delete user');
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditUserForm({ username: user.username, email: user.email });
    setMessage('');
    setError('');
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    try {
      const res = await fetch(`/api/admin/users/${editingUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editUserForm),
      });

      if (res.ok) {
        const data = await res.json();
        setMessage('User updated successfully');
        setUsers(users.map(u => u._id === editingUser._id ? data.user : u));
        setEditingUser(null);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update user');
      }
    } catch (err) {
      setError('Failed to update user');
    }
  };

  const handleChangePassword = (user: User) => {
    setChangingPasswordUser(user);
    setNewPassword('');
    setMessage('');
    setError('');
  };

  const handleSavePassword = async () => {
    if (!changingPasswordUser || !newPassword) {
      setError('Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${changingPasswordUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });

      if (res.ok) {
        setMessage('Password changed successfully');
        setChangingPasswordUser(null);
        setNewPassword('');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to change password');
      }
    } catch (err) {
      setError('Failed to change password');
    }
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setEditCampaignForm({
      name: campaign.name,
      emoji: campaign.emoji || '🎲',
      description: campaign.description || '',
      dmId: campaign.dmId._id,
      playerIds: campaign.playerIds.map(p => p._id),
      availableDays: campaign.availableDays || [],
    });
    setMessage('');
    setError('');
  };

  const handleSaveCampaign = async () => {
    if (!editingCampaign) return;

    try {
      const res = await fetch(`/api/campaigns/${editingCampaign._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editCampaignForm),
      });

      if (res.ok) {
        setMessage('Campaign updated successfully');
        setEditingCampaign(null);
        fetchData(); // Refresh to get updated campaign data with populated fields
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update campaign');
      }
    } catch (err) {
      setError('Failed to update campaign');
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign? This will also delete all its sessions.')) {
      return;
    }

    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setMessage('Campaign deleted successfully');
        setCampaigns(campaigns.filter(c => c._id !== campaignId));
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete campaign');
      }
    } catch (err) {
      setError('Failed to delete campaign');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session || (session.user as any)?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <main className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600 mt-2">Manage users and campaigns</p>
        </div>

        {/* Messages */}
        {message && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition ${
                activeTab === 'users'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-5 h-5" />
              Users ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition ${
                activeTab === 'campaigns'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Sword className="w-5 h-5" />
              Campaigns ({campaigns.length})
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'users' && (
              <div className="space-y-4">
                {users.length === 0 ? (
                  <p className="text-gray-600">No users found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Username</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Created</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user._id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">{user.username}</td>
                            <td className="py-3 px-4">{user.email}</td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleEditUser(user)}
                                className="text-blue-600 hover:text-blue-700 mr-3"
                                title="Edit user"
                              >
                                <Edit className="w-4 h-4 inline" />
                              </button>
                              <button
                                onClick={() => handleChangePassword(user)}
                                className="text-green-600 hover:text-green-700 mr-3"
                                title="Change password"
                              >
                                <Key className="w-4 h-4 inline" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user._id)}
                                className="text-red-600 hover:text-red-700"
                                title="Delete user"
                              >
                                <Trash2 className="w-4 h-4 inline" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'campaigns' && (
              <div className="space-y-4">
                {campaigns.length === 0 ? (
                  <p className="text-gray-600">No campaigns found</p>
                ) : (
                  campaigns.map((campaign) => (
                    <div key={campaign._id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {campaign.emoji} {campaign.name}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            DM: {campaign.dmId.username}
                          </p>
                          <p className="text-sm text-gray-600">
                            Players: {campaign.playerIds.map(p => p.username).join(', ') || 'None'}
                          </p>
                          {campaign.description && (
                            <p className="text-sm text-gray-700 mt-2">{campaign.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            Created: {new Date(campaign.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleEditCampaign(campaign)}
                            className="text-blue-600 hover:text-blue-700"
                            title="Edit campaign"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCampaign(campaign._id)}
                            className="text-red-600 hover:text-red-700"
                            title="Delete campaign"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Edit User</h2>
              <button
                onClick={() => setEditingUser(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={editUserForm.username}
                  onChange={(e) => setEditUserForm({ ...editUserForm, username: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={editUserForm.email}
                  onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveUser}
                  className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingUser(null)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {changingPasswordUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Change Password</h2>
              <button
                onClick={() => setChangingPasswordUser(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Changing password for: <strong>{changingPasswordUser.username}</strong>
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
                  placeholder="Enter new password (min 6 characters)"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSavePassword}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                >
                  <Key className="w-4 h-4" />
                  Change Password
                </button>
                <button
                  onClick={() => setChangingPasswordUser(null)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Campaign Modal */}
      {editingCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Edit Campaign</h2>
              <button
                onClick={() => setEditingCampaign(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Name
                </label>
                <input
                  type="text"
                  value={editCampaignForm.name}
                  onChange={(e) => setEditCampaignForm({ ...editCampaignForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emoji
                </label>
                <input
                  type="text"
                  value={editCampaignForm.emoji}
                  onChange={(e) => setEditCampaignForm({ ...editCampaignForm, emoji: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
                  placeholder="🎲"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dungeon Master
                </label>
                <select
                  value={editCampaignForm.dmId}
                  onChange={(e) => setEditCampaignForm({ ...editCampaignForm, dmId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
                >
                  {allUsers.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.username}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Players
                </label>
                <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                  {allUsers.filter(u => u._id !== editCampaignForm.dmId).map((user) => (
                    <label key={user._id} className="flex items-center gap-2 py-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editCampaignForm.playerIds.includes(user._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditCampaignForm({
                              ...editCampaignForm,
                              playerIds: [...editCampaignForm.playerIds, user._id],
                            });
                          } else {
                            setEditCampaignForm({
                              ...editCampaignForm,
                              playerIds: editCampaignForm.playerIds.filter(id => id !== user._id),
                            });
                          }
                        }}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-gray-900">{user.username}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Days
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                    <label key={day} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editCampaignForm.availableDays.includes(day)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditCampaignForm({
                              ...editCampaignForm,
                              availableDays: [...editCampaignForm.availableDays, day],
                            });
                          } else {
                            setEditCampaignForm({
                              ...editCampaignForm,
                              availableDays: editCampaignForm.availableDays.filter(d => d !== day),
                            });
                          }
                        }}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-gray-900">{day}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editCampaignForm.description}
                  onChange={(e) => setEditCampaignForm({ ...editCampaignForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
                  rows={3}
                  placeholder="Campaign description..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveCampaign}
                  className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingCampaign(null)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
