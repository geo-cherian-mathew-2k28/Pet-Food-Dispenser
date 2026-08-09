// SmartCat Feeder - Professional MQTT Presentation Deck
// Designed for live MQTT technical presentations & 5-year-old level visual comprehension.
// Minimal text, zero emoji clutter, high-impact SVG diagrams, and crisp light-mode UI.

import { useEffect, useState } from 'react';
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
  Sparkles,
  Send,
  Download,
  Wifi,
  Lock,
  Clock,
  CheckCircle
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
    } catch {
      // Retain defaults on offline
    }
  };

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(fetchStatus, 10000);
    return () => clearInterval(timer);
  }, []);

  const isMqttConnected = deviceData?.mqttConnected ?? true;
  const isDeviceOnline = deviceData?.device?.status === 'ONLINE';

  const slides = [
    { id: 0, title: 'System Overview' },
    { id: 1, title: 'What is MQTT?' },
    { id: 2, title: 'The 4 Core MQTT Roles' },
    { id: 3, title: 'Data Journey' },
    { id: 4, title: 'Topic Architecture' },
    { id: 5, title: 'Security Shield' },
  ];

  const totalSlides = slides.length;

  return (
    <div className="space-y-6 animate-slide-up pb-12 text-slate-900 bg-cat-50 min-h-screen">
      {/* ── Slide Controls Bar (Presentation Mode) ───────────────────────── */}
      <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cat-500 text-white rounded-xl shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 leading-tight">MQTT Architecture Deck</h1>
            <p className="text-xs text-slate-500 font-medium">
              Slide {currentSlide + 1} of {totalSlides}: <strong className="text-cat-600 font-bold">{slides[currentSlide].title}</strong>
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
            {currentSlide + 1} / {totalSlides}
          </span>

          <button
            onClick={() => setCurrentSlide(prev => Math.min(totalSlides - 1, prev + 1))}
            disabled={currentSlide === totalSlides - 1}
            className="px-4 py-2 rounded-xl bg-cat-500 hover:bg-cat-600 text-white disabled:opacity-30 transition-all font-bold text-xs flex items-center gap-1 shadow-sm"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Slide Indicators */}
      <div className="grid grid-cols-6 gap-2">
        {slides.map((s, index) => (
          <button
            key={s.id}
            onClick={() => setCurrentSlide(index)}
            className={`py-2 rounded-xl text-xs font-bold transition-all border text-center ${
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
      {/* SLIDE 1: SYSTEM OVERVIEW (VISUAL NODES) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentSlide === 0 && (
        <div className="bg-white p-6 md:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-8">
          {/* Header Status Pills */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <span className="text-xs font-bold text-cat-600 uppercase tracking-widest">Presentation View</span>
              <h2 className="text-2xl font-black text-slate-900 mt-1">SmartCat Feeder IoT Network</h2>
            </div>

            <div className="flex items-center gap-3">
              <div className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                isMqttConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                <span className={`w-2.5 h-2.5 rounded-full ${isMqttConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                Broker: {isMqttConnected ? 'CONNECTED' : 'STANDBY'}
              </div>

              <div className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                isDeviceOnline ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                <Radio className="w-4 h-4 text-blue-600" />
                Hardware: {isDeviceOnline ? 'ONLINE' : 'STANDBY'}
              </div>
            </div>
          </div>

          {/* Large Visual Nodes Diagram */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative py-4">
            {/* Node 1 */}
            <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-200 text-center flex flex-col items-center justify-between shadow-sm hover:border-cat-400 transition-all">
              <div className="w-16 h-16 rounded-2xl bg-cat-500 text-white flex items-center justify-center mb-4 shadow-md">
                <Globe className="w-8 h-8" />
              </div>
              <span className="text-[10px] font-extrabold text-cat-600 uppercase tracking-wider">Step 1</span>
              <h3 className="text-base font-black text-slate-900 mt-1">Web UI</h3>
              <p className="text-xs text-slate-500 mt-2 font-medium">User presses "Feed Now"</p>
            </div>

            {/* Node 2 */}
            <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-200 text-center flex flex-col items-center justify-between shadow-sm hover:border-emerald-400 transition-all">
              <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mb-4 shadow-md">
                <Server className="w-8 h-8" />
              </div>
              <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider">Step 2</span>
              <h3 className="text-base font-black text-slate-900 mt-1">Express API</h3>
              <p className="text-xs text-slate-500 mt-2 font-medium">Verifies user permission</p>
            </div>

            {/* Node 3 */}
            <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-200 text-center flex flex-col items-center justify-between shadow-sm hover:border-amber-400 transition-all">
              <div className="w-16 h-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center mb-4 shadow-md">
                <Radio className="w-8 h-8" />
              </div>
              <span className="text-[10px] font-extrabold text-amber-600 uppercase tracking-wider">Step 3</span>
              <h3 className="text-base font-black text-slate-900 mt-1">MQTT Broker</h3>
              <p className="text-xs text-slate-500 mt-2 font-medium">Routes packet instantly</p>
            </div>

            {/* Node 4 */}
            <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-200 text-center flex flex-col items-center justify-between shadow-sm hover:border-cyan-400 transition-all">
              <div className="w-16 h-16 rounded-2xl bg-cyan-600 text-white flex items-center justify-center mb-4 shadow-md">
                <Cpu className="w-8 h-8" />
              </div>
              <span className="text-[10px] font-extrabold text-cyan-600 uppercase tracking-wider">Step 4</span>
              <h3 className="text-base font-black text-slate-900 mt-1">Arduino Feeder</h3>
              <p className="text-xs text-slate-500 mt-2 font-medium">Rotates servo to drop food</p>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SLIDE 2: WHAT IS MQTT? (VISUAL COMPARISON) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentSlide === 1 && (
        <div className="bg-white p-6 md:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-8">
          <div>
            <span className="text-xs font-bold text-cat-600 uppercase tracking-widest">Simple Analogy</span>
            <h2 className="text-2xl font-black text-slate-900 mt-1">What is MQTT?</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* HTTP Comparison */}
            <div className="bg-rose-50/70 p-6 rounded-2xl border-2 border-rose-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-rose-700 bg-rose-100 px-3 py-1 rounded-lg">HTTP Polling</span>
                <span className="text-xs text-slate-500 font-bold">Heavy & Slow</span>
              </div>
              <div className="p-4 bg-white rounded-xl border border-rose-200 text-center space-y-2">
                <Clock className="w-8 h-8 text-rose-500 mx-auto" />
                <h4 className="font-bold text-sm text-slate-900">Knocking on Door non-stop</h4>
                <p className="text-xs text-slate-500">"Any food needed? Any food needed?" (Asking every 2 seconds)</p>
              </div>
            </div>

            {/* MQTT Comparison */}
            <div className="bg-emerald-50/70 p-6 rounded-2xl border-2 border-emerald-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-lg">MQTT Push</span>
                <span className="text-xs text-slate-500 font-bold">Instant & Efficient</span>
              </div>
              <div className="p-4 bg-white rounded-xl border border-emerald-200 text-center space-y-2">
                <Zap className="w-8 h-8 text-emerald-500 mx-auto" />
                <h4 className="font-bold text-sm text-slate-900">Walkie-Talkie Radio</h4>
                <p className="text-xs text-slate-500">Stays silent. Speaks ONLY when food button is pressed!</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SLIDE 3: THE 4 CORE ROLES */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentSlide === 2 && (
        <div className="bg-white p-6 md:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-8">
          <div>
            <span className="text-xs font-bold text-cat-600 uppercase tracking-widest">MQTT Anatomy</span>
            <h2 className="text-2xl font-black text-slate-900 mt-1">The 4 Core Roles of MQTT</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3 hover:border-cat-400 transition-all">
              <div className="p-3 bg-cat-500 text-white rounded-xl w-fit">
                <Send className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900">1. Publisher</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                The sender of the message. In our app, Express Backend acts as the Publisher.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3 hover:border-emerald-400 transition-all">
              <div className="p-3 bg-emerald-600 text-white rounded-xl w-fit">
                <Radio className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900">2. Topic</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                The specific channel address: <code className="font-mono text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">smartcat/device/command</code>.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3 hover:border-amber-400 transition-all">
              <div className="p-3 bg-amber-500 text-white rounded-xl w-fit">
                <Server className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900">3. Broker</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                The message router in the cloud (HiveMQ) that instantly delivers messages to receivers.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3 hover:border-cyan-400 transition-all">
              <div className="p-3 bg-cyan-600 text-white rounded-xl w-fit">
                <Download className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900">4. Subscriber</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                The listener. Arduino UNO R4 stays subscribed and opens the motor when triggered.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SLIDE 4: DATA JOURNEY */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentSlide === 3 && (
        <div className="bg-white p-6 md:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-8">
          <div>
            <span className="text-xs font-bold text-cat-600 uppercase tracking-widest">Interactive Sequence</span>
            <h2 className="text-2xl font-black text-slate-900 mt-1">End-to-End Data Journey</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            {[1, 2, 3, 4, 5, 6].map(num => (
              <button
                key={num}
                onClick={() => setActiveStep(num)}
                className={`p-3 rounded-xl border text-xs font-extrabold transition-all ${
                  activeStep === num
                    ? 'bg-cat-500 text-white border-cat-500 shadow-sm scale-105'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-cat-50'
                }`}
              >
                Step {num}
              </button>
            ))}
          </div>

          <div className="p-8 bg-slate-50 rounded-2xl border-2 border-cat-200 space-y-4 flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-cat-500 text-white font-black text-2xl flex items-center justify-center shrink-0 shadow-md">
              {activeStep}
            </div>

            <div className="space-y-1 text-center md:text-left">
              <h3 className="text-lg font-black text-slate-900">
                {
                  activeStep === 1 ? '1. User Presses Button in Web App' :
                  activeStep === 2 ? '2. Express Backend Validates Session & Lock' :
                  activeStep === 3 ? '3. Backend Publishes Command to MQTT Broker' :
                  activeStep === 4 ? '4. MQTT Broker Routes Packet to Arduino' :
                  activeStep === 5 ? '5. Arduino Drives Servo (0° → 160° Open)' :
                  '6. Arduino Publishes Response & Updates DB'
                }
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-2xl">
                {
                  activeStep === 1 ? 'Frontend captures portion count and dispatches an authenticated API call.' :
                  activeStep === 2 ? 'Server checks user identity, daily limit, and locks simultaneous feeds.' :
                  activeStep === 3 ? 'MQTT client sends JSON payload to smartcat/device/command topic.' :
                  activeStep === 4 ? 'Cloud Broker pushes message to Arduino subscriber in <100 milliseconds.' :
                  activeStep === 5 ? 'Hardware Pin D9 rotates servo motor for 1500ms and drops cat treats.' :
                  'Arduino returns status success, server releases lock, and UI displays confirmed feed.'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SLIDE 5: TOPIC ARCHITECTURE */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentSlide === 4 && (
        <div className="bg-white p-6 md:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-8">
          <div>
            <span className="text-xs font-bold text-cat-600 uppercase tracking-widest">Topic Directory</span>
            <h2 className="text-2xl font-black text-slate-900 mt-1">Discovered MQTT Topic Channels</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-amber-50/70 rounded-2xl border-2 border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase bg-amber-200 text-amber-800 px-2 py-0.5 rounded">Command</span>
                <span className="text-xs text-slate-400 font-bold">Web ➔ Feeder</span>
              </div>
              <h3 className="font-mono text-xs font-extrabold text-slate-900 bg-white p-3 rounded-xl border border-amber-200">
                smartcat/device/command
              </h3>
              <p className="text-xs text-slate-600 font-medium">Triggers manual or scheduled feeding routines.</p>
            </div>

            <div className="p-6 bg-emerald-50/70 rounded-2xl border-2 border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded">Response</span>
                <span className="text-xs text-slate-400 font-bold">Feeder ➔ Web</span>
              </div>
              <h3 className="font-mono text-xs font-extrabold text-slate-900 bg-white p-3 rounded-xl border border-emerald-200">
                smartcat/device/response
              </h3>
              <p className="text-xs text-slate-600 font-medium">Confirms successful motor execution and servo telemetry.</p>
            </div>

            <div className="p-6 bg-blue-50/70 rounded-2xl border-2 border-blue-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase bg-blue-200 text-blue-800 px-2 py-0.5 rounded">Heartbeat</span>
                <span className="text-xs text-slate-400 font-bold">Every 25 seconds</span>
              </div>
              <h3 className="font-mono text-xs font-extrabold text-slate-900 bg-white p-3 rounded-xl border border-blue-200">
                smartcat/device/heartbeat
              </h3>
              <p className="text-xs text-slate-600 font-medium">Periodic telemetry pulse containing Wi-Fi signal & uptime.</p>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SLIDE 6: SECURITY SHIELD */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentSlide === 5 && (
        <div className="bg-white p-6 md:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-8">
          <div>
            <span className="text-xs font-bold text-cat-600 uppercase tracking-widest">Anti-Hacking Defense</span>
            <h2 className="text-2xl font-black text-slate-900 mt-1">4 Security Safeguards</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-4 hover:border-emerald-400 transition-all">
              <div className="p-3 bg-emerald-600 text-white rounded-xl shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">1. Topic Isolation</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                  Namespace isolation restricts topics so foreign brokers or clients cannot intercept messages.
                </p>
              </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-4 hover:border-emerald-400 transition-all">
              <div className="p-3 bg-emerald-600 text-white rounded-xl shrink-0">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">2. Strict Command Whitelisting</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                  Hardware accepts only strictly formatted <code className="text-cat-600 font-bold font-mono">command: feed</code> payloads. Unapproved strings are rejected.
                </p>
              </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-4 hover:border-emerald-400 transition-all">
              <div className="p-3 bg-emerald-600 text-white rounded-xl shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">3. 2KB Payload Cap & Deduplication</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                  Blocks buffer overflow attacks by dropping payloads &gt;2048 bytes and rejecting duplicate request IDs within 30s.
                </p>
              </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-4 hover:border-emerald-400 transition-all">
              <div className="p-3 bg-emerald-600 text-white rounded-xl shrink-0">
                <Wifi className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">4. TLS 1.2 Encrypted Transport</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                  MQTTS connections over port 8883 keep credentials and commands encrypted end-to-end.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
