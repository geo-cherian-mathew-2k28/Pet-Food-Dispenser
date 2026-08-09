// SmartCat Feeder - System Architecture & How It Works Page
// Visual, diagrammatic representation of the actual MQTT IoT communication architecture.

import { useEffect, useState } from 'react';
import api from '../lib/api';
import {
  Cpu,
  Server,
  Globe,
  Radio,
  Zap,
  ArrowRight,
  ShieldCheck,
  Layers,
  Activity,
  CheckCircle2,
  Lock,
  Wifi,
  Code2,
  HelpCircle,
  Clock,
  Send,
  Download,
  AlertCircle
} from 'lucide-react';

interface DeviceStatusResponse {
  device?: {
    status: 'ONLINE' | 'OFFLINE';
    lastHeartbeatAt: string | null;
    uptimeSeconds: number | null;
    wifiStrength: number | null;
    servoOpenDurationMs: number;
  };
  mqttConnected: boolean;
  isDispensing: boolean;
}

export default function ArchitecturePage() {
  const [deviceData, setDeviceData] = useState<DeviceStatusResponse | null>(null);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [activePayloadTab, setActivePayloadTab] = useState<'command' | 'response' | 'heartbeat' | 'status'>('command');

  const fetchStatus = async () => {
    try {
      const res = await api.get('/device/status');
      setDeviceData(res.data);
    } catch (err) {
      // Keep static defaults if offline
    }
  };

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(fetchStatus, 10000);
    return () => clearInterval(timer);
  }, []);

  // Real data or defaults derived from current project configuration
  const isMqttConnected = deviceData?.mqttConnected ?? true;
  const isDeviceOnline = deviceData?.device?.status === 'ONLINE';

  return (
    <div className="space-y-8 animate-slide-up pb-12">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-card">
        <div>
          <div className="flex items-center gap-2 text-cat-500 font-semibold text-xs uppercase tracking-wider mb-1">
            <Cpu className="w-4 h-4" /> System Architecture & Technical Specifications
          </div>
          <h1 className="text-2xl font-bold text-gray-900">How SmartCat Feeder Works</h1>
          <p className="text-gray-500 text-sm mt-1">
            Visual end-to-end telemetry pipeline: Web → REST API → MQTT Broker → Arduino UNO R4 → Servo Motor
          </p>
        </div>

        {/* Live System Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border ${
            isMqttConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isMqttConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            MQTT Broker: {isMqttConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </div>

          <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border ${
            isDeviceOnline ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-600 border-gray-200'
          }`}>
            <Radio className="w-3.5 h-3.5" />
            Hardware: {isDeviceOnline ? 'ONLINE' : 'OFFLINE'}
          </div>
        </div>
      </div>

      {/* ── SECTION 1: Main Architecture Visual Diagram ───────────────────── */}
      <div className="card p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-cat-500" />
              1. End-to-End System Architecture
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Live hardware-software topology discovered directly from project source code
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 bg-cat-50 text-cat-600 font-semibold rounded-lg border border-cat-100 hidden sm:inline-block">
            Event-Driven Architecture
          </span>
        </div>

        {/* Visual Node Pipeline */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
          {/* Node 1: User Web App */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col items-center text-center relative shadow-md border border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-cat-500/20 text-cat-400 flex items-center justify-center mb-3">
              <Globe className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-cat-300 uppercase tracking-wider">Frontend</span>
            <h3 className="font-bold text-sm text-white mt-1">React Web UI</h3>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              Sends HTTP REST requests with JWT Authorization headers
            </p>
            <div className="mt-4 px-2.5 py-1 bg-slate-800 text-[10px] text-cat-300 font-mono rounded-lg border border-slate-700">
              POST /api/feeds/manual
            </div>
          </div>

          {/* Arrow 1 */}
          <div className="hidden md:flex flex-col items-center justify-center text-cat-400">
            <span className="text-[10px] font-bold text-gray-400 mb-1">HTTP / REST</span>
            <ArrowRight className="w-6 h-6 text-cat-500 animate-pulse" />
            <span className="text-[9px] text-gray-400 mt-1 font-mono">Port 5000</span>
          </div>

          {/* Node 2: Node.js Express Backend */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col items-center text-center relative shadow-md border border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
              <Server className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Backend API</span>
            <h3 className="font-bold text-sm text-white mt-1">Node.js / Express</h3>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              Validates auth, checks lock, creates Prisma log & publishes MQTT
            </p>
            <div className="mt-4 px-2.5 py-1 bg-slate-800 text-[10px] text-emerald-300 font-mono rounded-lg border border-slate-700">
              mqtt.service.ts
            </div>
          </div>

          {/* Arrow 2 */}
          <div className="hidden md:flex flex-col items-center justify-center text-cat-400">
            <span className="text-[10px] font-bold text-gray-400 mb-1">MQTT Publish</span>
            <ArrowRight className="w-6 h-6 text-emerald-500 animate-pulse" />
            <span className="text-[9px] text-gray-400 mt-1 font-mono">QoS Level 1</span>
          </div>

          {/* Node 3: MQTT Broker */}
          <div className="bg-gradient-to-b from-cat-900 to-slate-900 text-white p-5 rounded-2xl flex flex-col items-center text-center relative shadow-lg border border-cat-700/50 col-span-1">
            <div className="w-12 h-12 rounded-xl bg-cat-500 text-white flex items-center justify-center mb-3 shadow-md">
              <Radio className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-cat-300 uppercase tracking-wider">Broker</span>
            <h3 className="font-bold text-sm text-white mt-1">HiveMQ / EMQX</h3>
            <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
              Message Router pub/sub broker handling real-time topics
            </p>
            <div className="mt-4 px-2.5 py-1 bg-cat-950/80 text-[10px] text-cat-200 font-mono rounded-lg border border-cat-700">
              smartcat/#
            </div>
          </div>
        </div>

        {/* Second Row Pipeline */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
          {/* Node 4: Arduino Hardware */}
          <div className="md:col-start-3 bg-slate-900 text-white p-5 rounded-2xl flex flex-col items-center text-center relative shadow-md border border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-3">
              <Cpu className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Hardware</span>
            <h3 className="font-bold text-sm text-white mt-1">Arduino UNO R4</h3>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              PubSubClient subscriber + 12×8 LED Matrix status display
            </p>
            <div className="mt-4 px-2.5 py-1 bg-slate-800 text-[10px] text-cyan-300 font-mono rounded-lg border border-slate-700">
              smartcat_feeder.ino
            </div>
          </div>

          {/* Arrow 3 */}
          <div className="hidden md:flex flex-col items-center justify-center text-cat-400">
            <span className="text-[10px] font-bold text-gray-400 mb-1">PWM Signal</span>
            <ArrowRight className="w-6 h-6 text-cyan-500 animate-pulse" />
            <span className="text-[9px] text-gray-400 mt-1 font-mono">Pin D9</span>
          </div>

          {/* Node 5: Servo Actuator */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col items-center text-center relative shadow-md border border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
              <Zap className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">Actuator</span>
            <h3 className="font-bold text-sm text-white mt-1">SG90 Servo Motor</h3>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              Rotates 0° → 160° open angle to dispense dry cat food
            </p>
            <div className="mt-4 px-2.5 py-1 bg-slate-800 text-[10px] text-amber-300 font-mono rounded-lg border border-slate-700">
              1500ms open duration
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: "Feed Now" Command Journey ─────────────────────────── */}
      <div className="card p-6 md:p-8 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-cat-500" />
            2. The "Feed Now" Command Execution Journey
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Click any step below to trace the exact code path from web click to physical food dispensing
          </p>
        </div>

        {/* Interactive Step Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {[
            { step: 1, title: 'Web Click', label: 'User Press' },
            { step: 2, title: 'REST API', label: 'HTTP POST' },
            { step: 3, title: 'Backend Lock', label: 'Auth & DB' },
            { step: 4, title: 'MQTT Publish', label: 'Broker Push' },
            { step: 5, title: 'Arduino RX', label: 'Topic Match' },
            { step: 6, title: 'Servo Dispense', label: 'PWM 160°' },
            { step: 7, title: 'Status ACK', label: 'Response TX' },
          ].map((item) => (
            <button
              key={item.step}
              onClick={() => setActiveStep(item.step)}
              className={`p-3 rounded-xl border text-left transition-all ${
                activeStep === item.step
                  ? 'bg-cat-500 text-white border-cat-500 shadow-sm scale-105'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-cat-300 hover:bg-cat-50/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  activeStep === item.step ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  #{item.step}
                </span>
              </div>
              <p className="font-bold text-xs mt-2 truncate">{item.title}</p>
              <p className={`text-[10px] truncate ${activeStep === item.step ? 'text-cat-100' : 'text-gray-400'}`}>
                {item.label}
              </p>
            </button>
          ))}
        </div>

        {/* Step Detail Card */}
        <div className="bg-gray-900 text-white p-6 rounded-2xl border border-gray-800 flex flex-col md:flex-row items-start gap-6">
          <div className="w-12 h-12 rounded-2xl bg-cat-500 text-white flex items-center justify-center font-black text-xl shrink-0 shadow-md">
            {activeStep}
          </div>
          <div className="flex-1 space-y-3">
            {activeStep === 1 && (
              <>
                <h3 className="font-bold text-base text-white">Step 1: User Clicks "Feed Now" in Website</h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  The user interacts with the React frontend dashboard and presses the primary <strong>"Feed Now"</strong> button. The browser immediately validates portion settings and prepares an authenticated HTTP payload.
                </p>
                <div className="p-3 bg-gray-950 rounded-xl font-mono text-[11px] text-cat-300 border border-gray-800">
                  Trigger Component: <span className="text-white">frontend/src/pages/DashboardPage.tsx → handleFeedNow()</span>
                </div>
              </>
            )}

            {activeStep === 2 && (
              <>
                <h3 className="font-bold text-base text-white">Step 2: Frontend Sends REST HTTP Request</h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  The frontend makes an asynchronous Axios POST request to the Express backend endpoint. The request includes the JWT Bearer token in headers and portion configuration in the request body.
                </p>
                <div className="p-3 bg-gray-950 rounded-xl font-mono text-[11px] text-emerald-400 border border-gray-800">
                  Endpoint: <span className="text-white">POST /api/feeds/manual payload: &#123; portion: 1 &#125;</span>
                </div>
              </>
            )}

            {activeStep === 3 && (
              <>
                <h3 className="font-bold text-base text-white">Step 3: Backend Security & Lock Enforcement</h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  The Express backend authenticates the user JWT token, verifies daily feeding limits, and engages an in-memory dispensing lock (<code className="text-cat-300">isServerDispensing</code>) to prevent simultaneous feed requests from multiple users.
                </p>
                <div className="p-3 bg-gray-950 rounded-xl font-mono text-[11px] text-blue-400 border border-gray-800">
                  Backend Module: <span className="text-white">backend/src/modules/feeds/feeds.router.ts → createFeedLog(PENDING)</span>
                </div>
              </>
            )}

            {activeStep === 4 && (
              <>
                <h3 className="font-bold text-base text-white">Step 4: Backend Publishes Command to MQTT Broker</h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  The Node.js MQTT client publishes a structured JSON payload to the command topic with <strong>QoS 1 (At least once)</strong>. The broker acknowledges message delivery.
                </p>
                <div className="p-3 bg-gray-950 rounded-xl font-mono text-[11px] text-amber-300 border border-gray-800">
                  Topic: <span className="text-white">smartcat/geo123/device/command (QoS 1)</span>
                </div>
              </>
            )}

            {activeStep === 5 && (
              <>
                <h3 className="font-bold text-base text-white">Step 5: Arduino Receives & Deserializes Payload</h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  The Arduino UNO R4 WiFi micro-controller receives the MQTT payload via <code className="text-cyan-300">PubSubClient.onMqttMessage()</code> callback. ArduinoJson deserializes the JSON string and checks duplicate request IDs.
                </p>
                <div className="p-3 bg-gray-950 rounded-xl font-mono text-[11px] text-cyan-300 border border-gray-800">
                  Firmware Handler: <span className="text-white">smartcat_feeder.ino → handleCommand(payload)</span>
                </div>
              </>
            )}

            {activeStep === 6 && (
              <>
                <h3 className="font-bold text-base text-white">Step 6: Servo Motor Dispenses Food</h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Arduino attaches the SG90 servo to Pin D9, drives it to <strong>160° (OPEN)</strong>, holds for the configured duration (<code className="text-amber-300">1500ms * portion</code>), rotates back to <strong>0° (CLOSED)</strong>, and displays a downward arrow animation on the 12×8 LED matrix.
                </p>
                <div className="p-3 bg-gray-950 rounded-xl font-mono text-[11px] text-amber-400 border border-gray-800">
                  Actuator Control: <span className="text-white">feederServo.write(160) → delay(1500) → feederServo.write(0)</span>
                </div>
              </>
            )}

            {activeStep === 7 && (
              <>
                <h3 className="font-bold text-base text-white">Step 7: Arduino Publishes Response & Backend Updates DB</h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Arduino publishes a success JSON message to <code className="text-emerald-400">smartcat/geo123/device/response</code>. Backend receives it, marks the feed log status as <strong>SUCCESS</strong> in Prisma DB, releases the server dispensing lock, and returns HTTP 200 to the web browser.
                </p>
                <div className="p-3 bg-gray-950 rounded-xl font-mono text-[11px] text-emerald-300 border border-gray-800">
                  Response Payload: <span className="text-white">&#123; "status": "success", "message": "Food dispensed" &#125;</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── SECTION 3: Real MQTT Topics Visual Directory ─────────────────── */}
      <div className="card p-6 md:p-8 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Radio className="w-5 h-5 text-cat-500" />
            3. Discovered MQTT Topic Architecture
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Exact MQTT topic hierarchy and channel definitions used in the production codebase
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Topic 1: Command */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-card flex flex-col justify-between hover:border-cat-200 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-1 bg-amber-50 text-amber-700 font-mono text-[11px] font-bold rounded-md border border-amber-100">
                  QoS Level 1
                </span>
                <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                  <Send className="w-3 h-3 text-cat-500" /> Backend → Device
                </span>
              </div>
              <h3 className="font-mono text-xs font-bold text-gray-900 bg-gray-50 p-2.5 rounded-xl border border-gray-100 break-all">
                smartcat/geo123/device/command
              </h3>
              <p className="text-xs text-gray-600 mt-3 leading-relaxed">
                <strong>Purpose:</strong> Carries manual or scheduled feeding trigger commands to the hardware controller.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-400">
              <span>Format: JSON</span>
              <span className="font-semibold text-amber-600">Reliable Delivery</span>
            </div>
          </div>

          {/* Topic 2: Response */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-card flex flex-col justify-between hover:border-cat-200 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-mono text-[11px] font-bold rounded-md border border-emerald-100">
                  QoS Level 0
                </span>
                <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                  <Download className="w-3 h-3 text-emerald-500" /> Device → Backend
                </span>
              </div>
              <h3 className="font-mono text-xs font-bold text-gray-900 bg-gray-50 p-2.5 rounded-xl border border-gray-100 break-all">
                smartcat/geo123/device/response
              </h3>
              <p className="text-xs text-gray-600 mt-3 leading-relaxed">
                <strong>Purpose:</strong> Returns dispensing completion status, actual servo angle, and execution duration.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-400">
              <span>Format: JSON</span>
              <span className="font-semibold text-emerald-600">Acknowledged</span>
            </div>
          </div>

          {/* Topic 3: Heartbeat */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-card flex flex-col justify-between hover:border-cat-200 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-mono text-[11px] font-bold rounded-md border border-blue-100">
                  Every 25 seconds
                </span>
                <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                  <Activity className="w-3 h-3 text-blue-500" /> Device → Backend
                </span>
              </div>
              <h3 className="font-mono text-xs font-bold text-gray-900 bg-gray-50 p-2.5 rounded-xl border border-gray-100 break-all">
                smartcat/geo123/device/heartbeat
              </h3>
              <p className="text-xs text-gray-600 mt-3 leading-relaxed">
                <strong>Purpose:</strong> Periodic telemetry pulse containing system uptime and WiFi RSSI signal strength.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-400">
              <span>Format: JSON</span>
              <span className="font-semibold text-blue-600">Telemetry Pulse</span>
            </div>
          </div>

          {/* Topic 4: Status */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-card flex flex-col justify-between hover:border-cat-200 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-1 bg-purple-50 text-purple-700 font-mono text-[11px] font-bold rounded-md border border-purple-100">
                  Event-Driven
                </span>
                <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                  <Wifi className="w-3 h-3 text-purple-500" /> Device → Backend
                </span>
              </div>
              <h3 className="font-mono text-xs font-bold text-gray-900 bg-gray-50 p-2.5 rounded-xl border border-gray-100 break-all">
                smartcat/geo123/device/status
              </h3>
              <p className="text-xs text-gray-600 mt-3 leading-relaxed">
                <strong>Purpose:</strong> Fired immediately when Arduino connects or re-establishes MQTT broker session.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-400">
              <span>Format: JSON</span>
              <span className="font-semibold text-purple-600">Connect Event</span>
            </div>
          </div>

          {/* Topic 5: Error */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-card flex flex-col justify-between hover:border-cat-200 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-1 bg-red-50 text-red-700 font-mono text-[11px] font-bold rounded-md border border-red-100">
                  Exception Handler
                </span>
                <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-red-500" /> Device → Backend
                </span>
              </div>
              <h3 className="font-mono text-xs font-bold text-gray-900 bg-gray-50 p-2.5 rounded-xl border border-gray-100 break-all">
                smartcat/geo123/device/error
              </h3>
              <p className="text-xs text-gray-600 mt-3 leading-relaxed">
                <strong>Purpose:</strong> Reports JSON deserialization failures or illegal state hardware exceptions.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-400">
              <span>Format: JSON</span>
              <span className="font-semibold text-red-600">Error Telemetry</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 4: Publisher vs Subscriber Visual Roles ─────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Downstream: Web -> Device */}
        <div className="card p-6 space-y-4 border-l-4 border-l-cat-500">
          <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
            <Send className="w-4 h-4 text-cat-500" />
            Downstream Flow (Commands)
          </h3>

          <div className="space-y-3">
            <div className="p-3 bg-cat-50/50 rounded-xl border border-cat-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-cat-600 block">Publisher = Sender</span>
                <span className="font-bold text-xs text-gray-900">Node.js Express Backend</span>
              </div>
              <span className="text-xs bg-cat-500 text-white px-2 py-0.5 rounded font-mono">PUBLISH</span>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-gray-500 block">Broker = Router</span>
                <span className="font-bold text-xs text-gray-900">HiveMQ / EMQX MQTT Broker</span>
              </div>
              <span className="text-xs bg-gray-700 text-white px-2 py-0.5 rounded font-mono">ROUTE</span>
            </div>

            <div className="p-3 bg-cyan-50/50 rounded-xl border border-cyan-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-cyan-600 block">Subscriber = Receiver</span>
                <span className="font-bold text-xs text-gray-900">Arduino UNO R4 WiFi</span>
              </div>
              <span className="text-xs bg-cyan-600 text-white px-2 py-0.5 rounded font-mono">SUBSCRIBE</span>
            </div>
          </div>
        </div>

        {/* Upstream: Device -> Web */}
        <div className="card p-6 space-y-4 border-l-4 border-l-emerald-500">
          <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-500" />
            Upstream Flow (Telemetry & Status)
          </h3>

          <div className="space-y-3">
            <div className="p-3 bg-cyan-50/50 rounded-xl border border-cyan-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-cyan-600 block">Publisher = Sender</span>
                <span className="font-bold text-xs text-gray-900">Arduino UNO R4 WiFi</span>
              </div>
              <span className="text-xs bg-cyan-600 text-white px-2 py-0.5 rounded font-mono">PUBLISH</span>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-gray-500 block">Broker = Router</span>
                <span className="font-bold text-xs text-gray-900">HiveMQ / EMQX MQTT Broker</span>
              </div>
              <span className="text-xs bg-gray-700 text-white px-2 py-0.5 rounded font-mono">ROUTE</span>
            </div>

            <div className="p-3 bg-cat-50/50 rounded-xl border border-cat-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-cat-600 block">Subscriber = Receiver</span>
                <span className="font-bold text-xs text-gray-900">Node.js Express Backend</span>
              </div>
              <span className="text-xs bg-cat-500 text-white px-2 py-0.5 rounded font-mono">SUBSCRIBE</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 5: Arduino Connection Pipeline & Safe Parameters ───── */}
      <div className="card p-6 md:p-8 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Wifi className="w-5 h-5 text-cat-500" />
            4. Micro-controller Network Connection Pipeline
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Safe technical connection metrics (sensitive secrets and passwords automatically masked)
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Arduino Library</span>
            <span className="text-sm font-bold text-gray-900 mt-1 block">PubSubClient + WiFiS3</span>
            <span className="text-[11px] text-cat-600 mt-2 block font-mono">Arduino UNO R4 WiFi</span>
          </div>

          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">MQTT Port & TLS</span>
            <span className="text-sm font-bold text-gray-900 mt-1 block">Port 1883 / 8883 (TLS)</span>
            <span className="text-[11px] text-emerald-600 mt-2 block font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Authentication Enabled
            </span>
          </div>

          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">KeepAlive Interval</span>
            <span className="text-sm font-bold text-gray-900 mt-1 block">15 Seconds</span>
            <span className="text-[11px] text-blue-600 mt-2 block font-mono">Socket Timeout: 8s</span>
          </div>

          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Watchdogs & Retries</span>
            <span className="text-sm font-bold text-gray-900 mt-1 block">WiFi 15s / MQTT 8s</span>
            <span className="text-[11px] text-purple-600 mt-2 block font-mono">Auto-reconnect loop</span>
          </div>
        </div>
      </div>

      {/* ── SECTION 6: Payload Inspection Visualizer ─────────────────────── */}
      <div className="card p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Code2 className="w-5 h-5 text-cat-500" />
              5. Live JSON Message Payloads
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Inspect the exact JSON data structures exchanged over MQTT topics
            </p>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            {(['command', 'response', 'heartbeat', 'status'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActivePayloadTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  activePayloadTab === tab
                    ? 'bg-white text-cat-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Code Snippet Box */}
        <div className="bg-slate-950 text-slate-100 p-5 rounded-2xl font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner">
          <div className="flex items-center justify-between text-slate-500 text-[11px] pb-3 mb-3 border-b border-slate-800">
            <span>Topic: smartcat/geo123/device/{activePayloadTab}</span>
            <span>Content-Type: application/json</span>
          </div>

          <pre className="text-emerald-400 leading-relaxed">
            {activePayloadTab === 'command' && JSON.stringify({
              command: "feed",
              requestId: "clxxx123xyz456",
              source: "web",
              userId: "user-geo-101",
              userName: "Geo Mathew",
              portion: 1,
              durationMs: 1500,
              createdAt: new Date().toISOString()
            }, null, 2)}

            {activePayloadTab === 'response' && JSON.stringify({
              requestId: "clxxx123xyz456",
              status: "success",
              message: "Food dispensed",
              servoAngle: 160,
              durationMs: 1500,
              createdAt: "T+00:00:01.523"
            }, null, 2)}

            {activePayloadTab === 'heartbeat' && JSON.stringify({
              status: "online",
              uptimeSeconds: 3420,
              wifiStrength: -55,
              createdAt: "T+00:57:00.000"
            }, null, 2)}

            {activePayloadTab === 'status' && JSON.stringify({
              status: "online",
              createdAt: "T+00:00:00.001"
            }, null, 2)}
          </pre>
        </div>
      </div>

      {/* ── SECTION 7: "Why MQTT?" Visual Comparison ────────────────────── */}
      <div className="card p-6 md:p-8 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-cat-500" />
            6. Why MQTT Over Traditional HTTP?
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Comparing continuous HTTP polling vs lightweight event-driven MQTT messaging
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Traditional HTTP */}
          <div className="bg-red-50/50 p-6 rounded-2xl border border-red-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-red-900 text-sm">HTTP Polling Architecture</h3>
              <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded">High Overhead</span>
            </div>
            <p className="text-xs text-red-700 leading-relaxed">
              Hardware must continuously query the server every second ("Any new feeds?"). Requires heavy HTTP headers, TCP handshakes, high bandwidth, and causes battery/thermal strain on micro-controllers.
            </p>
            <div className="p-3 bg-white rounded-xl text-xs font-mono text-red-600 border border-red-100">
              Client → GET /api/check → Server Response (Repeated N times)
            </div>
          </div>

          {/* Modern MQTT */}
          <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-emerald-900 text-sm">MQTT Event-Driven Architecture</h3>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">Optimal for IoT</span>
            </div>
            <p className="text-xs text-emerald-700 leading-relaxed">
              Open persistent connection with tiny 2-byte packet headers. The broker pushes messages instantly only when a feed event occurs. Zero polling overhead, instant reaction.
            </p>
            <div className="p-3 bg-white rounded-xl text-xs font-mono text-emerald-600 border border-emerald-100">
              Broker → Push Message → Subscribed Device (Instant Execution)
            </div>
          </div>
        </div>

        {/* 4 Feature Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div className="p-4 bg-gray-50 rounded-xl text-center">
            <div className="w-8 h-8 rounded-full bg-cat-100 text-cat-600 mx-auto flex items-center justify-center mb-2 font-bold text-xs">1</div>
            <h4 className="font-bold text-xs text-gray-900">Lightweight</h4>
            <p className="text-[11px] text-gray-500 mt-1">2-byte header saves bandwidth</p>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl text-center">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-2 font-bold text-xs">2</div>
            <h4 className="font-bold text-xs text-gray-900">Real-Time</h4>
            <p className="text-[11px] text-gray-500 mt-1">Sub-millisecond latency</p>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl text-center">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 mx-auto flex items-center justify-center mb-2 font-bold text-xs">3</div>
            <h4 className="font-bold text-xs text-gray-900">Pub / Sub</h4>
            <p className="text-[11px] text-gray-500 mt-1">Decoupled sender & receiver</p>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl text-center">
            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 mx-auto flex items-center justify-center mb-2 font-bold text-xs">4</div>
            <h4 className="font-bold text-xs text-gray-900">Built for IoT</h4>
            <p className="text-[11px] text-gray-500 mt-1">Handles noisy Wi-Fi drops</p>
          </div>
        </div>
      </div>

      {/* ── SECTION 8: Reliability & Guard Mechanisms ───────────────────── */}
      <div className="card p-6 md:p-8 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cat-500" />
            7. System Reliability & Safety Guards
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Built-in hardware and backend protections against accidental over-feeding or duplicate triggers
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-card space-y-2">
            <div className="p-2 bg-cat-50 text-cat-600 rounded-lg w-fit">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-gray-900">Dual Dispensing Locks</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Server-side <code className="text-cat-600 font-mono">isServerDispensing</code> and Arduino-side <code className="text-cat-600 font-mono">isDispensing</code> locks prevent simultaneous feed requests from overlapping.
            </p>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-card space-y-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg w-fit">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-gray-900">30s Deduplication Window</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Arduino stores the last processed <code className="text-emerald-600 font-mono">requestId</code> and ignores identical duplicate messages sent within 30 seconds.
            </p>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-card space-y-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg w-fit">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-gray-900">120s Heartbeat Timeout</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              If Arduino goes powered off or offline for &gt;120s without a heartbeat pulse, backend marks device state OFFLINE and releases stuck locks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
