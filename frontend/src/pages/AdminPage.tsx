// SmartCat Feeder - Admin Panel Page
// Allows admins to view registered users, revoke access, and configure daily feed limits.

import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Trash2, Shield, User, AlertCircle, RefreshCw, Mail, MessageSquare, Settings, CheckCircle2, Loader2, AlertTriangle, Bug, RotateCcw } from 'lucide-react';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  telegramChatId: string | null;
  createdAt: string;
}

interface DeviceSettings {
  maxFeedsPerDay: number;
  servoOpenDurationMs: number;
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Daily limit settings
  const [deviceSettings, setDeviceSettings] = useState<DeviceSettings | null>(null);
  const [maxFeedsPerDay, setMaxFeedsPerDay] = useState<number>(10);
  const [savingLimit, setSavingLimit] = useState(false);
  const [limitMessage, setLimitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Debug
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const [usersRes, deviceRes] = await Promise.all([
        api.get('/auth/users'),
        api.get('/device/status'),
      ]);
      setUsers(usersRes.data.users);
      if (deviceRes.data.device) {
        const dev = deviceRes.data.device;
        setDeviceSettings(dev);
        setMaxFeedsPerDay(dev.maxFeedsPerDay ?? 10);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch admin data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDebug = async () => {
    try {
      const res = await api.get('/device/debug');
      setDebugInfo(res.data);
    } catch (err: any) {
      setDebugInfo({ error: err.response?.data?.error || 'Failed to fetch debug info' });
    }
  };

  const handleResetToday = async () => {
    if (!confirm('This will mark all of today\'s PENDING/FAILED logs as resolved so the feed count resets. Continue?')) return;
    setResetting(true);
    setResetMessage('');
    try {
      const res = await api.post('/device/reset-today', {});
      setResetMessage(res.data.message);
      fetchDebug();
    } catch (err: any) {
      setResetMessage(err.response?.data?.error || 'Reset failed');
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchDebug();
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

  const handleSaveDailyLimit = async () => {
    setSavingLimit(true);
    setLimitMessage(null);
    try {
      // Always send both fields so validation passes on all backend versions
      const payload: Record<string, number> = { maxFeedsPerDay };
      if (deviceSettings?.servoOpenDurationMs) {
        payload.servoOpenDurationMs = deviceSettings.servoOpenDurationMs;
      }
      const res = await api.post('/device/settings', payload);
      setLimitMessage({ type: 'success', text: `Daily limit updated to ${maxFeedsPerDay} feeds/day` });
      if (res.data.device) {
        setDeviceSettings(res.data.device);
        setMaxFeedsPerDay(res.data.device.maxFeedsPerDay);
      }
    } catch (err: any) {
      setLimitMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update limit' });
    } finally {
      setSavingLimit(false);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-500 text-sm mt-1">Manage system accounts, access control, and feeding limits</p>
        </div>
        <button
          onClick={fetchUsers}
          className="btn-ghost p-2 rounded-lg"
          title="Refresh"
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

      {/* ── Daily Feed Limit Control ────────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-5 h-5 text-cat-500" />
          <h2 className="font-bold text-gray-900 text-lg">Daily Feed Limit</h2>
        </div>
        <p className="text-xs text-gray-500 mb-5">
          Set the maximum number of times the feeder can be triggered per day (across all sources: web, Telegram, and schedules).
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max feeds per day: <span className="font-bold text-cat-600">{maxFeedsPerDay}</span>
            </label>
            <input
              type="range"
              min="1"
              max="50"
              step="1"
              value={maxFeedsPerDay}
              onChange={(e) => setMaxFeedsPerDay(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cat-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1.5">
              <span>1 (strict)</span>
              <span>25 (normal)</span>
              <span>50 (max)</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 min-w-[140px]">
            <div className="text-center">
              <div className="text-4xl font-extrabold text-cat-500">{maxFeedsPerDay}</div>
              <div className="text-xs text-gray-400">feeds / day</div>
            </div>
            <button
              onClick={handleSaveDailyLimit}
              disabled={savingLimit}
              className="btn-primary justify-center py-2 text-sm font-semibold gap-1.5"
            >
              {savingLimit ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Limit</span>
              )}
            </button>
          </div>
        </div>

        {limitMessage && (
          <div className={`mt-3 p-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
            limitMessage.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-100'
              : 'bg-red-50 text-red-700 border border-red-100'
          }`}>
            {limitMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{limitMessage.text}</span>
          </div>
        )}

        {deviceSettings && (
          <div className="mt-4 pt-4 border-t border-gray-50 flex flex-wrap gap-4 text-xs text-gray-500">
            <span>Current limit: <strong className="text-gray-800">{deviceSettings.maxFeedsPerDay} feeds/day</strong></span>
            <span>Servo open: <strong className="text-gray-800">{(deviceSettings.servoOpenDurationMs / 1000).toFixed(1)}s</strong></span>
          </div>
        )}
      </div>

      {/* ── Debug & Reset Section ────────────────────────────────────────── */}
      {debugInfo && (
        <div className="card p-6 border border-amber-100 bg-amber-50/10">
          <div className="flex items-center gap-2 mb-1">
            <Bug className="w-5 h-5 text-amber-600" />
            <h2 className="font-bold text-gray-900 text-lg">Diagnostics & Limit Reset</h2>
          </div>
          <p className="text-xs text-gray-500 mb-5">
            Check the database state for the feeder's daily limit and current count, or reset today's failed/pending feeds.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            <div className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
              <div className="text-xs font-semibold text-gray-400">Effective Daily Limit</div>
              <div className="text-2xl font-black text-gray-800 mt-1">
                {debugInfo.effectiveLimit !== undefined ? debugInfo.effectiveLimit : 'Loading...'}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">From database: {debugInfo.device?.maxFeedsPerDay ?? 'None'} (env: {debugInfo.envMaxFeedsPerDay})</div>
            </div>

            <div className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
              <div className="text-xs font-semibold text-gray-400">Today's Success Count</div>
              <div className="text-2xl font-black text-green-600 mt-1">
                {debugInfo.todaySuccessCount !== undefined ? debugInfo.todaySuccessCount : 'Loading...'}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">Logs marked as SUCCESS</div>
            </div>

            <div className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
              <div className="text-xs font-semibold text-gray-400">Today's Pending Count</div>
              <div className="text-2xl font-black text-amber-600 mt-1">
                {debugInfo.todayPendingCount !== undefined ? debugInfo.todayPendingCount : 'Loading...'}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">Logs in PENDING state (waiting or timed out)</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={handleResetToday}
              disabled={resetting}
              className="btn-secondary text-sm font-semibold gap-1.5 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
            >
              {resetting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              <span>Reset Today's Non-Success Logs</span>
            </button>
            <button
              onClick={fetchDebug}
              className="btn-ghost text-xs text-gray-500 font-semibold gap-1 py-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Stats</span>
            </button>
          </div>

          {resetMessage && (
            <div className="mt-3 p-3 rounded-xl bg-amber-50 text-amber-800 border border-amber-100 text-xs font-semibold">
              {resetMessage}
            </div>
          )}
        </div>
      )}

      {/* ── User Management ─────────────────────────────────────────────────── */}
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
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
              <Shield className="w-4 h-4 text-cat-500" />
              <h2 className="font-bold text-gray-900">System Users</h2>
              <span className="ml-auto text-xs text-gray-400">{users.length} registered</span>
            </div>
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
