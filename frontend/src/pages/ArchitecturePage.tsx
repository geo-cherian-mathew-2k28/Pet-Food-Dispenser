// SmartCat Feeder - Visual Graphical MQTT Flowchart & Architecture
// Designed for crystal-clear clarity: Producer, Broker, Subscriber & Topic Isolation.
// 100% Light Theme, graphical flowchart diagrams, no code or dense walls of text.

import { useState, useEffect } from 'react';
import api from '../lib/api';
import {
  Send,
  Radio,
  Cpu,
  Globe,
  ArrowRight,
  CheckCircle2,
  Play,
  RotateCcw,
  Sparkles,
  RefreshCw,
  Activity,
  Layers
} from 'lucide-react';

interface DeviceStatusResponse {
  device?: {
    status: 'ONLINE' | 'OFFLINE';
    lastHeartbeatAt: string | null;
    uptimeSeconds: number | null;
    wifiStrength: number | null;
    servoOpenDurationMs: number;
    feedCooldownSeconds: number;
  };
  mqttConnected: boolean;
  isDispensing: boolean;
}

type FlowScenario = 'feed' | 'response' | 'heartbeat';

interface FlowStep {
  stepNumber: number;
  producerName: string;
  producerRole: string;
  brokerAction: string;
  subscriberName: string;
  subscriberRole: string;
  topic: string;
  packetSummary: string;
  activePoint: 'producer' | 'broker' | 'subscriber';
}

