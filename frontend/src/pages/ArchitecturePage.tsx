// SmartCat Feeder - Interactive MQTT Topic-Routing & Packet Flow Simulator
// 100% Light Theme, Smooth Glowing Particle Dot, Multi-Subscriber Matching,
// Error ACK for Unsubscribed Topics (Educational CN Demonstration).

import { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Activity,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface SubscriberDef {
  id: string;
  name: string;
  deviceType: string;
  topic: string;
  accentColor: string;
}

const SUBSCRIBERS: SubscriberDef[] = [
  {
    id: 'feeder',
    name: 'Arduino Cat Feeder (UNO R4)',
    deviceType: 'Hardware Actuator',
    topic: 'smartcat/geo123/device/command',
    accentColor: '#10b981', // green
  },
  {
    id: 'mobile',
    name: 'Owner Mobile App',
    deviceType: 'Client Monitor',
    topic: 'smartcat/geo123/device/status',
    accentColor: '#3b82f6', // blue
  },
  {
    id: 'other_user',
    name: 'Other Feeder (User 999)',
    deviceType: 'Isolated Hardware',
    topic: 'smartcat/user999/device/command',
    accentColor: '#8b5cf6', // purple
  },
];

export default function ArchitecturePage() {
  // Topic string to publish
  const [topicInput, setTopicInput] = useState<string>('smartcat/geo123/device/command');
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0); // 0.6x (slow), 1.0x (normal), 1.5x (fast)
  const [animProgress, setAnimProgress] = useState<number>(0); // 0 to 100
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [autoLoop, setAutoLoop] = useState<boolean>(false);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Check which subscriber matches the current topic
  const matchedSubscriber = SUBSCRIBERS.find((s) => s.topic.trim() === topicInput.trim());
  const isTopicMatched = Boolean(matchedSubscriber);

  // Smooth animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const baseDurationMs = 6500 / speedMultiplier; // ~6.5s at 1x, ~10.8s at 0.6x

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      setAnimProgress((prev) => {
        const next = prev + (delta / baseDurationMs) * 100;
        if (next >= 100) {
          if (!autoLoop) {
            setIsPlaying(false);
            return 100;
          }
          return 0; // restart
        }
        return next;
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, autoLoop, speedMultiplier]);

  const handleStart = () => {
    if (animProgress >= 100) setAnimProgress(0);
    setIsPlaying(true);
  };

  const handlePause = () => setIsPlaying(false);

  const handleReset = () => {
    setIsPlaying(false);
    setAnimProgress(0);
  };

  // ── Coordinates for the SVG Canvas ───────────────────────────────────────────
  // Canvas ViewBox: 900 x 440
  const pubPos = { x: 130, y: 220 };
  const brokerPos = { x: 450, y: 220 };
  const subPositions: Record<string, { x: number; y: number }> = {
    feeder: { x: 770, y: 80 },
    mobile: { x: 770, y: 220 },
    other_user: { x: 770, y: 360 },
  };

  // ── Particle Dot Motion Calculations ─────────────────────────────────────────
  // If topic is MATCHED:
  // Phase 1 (0 - 35%): Outbound Publisher -> Broker
  // Phase 2 (35 - 45%): At Broker (Topic evaluation & Broker PUBACK)
  // Phase 3 (45 - 75%): Broker -> Subscribed Subscriber ONLY
  // Phase 4 (75 - 82%): Subscriber actuates & triggers ACK
  // Phase 5 (82 - 100%): Return ACK Particle from Subscriber -> Broker -> Publisher
  //
  // If topic is UNMATCHED (INVALID):
  // Phase 1 (0 - 45%): Outbound Publisher -> Broker
  // Phase 2 (45 - 55%): Broker detects 0 subscribers! Packet dropped.
  // Phase 3 (55 - 100%): Return Error ACK Particle from Broker -> Publisher (No forward to subscribers)

  let stageLabel = 'Ready - Click Dispatch Packet';
  let stageType: 'info' | 'warn' | 'success' | 'error' = 'info';

  let dot = {
    x: pubPos.x,
    y: pubPos.y,
    visible: false,
    color: '#3b82f6', // default blue
    glowColor: '#93c5fd',
  };

  if (isTopicMatched && matchedSubscriber) {
    if (animProgress > 0 && animProgress <= 35) {
      // Stage 1: Publisher to Broker
      const t = animProgress / 35;
      dot = {
        x: pubPos.x + (brokerPos.x - pubPos.x) * t,
        y: pubPos.y,
        visible: true,
        color: '#f97316', // orange data pulse
        glowColor: '#fdba74',
      };
      stageLabel = `1. Transmitting packet on [${topicInput}] to HiveMQ Broker`;
      stageType = 'info';
    } else if (animProgress > 35 && animProgress <= 45) {
      // Stage 2: In Broker, Broker PUBACK
      dot = {
        x: brokerPos.x,
        y: brokerPos.y,
        visible: true,
        color: '#f59e0b', // amber
        glowColor: '#fde68a',
      };
      stageLabel = `2. Broker received packet! PUBACK confirmed. Looking up subscribers...`;
      stageType = 'warn';
    } else if (animProgress > 45 && animProgress <= 75) {
      // Stage 3: Broker to Matched Subscriber
      const target = subPositions[matchedSubscriber.id];
      const t = (animProgress - 45) / (75 - 45);
      dot = {
        x: brokerPos.x + (target.x - brokerPos.x) * t,
        y: brokerPos.y + (target.y - brokerPos.y) * t,
        visible: true,
        color: matchedSubscriber.accentColor,
        glowColor: '#86efac',
      };
      stageLabel = `3. Topic MATCH! Pushing packet to ${matchedSubscriber.name}`;
      stageType = 'info';
    } else if (animProgress > 75 && animProgress <= 82) {
      // Stage 4: Arrived at Subscriber
      const target = subPositions[matchedSubscriber.id];
      dot = {
        x: target.x,
        y: target.y,
        visible: true,
        color: '#10b981', // green
        glowColor: '#6ee7b7',
      };
      stageLabel = `4. ${matchedSubscriber.name} received packet! Triggering action & emitting ACK`;
      stageType = 'success';
    } else if (animProgress > 82 && animProgress <= 100) {
      // Stage 5: Return ACK: Subscriber -> Broker -> Publisher
      const source = subPositions[matchedSubscriber.id];
      const t = (animProgress - 82) / (100 - 82);
      let ackX = source.x;
      let ackY = source.y;
      if (t < 0.5) {
        const localT = t / 0.5;
        ackX = source.x + (brokerPos.x - source.x) * localT;
        ackY = source.y + (brokerPos.y - source.y) * localT;
      } else {
        const localT = (t - 0.5) / 0.5;
        ackX = brokerPos.x + (pubPos.x - brokerPos.x) * localT;
        ackY = brokerPos.y;
      }
      dot = {
        x: ackX,
        y: ackY,
        visible: true,
        color: '#059669', // emerald ACK
        glowColor: '#34d399',
      };
      stageLabel = `5. Return ACK packet delivered back to Publisher: SUCCESS ✓`;
      stageType = 'success';
    }
  } else {
    // ── UNMATCHED / INVALID TOPIC SCENARIO ──
    if (animProgress > 0 && animProgress <= 45) {
      const t = animProgress / 45;
      dot = {
        x: pubPos.x + (brokerPos.x - pubPos.x) * t,
        y: pubPos.y,
        visible: true,
        color: '#f97316',
        glowColor: '#fdba74',
      };
      stageLabel = `1. Transmitting packet on unregistered topic [${topicInput}] to Broker`;
      stageType = 'info';
    } else if (animProgress > 45 && animProgress <= 58) {
      dot = {
        x: brokerPos.x,
        y: brokerPos.y,
        visible: true,
        color: '#ef4444', // red flash
        glowColor: '#fca5a5',
      };
      stageLabel = `2. Broker Check: 0 subscribers registered for [${topicInput}]! Packet dropped!`;
      stageType = 'error';
    } else if (animProgress > 58 && animProgress <= 100) {
      // Return Error ACK from Broker -> Publisher
      const t = (animProgress - 58) / (100 - 58);
      dot = {
        x: brokerPos.x + (pubPos.x - brokerPos.x) * t,
        y: brokerPos.y,
        visible: true,
        color: '#dc2626', // dark red error ACK
        glowColor: '#f87171',
      };
      stageLabel = `3. Broker returns Error ACK: No active subscribers (Packet Discarded ✗)`;
      stageType = 'error';
    }
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-5xl mx-auto">
      {/* ── Page Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">MQTT Architecture</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Student Lab & Simulator
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-0.5">
            Topic-based publish/subscribe packet routing and return acknowledgment flow
          </p>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl border border-stone-200">
          <span className="text-[11px] font-semibold text-stone-500 px-2">Speed:</span>
          <button
            onClick={() => setSpeedMultiplier(0.6)}
            className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all ${
              speedMultiplier === 0.6
                ? 'bg-white text-orange-700 shadow-2xs border border-stone-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            🐢 0.6x Slow
          </button>
          <button
            onClick={() => setSpeedMultiplier(1.0)}
            className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all ${
              speedMultiplier === 1.0
                ? 'bg-white text-blue-700 shadow-2xs border border-stone-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            1.0x Normal
          </button>
          <button
            onClick={() => setSpeedMultiplier(1.5)}
            className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all ${
              speedMultiplier === 1.5
                ? 'bg-white text-emerald-700 shadow-2xs border border-stone-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            ⚡ 1.5x Fast
          </button>
        </div>
      </div>

      {/* ── 1. Interactive Topic Selector for Students ───────────────────────────── */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cat-500" />
            <h2 className="text-sm font-bold text-gray-900">Student Topic Dispatcher</h2>
          </div>
          <span className="text-xs text-gray-500">
            Pick a preset topic or type your own to test routing behavior
          </span>
        </div>

        {/* Preset Topic Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setTopicInput('smartcat/geo123/device/command'); handleReset(); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              topicInput === 'smartcat/geo123/device/command'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-400 ring-2 ring-emerald-200 shadow-xs'
                : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
            }`}
          >
            🐱 Feed Command (Targets Feeder)
          </button>

          <button
            onClick={() => { setTopicInput('smartcat/geo123/device/status'); handleReset(); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              topicInput === 'smartcat/geo123/device/status'
                ? 'bg-blue-50 text-blue-900 border-blue-400 ring-2 ring-blue-200 shadow-xs'
                : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
            }`}
          >
            📱 App Status (Targets Mobile)
          </button>

          <button
            onClick={() => { setTopicInput('smartcat/user999/device/command'); handleReset(); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              topicInput === 'smartcat/user999/device/command'
                ? 'bg-purple-50 text-purple-900 border-purple-400 ring-2 ring-purple-200 shadow-xs'
                : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
            }`}
          >
            🔒 Other User Topic (Isolation)
          </button>

          <button
            onClick={() => { setTopicInput('sensor/kitchen/temperature'); handleReset(); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              topicInput === 'sensor/kitchen/temperature'
                ? 'bg-rose-50 text-rose-900 border-rose-400 ring-2 ring-rose-200 shadow-xs'
                : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
            }`}
          >
            ❌ Invalid Topic (Tests Error ACK)
          </button>
        </div>

        {/* Custom Editable Topic Input */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs font-semibold text-gray-600 shrink-0">Publish Topic:</span>
          <input
            type="text"
            value={topicInput}
            onChange={(e) => { setTopicInput(e.target.value); handleReset(); }}
            className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-mono text-gray-800 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cat-400"
            placeholder="Type any MQTT topic..."
          />
          {isTopicMatched ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Matches {matchedSubscriber?.name.split(' ')[0]}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 shrink-0">
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              0 Subscribers (Will Drop & Error)
            </span>
          )}
        </div>
      </div>

      {/* ── 2. Interactive SVG Canvas Simulation ─────────────────────────────────── */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-4">
        {/* Playback Controls & Status Pill */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-stone-50/90 p-3 rounded-xl border border-stone-200/90">
          <div className="flex items-center gap-2">
            <button
              onClick={isPlaying ? handlePause : handleStart}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all ${
                isPlaying ? 'bg-amber-600 hover:bg-amber-700' : 'bg-cat-500 hover:bg-cat-600 active:scale-95'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              {isPlaying ? 'Pause' : animProgress > 0 && animProgress < 100 ? 'Resume' : 'Dispatch Packet'}
            </button>

            <button
              onClick={() => setAutoLoop(!autoLoop)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                autoLoop
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-white text-gray-600 border-stone-200 hover:bg-stone-50'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Loop: {autoLoop ? 'ON' : 'OFF'}
            </button>

            <button
              onClick={handleReset}
              className="p-1.5 rounded-xl border border-stone-200 text-gray-500 hover:bg-stone-50 hover:text-gray-700 transition-all"
              title="Reset simulation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Current Status Pill */}
          <div
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border flex items-center gap-1.5 ${
              stageType === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : stageType === 'warn'
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : stageType === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-300'
                : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current animate-pulse shrink-0" />
            <span>{stageLabel}</span>
          </div>
        </div>

        {/* ── THE GRAPHICAL DIAGRAM (SVG Canvas) ──────────────────────────────── */}
        <div className="relative border border-stone-200/90 rounded-2xl bg-stone-50/50 overflow-hidden">
          <svg
            viewBox="0 0 900 440"
            className="w-full h-auto select-none font-sans"
            style={{ maxHeight: '520px' }}
          >
            <defs>
              <marker id="arrow-blue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#3b82f6" />
              </marker>
              <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
              </marker>
              <marker id="arrow-gray" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#9ca3af" />
              </marker>
              <marker id="arrow-ack" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#059669" />
              </marker>
              <marker id="arrow-error" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#dc2626" />
              </marker>
            </defs>

            {/* ── Connecting Wire: Publisher to Broker ──────────────────────── */}
            <line
              x1="210"
              y1="220"
              x2="380"
              y2="220"
              stroke={animProgress > 0 && animProgress <= 35 ? '#f97316' : '#d6d3d1'}
              strokeWidth={animProgress > 0 && animProgress <= 35 ? '3.5' : '2'}
              strokeDasharray={animProgress > 0 && animProgress <= 35 ? '5,5' : 'none'}
              markerEnd="url(#arrow-blue)"
              className="transition-all duration-300"
            />
            <text x="295" y="208" textAnchor="middle" className="text-[11px] font-bold fill-gray-700">
              PUBLISH (QoS 1)
            </text>

            {/* ── Return Wire: Broker PUBACK to Publisher (lower wire) ────────── */}
            <line
              x1="380"
              y1="235"
              x2="210"
              y2="235"
              stroke={animProgress > 35 && animProgress <= 45 ? '#10b981' : '#e7e5e4'}
              strokeWidth={animProgress > 35 && animProgress <= 45 ? '3' : '1.5'}
              strokeDasharray="4,4"
              markerEnd="url(#arrow-ack)"
            />
            {animProgress > 35 && animProgress <= 45 && (
              <text x="295" y="250" textAnchor="middle" className="text-[10px] font-bold fill-emerald-600">
                ⚡ PUBACK Confirmed (&lt;40ms)
              </text>
            )}

            {/* ── Return Wire for Error ACK (When Topic is Unmatched) ────────── */}
            {!isTopicMatched && animProgress > 58 && (
              <>
                <line
                  x1="380"
                  y1="245"
                  x2="210"
                  y2="245"
                  stroke="#dc2626"
                  strokeWidth="3"
                  strokeDasharray="4,4"
                  markerEnd="url(#arrow-error)"
                />
                <text x="295" y="260" textAnchor="middle" className="text-[10px] font-bold fill-rose-700">
                  ❌ Error ACK: 0 Subscribers (Packet Dropped)
                </text>
              </>
            )}

            {/* ── Lines from Broker to each Subscriber ────────────────────────── */}

            {/* Path to Subscriber 1: Cat Feeder (Top) */}
            <path
              d="M 520 220 C 580 220, 600 80, 670 80"
              fill="none"
              stroke={
                matchedSubscriber?.id === 'feeder' && animProgress > 45 && animProgress <= 75
                  ? '#10b981'
                  : matchedSubscriber?.id === 'feeder'
                  ? '#86efac'
                  : '#e7e5e4'
              }
              strokeWidth={matchedSubscriber?.id === 'feeder' && animProgress > 45 ? '3.5' : '2'}
              strokeDasharray={matchedSubscriber?.id === 'feeder' && animProgress > 45 ? '6,6' : 'none'}
              markerEnd={matchedSubscriber?.id === 'feeder' ? 'url(#arrow-green)' : 'url(#arrow-gray)'}
              className="transition-all duration-300"
            />

            {/* Path to Subscriber 2: Mobile App (Middle) */}
            <line
              x1="520"
              y1="220"
              x2="670"
              y2="220"
              stroke={
                matchedSubscriber?.id === 'mobile' && animProgress > 45 && animProgress <= 75
                  ? '#3b82f6'
                  : matchedSubscriber?.id === 'mobile'
                  ? '#93c5fd'
                  : '#e7e5e4'
              }
              strokeWidth={matchedSubscriber?.id === 'mobile' && animProgress > 45 ? '3.5' : '2'}
              strokeDasharray={matchedSubscriber?.id === 'mobile' && animProgress > 45 ? '6,6' : 'none'}
              markerEnd={matchedSubscriber?.id === 'mobile' ? 'url(#arrow-blue)' : 'url(#arrow-gray)'}
              className="transition-all duration-300"
            />

            {/* Path to Subscriber 3: Other Feeder (Bottom) */}
            <path
              d="M 520 220 C 580 220, 600 360, 670 360"
              fill="none"
              stroke={
                matchedSubscriber?.id === 'other_user' && animProgress > 45 && animProgress <= 75
                  ? '#8b5cf6'
                  : matchedSubscriber?.id === 'other_user'
                  ? '#c4b5fd'
                  : '#e7e5e4'
              }
              strokeWidth={matchedSubscriber?.id === 'other_user' && animProgress > 45 ? '3.5' : '2'}
              strokeDasharray={matchedSubscriber?.id === 'other_user' && animProgress > 45 ? '6,6' : 'none'}
              markerEnd={matchedSubscriber?.id === 'other_user' ? 'url(#arrow-green)' : 'url(#arrow-gray)'}
              className="transition-all duration-300"
            />

            {/* ── Return ACK Wire (From Matched Sub back to Broker) ──────────── */}
            {isTopicMatched && animProgress > 80 && (
              <path
                d={
                  matchedSubscriber?.id === 'feeder'
                    ? 'M 670 95 C 600 95, 580 230, 520 230'
                    : matchedSubscriber?.id === 'mobile'
                    ? 'M 670 230 L 520 230'
                    : 'M 670 345 C 600 345, 580 230, 520 230'
                }
                fill="none"
                stroke="#059669"
                strokeWidth="2.5"
                strokeDasharray="4,4"
                markerEnd="url(#arrow-ack)"
              />
            )}

            {/* ── 1. PUBLISHER NODE (LEFT) ───────────────────────────────────── */}
            <g transform="translate(40, 160)">
              <rect
                width="170"
                height="120"
                rx="14"
                fill="#eff6ff"
                stroke="#3b82f6"
                strokeWidth="2"
                className="shadow-sm"
              />
              <text x="85" y="24" textAnchor="middle" className="text-[12px] font-bold fill-blue-900">
                🌐 Web Client / Server
              </text>
              <text x="85" y="40" textAnchor="middle" className="text-[10px] font-semibold fill-blue-600">
                PUBLISHER
              </text>
              <rect x="8" y="52" width="154" height="28" rx="6" fill="#ffffff" stroke="#bfdbfe" />
              <text x="85" y="66" textAnchor="middle" className="text-[8.5px] font-bold fill-gray-500">
                PUBLISH TOPIC:
              </text>
              <text x="85" y="76" textAnchor="middle" className="text-[8.5px] font-mono fill-blue-950 font-bold">
                {topicInput.length > 22 ? topicInput.slice(0, 20) + '...' : topicInput}
              </text>
              <text x="85" y="103" textAnchor="middle" className="text-[9px] font-mono fill-gray-500">
                QoS 1 Acknowledged
              </text>
            </g>

            {/* ── 2. CENTRAL BROKER NODE (CENTER) ────────────────────────────── */}
            <g transform="translate(370, 145)">
              <rect
                width="160"
                height="150"
                rx="16"
                fill={
                  !isTopicMatched && animProgress > 45 && animProgress < 60
                    ? '#fee2e2'
                    : animProgress > 30 && animProgress < 50
                    ? '#fef3c7'
                    : '#fffbeb'
                }
                stroke={
                  !isTopicMatched && animProgress > 45 && animProgress < 60
                    ? '#ef4444'
                    : animProgress > 30 && animProgress < 50
                    ? '#d97706'
                    : '#f59e0b'
                }
                strokeWidth="2.5"
                className="shadow-sm transition-all"
              />
              <text x="80" y="26" textAnchor="middle" className="text-[13px] font-bold fill-amber-950">
                📡 HiveMQ Broker
              </text>
              <text x="80" y="42" textAnchor="middle" className="text-[10px] font-semibold fill-amber-700">
                broker.hivemq.com:1883
              </text>

              <rect x="10" y="52" width="140" height="48" rx="8" fill="#ffffff" stroke="#fde68a" />
              <text x="80" y="68" textAnchor="middle" className="text-[9px] font-bold fill-amber-900">
                Topic Routing Table
              </text>
              <text x="80" y="82" textAnchor="middle" className="text-[8px] font-mono fill-gray-600">
                {isTopicMatched ? 'Filter: 1 Match Found' : 'Filter: 0 Matches (DROP)'}
              </text>
              <text x="80" y="93" textAnchor="middle" className="text-[8px] font-bold fill-emerald-600">
                {isTopicMatched ? `➔ Target: ${matchedSubscriber?.name.split(' ')[0]}` : '➔ Emitting Error ACK'}
              </text>

              <circle cx="20" cy="124" r="4" fill={isTopicMatched ? '#10b981' : '#ef4444'} />
              <text x="30" y="127" className="text-[9px] font-bold fill-gray-700">
                {isTopicMatched ? 'Routing Active' : 'Unmatched / Dropped'}
              </text>
            </g>

            {/* ── 3. SUBSCRIBER NODES (RIGHT) ────────────────────────────────── */}

            {/* Subscriber 1: Cat Feeder (Top) */}
            <g transform="translate(670, 25)">
              <rect
                width="205"
                height="110"
                rx="14"
                fill={matchedSubscriber?.id === 'feeder' ? '#f0fdf4' : '#fafaf9'}
                stroke={matchedSubscriber?.id === 'feeder' ? '#22c55e' : '#d6d3d1'}
                strokeWidth={matchedSubscriber?.id === 'feeder' ? '2.5' : '1.5'}
                className="shadow-sm"
              />
              <text x="102" y="22" textAnchor="middle" className="text-[12px] font-bold fill-gray-900">
                🐱 Cat Feeder (UNO R4)
              </text>
              <text x="102" y="38" textAnchor="middle" className="text-[8.5px] font-mono font-bold fill-emerald-800">
                SUB: smartcat/geo123/device/command
              </text>

              {matchedSubscriber?.id === 'feeder' ? (
                <rect x="15" y="48" width="175" height="22" rx="6" fill="#dcfce7" stroke="#86efac" />
              ) : (
                <rect x="15" y="48" width="175" height="22" rx="6" fill="#f5f5f4" stroke="#e7e5e4" />
              )}
              <text
                x="102"
                y="63"
                textAnchor="middle"
                className={`text-[9px] font-bold ${matchedSubscriber?.id === 'feeder' ? 'fill-emerald-800' : 'fill-gray-400'}`}
              >
                {matchedSubscriber?.id === 'feeder' ? '✅ TOPIC MATCH — ACCEPTS' : '❌ Topic Mismatch — Ignored'}
              </text>

              <text x="102" y="93" textAnchor="middle" className="text-[9px] font-medium fill-gray-600">
                {matchedSubscriber?.id === 'feeder' && animProgress >= 70 && animProgress <= 85
                  ? '🥣 Servo Rotates 90° (Dispensing!)'
                  : 'Rotates servo to dispense food'}
              </text>
            </g>

            {/* Subscriber 2: Owner Mobile App (Middle) */}
            <g transform="translate(670, 165)">
              <rect
                width="205"
                height="110"
                rx="14"
                fill={matchedSubscriber?.id === 'mobile' ? '#f0fdf4' : '#fafaf9'}
                stroke={matchedSubscriber?.id === 'mobile' ? '#22c55e' : '#d6d3d1'}
                strokeWidth={matchedSubscriber?.id === 'mobile' ? '2.5' : '1.5'}
                className="shadow-sm"
              />
              <text x="102" y="22" textAnchor="middle" className="text-[12px] font-bold fill-gray-900">
                📱 Owner Mobile App
              </text>
              <text x="102" y="38" textAnchor="middle" className="text-[8.5px] font-mono font-bold fill-blue-800">
                SUB: smartcat/geo123/device/status
              </text>

              {matchedSubscriber?.id === 'mobile' ? (
                <rect x="15" y="48" width="175" height="22" rx="6" fill="#dcfce7" stroke="#86efac" />
              ) : (
                <rect x="15" y="48" width="175" height="22" rx="6" fill="#f5f5f4" stroke="#e7e5e4" />
              )}
              <text
                x="102"
                y="63"
                textAnchor="middle"
                className={`text-[9px] font-bold ${matchedSubscriber?.id === 'mobile' ? 'fill-emerald-800' : 'fill-gray-400'}`}
              >
                {matchedSubscriber?.id === 'mobile' ? '✅ TOPIC MATCH — ACCEPTS' : '❌ Topic Mismatch — Ignored'}
              </text>

              <text x="102" y="93" textAnchor="middle" className="text-[9px] font-medium fill-gray-600">
                Receives telemetry & status alerts
              </text>
            </g>

            {/* Subscriber 3: Other Feeder (Bottom) */}
            <g transform="translate(670, 305)">
              <rect
                width="205"
                height="110"
                rx="14"
                fill={matchedSubscriber?.id === 'other_user' ? '#f0fdf4' : '#fafaf9'}
                stroke={matchedSubscriber?.id === 'other_user' ? '#22c55e' : '#d6d3d1'}
                strokeWidth={matchedSubscriber?.id === 'other_user' ? '2.5' : '1.5'}
                className="shadow-sm"
              />
              <text x="102" y="22" textAnchor="middle" className="text-[12px] font-bold fill-gray-900">
                🔒 Feeder B (Other User)
              </text>
              <text x="102" y="38" textAnchor="middle" className="text-[8.5px] font-mono font-bold fill-purple-800">
                SUB: smartcat/user999/device/command
              </text>

              {matchedSubscriber?.id === 'other_user' ? (
                <rect x="15" y="48" width="175" height="22" rx="6" fill="#dcfce7" stroke="#86efac" />
              ) : (
                <rect x="15" y="48" width="175" height="22" rx="6" fill="#f5f5f4" stroke="#e7e5e4" />
              )}
              <text
                x="102"
                y="63"
                textAnchor="middle"
                className={`text-[9px] font-bold ${matchedSubscriber?.id === 'other_user' ? 'fill-emerald-800' : 'fill-gray-400'}`}
              >
                {matchedSubscriber?.id === 'other_user' ? '✅ TOPIC MATCH — ACCEPTS' : '❌ Topic Mismatch — Ignored'}
              </text>

              <text x="102" y="93" textAnchor="middle" className="text-[9px] font-medium fill-gray-600">
                Multi-tenant isolation for user999
              </text>
            </g>

            {/* ── THE LUMINOUS GLOWING PARTICLEDOT (NO TEXT ON DOT) ───────────── */}
            {dot.visible && (
              <g transform={`translate(${dot.x}, ${dot.y})`}>
                {/* Outer radar ripple ring */}
                <circle
                  r="22"
                  fill={dot.glowColor}
                  opacity="0.35"
                  className="animate-ping"
                />
                {/* Mid glow disc */}
                <circle
                  r="14"
                  fill={dot.glowColor}
                  opacity="0.8"
                />
                {/* Core bright particle dot */}
                <circle
                  r="8"
                  fill={dot.color}
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  className="shadow-lg"
                />
              </g>
            )}
          </svg>
        </div>

        {/* ── 3. Educational Concept Cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 text-xs space-y-1">
            <span className="font-bold text-blue-900 block">1. Decoupled Communication</span>
            <p className="text-gray-700">
              The publisher does not know the IP address or status of the cat feeder. It simply publishes a packet with a topic key.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 text-xs space-y-1">
            <span className="font-bold text-amber-900 block">2. Topic-Based Filtering</span>
            <p className="text-gray-700">
              The broker maintains a lookup table. If a packet has no subscribers (e.g. invalid topic), it is dropped and an error ACK is returned.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 text-xs space-y-1">
            <span className="font-bold text-emerald-900 block">3. Multi-Tenant Isolation</span>
            <p className="text-gray-700">
              User 999 cannot trigger your feeder because their device subscribes to <code className="text-[10px] font-bold">.../user999/...</code> while yours listens on <code className="text-[10px] font-bold">.../geo123/...</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
