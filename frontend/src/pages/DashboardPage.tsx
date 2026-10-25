// SmartCat Feeder - Dashboard Page
// Shows feed now button, device status, stats, and recent history.

import { useEffect, useState, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '../lib/api';
import type { DeviceStatus, FeedLog, FeedStats } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  Play, Lock, Wifi, Heart, Clock, AlertTriangle, CheckCircle2, XCircle, Loader2, BarChart2,
  Radio, Server, Cpu, Globe, Activity
} from 'lucide-react';

function StatusBadge({ status }: { status: 'ONLINE' | 'OFFLINE' }) {
  const isOnline = status === 'ONLINE';
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
      isOnline
        ? 'bg-green-50 text-green-700 border-green-200'
        : 'bg-red-50 text-red-700 border-red-200'
    }`}>
      <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
      {status}
    </span>
  );
}

function FeedStatusBadge({ status }: { status: string }) {
  if (status === 'SUCCESS') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Success
      </span>
    );
  }
  if (status === 'FAILED') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
        <XCircle className="w-3.5 h-3.5" />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      <Loader2 className="w-3.5 h-3.5 animate-spin" />
      Pending
    </span>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  const [device, setDevice] = useState<DeviceStatus | null>(() => {
    try {
      const saved = sessionStorage.getItem('smartcat_cached_device');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [stats, setStats] = useState<FeedStats | null>(() => {
    try {
      const saved = sessionStorage.getItem('smartcat_cached_stats');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [recentFeeds, setRecentFeeds] = useState<FeedLog[]>(() => {
    try {
      const saved = sessionStorage.getItem('smartcat_cached_recent_feeds');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [scheduleCount, setScheduleCount] = useState<number>(() => {
    try {
      const saved = sessionStorage.getItem('smartcat_cached_sched_count');
      return saved ? Number(saved) : 0;
    } catch { return 0; }
  });

  const [feeding, setFeeding]   = useState(false);
  const [feedResult, setFeedResult] = useState<{ success: boolean; message: string } | null>(null);
  // If we already have cached stats in this session, render instantly without full-screen loading spinner
  const [loading, setLoading]   = useState(() => {
    try {
      return !sessionStorage.getItem('smartcat_cached_stats');
    } catch { return true; }
  });
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [packetStage, setPacketStage] = useState<number>(0);
  const [packetTimerMs, setPacketTimerMs] = useState<number>(0);
  const [showNetworkInspector, setShowNetworkInspector] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    try {
      const [deviceRes, statsRes, feedsRes, schedRes] = await Promise.all([
        api.get('/device/status'),
        api.get('/feeds/stats'),
        api.get('/feeds?limit=5'),
        api.get('/schedules'),
      ]);
      setDevice(deviceRes.data.device);
      setStats(statsRes.data);
      setRecentFeeds(feedsRes.data.feeds);
      const activeScheds = schedRes.data.schedules.filter((s: { enabled: boolean }) => s.enabled).length;
      setScheduleCount(activeScheds);

      try {
        sessionStorage.setItem('smartcat_cached_device', JSON.stringify(deviceRes.data.device));
        sessionStorage.setItem('smartcat_cached_stats', JSON.stringify(statsRes.data));
        sessionStorage.setItem('smartcat_cached_recent_feeds', JSON.stringify(feedsRes.data.feeds));
        sessionStorage.setItem('smartcat_cached_sched_count', String(activeScheds));
      } catch {}
    } catch (_err) {
      // silently handle - data may not yet be available
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refresh device status every 30s
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const updateCooldown = () => {
      const cooldownPeriod = device?.feedCooldownSeconds ?? 60;
      if (cooldownPeriod === 0) {
        setCooldownRemaining(0);
        return;
      }
      if (stats?.lastFeed?.completedAt) {
        const completedAtTime = new Date(stats.lastFeed.completedAt).getTime();
        const elapsedSeconds = (Date.now() - completedAtTime) / 1000;
        const remaining = Math.max(0, Math.ceil(cooldownPeriod - elapsedSeconds));
        setCooldownRemaining(remaining);
      } else {
        setCooldownRemaining(0);
      }
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
  }, [stats?.lastFeed?.completedAt, device?.feedCooldownSeconds]);

  const handleFeedNow = async () => {
    setFeeding(true);
    setFeedResult(null);
    setPacketStage(1);
    const startTime = Date.now();

    const stageTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setPacketTimerMs(elapsed);
      if (elapsed > 80 && elapsed <= 250) {
        setPacketStage(2); // MQTT publish to broker
      } else if (elapsed > 250 && elapsed <= 500) {
        setPacketStage(3); // Broker push to Arduino
      } else if (elapsed > 500) {
        setPacketStage(4); // Arduino servo physical actuation
      }
    }, 40);

    try {
      const res = await api.post('/feeds/now', { portion: 1 });
      setPacketStage(5); // Complete / ACK
      setFeedResult({ success: res.data.success, message: res.data.message });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Feed request failed';
      setFeedResult({ success: false, message });
      setPacketStage(0);
    } finally {
      clearInterval(stageTimer);
      setFeeding(false);
      await fetchData();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mr-3 text-cat-500" />
        <span className="text-lg">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Hello, {user?.name}
        </h1>
        <p className="text-gray-500 text-sm mt-1">Here's your pet feeder overview</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center p-5">
          <p className="text-3xl font-bold text-cat-500">{stats?.todayCount ?? 0}</p>
          <p className="text-sm text-gray-500 mt-1">Feeds Today</p>
        </div>
        <div className="card text-center p-5">
          <p className="text-3xl font-bold text-sage-500">{scheduleCount}</p>
          <p className="text-sm text-gray-500 mt-1">Active Schedules</p>
        </div>
        <div className="card text-center p-5">
          <p className="text-3xl font-bold text-green-500">{stats?.successCount ?? 0}</p>
          <p className="text-sm text-gray-500 mt-1">Total Success</p>
        </div>
        <div className="card text-center p-5">
          <p className="text-3xl font-bold text-gray-700">{stats?.total ?? 0}</p>
          <p className="text-sm text-gray-500 mt-1">All Time</p>
        </div>
      </div>

      {/* Feed Now + Device Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Feed Now */}
        <div className="card flex flex-col justify-between gap-4 p-6 border-t-4 border-t-cat-500 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-gray-900 text-lg">Feed Now</h2>
                {device?.feedCooldownSeconds === 0 && (
                  <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    ⚡ Instant Demo Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Real-time MQTT actuated dispenser</p>
            </div>
            
            <button
              onClick={() => setShowNetworkInspector(!showNetworkInspector)}
              className="text-xs text-cat-600 hover:text-cat-700 font-semibold flex items-center gap-1 bg-cat-50 px-2.5 py-1 rounded-lg border border-cat-100"
            >
              <Activity className="w-3.5 h-3.5" />
              {showNetworkInspector ? 'Hide Packet Flow' : 'Inspect Packet Flow'}
            </button>
          </div>
          
          <button
            id="feed-now-btn"
            onClick={handleFeedNow}
            disabled={feeding || cooldownRemaining > 0}
            className={`feed-btn flex items-center justify-center gap-2 shadow-md transition-all ${
              cooldownRemaining > 0 ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed opacity-75' : ''
            }`}
          >
            {feeding ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>
                  {packetStage === 1 ? 'Dispatching HTTP POST...' :
                   packetStage === 2 ? 'Publishing MQTT Packet...' :
                   packetStage === 3 ? 'Broker Routing to Feeder...' :
                   'Actuating Servo Motor...'}
                </span>
              </>
            ) : cooldownRemaining > 0 ? (
              <>
                <Lock className="w-5 h-5" />
                <span>Locked ({cooldownRemaining}s cooldown)</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>Feed Cat Now</span>
              </>
            )}
          </button>

          {/* Real-Time MQTT Packet Transmission Inspector */}
          {showNetworkInspector && (
            <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800 space-y-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-mono text-[11px] font-bold text-cat-400 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${feeding ? 'bg-emerald-400 animate-ping' : 'bg-cat-500'}`} />
                  REAL-TIME NETWORK PIPELINE
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  {feeding ? `T+${packetTimerMs}ms` : 'Ready for packet'}
                </span>
              </div>

              {/* 4 Nodes */}
              <div className="grid grid-cols-4 gap-1.5 text-center">
                <div className={`p-2 rounded-xl border transition-all ${
                  packetStage === 1 ? 'bg-cat-500/30 border-cat-400 text-cat-200' :
                  packetStage > 1 ? 'bg-slate-800/80 border-emerald-500/50 text-emerald-400' :
                  'bg-slate-800/40 border-slate-700/50 text-slate-400'
                }`}>
                  <Globe className="w-4 h-4 mx-auto mb-1" />
                  <div className="font-bold text-[10px]">1. Web UI</div>
                  <div className="text-[9px] opacity-70">HTTP POST</div>
                </div>

                <div className={`p-2 rounded-xl border transition-all ${
                  packetStage === 2 ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200' :
                  packetStage > 2 ? 'bg-slate-800/80 border-emerald-500/50 text-emerald-400' :
                  'bg-slate-800/40 border-slate-700/50 text-slate-400'
                }`}>
                  <Server className="w-4 h-4 mx-auto mb-1" />
                  <div className="font-bold text-[10px]">2. Backend</div>
                  <div className="text-[9px] opacity-70">MQTT QoS 1</div>
                </div>

                <div className={`p-2 rounded-xl border transition-all ${
                  packetStage === 3 ? 'bg-amber-500/30 border-amber-400 text-amber-200' :
                  packetStage > 3 ? 'bg-slate-800/80 border-emerald-500/50 text-emerald-400' :
                  'bg-slate-800/40 border-slate-700/50 text-slate-400'
                }`}>
                  <Radio className="w-4 h-4 mx-auto mb-1" />
                  <div className="font-bold text-[10px]">3. Broker</div>
                  <div className="text-[9px] opacity-70">TCP Push</div>
                </div>

                <div className={`p-2 rounded-xl border transition-all ${
                  packetStage === 4 ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 animate-pulse' :
                  packetStage === 5 ? 'bg-slate-800/80 border-emerald-500/50 text-emerald-400' :
                  'bg-slate-800/40 border-slate-700/50 text-slate-400'
                }`}>
                  <Cpu className="w-4 h-4 mx-auto mb-1" />
                  <div className="font-bold text-[10px]">4. Arduino</div>
                  <div className="text-[9px] opacity-70">Pin D9 Servo</div>
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 font-mono">
                <span>Topic: <code className="text-cat-300">smartcat/geo123/device/command</code></span>
                <span className="text-emerald-400 font-bold">Network: &lt;150ms Real-Time</span>
              </div>
            </div>
          )}

          {feedResult && (
            <div
              className={`p-3.5 rounded-xl text-sm font-medium animate-fade-in flex items-center gap-2 ${
                feedResult.success
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {feedResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
              <span>{feedResult.message}</span>
            </div>
          )}

          {stats?.lastFeed && (
            <p className="text-xs text-gray-400 text-center">
              Last fed:{' '}
              {stats.lastFeed.completedAt
                ? new Date(stats.lastFeed.completedAt).toLocaleString()
                : new Date(stats.lastFeed.createdAt).toLocaleString()}
            </p>
          )}
        </div>

        {/* Device Status */}
        <div className="card flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900 text-lg">Device Status</h2>
            {device && <StatusBadge status={device.status} />}
          </div>

          {device ? (
            <div className="space-y-3.5">
              <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2.5">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-gray-400" /> Heartbeat
                </span>
                <span className="font-semibold text-gray-800">
                  {device.lastHeartbeatAt
                    ? new Date(device.lastHeartbeatAt).toLocaleTimeString()
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2.5">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Wifi className="w-4 h-4 text-gray-400" /> WiFi Signal
                </span>
                <span className="font-semibold text-gray-800">
                  {device.wifiStrength ? `${device.wifiStrength} dBm` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-gray-400" /> Uptime
                </span>
                <span className="font-semibold text-gray-800 text-right">
                  {device.uptimeSeconds
                    ? `${Math.floor(device.uptimeSeconds / 60)}m ${device.uptimeSeconds % 60}s`
                    : 'N/A'}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p>No device data yet. Ensure your SmartCat Feeder is powered on and connected.</p>
            </div>
          )}
        </div>
      </div>

      {/* 7-day Chart */}
      {stats?.daily && (
        <div className="card p-6">
          <div className="flex items-center gap-1.5 mb-4">
            <BarChart2 className="w-5 h-5 text-cat-500" />
            <h2 className="font-bold text-gray-900 text-lg">Feeds — Last 7 Days</h2>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={stats.daily} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
              <defs>
                <linearGradient id="successGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f07c00" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f07c00" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
              />
              <Area
                type="monotone"
                dataKey="success"
                stroke="#f07c00"
                strokeWidth={2}
                fill="url(#successGrad)"
                name="Success"
              />
              <Area
                type="monotone"
                dataKey="failed"
                stroke="#ef4444"
                strokeWidth={2}
                fill="transparent"
                name="Failed"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Feeds */}
      <div className="card p-6">
        <h2 className="font-bold text-gray-900 text-lg mb-4">Recent Feedings</h2>
        {recentFeeds.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No feeding records yet.</p>
        ) : (
          <div className="space-y-3">
            {recentFeeds.map((feed) => (
              <div
                key={feed.id}
                className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <FeedStatusBadge status={feed.status} />
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{feed.source}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-700">{feed.userName}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 font-medium">{new Date(feed.createdAt).toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Portion: {feed.portion}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
