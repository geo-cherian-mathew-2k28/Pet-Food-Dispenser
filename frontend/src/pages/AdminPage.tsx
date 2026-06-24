// SmartCat Feeder - Admin Panel Page
// Allows admins to view registered users and revoke access (delete accounts).

import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Trash2, Shield, User, AlertCircle, RefreshCw, Mail, MessageSquare } from 'lucide-react';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  telegramChatId: string | null;
  createdAt: string;
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data.users);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will revoke both website access and Telegram bot access immediately.`)) {
      return;
    }
    setDeletingId(id);
    try {
      await api.delete(`/auth/users/${id}`);
      setUsers(users.filter(u => u.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-500 text-sm mt-1">Manage system accounts and access control</p>
        </div>
        <button
          onClick={fetchUsers}
          className="btn-ghost p-2 rounded-lg"
          title="Refresh User List"
        >
          <RefreshCw className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex gap-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          <span>Loading system users...</span>
        </div>
      ) : users.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <p className="font-semibold text-gray-700">No users found</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-card">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User Details</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Telegram ID</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => {
                  const isAdminUser = u.role === 'ADMIN';
                  return (
                    <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{u.name}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3.5 h-3.5" /> {u.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          isAdminUser
                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                            : 'bg-green-50 text-green-700 border border-green-100'
                        }`}>
                          {isAdminUser ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                          {isAdminUser ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {u.telegramChatId ? (
                          <span className="text-sm font-mono text-gray-800 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                            {u.telegramChatId}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Not linked</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {u.role !== 'ADMIN' ? (
                          <button
                            disabled={deletingId === u.id}
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            className="text-red-500 hover:text-red-700 disabled:opacity-50 p-2 hover:bg-red-50 rounded-xl transition-colors inline-flex"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 italic font-medium pr-2">System Creator</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {users.map((u) => {
              const isAdminUser = u.role === 'ADMIN';
              return (
                <div key={u.id} className="card p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-gray-900">{u.name}</h3>
                      <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" /> {u.email}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      isAdminUser
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-green-50 text-green-700'
                    }`}>
                      {isAdminUser ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      {isAdminUser ? 'Admin' : 'User'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm border-t border-gray-50 pt-3">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <MessageSquare className="w-4 h-4" />
                      <span>Telegram ID</span>
                    </div>
                    {u.telegramChatId ? (
                      <span className="font-mono text-gray-800 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100 text-xs">
                        {u.telegramChatId}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Not linked</span>
                    )}
                  </div>

                  {u.role !== 'ADMIN' && (
                    <div className="pt-2 border-t border-gray-50 flex justify-end">
                      <button
                        disabled={deletingId === u.id}
                        onClick={() => handleDeleteUser(u.id, u.name)}
                        className="btn-danger w-full justify-center py-2 text-xs gap-1.5"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove Access
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
