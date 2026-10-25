// SmartCat Feeder - Interactive MQTT & Computer Networks Architecture Suite
// Designed for technical evaluations, computer networks presentations, and deep conceptual clarity.

import { useEffect, useState, useRef } from 'react';
import api from '../lib/api';
import {
  Cpu,
  Server,
  Globe,
  Radio,
  Zap,
  ChevronLeft,
  ChevronRight,
  Shield,
  Send,
  Download,
  Clock,
  CheckCircle,
  Play,
  Pause,
  RotateCcw,
  ArrowRight,
  Terminal,
  Info
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

// ── Packet Simulation Scenarios ────────────────────────────────────────────────
type ScenarioType = 'web' | 'schedule' | 'telegram' | 'heartbeat' | 'timeout';

interface SimulationStep {
  stepNumber: number;
  title: string;
  sender: string;
  receiver: string;
  protocol: string;
  port: string;
  topic?: string;
  qos?: string;
  latency: string;
  payload: string;
  explanation: string;
  activeNodes: number[]; // indices of active nodes (0: Client/Trigger, 1: Backend, 2: Broker, 3: Arduino)
}

const SCENARIOS: Record<ScenarioType, { name: string; description: string; steps: SimulationStep[] }> = {
  web: {
    name: 'Manual "Feed Now" Command (Web App)',
    description: 'Demonstrates end-to-end real-time MQTT push actuated from the web browser dashboard.',
    steps: [
      {
        stepNumber: 1,
        title: 'Client Dispatches HTTP Request',
        sender: 'Browser Client (React UI)',
        receiver: 'Express Backend API',
        protocol: 'HTTP/2 over TLS',
        port: 'Port 443 (HTTPS)',
        latency: '~25ms',
        payload: 'POST /api/feeds/now\nAuthorization: Bearer <JWT>\nBody: { "portion": 1 }',
        explanation: 'User clicks "Feed Now". React dashboard validates session token and transmits REST POST request to server.',
        activeNodes: [0, 1]
      },
      {
        stepNumber: 2,
        title: 'Backend Publishes to MQTT Broker',
        sender: 'Express Backend',
        receiver: 'MQTT Cloud Broker (EMQX / HiveMQ)',
        protocol: 'MQTT v3.1.1',
        port: 'Port 1883 / 8883 (MQTTS)',
        topic: 'smartcat/geo123/device/command',
        qos: 'QoS 1 (At least once with PUBACK)',
        latency: '~45ms (Real-Time)',
        payload: '{\n  "command": "feed",\n  "requestId": "6c6b1350",\n  "portion": 1,\n  "durationMs": 1500,\n  "createdAt": "2026-10-26T00:15:00Z"\n}',
        explanation: 'Server acquires dispensing lock, formats structured JSON command, and publishes to topic using QoS 1 to guarantee packet delivery.',
        activeNodes: [1, 2]
      },
      {
        stepNumber: 3,
        title: 'Broker Delivers to Subscribed Feeder',
        sender: 'MQTT Cloud Broker',
        receiver: 'Arduino UNO R4 WiFi',
        protocol: 'MQTT over TCP',
        port: 'Port 1883 / 8883',
        topic: 'smartcat/geo123/device/command',
        latency: '~35ms (Real-Time Push)',
        payload: '{\n  "command": "feed",\n  "requestId": "6c6b1350",\n  "portion": 1,\n  "durationMs": 1500\n}',
        explanation: 'The Broker checks its topic routing table, finds the Arduino client subscribed to "smartcat/geo123/device/command", and instantly pushes the packet down the open TCP socket.',
        activeNodes: [2, 3]
      },
      {
        stepNumber: 4,
        title: 'Hardware Actuation & Dispensing',
        sender: 'Arduino UNO R4 Microcontroller',
        receiver: 'SG90 Micro Servo (Pin D9)',
        protocol: 'Hardware PWM (50Hz Signal)',
        port: 'Digital Pin D9 (PWM)',
        latency: '1500ms (Physical Motor Swing)',
        payload: 'feederServo.write(90); // 1500us pulse width\ndelay(1500);           // hold open\nfeederServo.write(0);  // 544us closed',
        explanation: 'Microcontroller parses JSON payload, asserts 50Hz PWM signal on Pin D9, swings servo horn to 90 degrees, dispenses food, and returns to closed position.',
        activeNodes: [3]
      },
      {
        stepNumber: 5,
        title: 'Feeder Publishes Execution Response',
        sender: 'Arduino UNO R4 WiFi',
        receiver: 'Express Backend & DB',
        protocol: 'MQTT Response',
        port: 'Port 1883 / 8883',
        topic: 'smartcat/geo123/device/response',
        latency: '~40ms',
        payload: '{\n  "requestId": "6c6b1350",\n  "status": "success",\n  "message": "Food dispensed",\n  "durationMs": 1500\n}',
        explanation: 'Arduino publishes completion telemetry. Express backend releases dispensing lock, logs SUCCESS in PostgreSQL, and UI resolves feed button to green.',
        activeNodes: [3, 2, 1, 0]
      }
    ]
  },
  schedule: {
    name: 'Automated Scheduled Feeding (Cron Engine)',
    description: 'Autonomous background cron scheduler triggering scheduled feeding without user presence.',
    steps: [
      {
        stepNumber: 1,
        title: 'Node-Cron Timer Triggers',
        sender: 'Backend Cron Engine',
        receiver: 'Prisma ORM & PostgreSQL',
        protocol: 'Internal Timer & SQL',
        port: 'Local Memory / Port 6543',
        latency: '<5ms',
        payload: 'SELECT * FROM "Schedule" WHERE "enabled" = true AND "time" = \'08:00\';',
        explanation: 'Internal scheduler runs every minute. Matches current time against active schedules in database.',
        activeNodes: [1]
      },
      {
        stepNumber: 2,
        title: 'Backend Publishes Automated Feed Command',
        sender: 'Express Backend',
        receiver: 'MQTT Cloud Broker',
        protocol: 'MQTT v3.1.1',
        port: 'Port 1883 / 8883',
        topic: 'smartcat/geo123/device/command',
        qos: 'QoS 1',
        latency: '~40ms',
        payload: '{\n  "command": "feed",\n  "requestId": "sched_9921",\n  "source": "SCHEDULE",\n  "portion": 2\n}',
        explanation: 'Backend detects valid schedule, creates PENDING feed record, and sends MQTT command to broker.',
        activeNodes: [1, 2]
      },
      {
        stepNumber: 3,
        title: 'Broker Routes Command to Feeder',
        sender: 'MQTT Cloud Broker',
        receiver: 'Arduino UNO R4 WiFi',
        protocol: 'MQTT over TCP',
        port: 'Port 1883',
        topic: 'smartcat/geo123/device/command',
        latency: '~30ms',
        payload: 'Pushed to hardware subscriber over existing TCP socket connection.',
        explanation: 'Arduino receives scheduled feed instruction and actuates SG90 motor for 2 portions.',
        activeNodes: [2, 3]
      },
      {
        stepNumber: 4,
        title: 'Telemetry Logged in History',
        sender: 'Arduino Feeder',
        receiver: 'PostgreSQL Database',
        protocol: 'MQTT Response -> SQL Insert',
        port: 'Port 1883 -> Port 6543',
        latency: '~50ms',
        payload: 'UPDATE "FeedLog" SET "status" = \'SUCCESS\', "completedAt" = NOW() WHERE "requestId" = \'sched_9921\';',
        explanation: 'Feed execution telemetry logged with timestamp for pet care tracking and daily limit calculation.',
        activeNodes: [3, 2, 1]
      }
    ]
  },
  telegram: {
    name: 'Telegram Bot Remote Feed Command',
    description: 'Triggering feeder from Telegram chat using the bot webhook.',
    steps: [
      {
        stepNumber: 1,
        title: 'User Sends /feed Command',
        sender: 'Telegram Mobile App',
        receiver: 'Telegram Bot Cloud API',
        protocol: 'MTProto / HTTPS',
        port: 'Port 443',
        latency: '~60ms',
        payload: 'Chat ID: 1690543934\nText: "/feed"',
        explanation: 'User taps "/feed" or "Feed Cat Now" keyboard button inside Telegram chat.',
        activeNodes: [0]
      },
      {
        stepNumber: 2,
        title: 'Telegram Webhook Hits Backend',
        sender: 'Telegram Cloud Server',
        receiver: 'Express Telegraf Bot Service',
        protocol: 'HTTPS Webhook POST',
        port: 'Port 443',
        latency: '~45ms',
        payload: 'POST /telegraf-webhook\n{ "message": { "text": "/feed", "from": { "id": 1690543934 } } }',
        explanation: 'Server validates chat ID against TELEGRAM_ALLOWED_CHAT_IDS whitelist for security.',
        activeNodes: [0, 1]
      },
      {
        stepNumber: 3,
        title: 'Backend Publishes to MQTT Broker',
        sender: 'Express Backend',
        receiver: 'MQTT Cloud Broker',
        protocol: 'MQTT QoS 1',
        port: 'Port 1883 / 8883',
        topic: 'smartcat/geo123/device/command',
        latency: '~40ms',
        payload: '{\n  "command": "feed",\n  "requestId": "tg_a81f",\n  "source": "TELEGRAM"\n}',
        explanation: 'Command published over MQTT to broker which delivers it to Arduino feeder.',
        activeNodes: [1, 2, 3]
      },
      {
        stepNumber: 4,
        title: 'Bot Sends Confirmation to Chat',
        sender: 'Backend Telegram Bot',
        receiver: 'User Telegram Chat',
        protocol: 'Telegram Bot API',
        port: 'Port 443',
        latency: '~80ms',
        payload: 'Chat Message: "Cat fed successfully! (Portion 1 dispensed)"',
        explanation: 'Telegram bot notifies pet owner with instant confirmation message and updated daily count.',
        activeNodes: [1, 0]
      }
    ]
  },
  heartbeat: {
    name: '25-Second Periodic Heartbeat & Telemetry',
    description: 'Lightweight periodic telemetry pulse maintaining online device presence.',
    steps: [
      {
        stepNumber: 1,
        title: 'Arduino Timer Fires (Every 25s)',
        sender: 'Arduino UNO R4 WiFi',
        receiver: 'Built-in WiFiS3 Module',
        protocol: 'Internal millis() Watchdog',
        port: 'Internal Timer',
        latency: '<1ms',
        payload: 'unsigned long uptime = millis() / 1000;\nint rssi = WiFi.RSSI();',
        explanation: 'Arduino reads internal uptime and Wi-Fi received signal strength indicator (RSSI in dBm).',
        activeNodes: [3]
      },
      {
        stepNumber: 2,
        title: 'Heartbeat Packet Published',
        sender: 'Arduino UNO R4 WiFi',
        receiver: 'MQTT Cloud Broker',
        protocol: 'MQTT QoS 0 (Lightweight)',
        port: 'Port 1883 / 8883',
        topic: 'smartcat/geo123/device/heartbeat',
        latency: '~35ms',
        payload: '{\n  "status": "online",\n  "uptimeSeconds": 1420,\n  "wifiStrength": -58,\n  "createdAt": "T+00:23:40"\n}',
        explanation: 'Arduino publishes tiny telemetry payload (only ~80 bytes). Matrix LED flashes a subtle heartbeat row.',
        activeNodes: [3, 2]
      },
      {
        stepNumber: 3,
        title: 'Backend Updates Online State',
        sender: 'MQTT Cloud Broker',
        receiver: 'Express Backend & DB',
        protocol: 'MQTT Subscribe -> SQL Update',
        port: 'Port 1883 / 8883',
        latency: '~25ms',
        payload: 'UPDATE "DeviceStatus" SET "status" = \'ONLINE\', "lastHeartbeatAt" = NOW(), "wifiStrength" = -58;',
        explanation: 'Backend marks device ONLINE and resets the 120-second offline timeout watchdog.',
        activeNodes: [2, 1]
      }
    ]
  },
  timeout: {
    name: 'Network Timeout & Stale Lock Safety Mechanism',
    description: 'Safety watchdog that auto-releases dispensing locks if Wi-Fi or broker connection drops mid-feed.',
    steps: [
      {
        stepNumber: 1,
        title: 'Command Dispatched During Network Drop',
        sender: 'Backend Server',
        receiver: 'MQTT Broker',
        protocol: 'MQTT Publish QoS 1',
        port: 'Port 1883',
        latency: '0ms',
        payload: '{\n  "command": "feed",\n  "requestId": "fail_001"\n}',
        explanation: 'Command published, but Arduino board lost Wi-Fi connection or power, so no response arrives.',
        activeNodes: [1, 2]
      },
      {
        stepNumber: 2,
        title: 'Backend Awaiter Timeout Fires (15s)',
        sender: 'Express Backend Watchdog',
        receiver: 'Dispensing Lock Manager',
        protocol: 'Internal Event Timer',
        port: 'Local',
        latency: '15000ms Timeout',
        payload: 'DispensingLock.forceRelease();\nPendingResponse.delete("fail_001");',
        explanation: 'Safety timer detects no response within timeout window. Automatically force-releases server lock so system never freezes permanently.',
        activeNodes: [1]
      },
      {
        stepNumber: 3,
        title: 'Log Marked FAILED & User Notified',
        sender: 'Backend',
        receiver: 'Database & Web UI',
        protocol: 'HTTP 503 / DB Update',
        port: 'Port 443',
        latency: '~10ms',
        payload: '{\n  "success": false,\n  "message": "Timed out — no response from device. Lock released."\n}',
        explanation: 'UI alerts user with clear diagnostic instead of hanging forever, allowing immediate re-try.',
        activeNodes: [1, 0]
      }
    ]
  }
};

export default function ArchitecturePage() {
  const [deviceData, setDeviceData] = useState<DeviceStatusResponse | null>(null);
  const [currentSlide, setCurrentSlide] = useState<number>(0);

  // Packet Simulator State
  const [activeScenario, setActiveScenario] = useState<ScenarioType>('web');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const autoPlayRef = useRef<any>(null);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/device/status');
      setDeviceData(res.data);
    } catch {
      // Keep defaults
    }
  };

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(fetchStatus, 15000);
    return () => clearInterval(timer);
  }, []);

  const scenario = SCENARIOS[activeScenario];
  const step = scenario.steps[currentStepIndex];
  const totalSteps = scenario.steps.length;

  // Auto-play simulation runner
  useEffect(() => {
    if (isPlaying) {
      autoPlayRef.current = setTimeout(() => {
        if (currentStepIndex < totalSteps - 1) {
          setCurrentStepIndex(prev => prev + 1);
        } else {
          setIsPlaying(false); // Finished scenario
        }
      }, 2200);
    } else {
      if (autoPlayRef.current) clearTimeout(autoPlayRef.current);
    }
    return () => {
      if (autoPlayRef.current) clearTimeout(autoPlayRef.current);
    };
  }, [isPlaying, currentStepIndex, totalSteps]);

  const handleScenarioChange = (s: ScenarioType) => {
    setIsPlaying(false);
    setActiveScenario(s);
    setCurrentStepIndex(0);
  };

  const isMqttConnected = deviceData?.mqttConnected ?? true;
  const isDeviceOnline = deviceData?.device?.status === 'ONLINE';

  const slides = [
    { id: 0, title: 'Live Packet Simulator' },
    { id: 1, title: 'What is MQTT vs HTTP?' },
    { id: 2, title: 'MQTT Roles & Architecture' },
    { id: 3, title: 'QoS Levels (0, 1, 2)' },
    { id: 4, title: 'Topic Hierarchy & Wildcards' },
    { id: 5, title: 'Keep-Alive, PING & LWT' },
    { id: 6, title: 'Hardware & Servo PWM' },
  ];

  return (
    <div className="space-y-6 animate-slide-up pb-12 text-slate-900 bg-slate-50 min-h-screen">
      {/* ── Slide Navigation Bar ───────────────────────────────────────────── */}
      <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cat-500 text-white rounded-xl shadow-sm">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 leading-tight">IoT & Computer Networks Masterclass</h1>
              <span className="text-[10px] bg-cat-100 text-cat-700 font-extrabold px-2 py-0.5 rounded-full uppercase">
                Presentation Ready
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Topic {currentSlide + 1} of {slides.length}: <strong className="text-cat-600 font-bold">{slides[currentSlide].title}</strong>
            </p>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
            disabled={currentSlide === 0}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-cat-50 text-slate-700 disabled:opacity-30 transition-all font-bold text-xs flex items-center gap-1 shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>

          <span className="text-xs font-mono font-bold text-slate-600 px-3 py-2 bg-slate-100 rounded-xl border border-slate-200">
            {currentSlide + 1} / {slides.length}
          </span>

          <button
            onClick={() => setCurrentSlide(prev => Math.min(slides.length - 1, prev + 1))}
            disabled={currentSlide === slides.length - 1}
            className="px-4 py-2 rounded-xl bg-cat-500 hover:bg-cat-600 text-white disabled:opacity-30 transition-all font-bold text-xs flex items-center gap-1 shadow-sm"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Slide Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {slides.map((s, index) => (
          <button
            key={s.id}
            onClick={() => setCurrentSlide(index)}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border text-center truncate ${
              currentSlide === index
                ? 'bg-cat-500 text-white border-cat-500 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-cat-50'
            }`}
          >
            {s.title}
          </button>
        ))}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SLIDE 0: INTERACTIVE MULTI-SCENARIO PACKET SIMULATOR */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentSlide === 0 && (
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <span className="text-[10px] font-extrabold text-cat-600 uppercase tracking-widest bg-cat-50 px-2.5 py-1 rounded-lg border border-cat-100">
                Interactive Visual Simulation
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2">Live Network Packet Flow Simulator</h2>
              <p className="text-xs text-slate-500 mt-1">
                Select a network scenario below and watch the packet traverse through the IoT architecture step-by-step.
              </p>
            </div>

            {/* Live System Telemetry Status */}
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
                isMqttConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isMqttConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                Broker: {isMqttConnected ? 'CONNECTED' : 'STANDBY'}
              </div>

              <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
                isDeviceOnline ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                <Radio className="w-3.5 h-3.5 text-blue-600" />
                Hardware: {isDeviceOnline ? 'ONLINE' : 'STANDBY'}
              </div>
            </div>
          </div>

          {/* Scenario Selector Pills */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block">
              Choose Network Scenario:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {(Object.keys(SCENARIOS) as ScenarioType[]).map((key) => {
                const sc = SCENARIOS[key];
                return (
                  <button
                    key={key}
                    onClick={() => handleScenarioChange(key)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      activeScenario === key
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <div className="font-extrabold text-xs">{sc.name}</div>
                    <div className="text-[10px] opacity-70 mt-1 line-clamp-1">{sc.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 4 Architecture Nodes Visual Grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-3 relative">
            {/* Node 0: Client/Trigger */}
            <div className={`p-4 rounded-2xl border-2 transition-all relative ${
              step.activeNodes.includes(0)
                ? 'bg-cat-50/80 border-cat-500 shadow-md scale-102 ring-2 ring-cat-200'
                : 'bg-slate-50 border-slate-200 opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase text-cat-700 bg-cat-100 px-2 py-0.5 rounded">Node 1</span>
                {step.activeNodes.includes(0) && <span className="w-2.5 h-2.5 rounded-full bg-cat-500 animate-ping" />}
              </div>
              <div className="w-12 h-12 rounded-xl bg-cat-500 text-white flex items-center justify-center mb-2 shadow-sm">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="font-black text-sm text-slate-900">Client / Trigger</h3>
              <p className="text-[11px] text-slate-500 mt-1">Web UI / Telegram / Cron</p>
              <div className="mt-3 text-[10px] font-mono bg-white p-1.5 rounded border border-slate-200 text-slate-600">
                Port 443 HTTPS
              </div>
            </div>

            {/* Node 1: Express Backend */}
            <div className={`p-4 rounded-2xl border-2 transition-all relative ${
              step.activeNodes.includes(1)
                ? 'bg-emerald-50/80 border-emerald-500 shadow-md scale-102 ring-2 ring-emerald-200'
                : 'bg-slate-50 border-slate-200 opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Node 2</span>
                {step.activeNodes.includes(1) && <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />}
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-2 shadow-sm">
                <Server className="w-6 h-6" />
              </div>
              <h3 className="font-black text-sm text-slate-900">Express Backend</h3>
              <p className="text-[11px] text-slate-500 mt-1">Node.js API + MQTT Client</p>
              <div className="mt-3 text-[10px] font-mono bg-white p-1.5 rounded border border-slate-200 text-slate-600">
                MQTT Publisher & DB
              </div>
            </div>

            {/* Node 2: MQTT Broker */}
            <div className={`p-4 rounded-2xl border-2 transition-all relative ${
              step.activeNodes.includes(2)
                ? 'bg-amber-50/80 border-amber-500 shadow-md scale-102 ring-2 ring-amber-200'
                : 'bg-slate-50 border-slate-200 opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded">Node 3</span>
                {step.activeNodes.includes(2) && <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />}
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center mb-2 shadow-sm">
                <Radio className="w-6 h-6" />
              </div>
              <h3 className="font-black text-sm text-slate-900">MQTT Cloud Broker</h3>
              <p className="text-[11px] text-slate-500 mt-1">EMQX / HiveMQ Cloud</p>
              <div className="mt-3 text-[10px] font-mono bg-white p-1.5 rounded border border-slate-200 text-slate-600">
                Port 1883 / 8883 MQTTS
              </div>
            </div>

            {/* Node 3: Arduino UNO R4 */}
            <div className={`p-4 rounded-2xl border-2 transition-all relative ${
              step.activeNodes.includes(3)
                ? 'bg-cyan-50/80 border-cyan-500 shadow-md scale-102 ring-2 ring-cyan-200'
                : 'bg-slate-50 border-slate-200 opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase text-cyan-700 bg-cyan-100 px-2 py-0.5 rounded">Node 4</span>
                {step.activeNodes.includes(3) && <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-ping" />}
              </div>
              <div className="w-12 h-12 rounded-xl bg-cyan-600 text-white flex items-center justify-center mb-2 shadow-sm">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="font-black text-sm text-slate-900">Arduino UNO R4 WiFi</h3>
              <p className="text-[11px] text-slate-500 mt-1">Renesas RA4M1 + Servo</p>
              <div className="mt-3 text-[10px] font-mono bg-white p-1.5 rounded border border-slate-200 text-slate-600">
                Pin D9 PWM Actuator
              </div>
            </div>
          </div>

          {/* ── Active Packet Inspection Box (Live Terminal) ── */}
          <div className="bg-slate-950 text-slate-100 rounded-2xl p-5 border border-slate-800 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cat-400" />
                <span className="font-mono text-xs font-bold text-cat-300 uppercase tracking-wider">
                  Packet Inspection — Step {currentStepIndex + 1} of {totalSteps}: {step.title}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded">
                  Latency: {step.latency}
                </span>
                <span className="text-[11px] font-mono text-blue-400 bg-blue-950/80 border border-blue-800/60 px-2 py-0.5 rounded">
                  {step.protocol}
                </span>
              </div>
            </div>

            {/* Path & Topics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="space-y-1">
                <div className="text-slate-400 text-[11px]">TRANSMISSION HOP:</div>
                <div className="flex items-center gap-2 text-slate-200 font-bold">
                  <span className="text-cat-400">{step.sender}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-emerald-400">{step.receiver}</span>
                </div>
              </div>

              {step.topic && (
                <div className="space-y-1">
                  <div className="text-slate-400 text-[11px]">MQTT TOPIC:</div>
                  <div className="text-amber-400 font-bold bg-slate-900 px-2 py-1 rounded border border-slate-800">
                    {step.topic} {step.qos && <span className="text-slate-400 text-[10px]">({step.qos})</span>}
                  </div>
                </div>
              )}
            </div>

            {/* Raw Payload Block */}
            <div className="space-y-1.5">
              <div className="text-slate-400 text-[11px] font-mono">TRANSMITTED PAYLOAD / INSTRUCTION:</div>
              <pre className="bg-slate-900 p-3 rounded-xl border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed">
                {step.payload}
              </pre>
            </div>

            {/* Explanation Note */}
            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl flex items-start gap-2.5 text-xs text-slate-300">
              <Info className="w-4 h-4 text-cat-400 shrink-0 mt-0.5" />
              <span>{step.explanation}</span>
            </div>

            {/* Playback Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-3.5 py-1.5 rounded-xl bg-cat-500 hover:bg-cat-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  {isPlaying ? 'Pause' : 'Auto Play Simulation'}
                </button>

                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStepIndex(0);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>
              </div>

              {/* Step Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStepIndex(prev => Math.max(0, prev - 1));
                  }}
                  disabled={currentStepIndex === 0}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 font-bold text-xs flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev Step
                </button>

                <div className="text-xs font-mono text-slate-400 px-2 font-bold">
                  {currentStepIndex + 1} / {totalSteps}
                </div>

                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStepIndex(prev => Math.min(totalSteps - 1, prev + 1));
                  }}
                  disabled={currentStepIndex === totalSteps - 1}
                  className="px-3 py-1.5 rounded-xl bg-cat-500 hover:bg-cat-600 disabled:opacity-30 text-white font-bold text-xs flex items-center gap-1"
                >
                  Next Step <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SLIDE 1: WHAT IS MQTT VS HTTP? */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentSlide === 1 && (
        <div className="bg-white p-6 md:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-8">
          <div>
            <span className="text-xs font-bold text-cat-600 uppercase tracking-widest bg-cat-50 px-2.5 py-1 rounded-lg border border-cat-100">
              Protocol Comparison
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-2">Why MQTT Beats HTTP for IoT Devices</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Traditional web applications use HTTP (Request/Response). But for embedded microcontrollers like Arduino and ESP32, MQTT provides unmatched speed, lower battery consumption, and true real-time push.
            </p>
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                  <th className="p-3.5">Feature</th>
                  <th className="p-3.5 text-rose-600 bg-rose-50/50">HTTP / REST (Polling)</th>
                  <th className="p-3.5 text-emerald-600 bg-emerald-50/50">MQTT (Publish / Subscribe)</th>
                  <th className="p-3.5">Why It Matters for Cat Feeder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50/80">
                  <td className="p-3.5 font-bold text-slate-900">Header Overhead</td>
                  <td className="p-3.5 text-rose-700 font-mono">500 to 1000+ bytes</td>
                  <td className="p-3.5 text-emerald-700 font-mono font-bold">Only 2 bytes!</td>
                  <td className="p-3.5 text-slate-600">MQTT headers are tiny, saving 99% data usage on cell/Wi-Fi.</td>
                </tr>
                <tr className="hover:bg-slate-50/80">
                  <td className="p-3.5 font-bold text-slate-900">Communication Pattern</td>
                  <td className="p-3.5 text-rose-700">Client-to-Server Request/Response</td>
                  <td className="p-3.5 text-emerald-700 font-bold">Pub/Sub via Central Broker</td>
                  <td className="p-3.5 text-slate-600">Decouples web clients from hardware IP addresses completely.</td>
                </tr>
                <tr className="hover:bg-slate-50/80">
                  <td className="p-3.5 font-bold text-slate-900">Real-Time Delivery</td>
                  <td className="p-3.5 text-rose-700">Client must poll every N seconds</td>
                  <td className="p-3.5 text-emerald-700 font-bold">Sub-second push (&lt;50ms)</td>
                  <td className="p-3.5 text-slate-600">Dispenser opens the exact moment user presses "Feed Now".</td>
                </tr>
                <tr className="hover:bg-slate-50/80">
                  <td className="p-3.5 font-bold text-slate-900">Connection State</td>
                  <td className="p-3.5 text-rose-700">Stateless (TCP handshake every request)</td>
                  <td className="p-3.5 text-emerald-700 font-bold">Persistent single TCP connection</td>
                  <td className="p-3.5 text-slate-600">No repeated TLS renegotiations saving Arduino RAM and CPU.</td>
                </tr>
                <tr className="hover:bg-slate-50/80">
                  <td className="p-3.5 font-bold text-slate-900">Power Consumption</td>
                  <td className="p-3.5 text-rose-700">High (CPU constantly wakes up to poll)</td>
                  <td className="p-3.5 text-emerald-700 font-bold">Ultra-Low (Sleeps until packet arrives)</td>
                  <td className="p-3.5 text-slate-600">Arduino runs cool without power brownouts or voltage drops.</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Analogies Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="bg-rose-50/60 p-6 rounded-2xl border-2 border-rose-200 space-y-3">
              <span className="text-[10px] font-black uppercase text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
                HTTP Analogy
              </span>
              <h3 className="text-base font-extrabold text-slate-900">Knocking on the Door Continuously</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                With HTTP, the Arduino must knock on the server door every 2 seconds: <em>"Any food to dispense? No? Okay... Any food now? No?"</em>. This wastes 99.9% of bandwidth and creates heavy server load.
              </p>
            </div>

            <div className="bg-emerald-50/60 p-6 rounded-2xl border-2 border-emerald-200 space-y-3">
              <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                MQTT Analogy
              </span>
              <h3 className="text-base font-extrabold text-slate-900">Walkie-Talkie Radio Broadcast</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                The Arduino stays on its tuned radio frequency (topic channel). It stays completely silent. The instant someone presses "Feed Now" on their phone, the radio broadcasts the signal and the motor moves immediately!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SLIDE 2: THE 4 ROLES OF MQTT */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentSlide === 2 && (
        <div className="bg-white p-6 md:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-8">
          <div>
            <span className="text-xs font-bold text-cat-600 uppercase tracking-widest bg-cat-50 px-2.5 py-1 rounded-lg border border-cat-100">
              Architecture Anatomy
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-2">The 4 Core Roles of MQTT Architecture</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              MQTT achieves complete decoupling between senders and receivers across three dimensions: <strong>Space</strong> (don't need to know each other's IP), <strong>Time</strong> (asynchronous operations), and <strong>Synchronization</strong> (non-blocking).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3 hover:border-cat-400 transition-all">
              <div className="p-3 bg-cat-500 text-white rounded-xl w-fit shadow-sm">
                <Send className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900">1. Publisher</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                The client that sends messages. In our system, the Express server acts as the Publisher when a feeding command is triggered.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3 hover:border-amber-400 transition-all">
              <div className="p-3 bg-amber-500 text-white rounded-xl w-fit shadow-sm">
                <Server className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900">2. Broker</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                The central cloud switchboard (HiveMQ/EMQX). It authenticates clients, manages topic subscriptions, and routes incoming packets in under 15ms.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3 hover:border-emerald-400 transition-all">
              <div className="p-3 bg-emerald-600 text-white rounded-xl w-fit shadow-sm">
                <Radio className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900">3. Topic</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                The hierarchical message channel address (e.g. <code className="text-emerald-700 bg-white px-1 py-0.5 rounded border border-slate-200 font-mono">smartcat/geo123/device/command</code>) that categorizes messages.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3 hover:border-cyan-400 transition-all">
              <div className="p-3 bg-cyan-600 text-white rounded-xl w-fit shadow-sm">
                <Download className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900">4. Subscriber</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                The listener. Arduino UNO R4 WiFi subscribes once on boot and stays listening. When a command packet arrives, it immediately executes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SLIDE 3: QUALITY OF SERVICE (QOS) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentSlide === 3 && (
        <div className="bg-white p-6 md:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-8">
          <div>
            <span className="text-xs font-bold text-cat-600 uppercase tracking-widest bg-cat-50 px-2.5 py-1 rounded-lg border border-cat-100">
              Reliability Guarantee
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-2">Quality of Service (QoS) Levels Explained</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              MQTT offers 3 levels of delivery guarantees. Different data requires different reliability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* QoS 0 */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-black text-slate-800 bg-slate-200 px-2.5 py-1 rounded">
                  QoS 0
                </span>
                <span className="text-xs text-slate-500 font-bold">At most once</span>
              </div>
              <h3 className="font-extrabold text-base text-slate-900">Fire & Forget</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Message is sent without confirmation (no ACK). If Wi-Fi flickers, the message is lost.
              </p>
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs font-mono text-slate-600">
                <strong>Used in SmartCat for:</strong> Periodic Heartbeat telemetry (if 1 ping is lost, the next arrives in 25s anyway).
              </div>
            </div>

            {/* QoS 1 */}
            <div className="p-6 bg-emerald-50/70 rounded-2xl border-2 border-emerald-300 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-black text-emerald-800 bg-emerald-200 px-2.5 py-1 rounded">
                  QoS 1 ⭐
                </span>
                <span className="text-xs text-emerald-700 font-bold">At least once</span>
              </div>
              <h3 className="font-extrabold text-base text-emerald-950">Guaranteed Delivery with PUBACK</h3>
              <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                The sender stores the message until a <code className="font-mono bg-white px-1 rounded border">PUBACK</code> acknowledgment packet is returned. If timeout occurs, it automatically retries.
              </p>
              <div className="p-3 bg-white rounded-xl border border-emerald-200 text-xs font-mono text-emerald-800">
                <strong>Used in SmartCat for:</strong> Feeding Commands (<code className="text-cat-600">command: feed</code>) so the cat NEVER misses a meal!
              </div>
            </div>

            {/* QoS 2 */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-black text-slate-800 bg-slate-200 px-2.5 py-1 rounded">
                  QoS 2
                </span>
                <span className="text-xs text-slate-500 font-bold">Exactly once</span>
              </div>
              <h3 className="font-extrabold text-base text-slate-900">Four-Step Handshake</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Zero loss and zero duplicates guaranteed using a 4-message exchange (<code className="font-mono text-[10px]">{'PUB -> PUBREC -> PUBREL -> PUBCOMP'}</code>). High overhead.
              </p>
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs font-mono text-slate-600">
                <strong>Used for:</strong> Banking & medical dispensing devices.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SLIDE 4: TOPIC HIERARCHY */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentSlide === 4 && (
        <div className="bg-white p-6 md:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-8">
          <div>
            <span className="text-xs font-bold text-cat-600 uppercase tracking-widest bg-cat-50 px-2.5 py-1 rounded-lg border border-cat-100">
              Message Addressing
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-2">Topic Hierarchy & Namespace Isolation</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              MQTT topics are structured like file paths using forward slashes (<code className="font-mono bg-slate-100 px-1 rounded">/</code>). This allows multiple feeders on the same broker without collisions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-2">
              <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-200 px-2 py-0.5 rounded">Command Channel</span>
              <h4 className="font-mono text-xs font-black text-slate-900 bg-white p-2.5 rounded-xl border border-amber-200">
                smartcat/geo123/device/command
              </h4>
              <p className="text-xs text-slate-600">Backend publishes dispense instructions here. Arduino subscribes to this topic.</p>
            </div>

            <div className="p-5 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-2">
              <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-200 px-2 py-0.5 rounded">Response Channel</span>
              <h4 className="font-mono text-xs font-black text-slate-900 bg-white p-2.5 rounded-xl border border-emerald-200">
                smartcat/geo123/device/response
              </h4>
              <p className="text-xs text-slate-600">Arduino publishes execution confirmation and portion duration after motor completes.</p>
            </div>

            <div className="p-5 bg-blue-50/70 rounded-2xl border border-blue-200 space-y-2">
              <span className="text-[10px] font-black uppercase text-blue-800 bg-blue-200 px-2 py-0.5 rounded">Telemetry Channel</span>
              <h4 className="font-mono text-xs font-black text-slate-900 bg-white p-2.5 rounded-xl border border-blue-200">
                smartcat/geo123/device/heartbeat
              </h4>
              <p className="text-xs text-slate-600">Arduino sends periodic RSSI signal strength and uptime pulse every 25 seconds.</p>
            </div>
          </div>

          {/* Wildcards Explanation */}
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <h3 className="font-extrabold text-sm text-slate-900">MQTT Wildcard Subscriptions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                <span className="text-cat-600 font-bold">+ (Single Level Wildcard)</span>
                <p className="text-slate-600 text-[11px] font-sans">
                  Matches one level. Example: <code className="font-mono font-bold">smartcat/+/device/heartbeat</code> monitors heartbeats across all user feeders simultaneously.
                </p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                <span className="text-emerald-600 font-bold"># (Multi Level Wildcard)</span>
                <p className="text-slate-600 text-[11px] font-sans">
                  Matches all subtopics. Example: <code className="font-mono font-bold">smartcat/geo123/#</code> streams all traffic for that namespace in debug console.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SLIDE 5: KEEP-ALIVE, PING & LAST WILL */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentSlide === 5 && (
        <div className="bg-white p-6 md:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-8">
          <div>
            <span className="text-xs font-bold text-cat-600 uppercase tracking-widest bg-cat-50 px-2.5 py-1 rounded-lg border border-cat-100">
              Connection Health
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-2">Keep-Alive, PING & Last Will and Testament (LWT)</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              How the broker detects dropped Wi-Fi, unplugged cables, or power outages instantly without polling.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cat-500 text-white flex items-center justify-center shadow-sm">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900">MQTT Keep-Alive (15 Seconds)</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Our firmware configures <code className="font-mono bg-white px-1 rounded border">mqttClient.setKeepAlive(15)</code>. If no feed command is sent, the Arduino and broker exchange a tiny 2-byte <code className="font-mono">PINGREQ</code> and <code className="font-mono">PINGRESP</code> packet to prove the TCP pipe is healthy.
              </p>
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-sm">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900">Last Will and Testament (LWT)</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                When connecting to the broker, the client registers a "Will" message. If the Arduino loses power or Wi-Fi drops without an ungraceful disconnect, the <strong>Broker itself</strong> automatically publishes the LWT message <code className="font-mono text-rose-600">{'{"status": "offline"}'}</code> to notify the backend immediately!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SLIDE 6: HARDWARE & SERVO PWM */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentSlide === 6 && (
        <div className="bg-white p-6 md:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-8">
          <div>
            <span className="text-xs font-bold text-cat-600 uppercase tracking-widest bg-cat-50 px-2.5 py-1 rounded-lg border border-cat-100">
              Hardware Layer
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-2">Arduino UNO R4 WiFi & SG90 Servo Actuation</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              From incoming digital MQTT packet to physical mechanical food dispensing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl w-fit">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Renesas RA4M1 Core</h3>
              <p className="text-xs text-slate-500">
                32-bit ARM Cortex-M4 @ 48MHz with built-in Wi-Fi ESP32-S3 coprocessor and 12x8 LED matrix display.
              </p>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="p-2.5 bg-cat-100 text-cat-700 rounded-xl w-fit">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">50Hz PWM Servo Signal</h3>
              <p className="text-xs text-slate-500">
                Pin D9 outputs 50Hz pulses (20ms period). Pulse width sets physical position: 544µs = 0° (Closed), 1500µs = 90° (Open Dispense).
              </p>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl w-fit">
                <CheckCircle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Common Ground (GND)</h3>
              <p className="text-xs text-slate-500">
                Essential electrical rule: External 5V power ground must be tied directly to Arduino GND pin so the PWM signal has a return path.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