const FLOW_SCENARIOS: Record<FlowScenario, {
  title: string;
  shortDesc: string;
  color: string;
  steps: FlowStep[];
}> = {
  feed: {
    title: '🐱 Triggering Food (Feed Command)',
    shortDesc: 'You click "Feed Now" on your phone/laptop → Cat gets food in 1 second!',
    color: 'border-orange-200 bg-orange-50/40 text-orange-800',
    steps: [
      {
        stepNumber: 1,
        producerName: 'Web Browser / Phone',
        producerRole: 'PRODUCER (Sender)',
        brokerAction: 'Accepting HTTP click...',
        subscriberName: 'Backend Server',
        subscriberRole: 'Cloud API Worker',
        topic: '/api/feeds/now',
        packetSummary: 'You click "Feed Now" → Your browser tells the cloud server: "Dispense 1 portion of food!"',
        activePoint: 'producer',
      },
      {
        stepNumber: 2,
        producerName: 'Backend Server',
        producerRole: 'PRODUCER (MQTT Publisher)',
        brokerAction: 'Routing packet instantly (<50ms)...',
        subscriberName: 'HiveMQ Cloud Broker',
        subscriberRole: 'BROKER (Central Post Office)',
        topic: 'smartcat/geo123/device/command',
        packetSummary: 'Server wraps the command into a tiny MQTT packet and sends it to the central Post Office (Broker).',
        activePoint: 'broker',
      },
      {
        stepNumber: 3,
        producerName: 'HiveMQ Cloud Broker',
        producerRole: 'BROKER (Central Post Office)',
        brokerAction: 'Pushing directly to subscriber...',
        subscriberName: 'Arduino Feeder (UNO R4)',
        subscriberRole: 'SUBSCRIBER (Receiver & Actor)',
        topic: 'smartcat/geo123/device/command',
        packetSummary: 'The Broker pushes the packet directly to the Cat Feeder! The servo motor rotates and drops food into the bowl! 🥣',
        activePoint: 'subscriber',
      },
    ],
  },
  response: {
    title: '✅ Food Dropped Confirmation',
    shortDesc: 'Feeder says "Food delivered!" → Web dashboard shows green checkmark!',
    color: 'border-emerald-200 bg-emerald-50/40 text-emerald-800',
    steps: [
      {
        stepNumber: 1,
        producerName: 'Arduino Feeder (UNO R4)',
        producerRole: 'PRODUCER (Now Feeder is Sender!)',
        brokerAction: 'Food dispensed. Preparing ACK...',
        subscriberName: 'HiveMQ Cloud Broker',
        subscriberRole: 'BROKER (Central Post Office)',
        topic: 'smartcat/geo123/device/response',
        packetSummary: 'The motor finishes rotating! Feeder sends a quick letter: "Done! 1 portion dispensed in 1500ms".',
        activePoint: 'producer',
      },
      {
        stepNumber: 2,
        producerName: 'HiveMQ Cloud Broker',
        producerRole: 'BROKER (Post Office)',
        brokerAction: 'Forwarding to subscribed backend...',
        subscriberName: 'Backend Server',
        subscriberRole: 'SUBSCRIBER (Cloud Database)',
        topic: 'smartcat/geo123/device/response',
        packetSummary: 'The Broker delivers the letter to the Server. Server logs SUCCESS into Supabase.',
        activePoint: 'broker',
      },
      {
        stepNumber: 3,
        producerName: 'Backend Server',
        producerRole: 'Notifier',
        brokerAction: 'Resolving browser awaiter...',
        subscriberName: 'Your Web Dashboard',
        subscriberRole: 'SUBSCRIBER (User Screen)',
        topic: 'HTTP 200 / WebSocket',
        packetSummary: 'Your web dashboard turns green: "Food dispensed successfully!" The button starts its cooldown lock.',
        activePoint: 'subscriber',
      },
    ],
  },
  heartbeat: {
    title: '💓 25-Second "I am Alive" Pulse',
    shortDesc: 'Feeder automatically reports Wi-Fi signal & uptime every 25 seconds.',
    color: 'border-blue-200 bg-blue-50/40 text-blue-800',
    steps: [
      {
        stepNumber: 1,
        producerName: 'Arduino Feeder (UNO R4)',
        producerRole: 'PRODUCER (Telemetry Sensor)',
        brokerAction: 'Reading Wi-Fi dBm and uptime...',
        subscriberName: 'HiveMQ Cloud Broker',
        subscriberRole: 'BROKER (Message Router)',
        topic: 'smartcat/geo123/device/heartbeat',
        packetSummary: 'Feeder sends a 40-byte ping: "I am online! Wi-Fi: -62dBm, Uptime: 450s".',
        activePoint: 'producer',
      },
      {
        stepNumber: 2,
        producerName: 'HiveMQ Cloud Broker',
        producerRole: 'BROKER (Message Router)',
        brokerAction: 'Sorting ping to server queue...',
        subscriberName: 'Backend Server',
        subscriberRole: 'SUBSCRIBER (Device Watchdog)',
        topic: 'smartcat/geo123/device/heartbeat',
        packetSummary: 'Broker pushes the ping to the server watchdog. Server updates the green ONLINE badge.',
        activePoint: 'subscriber',
      },
      {
        stepNumber: 3,
        producerName: 'System Watchdog',
        producerRole: 'Safety Sentinel',
        brokerAction: 'Timer reset to 0...',
        subscriberName: 'Live Dashboard',
        subscriberRole: 'Live Monitor',
        topic: 'Heartbeat State: HEALTHY',
        packetSummary: 'If no ping arrives for 120s (e.g. power cut), the server safely marks device as OFFLINE.',
        activePoint: 'subscriber',
      },
    ],
  },
};

