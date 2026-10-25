// SmartCat Feeder - Visual MQTT Architecture & Multi-Subscriber Flow Simulator
// 100% Light Theme, Graphical Node-and-Line Flow, Interactive Moving Data Packets,
// Demonstrates Topic-Based Routing & Delivery ONLY to Subscribed Devices.

import { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Play,
  Pause,
  RotateCcw,
  Activity
} from 'lucide-react';

type TopicPreset = 'feed' | 'status' | 'other_user';

export default function ArchitecturePage() {
  const [selectedTopic, setSelectedTopic] = useState<TopicPreset>('feed');
  const [animProgress, setAnimProgress] = useState<number>(0); // 0 to 100
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [autoLoop, setAutoLoop] = useState<boolean>(false);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Active topic string based on selection
  const currentPublishedTopic =
    selectedTopic === 'feed'
      ? 'smartcat/geo123/device/command'
      : selectedTopic === 'status'
      ? 'smartcat/geo123/device/status'
      : 'smartcat/user999/device/command';

  const currentPayloadSummary =
    selectedTopic === 'feed'
      ? '{"cmd": "feed", "portion": 1}'
      : selectedTopic === 'status'
      ? '{"status": "online", "rssi": -45}'
      : '{"cmd": "feed", "user": "user999"}';

  // Determine which subscriber matches this topic
  const matchingSubscriberId =
    selectedTopic === 'feed' ? 'feeder' : selectedTopic === 'status' ? 'mobile' : 'neighbor';

  // Smooth animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const stepDurationMs = 4500; // 4.5s for full round-trip journey

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      setAnimProgress((prev) => {
        const next = prev + (delta / stepDurationMs) * 100;
        if (next >= 100) {
          if (!autoLoop) {
            setIsPlaying(false);
            return 100;
          }
          return 0; // restart loop
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
  }, [isPlaying, autoLoop]);

  const handleStart = () => {
    if (animProgress >= 100) {
      setAnimProgress(0);
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setAnimProgress(0);
  };

  // ── Coordinates for the SVG Canvas ───────────────────────────────────────────
  // Canvas width: 900, height: 440
  const pubPos = { x: 130, y: 220 };
  const brokerPos = { x: 450, y: 220 };
  const subPositions: Record<string, { x: number; y: number }> = {
    feeder: { x: 770, y: 80 },
    mobile: { x: 770, y: 220 },
    neighbor: { x: 770, y: 360 },
  };

  // Current stage calculation:
  // Phase 1 (0 - 32%): Outbound Publisher -> Broker
  // Phase 2 (32 - 46%): At Broker (Topic evaluation & Broker PUBACK)
  // Phase 3 (46 - 72%): Broker -> Subscribed Subscriber
  // Phase 4 (72 - 82%): Subscriber actuates & prepares ACK
  // Phase 5 (82 - 100%): Return ACK from Subscriber -> Broker -> Publisher
  let currentStageText = 'Idle - Ready to dispatch packet';
  let stageBadgeColor = 'bg-stone-100 text-stone-600 border-stone-200';

  let packetPos = { x: pubPos.x, y: pubPos.y, visible: false, isAck: false, label: '' };

  if (animProgress > 0 && animProgress <= 32) {
    // Stage 1: Moving from Publisher to Broker
    const t = animProgress / 32;
    packetPos = {
      x: pubPos.x + (brokerPos.x - pubPos.x) * t,
      y: pubPos.y,
      visible: true,
      isAck: false,
      label: currentPayloadSummary,
    };
    currentStageText = `1. Publisher sends packet on [${currentPublishedTopic}] ➔ Traveling to Broker`;
    stageBadgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
  } else if (animProgress > 32 && animProgress <= 46) {
    // Stage 2: In Broker, Broker sends PUBACK back & filters topics
    packetPos = {
      x: brokerPos.x,
      y: brokerPos.y,
      visible: true,
      isAck: false,
      label: 'Filtering...',
    };
    currentStageText = `2. Broker receives packet! Emits PUBACK and evaluates topic filters`;
    stageBadgeColor = 'bg-amber-50 text-amber-800 border-amber-300';
  } else if (animProgress > 46 && animProgress <= 72) {
    // Stage 3: Moving from Broker to Matched Subscriber
    const target = subPositions[matchingSubscriberId];
    const t = (animProgress - 46) / (72 - 46);
    // Cubic bezier interpolation
    const startX = brokerPos.x;
    const startY = brokerPos.y;
    const endX = target.x;
    const endY = target.y;

    packetPos = {
      x: startX + (endX - startX) * t,
      y: startY + (endY - startY) * t,
      visible: true,
      isAck: false,
      label: currentPayloadSummary,
    };
    currentStageText = `3. Topic MATCH! Broker pushes packet ONLY to matching subscriber`;
    stageBadgeColor = 'bg-purple-50 text-purple-700 border-purple-200';
  } else if (animProgress > 72 && animProgress <= 82) {
    // Stage 4: Arrived at Subscriber
    const target = subPositions[matchingSubscriberId];
    packetPos = {
      x: target.x,
      y: target.y,
      visible: true,
      isAck: true,
      label: 'Processing',
    };
    currentStageText = `4. Subscriber received packet! Triggering action (Servo 90°) & generating ACK`;
    stageBadgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-300';
  } else if (animProgress > 82 && animProgress <= 100) {
    // Stage 5: Reverse ACK traveling back to Publisher
    const source = subPositions[matchingSubscriberId];
    const t = (animProgress - 82) / (100 - 82);

    // Moves from Subscriber -> Broker -> Publisher
    let ackX = source.x;
    let ackY = source.y;
    if (t < 0.5) {
      // Sub -> Broker
      const localT = t / 0.5;
      ackX = source.x + (brokerPos.x - source.x) * localT;
      ackY = source.y + (brokerPos.y - source.y) * localT;
    } else {
      // Broker -> Publisher
      const localT = (t - 0.5) / 0.5;
      ackX = brokerPos.x + (pubPos.x - brokerPos.x) * localT;
      ackY = brokerPos.y;
    }

    packetPos = {
      x: ackX,
      y: ackY,
      visible: true,
      isAck: true,
      label: 'ACK: Success',
    };
    currentStageText = `5. Return Response/ACK packet returns to Publisher: Confirmed!`;
    stageBadgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-300';
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-5xl mx-auto">
      {/* ── Page Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">MQTT Architecture</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Interactive Simulation
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-0.5">
            Topic-based publish/subscribe routing & packet flow
          </p>
        </div>

        {/* Topic Selector Pills */}
        <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl border border-stone-200">
          <button
            onClick={() => { setSelectedTopic('feed'); handleReset(); }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              selectedTopic === 'feed'
                ? 'bg-white text-orange-700 shadow-2xs border border-stone-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            🐱 Feed Command
          </button>
          <button
            onClick={() => { setSelectedTopic('status'); handleReset(); }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              selectedTopic === 'status'
                ? 'bg-white text-blue-700 shadow-2xs border border-stone-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            📱 App Status
          </button>
          <button
            onClick={() => { setSelectedTopic('other_user'); handleReset(); }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              selectedTopic === 'other_user'
                ? 'bg-white text-purple-700 shadow-2xs border border-stone-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            🔒 Other User Topic
          </button>
        </div>
      </div>

      {/* ── 1. Compact Definition Box ───────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-orange-50/70 via-amber-50/40 to-stone-50 border border-amber-200/80 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Radio className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-100/70 px-1.5 py-0.5 rounded">
                MQTT Core Rule
              </span>
              <p className="text-sm text-gray-800 font-medium">
                Publishers send messages to a <strong className="text-gray-900">Topic</strong>. The <strong className="text-amber-800">Broker</strong> delivers each packet <span className="underline decoration-orange-400 font-semibold">ONLY</span> to subscribers that registered matching topics.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Interactive SVG Canvas Simulation ─────────────────────────────────── */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-4">
        {/* Controls Bar */}
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
          <div className={`text-xs font-semibold px-3 py-1 rounded-full border flex items-center gap-1.5 ${stageBadgeColor}`}>
            <span className="w-2 h-2 rounded-full bg-current animate-pulse shrink-0" />
            <span>{currentStageText}</span>
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
              {/* Arrow Marker Definitions */}
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
            </defs>

            {/* ── Connecting Wire: Publisher to Broker ──────────────────────── */}
            <line
              x1="210"
              y1="220"
              x2="380"
              y2="220"
              stroke={animProgress > 0 && animProgress <= 35 ? '#3b82f6' : '#d6d3d1'}
              strokeWidth={animProgress > 0 && animProgress <= 35 ? '3.5' : '2'}
              strokeDasharray={animProgress > 0 && animProgress <= 35 ? '5,5' : 'none'}
              markerEnd="url(#arrow-blue)"
              className="transition-all duration-300"
            />
            {/* Publisher to Broker Label */}
            <text x="295" y="208" textAnchor="middle" className="text-[11px] font-bold fill-blue-600">
              PUBLISH (QoS 1)
            </text>

            {/* ── Return Wire: Broker PUBACK to Publisher (lower wire) ────────── */}
            <line
              x1="380"
              y1="235"
              x2="210"
              y2="235"
              stroke={animProgress > 32 && animProgress <= 46 ? '#10b981' : '#e7e5e4'}
              strokeWidth={animProgress > 32 && animProgress <= 46 ? '3' : '1.5'}
              strokeDasharray="4,4"
              markerEnd="url(#arrow-ack)"
            />
            {animProgress > 32 && animProgress <= 46 && (
              <text x="295" y="250" textAnchor="middle" className="text-[10px] font-bold fill-emerald-600">
                ⚡ PUBACK Confirmed (&lt;40ms)
              </text>
            )}

            {/* ── Lines from Broker to each Subscriber ────────────────────────── */}

            {/* Path to Subscriber 1: Cat Feeder (Top) */}
            <path
              d="M 520 220 C 580 220, 600 80, 670 80"
              fill="none"
              stroke={
                matchingSubscriberId === 'feeder' && animProgress > 45 && animProgress <= 75
                  ? '#10b981'
                  : matchingSubscriberId === 'feeder'
                  ? '#86efac'
                  : '#e7e5e4'
              }
              strokeWidth={matchingSubscriberId === 'feeder' && animProgress > 45 ? '3.5' : '2'}
              strokeDasharray={matchingSubscriberId === 'feeder' && animProgress > 45 ? '6,6' : 'none'}
              markerEnd={matchingSubscriberId === 'feeder' ? 'url(#arrow-green)' : 'url(#arrow-gray)'}
              className="transition-all duration-300"
            />

            {/* Path to Subscriber 2: Mobile App (Middle) */}
            <line
              x1="520"
              y1="220"
              x2="670"
              y2="220"
              stroke={
                matchingSubscriberId === 'mobile' && animProgress > 45 && animProgress <= 75
                  ? '#3b82f6'
                  : matchingSubscriberId === 'mobile'
                  ? '#93c5fd'
                  : '#e7e5e4'
              }
              strokeWidth={matchingSubscriberId === 'mobile' && animProgress > 45 ? '3.5' : '2'}
              strokeDasharray={matchingSubscriberId === 'mobile' && animProgress > 45 ? '6,6' : 'none'}
              markerEnd={matchingSubscriberId === 'mobile' ? 'url(#arrow-blue)' : 'url(#arrow-gray)'}
              className="transition-all duration-300"
            />

            {/* Path to Subscriber 3: Neighbor (Bottom) */}
            <path
              d="M 520 220 C 580 220, 600 360, 670 360"
              fill="none"
              stroke={
                matchingSubscriberId === 'neighbor' && animProgress > 45 && animProgress <= 75
                  ? '#8b5cf6'
                  : matchingSubscriberId === 'neighbor'
                  ? '#c4b5fd'
                  : '#e7e5e4'
              }
              strokeWidth={matchingSubscriberId === 'neighbor' && animProgress > 45 ? '3.5' : '2'}
              strokeDasharray={matchingSubscriberId === 'neighbor' && animProgress > 45 ? '6,6' : 'none'}
              markerEnd={matchingSubscriberId === 'neighbor' ? 'url(#arrow-green)' : 'url(#arrow-gray)'}
              className="transition-all duration-300"
            />

            {/* ── Return ACK Wire (From Matched Sub back to Broker) ──────────── */}
            {animProgress > 80 && (
              <path
                d={
                  matchingSubscriberId === 'feeder'
                    ? 'M 670 95 C 600 95, 580 230, 520 230'
                    : matchingSubscriberId === 'mobile'
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
              <text x="85" y="26" textAnchor="middle" className="text-[12px] font-bold fill-blue-900">
                🌐 Web / Cloud API
              </text>
              <text x="85" y="44" textAnchor="middle" className="text-[10px] font-semibold fill-blue-600">
                PUBLISHER
              </text>
              <rect x="10" y="55" width="150" height="24" rx="6" fill="#ffffff" stroke="#bfdbfe" />
              <text x="85" y="71" textAnchor="middle" className="text-[9px] font-mono fill-blue-950 font-semibold">
                PUB: {currentPublishedTopic.length > 22 ? currentPublishedTopic.slice(0, 20) + '...' : currentPublishedTopic}
              </text>
              <text x="85" y="102" textAnchor="middle" className="text-[9px] font-mono fill-gray-500">
                {currentPayloadSummary}
              </text>
            </g>

            {/* ── 2. CENTRAL BROKER NODE (CENTER) ────────────────────────────── */}
            <g transform="translate(370, 150)">
              <rect
                width="160"
                height="140"
                rx="16"
                fill={animProgress > 30 && animProgress < 50 ? '#fef3c7' : '#fffbeb'}
                stroke={animProgress > 30 && animProgress < 50 ? '#d97706' : '#f59e0b'}
                strokeWidth={animProgress > 30 && animProgress < 50 ? '3' : '2'}
                className="shadow-sm"
              />
              <text x="80" y="28" textAnchor="middle" className="text-[13px] font-bold fill-amber-950">
                📡 HiveMQ Broker
              </text>
              <text x="80" y="46" textAnchor="middle" className="text-[10px] font-semibold fill-amber-700">
                broker.hivemq.com:1883
              </text>

              <rect x="12" y="56" width="136" height="42" rx="8" fill="#ffffff" stroke="#fde68a" />
              <text x="80" y="73" textAnchor="middle" className="text-[9px] font-bold fill-amber-900">
                Topic Filter Engine
              </text>
              <text x="80" y="88" textAnchor="middle" className="text-[8px] font-mono fill-gray-600">
                Matches & Dispatches
              </text>

              {/* Status Indicator */}
              <circle cx="24" cy="118" r="4" fill="#10b981" />
              <text x="34" y="121" className="text-[9px] font-bold fill-gray-700">
                Active & Listening
              </text>
            </g>

            {/* ── 3. SUBSCRIBER NODES (RIGHT) ────────────────────────────────── */}

            {/* Subscriber 1: Cat Feeder (Top) */}
            <g transform="translate(670, 25)">
              <rect
                width="200"
                height="110"
                rx="14"
                fill={matchingSubscriberId === 'feeder' ? '#f0fdf4' : '#fafaf9'}
                stroke={matchingSubscriberId === 'feeder' ? '#22c55e' : '#d6d3d1'}
                strokeWidth={matchingSubscriberId === 'feeder' ? '2.5' : '1.5'}
                className="shadow-sm"
              />
              <text x="100" y="24" textAnchor="middle" className="text-[12px] font-bold fill-gray-900">
                🐱 Cat Feeder (UNO R4)
              </text>
              <text x="100" y="40" textAnchor="middle" className="text-[10px] font-semibold fill-emerald-700">
                SUB: smartcat/geo123/device/command
              </text>

              {/* Match or Mismatch Badge */}
              {matchingSubscriberId === 'feeder' ? (
                <rect x="25" y="50" width="150" height="22" rx="6" fill="#dcfce7" stroke="#86efac" />
              ) : (
                <rect x="25" y="50" width="150" height="22" rx="6" fill="#f5f5f4" stroke="#e7e5e4" />
              )}
              <text
                x="100"
                y="65"
                textAnchor="middle"
                className={`text-[9px] font-bold ${matchingSubscriberId === 'feeder' ? 'fill-emerald-800' : 'fill-gray-400'}`}
              >
                {matchingSubscriberId === 'feeder' ? '✅ TOPIC MATCH - ACCEPTS' : '❌ Topic Mismatch - Ignored'}
              </text>

              <text x="100" y="93" textAnchor="middle" className="text-[9px] font-medium fill-gray-600">
                {matchingSubscriberId === 'feeder' && animProgress >= 70 && animProgress <= 85
                  ? '🥣 Servo Rotates 90° (Food Out!)'
                  : 'Triggers physical servo dispenser'}
              </text>
            </g>

            {/* Subscriber 2: Owner Mobile App (Middle) */}
            <g transform="translate(670, 165)">
              <rect
                width="200"
                height="110"
                rx="14"
                fill={matchingSubscriberId === 'mobile' ? '#f0fdf4' : '#fafaf9'}
                stroke={matchingSubscriberId === 'mobile' ? '#22c55e' : '#d6d3d1'}
                strokeWidth={matchingSubscriberId === 'mobile' ? '2.5' : '1.5'}
                className="shadow-sm"
              />
              <text x="100" y="24" textAnchor="middle" className="text-[12px] font-bold fill-gray-900">
                📱 Owner Mobile App
              </text>
              <text x="100" y="40" textAnchor="middle" className="text-[10px] font-semibold fill-blue-700">
                SUB: smartcat/geo123/device/status
              </text>

              {/* Match or Mismatch Badge */}
              {matchingSubscriberId === 'mobile' ? (
                <rect x="25" y="50" width="150" height="22" rx="6" fill="#dcfce7" stroke="#86efac" />
              ) : (
                <rect x="25" y="50" width="150" height="22" rx="6" fill="#f5f5f4" stroke="#e7e5e4" />
              )}
              <text
                x="100"
                y="65"
                textAnchor="middle"
                className={`text-[9px] font-bold ${matchingSubscriberId === 'mobile' ? 'fill-emerald-800' : 'fill-gray-400'}`}
              >
                {matchingSubscriberId === 'mobile' ? '✅ TOPIC MATCH - ACCEPTS' : '❌ Topic Mismatch - Ignored'}
              </text>

              <text x="100" y="93" textAnchor="middle" className="text-[9px] font-medium fill-gray-600">
                Displays live alerts & feeds count
              </text>
            </g>

            {/* Subscriber 3: Neighbor (Bottom) */}
            <g transform="translate(670, 305)">
              <rect
                width="200"
                height="110"
                rx="14"
                fill={matchingSubscriberId === 'neighbor' ? '#f0fdf4' : '#fafaf9'}
                stroke={matchingSubscriberId === 'neighbor' ? '#22c55e' : '#d6d3d1'}
                strokeWidth={matchingSubscriberId === 'neighbor' ? '2.5' : '1.5'}
                className="shadow-sm"
              />
              <text x="100" y="24" textAnchor="middle" className="text-[12px] font-bold fill-gray-900">
                🔒 Feeder B (Other User)
              </text>
              <text x="100" y="40" textAnchor="middle" className="text-[10px] font-semibold fill-purple-700">
                SUB: smartcat/user999/device/command
              </text>

              {/* Match or Mismatch Badge */}
              {matchingSubscriberId === 'neighbor' ? (
                <rect x="25" y="50" width="150" height="22" rx="6" fill="#dcfce7" stroke="#86efac" />
              ) : (
                <rect x="25" y="50" width="150" height="22" rx="6" fill="#f5f5f4" stroke="#e7e5e4" />
              )}
              <text
                x="100"
                y="65"
                textAnchor="middle"
                className={`text-[9px] font-bold ${matchingSubscriberId === 'neighbor' ? 'fill-emerald-800' : 'fill-gray-400'}`}
              >
                {matchingSubscriberId === 'neighbor' ? '✅ TOPIC MATCH - ACCEPTS' : '❌ Topic Mismatch - Ignored'}
              </text>

              <text x="100" y="93" textAnchor="middle" className="text-[9px] font-medium fill-gray-600">
                Isolated namespace for user 999
              </text>
            </g>

            {/* ── ANIMATED FLYING DATA PACKET ─────────────────────────────────── */}
            {packetPos.visible && (
              <g transform={`translate(${packetPos.x}, ${packetPos.y})`}>
                {/* Glow circle */}
                <circle
                  r="20"
                  fill={packetPos.isAck ? '#10b981' : '#f97316'}
                  opacity="0.25"
                  className="animate-ping"
                />
                {/* Solid packet bubble */}
                <rect
                  x="-45"
                  y="-16"
                  width="90"
                  height="32"
                  rx="16"
                  fill={packetPos.isAck ? '#059669' : '#ea580c'}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="shadow-lg"
                />
                <text
                  x="0"
                  y="4"
                  textAnchor="middle"
                  className="text-[10px] font-extrabold fill-white tracking-tight"
                >
                  {packetPos.isAck ? '✅ ACK/REP' : '📦 PACKET'}
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* ── Explanatory Legend Underneath ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/40 text-xs">
            <span className="font-bold text-blue-900 block mb-0.5">1. Target Topic Tagging</span>
            <p className="text-gray-700">Publisher attaches a specific topic key like <code className="text-[11px] font-bold">smartcat/geo123/device/command</code> to the packet.</p>
          </div>

          <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/40 text-xs">
            <span className="font-bold text-amber-900 block mb-0.5">2. Central Broker Filtering</span>
            <p className="text-gray-700">HiveMQ Broker checks its active routing table and filters out all mismatched subscribers instantly.</p>
          </div>

          <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 text-xs">
            <span className="font-bold text-emerald-900 block mb-0.5">3. Multi-Subscriber Delivery</span>
            <p className="text-gray-700">Packet arrives <strong className="text-emerald-800">ONLY</strong> at the subscribed device. Cat Feeder triggers its servo and returns an ACK!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
