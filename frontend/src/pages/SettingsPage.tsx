// SmartCat Feeder - Settings Page
// Configure device settings and manage user profile / Telegram linkage.

import { useEffect, useState } from 'react';
import api from '../lib/api';
import type { DeviceStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  CheckCircle2, XCircle, Loader2, Settings, User, Cpu, Server, AlertCircle, RefreshCw 
} from 'lucide-react';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  
  // Device Settings states
  const [device, setDevice] = useState<DeviceStatus | null>(null);
  const [mqttConnected, setMqttConnected] = useState<boolean | null>(null);
  const [servoOpenDurationMs, setServoOpenDurationMs] = useState<number>(2000);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [settingsMessage, setSettingsMessage] = useState<string>('');

  // Profile states
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [telegramChatId, setTelegramChatId] = useState(user?.telegramChatId || '');
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchDeviceStatus = async () => {
    try {
      const res = await api.get('/device/status');
      setDevice(res.data.device);
      setMqttConnected(res.data.mqttConnected);
      if (res.data.device?.servoOpenDurationMs) {
        setServoOpenDurationMs(res.data.device.servoOpenDurationMs);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchDeviceStatus();
  }, []);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSettingsMessage('');
    try {
      const res = await api.post('/device/settings', { servoOpenDurationMs });
      setSettingsMessage('Settings saved successfully!');
      if (res.data.device) setDevice(res.data.device);
    } catch (err: any) {
      setSettingsMessage('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage(null);
    try {
      const res = await api.put('/auth/profile', {
        name,
        email,
        telegramChatId: telegramChatId.trim() || null
      });
      // Update our react auth context with new details
      updateUser(res.data.user, res.data.token);
      setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err: any) {
      setProfileMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to update profile'
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const StatusIcon = ({ ok }: { ok: boolean | null }) => {
    if (ok === null) return <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />;
    return ok ? (
      <CheckCircle2 className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-400" />
    );
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Configure feeder behaviour and manage profile settings</p>
        </div>
        <button
          onClick={fetchDeviceStatus}
          className="btn-ghost p-2 rounded-lg"
          title="Refresh Device Connection"
        >
          <RefreshCw className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Settings Card */}
        <div className="card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <User className="w-5 h-5 text-cat-500" />
              <h2 className="font-bold text-gray-900 text-lg">Profile Details</h2>
            </div>
            <p className="text-xs text-gray-500 mb-5">
              Update your account details and link your Telegram account for bot access.
            </p>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="label">Name</label>
                <input
                  className="input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label">Email Address</label>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label">Telegram Chat ID</label>
                <input
                  className="input font-mono text-sm"
                  type="text"
                  placeholder="e.g. 1690543934"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                />
                <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">
                  To link Telegram: Send <code className="font-semibold text-cat-600 bg-gray-50 px-1 py-0.5 rounded border border-gray-150">/start</code> to your bot to view your ID, and enter it above.
                </p>
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="btn-primary w-full justify-center py-2 text-sm font-semibold gap-1.5"
              >
                {savingProfile ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Profile</span>
                )}
              </button>

              {profileMessage && (
                <div className={`p-3 rounded-xl text-xs font-semibold text-center flex items-center justify-center gap-1.5 ${
                  profileMessage.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-150'
                    : 'bg-red-50 text-red-700 border border-red-150'
                }`}>
                  {profileMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{profileMessage.text}</span>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Servo Duration Control Card */}
        <div className="card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Settings className="w-5 h-5 text-cat-500" />
              <h2 className="font-bold text-gray-900 text-lg">Feeder Open Duration</h2>
            </div>
            <p className="text-xs text-gray-500 mb-5">
              How long the feeder stays open before automatically closing. Increase for larger portions or bigger kibble.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration: <span className="font-bold text-cat-600">{(servoOpenDurationMs / 1000).toFixed(1)}s</span>
                </label>
                <input
                  type="range"
                  min="500"
                  max="10000"
                  step="100"
                  value={servoOpenDurationMs}
                  onChange={(e) => setServoOpenDurationMs(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cat-500"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1.5">
                  <span>0.5s (Quick)</span>
                  <span>10.0s (Long)</span>
                </div>
              </div>

              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="btn-primary w-full justify-center py-2 text-sm font-semibold gap-1.5"
              >
                {savingSettings ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Settings</span>
                )}
              </button>

              {settingsMessage && (
                <div className={`p-3 rounded-xl text-xs font-semibold text-center flex items-center justify-center gap-1.5 ${
                  settingsMessage.startsWith('Error')
                    ? 'bg-red-50 text-red-700 border border-red-150'
                    : 'bg-green-50 text-green-700 border border-green-150'
                }`}>
                  {settingsMessage.startsWith('Error') ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{settingsMessage}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Connection Status Card */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Server className="w-5 h-5 text-cat-500" />
            <h2 className="font-bold text-gray-900 text-lg">Connection Status</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <div>
                <p className="text-sm font-semibold text-gray-800">MQTT Broker</p>
                <p className="text-xs text-gray-400">Backend to Broker connection</p>
              </div>
              <StatusIcon ok={mqttConnected} />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-semibold text-gray-800">Arduino Device</p>
                <p className="text-xs text-gray-400">
                  {device?.lastHeartbeatAt
                    ? `Last seen: ${new Date(device.lastHeartbeatAt).toLocaleTimeString()}`
                    : 'No heartbeat received yet'}
                </p>
              </div>
              <StatusIcon ok={device?.status === 'ONLINE'} />
            </div>
          </div>
        </div>

        {/* Live Device Stats Card */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-5 h-5 text-cat-500" />
            <h2 className="font-bold text-gray-900 text-lg">Device Stats</h2>
          </div>
          {device ? (
            <div className="space-y-3.5 text-sm">
              {[
                ['Status', device.status],
                ['WiFi Signal', device.wifiStrength ? `${device.wifiStrength} dBm` : 'N/A'],
                ['Uptime', device.uptimeSeconds
                  ? `${Math.floor(device.uptimeSeconds / 60)}m ${device.uptimeSeconds % 60}s`
                  : 'N/A'],
                ['Last Heartbeat', device.lastHeartbeatAt
                  ? new Date(device.lastHeartbeatAt).toLocaleString()
                  : 'N/A'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                  <span className="text-gray-500 font-medium">{label}</span>
                  <span className="font-semibold text-gray-800">{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-6">
              <AlertCircle className="w-5 h-5" />
              <span>No active device statistics. Check the connection.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