export default function ArchitecturePage() {
  const [deviceInfo, setDeviceInfo] = useState<DeviceStatusResponse | null>(null);
  const [activeScenario, setActiveScenario] = useState<FlowScenario>('feed');
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [selectedUserTopic, setSelectedUserTopic] = useState<'geo' | 'alice' | 'bob'>('geo');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const scenarioData = FLOW_SCENARIOS[activeScenario];
  const step = scenarioData.steps[currentStepIdx] || scenarioData.steps[0];

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentStepIdx((prev) => (prev + 1) % scenarioData.steps.length);
      }, 2600);
    }
    return () => clearInterval(timer);
  }, [isPlaying, scenarioData.steps.length]);

  useEffect(() => {
    // Fetch live device status
    api.get('/device/status')
      .then((res) => setDeviceInfo(res.data))
      .catch(() => {});
  }, []);

  const handleSelectScenario = (key: FlowScenario) => {
    setActiveScenario(key);
    setCurrentStepIdx(0);
    setIsPlaying(false);
  };

  return (
    <div className="space-y-8 animate-slide-up pb-12 max-w-6xl mx-auto">
      {/* ─── Page Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cat-100 text-cat-700 border border-cat-200">
              Interactive System Flowchart
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Real-Time MQTT QoS 1
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 mt-1.5 tracking-tight">
            How SmartCat Feeder Works
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Visual explanation of the 3 roles: <b>Producer</b>, <b>Broker</b>, and <b>Subscriber</b>.
          </p>
        </div>

        {/* Live Device Pill */}
        <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-xs flex items-center gap-3 self-start sm:self-auto">
          <div className={`w-3 h-3 rounded-full ${deviceInfo?.device?.status === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          <div className="text-xs">
            <p className="font-bold text-gray-900">
              Hardware: {deviceInfo?.device?.status === 'ONLINE' ? 'Arduino UNO R4 (Online)' : 'Feeder (Offline)'}
            </p>
            <p className="text-gray-500 font-mono text-[11px]">
              Broker: {deviceInfo?.mqttConnected ? 'HiveMQ Cloud Connected' : 'Checking Broker...'}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Section 1: The 8-Year-Old Explanation of MQTT ────────────────────── */}
      <div className="bg-gradient-to-r from-orange-50/70 via-amber-50/50 to-stone-50 border border-orange-200/80 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-cat-500 text-white rounded-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">
            What is MQTT? (The Post Office Analogy)
          </h2>
        </div>
        
        <p className="text-sm text-gray-700 mb-6 leading-relaxed max-w-3xl">
          Imagine you want to send a message to your friend. With regular websites (HTTP), you have to call them and wait for them to answer. 
          With <b>MQTT</b>, there is a magical <b>Post Office (Broker)</b> that handles everything in 0.05 seconds!
        </p>

        {/* 3 Core Roles: Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Producer */}
          <div className="bg-white border-2 border-orange-200 rounded-xl p-5 shadow-xs relative overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-3 font-extrabold text-lg">
              1
            </div>
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
              The Sender
            </span>
            <h3 className="text-base font-bold text-gray-900 mt-2">1. PRODUCER (Publisher)</h3>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              Creates a message and drops it off with an address called a <b>Topic</b>.
            </p>
            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-700 font-medium">
              <span className="text-gray-400">In this project:</span> <br/>
              <b>Your Phone / Web App</b> when clicking Feed!
            </div>
          </div>

          {/* 2. Broker */}
          <div className="bg-white border-2 border-amber-300 rounded-xl p-5 shadow-xs relative overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3 font-extrabold text-lg">
              2
            </div>
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              The Post Office
            </span>
            <h3 className="text-base font-bold text-gray-900 mt-2">2. BROKER (Central Hub)</h3>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              Never sleeps! Instantly routes messages to whoever subscribed to that exact Topic.
            </p>
            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-700 font-medium">
              <span className="text-gray-400">In this project:</span> <br/>
              <b>HiveMQ Cloud Cluster</b> in Frankfurt, Germany.
            </div>
          </div>

          {/* 3. Subscriber */}
          <div className="bg-white border-2 border-emerald-300 rounded-xl p-5 shadow-xs relative overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 font-extrabold text-lg">
              3
            </div>
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              The Receiver
            </span>
            <h3 className="text-base font-bold text-gray-900 mt-2">3. SUBSCRIBER (Listener)</h3>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              Registers for a specific Topic mailbox and acts the exact millisecond a message arrives.
            </p>
            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-700 font-medium">
              <span className="text-gray-400">In this project:</span> <br/>
              <b>Arduino Feeder</b> (opens the food door!).
            </div>
          </div>
        </div>
      </div>

      {/* ─── Section 2: Interactive Visual Flowchart Simulation ──────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-6">
        <div>
          <span className="text-xs font-bold text-cat-600 uppercase tracking-wider">Step-by-Step Simulator</span>
          <h2 className="text-xl font-bold text-gray-950 mt-1">
            Visual Network Flowchart
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Select a scenario below to watch data packets travel between the 3 roles:
          </p>
        </div>

        {/* Scenario Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(Object.keys(FLOW_SCENARIOS) as FlowScenario[]).map((key) => {
            const sc = FLOW_SCENARIOS[key];
            const isSelected = activeScenario === key;
            return (
              <button
                key={key}
                onClick={() => handleSelectScenario(key)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-cat-500 bg-cat-50/50 shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 bg-stone-50/50'
                }`}
              >
                <p className={`font-bold text-sm ${isSelected ? 'text-cat-800' : 'text-gray-800'}`}>
                  {sc.title}
                </p>
                <p className="text-xs text-gray-500 mt-1 line-clamp-1">{sc.shortDesc}</p>
              </button>
            );
          })}
        </div>

        {/* ── Visual Flowchart Diagram Canvas ── */}
        <div className="bg-stone-50/70 border border-stone-200 rounded-2xl p-6 relative overflow-hidden">
          {/* 3 Graphical Flowchart Nodes Connected by Line */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative items-center">
            
            {/* NODE 1: PRODUCER */}
            <div className={`p-5 rounded-2xl border-2 transition-all relative ${
              step.activePoint === 'producer'
                ? 'bg-white border-orange-500 shadow-md ring-4 ring-orange-100'
                : 'bg-white/80 border-gray-200 opacity-80'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-orange-100 text-orange-700">
                  Step 1: Producer
                </span>
                <Globe className="w-5 h-5 text-orange-500" />
              </div>
              <h4 className="font-bold text-gray-900 text-base">{step.producerName}</h4>
              <p className="text-xs text-orange-600 font-semibold mt-0.5">{step.producerRole}</p>
              
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-xs text-gray-500">
                <Send className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span className="font-mono text-[11px] truncate">Publishes to topic</span>
              </div>
            </div>

            {/* NODE 2: BROKER */}
            <div className={`p-5 rounded-2xl border-2 transition-all relative ${
              step.activePoint === 'broker'
                ? 'bg-white border-amber-500 shadow-md ring-4 ring-amber-100'
                : 'bg-white/80 border-gray-200 opacity-80'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-700">
                  Step 2: Broker
                </span>
                <Radio className="w-5 h-5 text-amber-600" />
              </div>
              <h4 className="font-bold text-gray-900 text-base">HiveMQ Cloud Broker</h4>
              <p className="text-xs text-amber-700 font-semibold mt-0.5">Central Message Router</p>
              
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-xs text-gray-500">
                <RefreshCw className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-spin" />
                <span className="font-mono text-[11px] truncate">{step.brokerAction}</span>
              </div>
            </div>

            {/* NODE 3: SUBSCRIBER */}
            <div className={`p-5 rounded-2xl border-2 transition-all relative ${
              step.activePoint === 'subscriber'
                ? 'bg-white border-emerald-500 shadow-md ring-4 ring-emerald-100'
                : 'bg-white/80 border-gray-200 opacity-80'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700">
                  Step 3: Subscriber
                </span>
                <Cpu className="w-5 h-5 text-emerald-600" />
              </div>
              <h4 className="font-bold text-gray-900 text-base">{step.subscriberName}</h4>
              <p className="text-xs text-emerald-700 font-semibold mt-0.5">{step.subscriberRole}</p>
              
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-xs text-gray-500">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-mono text-[11px] truncate">Receives & acts immediately</span>
              </div>
            </div>
          </div>

          {/* Current Step Explanation Card */}
          <div className="mt-6 bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-cat-500 text-white flex items-center justify-center font-bold text-xs">
                  {step.stepNumber}
                </span>
                <span className="font-bold text-gray-900 text-sm">
                  Active Topic: <code className="font-mono text-cat-700 bg-cat-50 px-2 py-0.5 rounded border border-cat-200">{step.topic}</code>
                </span>
              </div>
              <span className="text-xs text-gray-500 font-medium">
                Step {step.stepNumber} of {scenarioData.steps.length}
              </span>
            </div>

            <p className="text-sm text-gray-800 leading-relaxed font-medium">
              👉 {step.packetSummary}
            </p>
          </div>

          {/* Interactive Flow Controls */}
          <div className="mt-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-3.5 py-1.5 rounded-lg bg-cat-500 hover:bg-cat-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Play className={`w-3.5 h-3.5 ${isPlaying ? 'fill-white' : ''}`} />
                {isPlaying ? 'Pause' : 'Auto Play'}
              </button>
              <button
                onClick={() => {
                  setCurrentStepIdx(0);
                  setIsPlaying(false);
                }}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-700 font-semibold text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>

            {/* Step navigation dots */}
            <div className="flex items-center gap-2">
              {scenarioData.steps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentStepIdx(idx);
                    setIsPlaying(false);
                  }}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    currentStepIdx === idx
                      ? 'bg-cat-500 text-white shadow-xs'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Section 3: How Different Users Get Different Topics (Multi-Tenant) ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500 text-white rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-gray-950">
              How Different Users Get Different Topics (No Crossed Wires!)
            </h2>
          </div>
          <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
            What if 1,000 cat owners use the same HiveMQ Broker? How does Geo's cat not eat Alice's cat food?
            <br />
            <b>Answer:</b> Every feeder has its own unique <b>Topic Address</b>, like an apartment mailbox number!
          </p>
        </div>

        {/* Interactive Topic Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => setSelectedUserTopic('geo')}
            className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
              selectedUserTopic === 'geo'
                ? 'border-orange-500 bg-orange-50/60 shadow-xs'
                : 'border-gray-200 hover:border-gray-300 bg-stone-50/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-gray-900">User: Geo (This Project)</span>
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            </div>
            <p className="text-xs font-mono text-orange-700 mt-1 truncate">smartcat/geo123/device/command</p>
          </button>

          <button
            onClick={() => setSelectedUserTopic('alice')}
            className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
              selectedUserTopic === 'alice'
                ? 'border-purple-500 bg-purple-50/60 shadow-xs'
                : 'border-gray-200 hover:border-gray-300 bg-stone-50/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-gray-900">User: Alice (Neighbor)</span>
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            </div>
            <p className="text-xs font-mono text-purple-700 mt-1 truncate">smartcat/alice_cat/device/command</p>
          </button>

          <button
            onClick={() => setSelectedUserTopic('bob')}
            className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
              selectedUserTopic === 'bob'
                ? 'border-cyan-500 bg-cyan-50/60 shadow-xs'
                : 'border-gray-200 hover:border-gray-300 bg-stone-50/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-gray-900">User: Bob (Friend)</span>
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
            </div>
            <p className="text-xs font-mono text-cyan-700 mt-1 truncate">smartcat/bob_cat/device/command</p>
          </button>
        </div>

        {/* Visual Topic Routing Diagram */}
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            {/* Sender */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs flex-1 w-full">
              <span className="text-[10px] font-extrabold uppercase text-gray-400">Owner App</span>
              <h4 className="font-bold text-gray-900 text-sm mt-0.5">
                {selectedUserTopic === 'geo' ? 'Geo\'s Phone' : selectedUserTopic === 'alice' ? 'Alice\'s Phone' : 'Bob\'s Phone'}
              </h4>
              <p className="text-xs text-gray-500 mt-1">Publishes to:</p>
              <code className="text-[11px] font-mono font-bold text-cat-700 bg-cat-50 px-2 py-0.5 rounded border border-cat-200 block mt-1 truncate">
                smartcat/{selectedUserTopic === 'geo' ? 'geo123' : selectedUserTopic === 'alice' ? 'alice_cat' : 'bob_cat'}/device/command
              </code>
            </div>

            <ArrowRight className="w-5 h-5 text-gray-400 hidden md:block shrink-0" />

            {/* Central Broker Mailbox */}
            <div className="bg-white border-2 border-amber-300 rounded-xl p-4 shadow-xs flex-1 w-full">
              <span className="text-[10px] font-extrabold uppercase text-amber-700">Central Broker</span>
              <h4 className="font-bold text-gray-900 text-sm mt-0.5">HiveMQ Cloud</h4>
              <p className="text-xs text-gray-600 mt-1">
                Reads address: <b>{selectedUserTopic === 'geo' ? 'geo123' : selectedUserTopic === 'alice' ? 'alice_cat' : 'bob_cat'}</b>
              </p>
              <span className="inline-block mt-1 text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-medium border border-amber-200">
                Routes only to matching subscriber
              </span>
            </div>

            <ArrowRight className="w-5 h-5 text-gray-400 hidden md:block shrink-0" />

            {/* Destination Feeder */}
            <div className="bg-white border-2 border-emerald-400 rounded-xl p-4 shadow-xs flex-1 w-full">
              <span className="text-[10px] font-extrabold uppercase text-emerald-700">Physical Feeder</span>
              <h4 className="font-bold text-gray-900 text-sm mt-0.5">
                {selectedUserTopic === 'geo' ? 'Geo\'s Feeder (Your Arduino)' : selectedUserTopic === 'alice' ? 'Alice\'s Feeder' : 'Bob\'s Feeder'}
              </h4>
              <p className="text-xs text-emerald-700 font-semibold mt-1">
                Subscribed ONLY to {selectedUserTopic === 'geo' ? 'geo123' : selectedUserTopic === 'alice' ? 'alice_cat' : 'bob_cat'}!
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Ignores all other user messages completely.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Section 4: Computer Networks Presentation Highlights ────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <Radio className="w-4 h-4 text-cat-500" />
            <h3 className="font-bold text-gray-900 text-sm">Why MQTT Instead of Regular HTTP?</h3>
          </div>
          <ul className="text-xs text-gray-600 space-y-2 mt-2 leading-relaxed">
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span>
              <span><b>Push vs. Polling:</b> The Arduino does not need to query the server 1,000 times a minute. The server pushes the packet instantly when you click.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span>
              <span><b>Tiny 2-Byte Headers:</b> HTTP headers are 800+ bytes. MQTT header is only 2 bytes! Saves Arduino RAM and Wi-Fi bandwidth.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span>
              <span><b>Decoupled Architecture:</b> The phone and the Arduino never talk directly to each other; they only talk to the Broker.</span>
            </li>
          </ul>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-gray-900 text-sm">Quality of Service (QoS) Level 1</h3>
          </div>
          <ul className="text-xs text-gray-600 space-y-2 mt-2 leading-relaxed">
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span>
              <span><b>Guaranteed Delivery:</b> Commands use QoS 1 (At Least Once Delivery). The Broker requires a <code>PUBACK</code> confirmation.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span>
              <span><b>Auto-Retry on Wi-Fi Blips:</b> If a packet drops over home Wi-Fi, the MQTT client automatically resends until received.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span>
              <span><b>Duplicate Guard:</b> The Arduino firmware deduplicates commands using unique <code>requestId</code> values so your cat is never overfed.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
