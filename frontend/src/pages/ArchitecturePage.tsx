// SmartCat Feeder - Clean Minimalist MQTT & Computer Networks Architecture
// 100% Light Themed, presentation-grade interactive walkthrough.

import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import {
  Cpu,
  Server,
  Globe,
  Radio,
  Zap,
  ChevronLeft,
  ChevronRight,
  Send,
  Download,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  ArrowRight,
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

type ScenarioKey = 'web' | 'schedule' | 'telegram' | 'heartbeat';

interface StepDetail {
  title: string;
  sender: string;
  receiver: string;
  protocol: string;
  topic?: string;
  summary: string;
  activeNode: number; // 0: Client, 1: Server, 2: Broker, 3: Arduino
}

const SCENARIOS: Record<ScenarioKey, { title: string; subtitle: string; steps: StepDetail[] }> = {
  web: {
    title: 'Manual "Feed Now" Command',
    subtitle: 'Real-time MQTT dispatch from web dashboard to feeder',
    steps: [
      {
        title: 'Step 1: User Clicks "Feed Cat Now"',
        sender: 'Browser Dashboard',
        receiver: 'Express Backend',
        protocol: 'HTTP/2 REST POST (/api/feeds/now)',
        summary: 'The web app verifies user session and sends an authenticated feeding request to the server.',
        activeNode: 0,
      },
      {
        title: 'Step 2: Server Publishes MQTT Packet',
        sender: 'Express Backend',
        receiver: 'MQTT Cloud Broker',
        protocol: 'MQTT v3.1.1 (QoS 1 Guaranteed Delivery)',
        topic: 'smartcat/geo123/device/command',
        summary: 'The server creates a JSON command packet ({"command":"feed", "portion":1}) and publishes it to the broker.',
        activeNode: 1,
      },
      {
        title: 'Step 3: Broker Routes Packet to Arduino',
        sender: 'MQTT Cloud Broker',
        receiver: 'Arduino UNO R4 WiFi',
        protocol: 'TCP Push over Port 1883 / 8883',
        topic: 'smartcat/geo123/device/command',
        summary: 'The broker immediately delivers the message down the open TCP connection to the subscribed Arduino in <100ms.',
        activeNode: 2,
      },
      {
        title: 'Step 4: Servo Motor Actuation',
        sender: 'Arduino UNO R4',
        receiver: 'SG90 Servo (Pin D9)',
        protocol: 'Hardware PWM 50Hz (1500µs pulse)',
        summary: 'The Arduino outputs PWM pulses on Digital Pin D9, swinging the servo to 90° to dispense kibble into the bowl.',
        activeNode: 3,
      },
      {
        title: 'Step 5: Completion Confirmation',
        sender: 'Arduino UNO R4',
        receiver: 'Backend & Dashboard',
        protocol: 'MQTT Response (smartcat/geo123/device/response)',
        summary: 'Arduino publishes "Food dispensed" response. Server logs SUCCESS and the dashboard shows feed complete.',
        activeNode: 1,
      },
    ],
  },
  schedule: {
    title: 'Automated Scheduled Feed',
    subtitle: 'Background cron job triggering feeding automatically',
    steps: [
      {
        title: 'Step 1: Background Timer Fires',
        sender: 'Backend Cron Engine',
        receiver: 'Database',
        protocol: 'Node-Cron & SQL Query',
        summary: 'Internal scheduler checks active feeding schedules for the current time (e.g. 08:00 AM).',
        activeNode: 1,
      },
      {
        title: 'Step 2: Server Publishes Feed Packet',
        sender: 'Express Backend',
        receiver: 'MQTT Cloud Broker',
        protocol: 'MQTT QoS 1',
        topic: 'smartcat/geo123/device/command',
        summary: 'Server publishes automated scheduled feed command to the broker channel.',
        activeNode: 1,
      },
      {
        title: 'Step 3: Feeder Actuates Motor',
        sender: 'MQTT Broker',
        receiver: 'Arduino UNO R4',
        protocol: 'TCP Message Delivery',
        topic: 'smartcat/geo123/device/command',
        summary: 'Arduino receives scheduled instruction and rotates servo motor for the configured portion.',
        activeNode: 3,
      },
      {
        title: 'Step 4: Log Saved to History',
        sender: 'Arduino UNO R4',
        receiver: 'PostgreSQL Database',
        protocol: 'MQTT Response -> DB Log',
        summary: 'Execution timestamp and portion count are logged for pet care tracking and daily limits.',
        activeNode: 1,
      },
    ],
  },
  telegram: {
    title: 'Telegram Remote Feed',
    subtitle: 'Triggering feeder from Telegram chat with /feed',
    steps: [
      {
        title: 'Step 1: User Sends /feed in Telegram',
        sender: 'Telegram Mobile App',
        receiver: 'Telegram Bot API',
        protocol: 'HTTPS Webhook',
        summary: 'Pet owner taps "/feed" or uses keyboard button in Telegram chat.',
        activeNode: 0,
      },
      {
        title: 'Step 2: Bot Dispatches MQTT Packet',
        sender: 'Express Bot Service',
        receiver: 'MQTT Cloud Broker',
        protocol: 'MQTT QoS 1',
        topic: 'smartcat/geo123/device/command',
        summary: 'Bot verifies user permission and publishes feed instruction to MQTT broker.',
        activeNode: 1,
      },
      {
        title: 'Step 3: Hardware Dispenses Food',
        sender: 'MQTT Broker',
        receiver: 'Arduino UNO R4 WiFi',
        protocol: 'MQTT over TCP',
        summary: 'Arduino moves servo to drop food and replies with success confirmation.',
        activeNode: 3,
      },
      {
        title: 'Step 4: Bot Replies in Telegram Chat',
        sender: 'Telegram Bot',
        receiver: 'User Phone',
        protocol: 'Telegram Bot API Message',
        summary: 'Bot replies: "Cat fed successfully! (Portion 1 dispensed)".',
        activeNode: 0,
      },
    ],
  },
  heartbeat: {
    title: '25-Second Heartbeat Telemetry',
    subtitle: 'Periodic status pulse proving device is online',
    steps: [
      {
        title: 'Step 1: Arduino Checks Telemetry',
        sender: 'Arduino UNO R4',
        receiver: 'Internal WiFi Radio',
        protocol: 'Internal Timer (Every 25s)',
        summary: 'Arduino checks uptime and reads Wi-Fi signal strength (RSSI in dBm).',
        activeNode: 3,
      },
      {
        title: 'Step 2: Heartbeat Published to Broker',
        sender: 'Arduino UNO R4',
        receiver: 'MQTT Cloud Broker',
        protocol: 'MQTT QoS 0 (Lightweight ~80 bytes)',
        topic: 'smartcat/geo123/device/heartbeat',
        summary: 'Arduino publishes tiny heartbeat payload: {"status":"online", "wifiStrength": -55}.',
        activeNode: 2,
      },
      {
        title: 'Step 3: Server Updates Online Status',
        sender: 'MQTT Broker',
        receiver: 'Backend & Dashboard',
        protocol: 'MQTT Subscribe -> SQL Update',
        summary: 'Server marks device ONLINE and updates RSSI strength on the web dashboard.',
        activeNode: 1,
      },
    ],
  },
};

export default function ArchitecturePage() {
  const [deviceData, setDeviceData] = useState<DeviceStatusResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'simulator' | 'comparison' | 'roles' | 'qos' | 'hardware'>('simulator');

  // Simulator State
  const [selectedScenario, setSelectedScenario] = useState<ScenarioKey>('web');
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    api.get('/device/status').then((res) => setDeviceData(res.data)).catch(() => {});
  }, []);

  const scenario = SCENARIOS[selectedScenario];
  const step = scenario.steps[currentStep];
  const totalSteps = scenario.steps.length;

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setTimeout(() => {
        if (currentStep < totalSteps - 1) {
          setCurrentStep((prev) => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, 2500);
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentStep, totalSteps]);

  const handleScenarioChange = (s: ScenarioKey) => {
    setIsPlaying(false);
    setSelectedScenario(s);
    setCurrentStep(0);
  };

  const isOnline = deviceData?.device?.status === 'ONLINE';
  const isMqtt = deviceData?.mqttConnected ?? true;

  return (
    <div className="space-y-6 pb-12 animate-slide-up text-stone-800">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-cat-700 bg-cat-50 px-2.5 py-0.5 rounded-full border border-cat-200">
              Computer Networks Project
            </span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 mt-1">SmartCat Feeder IoT Architecture</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Clear visual explanation of MQTT publish-subscribe networking and hardware actuation
          </p>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border ${
            isMqtt ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isMqtt ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            MQTT Broker: {isMqtt ? 'Connected' : 'Standby'}
          </div>

          <div className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border ${
            isOnline ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-stone-100 text-stone-600 border-stone-200'
          }`}>
            <Radio className="w-3.5 h-3.5 text-blue-600" />
            Feeder: {isOnline ? 'Online' : 'Standby'}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'simulator', label: 'Packet Simulator' },
          { key: 'comparison', label: 'MQTT vs HTTP' },
          { key: 'roles', label: 'The 4 MQTT Roles' },
          { key: 'qos', label: 'Quality of Service (QoS)' },
          { key: 'hardware', label: 'Hardware & Servo Wiring' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              activeTab === tab.key
                ? 'bg-cat-500 text-white border-cat-500 shadow-sm'
                : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: INTERACTIVE PACKET SIMULATOR ────────────────────────────── */}
      {activeTab === 'simulator' && (
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6">
          <div className="border-b border-stone-100 pb-4">
            <h2 className="text-xl font-bold text-stone-900">Interactive Packet Flow Walkthrough</h2>
            <p className="text-xs text-stone-500 mt-1">
              Select a scenario and click <strong>Next Step</strong> to walk through how data travels across the network.
            </p>
          </div>

          {/* Scenario Selection */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(SCENARIOS) as ScenarioKey[]).map((key) => {
              const item = SCENARIOS[key];
              return (
                <button
                  key={key}
                  onClick={() => handleScenarioChange(key)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedScenario === key
                      ? 'bg-cat-50 border-cat-400 text-cat-900 shadow-sm'
                      : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700'
                  }`}
                >
                  <div className="font-bold text-xs">{item.title}</div>
                  <div className="text-[10px] text-stone-500 mt-0.5 line-clamp-1">{item.subtitle}</div>
                </button>
              );
            })}
          </div>

          {/* 4 Connected Nodes Diagram */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            {[
              { idx: 0, title: '1. User Trigger', subtitle: 'Web Dashboard / Telegram', icon: Globe },
              { idx: 1, title: '2. Express Server', subtitle: 'Backend API & Controller', icon: Server },
              { idx: 2, title: '3. MQTT Broker', subtitle: 'Cloud Message Router', icon: Radio },
              { idx: 3, title: '4. Arduino Feeder', subtitle: 'UNO R4 & SG90 Servo', icon: Cpu },
            ].map((node) => {
              const Icon = node.icon;
              const isActive = step.activeNode === node.idx;
              return (
                <div
                  key={node.idx}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    isActive
                      ? 'bg-cat-50/70 border-cat-500 shadow-sm scale-102 ring-2 ring-cat-200'
                      : 'bg-stone-50/60 border-stone-200 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase text-stone-500">{node.title}</span>
                    {isActive && <span className="w-2 h-2 rounded-full bg-cat-500 animate-pulse" />}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-cat-500 text-white flex items-center justify-center mb-2 shadow-sm">
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-stone-900">{node.subtitle}</p>
                </div>
              );
            })}
          </div>

          {/* Current Step Explanation Card (100% Light Themed) */}
          <div className="bg-stone-50 p-5 rounded-xl border border-stone-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-cat-500 text-white px-2.5 py-0.5 rounded-full">
                  Step {currentStep + 1} of {totalSteps}
                </span>
                <h3 className="font-bold text-sm text-stone-900">{step.title}</h3>
              </div>

              <div className="text-xs text-stone-500 font-medium">
                Protocol: <strong className="text-stone-800">{step.protocol}</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-stone-500 text-[11px] block">TRANSMISSION:</span>
                <span className="font-semibold text-stone-800 flex items-center gap-1.5 mt-0.5">
                  <span className="text-cat-700">{step.sender}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
                  <span className="text-emerald-700">{step.receiver}</span>
                </span>
              </div>

              {step.topic && (
                <div>
                  <span className="text-stone-500 text-[11px] block">MQTT TOPIC:</span>
                  <code className="font-mono text-xs text-stone-800 bg-white px-2 py-0.5 rounded border border-stone-200 inline-block mt-0.5">
                    {step.topic}
                  </code>
                </div>
              )}
            </div>

            <div className="p-3 bg-white rounded-lg border border-stone-200 text-xs text-stone-700 leading-relaxed flex items-start gap-2">
              <Info className="w-4 h-4 text-cat-500 shrink-0 mt-0.5" />
              <span>{step.summary}</span>
            </div>

            {/* Step Controls */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-3.5 py-1.5 rounded-xl bg-cat-500 hover:bg-cat-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  {isPlaying ? 'Pause' : 'Auto Play'}
                </button>

                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStep(0);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 font-bold text-xs flex items-center gap-1 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStep((prev) => Math.max(0, prev - 1));
                  }}
                  disabled={currentStep === 0}
                  className="px-3 py-1.5 rounded-xl bg-white border border-stone-200 hover:bg-stone-100 disabled:opacity-40 text-stone-700 font-bold text-xs flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>

                <span className="text-xs font-mono font-bold text-stone-500 px-2">
                  {currentStep + 1} / {totalSteps}
                </span>

                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStep((prev) => Math.min(totalSteps - 1, prev + 1));
                  }}
                  disabled={currentStep === totalSteps - 1}
                  className="px-3 py-1.5 rounded-xl bg-cat-500 hover:bg-cat-600 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: MQTT VS HTTP ────────────────────────────────────────────── */}
      {activeTab === 'comparison' && (
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-stone-900">Why MQTT Over HTTP for IoT Microcontrollers</h2>
            <p className="text-xs text-stone-500 mt-1">
              Comparison between traditional web HTTP polling and lightweight MQTT publish-subscribe messaging.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-stone-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200">
                  <th className="p-3">Feature</th>
                  <th className="p-3 text-rose-700 bg-rose-50/60">HTTP (Polling)</th>
                  <th className="p-3 text-emerald-700 bg-emerald-50/60">MQTT (Pub/Sub)</th>
                  <th className="p-3">Impact on Feeder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                <tr className="hover:bg-stone-50">
                  <td className="p-3 font-semibold text-stone-900">Packet Header Size</td>
                  <td className="p-3 text-rose-700 font-mono">500 – 1,000+ bytes</td>
                  <td className="p-3 text-emerald-700 font-mono font-bold">2 bytes</td>
                  <td className="p-3 text-stone-600">Saves 99% data overhead on Wi-Fi.</td>
                </tr>
                <tr className="hover:bg-stone-50">
                  <td className="p-3 font-semibold text-stone-900">Communication Model</td>
                  <td className="p-3 text-rose-700">Client-to-server request/response</td>
                  <td className="p-3 text-emerald-700 font-bold">Publish / Subscribe via Broker</td>
                  <td className="p-3 text-stone-600">Hardware never needs a public IP address.</td>
                </tr>
                <tr className="hover:bg-stone-50">
                  <td className="p-3 font-semibold text-stone-900">Real-Time Delivery</td>
                  <td className="p-3 text-rose-700">Periodic polling delay (e.g. 5–10s)</td>
                  <td className="p-3 text-emerald-700 font-bold">Instant push (&lt;100ms)</td>
                  <td className="p-3 text-stone-600">Motor actuates immediately on button click.</td>
                </tr>
                <tr className="hover:bg-stone-50">
                  <td className="p-3 font-semibold text-stone-900">Connection Overhead</td>
                  <td className="p-3 text-rose-700">New TCP/TLS handshake each request</td>
                  <td className="p-3 text-emerald-700 font-bold">Single persistent TCP socket</td>
                  <td className="p-3 text-stone-600">Prevents Arduino CPU and RAM exhaustion.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-5 bg-rose-50/60 rounded-xl border border-rose-200 space-y-2">
              <span className="text-[10px] font-bold uppercase text-rose-700 bg-rose-100 px-2 py-0.5 rounded">HTTP Inefficiency</span>
              <h3 className="font-bold text-sm text-stone-900">The "Door Knocking" Problem</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                With HTTP polling, the Arduino must repeatedly query the server every 2 seconds: <em>"Any food to dispense? Any food now?"</em>. Over 99% of requests are wasted, consuming battery and heating up the board.
              </p>
            </div>

            <div className="p-5 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-2">
              <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">MQTT Efficiency</span>
              <h3 className="font-bold text-sm text-stone-900">The "Walkie-Talkie" Solution</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                The Arduino maintains a lightweight listening state on its topic channel. When a feed command is clicked on the web, the broker pushes the message down the socket in under 100 milliseconds.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: THE 4 ROLES ────────────────────────────────────────────── */}
      {activeTab === 'roles' && (
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-stone-900">The 4 Core Roles in MQTT Architecture</h2>
            <p className="text-xs text-stone-500 mt-1">
              MQTT completely decouples the sender and receiver through four components:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <div className="p-2.5 bg-cat-500 text-white rounded-xl w-fit">
                <Send className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-stone-900">1. Publisher</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Sends the message. In our project, the Express backend publishes feed instructions.
              </p>
            </div>

            <div className="p-5 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <div className="p-2.5 bg-amber-500 text-white rounded-xl w-fit">
                <Server className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-stone-900">2. Broker</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                The central cloud switchboard (EMQX / HiveMQ). It manages routing and delivers packets to all subscribers.
              </p>
            </div>

            <div className="p-5 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl w-fit">
                <Radio className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-stone-900">3. Topic</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                The message channel (e.g. <code className="font-mono text-[11px] bg-white px-1 py-0.5 rounded border">smartcat/geo123/device/command</code>) identifying the action.
              </p>
            </div>

            <div className="p-5 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <div className="p-2.5 bg-cyan-600 text-white rounded-xl w-fit">
                <Download className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-stone-900">4. Subscriber</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                The listener. Arduino UNO R4 subscribes on startup and actuates the motor when a packet arrives.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: QOS LEVELS ─────────────────────────────────────────────── */}
      {activeTab === 'qos' && (
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-stone-900">Quality of Service (QoS) Guarantees</h2>
            <p className="text-xs text-stone-500 mt-1">
              MQTT defines three delivery guarantee levels for different IoT requirements:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <span className="font-mono text-xs font-bold bg-stone-200 text-stone-800 px-2 py-0.5 rounded">QoS 0</span>
              <h3 className="font-bold text-sm text-stone-900">At Most Once ("Fire & Forget")</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Sent without acknowledgment. If a Wi-Fi packet drops, it is not re-transmitted.
              </p>
              <p className="text-[11px] text-stone-500 font-medium pt-1 border-t border-stone-200">
                Used in SmartCat for: <strong>Heartbeat telemetry</strong>.
              </p>
            </div>

            <div className="p-5 bg-emerald-50/70 rounded-xl border-2 border-emerald-300 space-y-2">
              <span className="font-mono text-xs font-bold bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded">QoS 1 (Recommended)</span>
              <h3 className="font-bold text-sm text-emerald-950">At Least Once (PUBACK Guaranteed)</h3>
              <p className="text-xs text-emerald-900 leading-relaxed">
                The sender holds the message until the recipient returns a <code className="font-mono bg-white px-1 rounded border">PUBACK</code> acknowledgment packet.
              </p>
              <p className="text-[11px] text-emerald-800 font-semibold pt-1 border-t border-emerald-200">
                Used in SmartCat for: <strong>Feed commands</strong> so your pet is guaranteed to be fed!
              </p>
            </div>

            <div className="p-5 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <span className="font-mono text-xs font-bold bg-stone-200 text-stone-800 px-2 py-0.5 rounded">QoS 2</span>
              <h3 className="font-bold text-sm text-stone-900">Exactly Once (4-Way Handshake)</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Guarantees zero duplicates using a 4-message handshake (<code className="font-mono text-[10px]">PUB -&gt; PUBREC -&gt; PUBREL -&gt; PUBCOMP</code>). High overhead.
              </p>
              <p className="text-[11px] text-stone-500 font-medium pt-1 border-t border-stone-200">
                Used for: Banking & high-precision medical devices.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: HARDWARE & SERVO WIRING ────────────────────────────────── */}
      {activeTab === 'hardware' && (
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-stone-900">Arduino UNO R4 WiFi & SG90 Servo Actuation</h2>
            <p className="text-xs text-stone-500 mt-1">
              Physical wiring specifications and PWM control signal timings:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <div className="p-2 bg-blue-100 text-blue-800 rounded-lg w-fit">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-stone-900">Arduino UNO R4 WiFi</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Powered by a 32-bit Renesas RA4M1 ARM Cortex-M4 chip with built-in Wi-Fi and 12x8 LED status matrix.
              </p>
            </div>

            <div className="p-5 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <div className="p-2 bg-cat-100 text-cat-700 rounded-lg w-fit">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-stone-900">50Hz PWM Signal (Pin D9)</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Pin D9 outputs standard 50Hz pulses (20ms cycle). <br />
                • <strong>0° (Closed):</strong> 544µs pulse <br />
                • <strong>90° (Open):</strong> 1500µs pulse
              </p>
            </div>

            <div className="p-5 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg w-fit">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-stone-900">Shared Common Ground</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Essential electrical rule: If using an external 5V battery, its negative (-) ground must connect to Arduino GND so the PWM signal has a return path.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
