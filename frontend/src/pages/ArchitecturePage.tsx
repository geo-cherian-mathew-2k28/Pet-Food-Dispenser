// SmartCat Feeder - System Architecture & Presentation Page
// Designed with a clean, high-contrast Light Theme PPT Slide Presentation format.
// Simple, kid-friendly visual flowcharts and comprehensive anti-hacking security safeguards.

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
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Smile,
  Shield,
  Sparkles,
  Info
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
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [activeStep, setActiveStep] = useState<number>(1);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/device/status');
      setDeviceData(res.data);
    } catch (err) {
      // Keep fallback values on error
    }
  };

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(fetchStatus, 10000);
    return () => clearInterval(timer);
  }, []);

  const isMqttConnected = deviceData?.mqttConnected ?? true;
  const isDeviceOnline = deviceData?.device?.status === 'ONLINE';

  const slideTitles = [
    '1. High-Level Architecture Overview',
    '2. "Explain Like I\'m 10" (Kid-Friendly Story)',
    '3. Visual Interactive System Flowchart',
    '4. Step-by-Step "Feed Now" Journey',
    '5. Discovered MQTT Topic Channels',
    '6. 7-Layer Security & Anti-Hacking Shield',
    '7. Why Event-Driven MQTT vs HTTP Polling',
  ];

  const totalSlides = slideTitles.length;

  return (
    <div className="space-y-6 animate-slide-up pb-12 text-slate-900 bg-cat-50 min-h-screen">
      {/* ── Slide Navigation Header (PPT Style Deck Controls) ─────────────── */}
      <div className="bg-white p-5 rounded-2xl border border-cat-100 shadow-card space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cat-600 font-bold text-xs uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 text-cat-500" /> Interactive Presentation Deck
            </div>
            <h1 className="text-2xl font-black text-slate-900">System Architecture & Security</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Slide {currentSlide + 1} of {totalSlides}: <strong className="text-cat-600">{slideTitles[currentSlide]}</strong>
            </p>
          </div>

          {/* Slide Deck Navigation Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
              disabled={currentSlide === 0}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-cat-50 text-slate-700 disabled:opacity-40 transition-all shadow-sm flex items-center gap-1 text-xs font-bold"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>

            <span className="text-xs font-mono font-bold text-slate-500 px-3 py-1.5 bg-slate-100 rounded-lg">
              {currentSlide + 1} / {totalSlides}
            </span>

            <button
              onClick={() => setCurrentSlide(prev => Math.min(totalSlides - 1, prev + 1))}
              disabled={currentSlide === totalSlides - 1}
              className="p-2.5 rounded-xl border border-cat-300 bg-cat-500 hover:bg-cat-600 text-white disabled:opacity-40 transition-all shadow-sm flex items-center gap-1 text-xs font-bold"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Slide Indicator Bar Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-slate-100 pt-3">
          {slideTitles.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                currentSlide === index
                  ? 'bg-cat-500 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-cat-100 hover:text-cat-700'
              }`}
            >
              Slide {index + 1}
            </button>
          ))}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SLIDE 1: High-Level System Overview */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentSlide === 0 && (
        <div className="space-y-6">
          {/* Status Header */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-card flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <Radio className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">MQTT Broker</span>
                <p className="text-sm font-black text-emerald-700">
                  {isMqttConnected ? '✅ Connected (Active)' : '⚠️ Offline'}
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-card flex items-center gap-3">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Hardware Board</span>
                <p className="text-sm font-black text-blue-700">
                  {isDeviceOnline ? '✅ Arduino UNO R4 Online' : '⚪ Hardware Standby'}
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-cat-200 shadow-card flex items-center gap-3">
              <div className="p-3 bg-cat-50 text-cat-600 rounded-xl">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Security Shield</span>
                <p className="text-sm font-black text-cat-700">7-Layer Guard Active</p>
              </div>
            </div>
          </div>

          {/* Main Visual Component Boxes (Clean Light Theme) */}
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-card space-y-6">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-cat-500" />
              Core Architecture Components
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Box 1 */}
              <div className="bg-cat-50/60 p-5 rounded-2xl border border-cat-200 text-center flex flex-col items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-cat-500 text-white flex items-center justify-center mb-2 shadow-sm">
                  <Globe className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold text-cat-600 uppercase tracking-wider">Layer 1</span>
                <h3 className="font-bold text-sm text-slate-900 mt-1">User Web App</h3>
                <p className="text-xs text-slate-600 mt-2">React 19 + Tailwind CSS Frontend UI</p>
                <span className="mt-3 px-2 py-1 bg-white text-slate-700 font-mono text-[10px] rounded-lg border border-cat-200 font-bold">
                  User Interface
                </span>
              </div>

              {/* Box 2 */}
              <div className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-200 text-center flex flex-col items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-2 shadow-sm">
                  <Server className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Layer 2</span>
                <h3 className="font-bold text-sm text-slate-900 mt-1">Express API Server</h3>
                <p className="text-xs text-slate-600 mt-2">Node.js + Prisma ORM + Auth Guard</p>
                <span className="mt-3 px-2 py-1 bg-white text-slate-700 font-mono text-[10px] rounded-lg border border-emerald-200 font-bold">
                  Smart Gatekeeper
                </span>
              </div>

              {/* Box 3 */}
              <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200 text-center flex flex-col items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center mb-2 shadow-sm">
                  <Radio className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Layer 3</span>
                <h3 className="font-bold text-sm text-slate-900 mt-1">MQTT Cloud Broker</h3>
                <p className="text-xs text-slate-600 mt-2">HiveMQ / EMQX Pub/Sub Router</p>
                <span className="mt-3 px-2 py-1 bg-white text-slate-700 font-mono text-[10px] rounded-lg border border-amber-200 font-bold">
                  Fast Courier
                </span>
              </div>

              {/* Box 4 */}
              <div className="bg-cyan-50/60 p-5 rounded-2xl border border-cyan-200 text-center flex flex-col items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-cyan-600 text-white flex items-center justify-center mb-2 shadow-sm">
                  <Cpu className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider">Layer 4</span>
                <h3 className="font-bold text-sm text-slate-900 mt-1">Arduino UNO R4</h3>
                <p className="text-xs text-slate-600 mt-2">Micro-controller + 12×8 LED Matrix</p>
                <span className="mt-3 px-2 py-1 bg-white text-slate-700 font-mono text-[10px] rounded-lg border border-cyan-200 font-bold">
                  Device Controller
                </span>
              </div>

              {/* Box 5 */}
              <div className="bg-purple-50/60 p-5 rounded-2xl border border-purple-200 text-center flex flex-col items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center mb-2 shadow-sm">
                  <Zap className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Layer 5</span>
                <h3 className="font-bold text-sm text-slate-900 mt-1">Servo Motor</h3>
                <p className="text-xs text-slate-600 mt-2">SG90 Servo (0° → 160° Open)</p>
                <span className="mt-3 px-2 py-1 bg-white text-slate-700 font-mono text-[10px] rounded-lg border border-purple-200 font-bold">
                  Food Dispenser Door
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SLIDE 2: Kid-Friendly "Explain Like I'm 10" Story */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentSlide === 1 && (
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-cat-200 shadow-card space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cat-100 text-cat-600 rounded-2xl">
              <Smile className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">How It Works (Simply Explained!)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Imagine sending a secret message to a robot cat feeder. Here is what happens step by step:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-cat-50 p-5 rounded-2xl border border-cat-200 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cat-500 text-white font-black text-base flex items-center justify-center">
                1 📱
              </div>
              <h3 className="font-bold text-sm text-slate-900">You Press "Feed Now"</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                You tap the button on your phone or computer screen. Your phone sends a quick note to the website server asking to feed your cat.
              </p>
            </div>

            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black text-base flex items-center justify-center">
                2 🧠
              </div>
              <h3 className="font-bold text-sm text-slate-900">The Brain Checks Permission</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                The backend server acts like a smart guard. It checks if you are logged in and makes sure your cat hasn't been overfed today.
              </p>
            </div>

            <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white font-black text-base flex items-center justify-center">
                3 📬
              </div>
              <h3 className="font-bold text-sm text-slate-900">The Cloud Postman Delivers</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                The MQTT broker is like a lightning-fast postman. It carries the "FEED" letter through the internet straight to the cat feeder in under 1 second!
              </p>
            </div>

            <div className="bg-purple-50 p-5 rounded-2xl border border-purple-200 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white font-black text-base flex items-center justify-center">
                4 🐱
              </div>
              <h3 className="font-bold text-sm text-slate-900">The Door Opens & Food Drops!</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                The Arduino robot reads the message, smiles on its LED screen, turns the motor door open for 1.5 seconds, and cat food falls into the bowl!
              </p>
            </div>
          </div>

          <div className="p-4 bg-cat-50 border border-cat-200 rounded-2xl flex items-center gap-3 text-cat-900 text-xs font-semibold">
            <Info className="w-5 h-5 text-cat-600 shrink-0" />
            <span>It is as simple as: <strong>Phone → Server → Postman → Feeder Motor → Treats for Cat!</strong></span>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SLIDE 3: Visual Interactive Flowchart */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentSlide === 2 && (
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-card space-y-6">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-cat-500" />
              Complete System Flowchart
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Visual pipeline showing data flow direction, security checks, and hardware execution
            </p>
          </div>

          {/* SVG Flowchart Diagram */}
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 overflow-x-auto">
            <div className="min-w-[700px] flex items-center justify-between relative">
              {/* Flowchart Node 1 */}
              <div className="w-40 bg-white p-4 rounded-2xl border-2 border-cat-300 shadow-sm text-center">
                <Globe className="w-7 h-7 text-cat-500 mx-auto mb-2" />
                <h4 className="font-bold text-xs text-slate-900">React Web UI</h4>
                <p className="text-[10px] text-slate-500 mt-1 font-mono">User Clicks Button</p>
              </div>

              <div className="flex-1 flex flex-col items-center">
                <span className="text-[10px] font-bold text-cat-600 bg-cat-50 px-2 py-0.5 rounded border border-cat-200 mb-1">HTTP REST</span>
                <ArrowRight className="w-6 h-6 text-cat-500 animate-pulse" />
              </div>

              {/* Flowchart Node 2 */}
              <div className="w-44 bg-white p-4 rounded-2xl border-2 border-emerald-300 shadow-sm text-center">
                <Server className="w-7 h-7 text-emerald-600 mx-auto mb-2" />
                <h4 className="font-bold text-xs text-slate-900">Node.js Express</h4>
                <p className="text-[10px] text-slate-500 mt-1 font-mono">Auth & Lock Guard</p>
              </div>

              <div className="flex-1 flex flex-col items-center">
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 mb-1">MQTT QoS 1</span>
                <ArrowRight className="w-6 h-6 text-amber-500 animate-pulse" />
              </div>

              {/* Flowchart Node 3 */}
              <div className="w-44 bg-white p-4 rounded-2xl border-2 border-amber-300 shadow-sm text-center">
                <Radio className="w-7 h-7 text-amber-500 mx-auto mb-2" />
                <h4 className="font-bold text-xs text-slate-900">MQTT Broker</h4>
                <p className="text-[10px] text-slate-500 mt-1 font-mono">HiveMQ / EMQX</p>
              </div>

              <div className="flex-1 flex flex-col items-center">
                <span className="text-[10px] font-bold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200 mb-1">Topic Delivery</span>
                <ArrowRight className="w-6 h-6 text-cyan-500 animate-pulse" />
              </div>

              {/* Flowchart Node 4 */}
              <div className="w-40 bg-white p-4 rounded-2xl border-2 border-cyan-300 shadow-sm text-center">
                <Cpu className="w-7 h-7 text-cyan-600 mx-auto mb-2" />
                <h4 className="font-bold text-xs text-slate-900">Arduino UNO R4</h4>
                <p className="text-[10px] text-slate-500 mt-1 font-mono">Servo PWM Pin D9</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SLIDE 4: Step-by-Step "Feed Now" Journey */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentSlide === 3 && (
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-card space-y-6">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-cat-500" />
              The "Feed Now" 7-Step Sequence
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Click any step button to inspect code-level actions
            </p>
          </div>

          {/* Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {[
              { step: 1, label: '1. Web Tap' },
              { step: 2, label: '2. REST API' },
              { step: 3, label: '3. Auth Check' },
              { step: 4, label: '4. MQTT Push' },
              { step: 5, label: '5. Arduino RX' },
              { step: 6, label: '6. Servo Turn' },
              { step: 7, label: '7. Confirmation' },
            ].map(item => (
              <button
                key={item.step}
                onClick={() => setActiveStep(item.step)}
                className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                  activeStep === item.step
                    ? 'bg-cat-500 text-white border-cat-500 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-cat-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Description Box */}
          <div className="p-6 bg-cat-50/50 rounded-2xl border border-cat-200 space-y-3">
            <h3 className="font-bold text-sm text-slate-900">
              Step {activeStep}: {
                activeStep === 1 ? 'User Press "Feed Now" in Web Dashboard' :
                activeStep === 2 ? 'Browser sends HTTP POST /api/feeds/manual' :
                activeStep === 3 ? 'Backend enforces authentication & dispensing lock' :
                activeStep === 4 ? 'Backend publishes JSON payload over MQTT (QoS 1)' :
                activeStep === 5 ? 'Arduino micro-controller receives MQTT message' :
                activeStep === 6 ? 'Arduino rotates SG90 Servo motor (0° → 160° → 0°)' :
                'Arduino publishes response ACK & database updates to SUCCESS'
              }
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {
                activeStep === 1 ? 'The user clicks the button on the React website interface to trigger an instant feed.' :
                activeStep === 2 ? 'Axios sends an HTTP POST request containing the user JWT token and portion number.' :
                activeStep === 3 ? 'The server verifies user identity, checks daily limit, and sets an in-memory lock.' :
                activeStep === 4 ? 'The Node.js MQTT client sends a JSON package to topic smartcat/geo123/device/command.' :
                activeStep === 5 ? 'Arduino receives the payload via PubSubClient and checks for duplicate request IDs.' :
                activeStep === 6 ? 'Pin D9 sends PWM signal to open the servo door for 1.5s while showing LED animation.' :
                'Arduino posts response to response topic, database marks status SUCCESS, and lock releases.'
              }
            </p>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SLIDE 5: MQTT Topic Channels */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentSlide === 4 && (
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-card space-y-6">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Radio className="w-5 h-5 text-cat-500" />
              Discovered MQTT Topic Architecture
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Specific topics used by the SmartCat Feeder for real-time messaging
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-cat-50 rounded-2xl border border-cat-200 space-y-2">
              <span className="text-[10px] font-bold text-cat-600 uppercase">Backend → Arduino</span>
              <h3 className="font-mono text-xs font-bold text-slate-900 bg-white p-2 rounded-lg border border-cat-200">
                smartcat/geo123/device/command
              </h3>
              <p className="text-xs text-slate-600">Carries feed commands (QoS 1 at-least-once delivery).</p>
            </div>

            <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2">
              <span className="text-[10px] font-bold text-emerald-600 uppercase">Arduino → Backend</span>
              <h3 className="font-mono text-xs font-bold text-slate-900 bg-white p-2 rounded-lg border border-emerald-200">
                smartcat/geo123/device/response
              </h3>
              <p className="text-xs text-slate-600">Returns servo angle and success/failure status.</p>
            </div>

            <div className="p-5 bg-blue-50 rounded-2xl border border-blue-200 space-y-2">
              <span className="text-[10px] font-bold text-blue-600 uppercase">Arduino → Backend</span>
              <h3 className="font-mono text-xs font-bold text-slate-900 bg-white p-2 rounded-lg border border-blue-200">
                smartcat/geo123/device/heartbeat
              </h3>
              <p className="text-xs text-slate-600">Sends WiFi RSSI signal strength & uptime every 25 seconds.</p>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SLIDE 6: 7-Layer Security & Anti-Hacking Shield */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentSlide === 5 && (
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-card space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">7-Layer Security & Anti-Hacking Safeguards</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                The hardware board and backend are hardened so no unauthorized user or attacker can compromise the feeder
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3">
              <div className="p-2 bg-emerald-500 text-white rounded-xl text-xs font-black shrink-0">1</div>
              <div>
                <h3 className="font-bold text-xs text-slate-900">Namespace Topic Isolation</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Topics are locked to unique device namespaces (<code className="text-cat-600">smartcat/geo123/*</code>) to prevent message eavesdropping or cross-tenant interference.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3">
              <div className="p-2 bg-emerald-500 text-white rounded-xl text-xs font-black shrink-0">2</div>
              <div>
                <h3 className="font-bold text-xs text-slate-900">Strict Command Whitelisting</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Arduino firmware strictly accepts only <code className="text-cat-600">"command": "feed"</code> JSON objects. All unapproved strings or foreign commands are instantly dropped.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3">
              <div className="p-2 bg-emerald-500 text-white rounded-xl text-xs font-black shrink-0">3</div>
              <div>
                <h3 className="font-bold text-xs text-slate-900">2KB Payload Size Cap Guard</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Backend MQTT parser drops any incoming payload exceeding 2,048 bytes to block buffer overflow or Denial of Service (DoS) memory exhaustion attempts.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3">
              <div className="p-2 bg-emerald-500 text-white rounded-xl text-xs font-black shrink-0">4</div>
              <div>
                <h3 className="font-bold text-xs text-slate-900">Dual Hardware & Server Locks</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Server-side <code className="text-cat-600">isServerDispensing</code> and Arduino-side <code className="text-cat-600">isDispensing</code> locks prevent simultaneous feed spamming.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3">
              <div className="p-2 bg-emerald-500 text-white rounded-xl text-xs font-black shrink-0">5</div>
              <div>
                <h3 className="font-bold text-xs text-slate-900">30s Request Deduplication Window</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Arduino tracks the last processed <code className="text-cat-600">requestId</code> within a 30s window to reject replayed duplicate commands.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3">
              <div className="p-2 bg-emerald-500 text-white rounded-xl text-xs font-black shrink-0">6</div>
              <div>
                <h3 className="font-bold text-xs text-slate-900">120s Heartbeat Watchdog & Quarantining</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Backend marks the feeder OFFLINE if no heartbeat pulse is received within 120 seconds, preventing stuck locks or phantom feeds.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3 md:col-span-2">
              <div className="p-2 bg-emerald-500 text-white rounded-xl text-xs font-black shrink-0">7</div>
              <div>
                <h3 className="font-bold text-xs text-slate-900">TLS 1.2 MQTTS Encrypted Transport</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Port 8883 connections utilize TLS 1.2 encryption so credentials and payload data cannot be intercepted over public network lines.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SLIDE 7: Why MQTT vs HTTP */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentSlide === 6 && (
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-card space-y-6">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-cat-500" />
              Why Event-Driven MQTT Over HTTP Polling?
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Comparing continuous HTTP polling vs instant MQTT push notifications
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-red-50/60 rounded-2xl border border-red-200 space-y-3">
              <h3 className="font-bold text-sm text-red-900">Traditional HTTP Polling (Inefficient)</h3>
              <p className="text-xs text-red-700 leading-relaxed">
                Requires the microcontroller to send continuous HTTP GET requests every second asking "Any food needed?". Consumes high network bandwidth, drains power, and causes latency.
              </p>
            </div>

            <div className="p-6 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-3">
              <h3 className="font-bold text-sm text-emerald-900">MQTT Event-Driven Push (Optimal)</h3>
              <p className="text-xs text-emerald-700 leading-relaxed">
                Establishes a single persistent socket with tiny 2-byte packet headers. The broker pushes messages instantly only when a feed occurs. Instant response with zero polling overhead.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
