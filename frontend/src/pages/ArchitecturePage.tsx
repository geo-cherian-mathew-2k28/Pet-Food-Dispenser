// SmartCat Feeder - Visual MQTT Architecture & Live Packet Simulator
// Minimal text, 100% Light Theme, graphical flowchart diagrams & animated packet flow.

import { useState, useEffect } from 'react';
import {
  Radio,
  Cpu,
  Globe,
  ArrowRight,
  CheckCircle2,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
  Activity,
  Layers,
  Package
} from 'lucide-react';

export default function ArchitecturePage() {
  // ── Simulator State ──────────────────────────────────────────────────────────
  // Step 0: Idle
  // Step 1: Publisher sends packet -> Broker
  // Step 2: Broker receives, sends PUBACK to Publisher
  // Step 3: Broker routes packet -> Arduino Subscriber
  // Step 4: Arduino actuates servo & publishes Response back
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [autoLoop, setAutoLoop] = useState<boolean>(false);
  const [packetProgress, setPacketProgress] = useState<number>(0); // 0 to 100%

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= 4) {
          if (!autoLoop) {
            setIsPlaying(false);
            return 4;
          }
          return 1;
        }
        return prev + 1;
      });
    }, 1400);

    return () => clearInterval(interval);
  }, [isPlaying, autoLoop]);

  // Compute packet progress along the track
  useEffect(() => {
    switch (currentStep) {
      case 0:
        setPacketProgress(0);
        break;
      case 1:
        setPacketProgress(25);
        break;
      case 2:
        setPacketProgress(50);
        break;
      case 3:
        setPacketProgress(75);
        break;
      case 4:
        setPacketProgress(100);
        break;
    }
  }, [currentStep]);

  const handleStartSim = () => {
    setCurrentStep(1);
    setIsPlaying(true);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
    setPacketProgress(0);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-5xl mx-auto">
      {/* ── Page Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">MQTT Architecture</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Visual Overview
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-0.5">
            How commands travel from your browser to the physical servo feeder
          </p>
        </div>
      </div>

      {/* ── 1. Compact Definition Box ───────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-orange-50/70 via-amber-50/40 to-stone-50 border border-amber-200/80 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <Radio className="w-5 h-5" />
          </div>
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-600 bg-orange-100/70 px-2 py-0.5 rounded-md">
                Protocol Concept
              </span>
              <h2 className="text-base font-bold text-gray-900">What is MQTT?</h2>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed font-medium">
              <strong className="text-gray-900">MQTT</strong> (Message Queuing Telemetry Transport) is an ultra-lightweight publish/subscribe messaging protocol designed for IoT hardware. Devices never communicate point-to-point; instead, all messages are routed through a central <strong className="text-orange-700">Broker</strong> by topic.
            </p>
            {/* 3 Micro-pills */}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-700 shadow-2xs">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> 2-Byte Packet Header
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-700 shadow-2xs">
                <Layers className="w-3.5 h-3.5 text-blue-500" /> Decoupled Pub/Sub
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-700 shadow-2xs">
                <Activity className="w-3.5 h-3.5 text-emerald-500" /> Low Latency &lt;50ms
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Core Relationship Diagram (Publisher -> Broker -> Subscriber) ────── */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Core MQTT Relationship</h2>
            <p className="text-xs text-gray-500 mt-0.5">Publisher, Broker, and Subscriber roles in SmartCat</p>
          </div>
          <span className="text-xs font-semibold text-stone-600 bg-stone-100 px-2.5 py-1 rounded-lg">
            3-Tier Architecture
          </span>
        </div>

        {/* Visual 3-Node Cards Connected by Arrows */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative items-center">
          {/* Card 1: Publisher */}
          <div className="bg-blue-50/50 border-2 border-blue-200 rounded-xl p-4 flex flex-col gap-2 relative">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded">
                ROLE 1
              </span>
              <Globe className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-bold text-gray-900 text-base">Publisher</h3>
            <p className="text-xs text-gray-600 font-medium">Web Browser & Express API</p>
            <div className="bg-white border border-blue-100 rounded-lg p-2 mt-1">
              <span className="text-[11px] font-mono text-blue-800 break-all">
                PUB ➔ <span className="font-bold">smartcat/geo123/device/command</span>
              </span>
            </div>
            <p className="text-[11px] text-gray-500">Sends action commands without needing to know device IP address.</p>
          </div>

          {/* Card 2: Broker */}
          <div className="bg-amber-50/50 border-2 border-amber-300 rounded-xl p-4 flex flex-col gap-2 relative shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                CENTRAL HUB
              </span>
              <Radio className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="font-bold text-gray-900 text-base">HiveMQ Broker</h3>
            <p className="text-xs text-gray-600 font-medium">broker.hivemq.com:1883</p>
            <div className="bg-white border border-amber-200 rounded-lg p-2 mt-1">
              <span className="text-[11px] font-mono text-amber-900">
                Matches Topics & Routes Packets
              </span>
            </div>
            <p className="text-[11px] text-gray-500">Acknowledges receipt (PUBACK) and delivers to active subscribers.</p>
          </div>

          {/* Card 3: Subscriber */}
          <div className="bg-emerald-50/50 border-2 border-emerald-200 rounded-xl p-4 flex flex-col gap-2 relative">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
                ROLE 2
              </span>
              <Cpu className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="font-bold text-gray-900 text-base">Subscriber</h3>
            <p className="text-xs text-gray-600 font-medium">Arduino UNO R4 WiFi</p>
            <div className="bg-white border border-emerald-100 rounded-lg p-2 mt-1">
              <span className="text-[11px] font-mono text-emerald-800 break-all">
                SUB ➔ <span className="font-bold">smartcat/geo123/device/command</span>
              </span>
            </div>
            <p className="text-[11px] text-gray-500">Listens for packets, actuates servo motor, and posts ACK response.</p>
          </div>
        </div>
      </div>

      {/* ── 3. Interactive Data Packet Flow Simulator ───────────────────────────── */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cat-500" />
              <h2 className="text-base font-bold text-gray-900">Live Data Packet Simulator</h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Watch an MQTT feed packet travel step-by-step in real time</p>
          </div>

          {/* Simulator Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleStartSim}
              disabled={isPlaying}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all ${
                isPlaying ? 'bg-gray-300 cursor-not-allowed' : 'bg-cat-500 hover:bg-cat-600 active:scale-95'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {currentStep > 0 && currentStep < 4 ? 'Running...' : 'Dispatch Packet'}
            </button>

            <button
              onClick={() => setAutoLoop(!autoLoop)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                autoLoop
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
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
        </div>

        {/* ── The Visual Track ─────────────────────────────────────────────────── */}
        <div className="bg-stone-50/80 border border-stone-200/90 rounded-2xl p-6 relative overflow-hidden">
          {/* Progress Line */}
          <div className="relative w-full h-3 bg-stone-200 rounded-full mb-8 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-amber-500 to-emerald-500 transition-all duration-700 ease-out"
              style={{ width: `${packetProgress}%` }}
            />
          </div>

          {/* 3 Main Stations */}
          <div className="grid grid-cols-3 gap-2 text-center relative z-10">
            {/* Station 1: Publisher */}
            <div className={`p-3 rounded-xl border transition-all ${
              currentStep === 1
                ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200 shadow-sm'
                : 'bg-white border-stone-200'
            }`}>
              <div className="flex justify-center mb-1">
                <Globe className={`w-6 h-6 ${currentStep === 1 ? 'text-blue-600 animate-bounce' : 'text-gray-400'}`} />
              </div>
              <p className="font-bold text-xs text-gray-900">1. Publisher</p>
              <p className="text-[10px] text-gray-500">Browser / Backend</p>
            </div>

            {/* Station 2: Broker */}
            <div className={`p-3 rounded-xl border transition-all ${
              currentStep === 2 || currentStep === 3
                ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-200 shadow-sm'
                : 'bg-white border-stone-200'
            }`}>
              <div className="flex justify-center mb-1">
                <Radio className={`w-6 h-6 ${currentStep === 2 || currentStep === 3 ? 'text-amber-600 animate-pulse' : 'text-gray-400'}`} />
              </div>
              <p className="font-bold text-xs text-gray-900">2. MQTT Broker</p>
              <p className="text-[10px] text-gray-500">HiveMQ Cloud</p>
            </div>

            {/* Station 3: Subscriber */}
            <div className={`p-3 rounded-xl border transition-all ${
              currentStep === 4
                ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200 shadow-sm'
                : 'bg-white border-stone-200'
            }`}>
              <div className="flex justify-center mb-1">
                <Cpu className={`w-6 h-6 ${currentStep === 4 ? 'text-emerald-600 animate-bounce' : 'text-gray-400'}`} />
              </div>
              <p className="font-bold text-xs text-gray-900">3. Subscriber</p>
              <p className="text-[10px] text-gray-500">Arduino Feeder</p>
            </div>
          </div>

          {/* Active Data Packet Pill */}
          <div className="mt-6 flex justify-center">
            {currentStep === 0 && (
              <span className="text-xs text-gray-400 italic">
                Press "Dispatch Packet" to watch the data packet flow
              </span>
            )}

            {currentStep === 1 && (
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 border border-blue-300 px-3.5 py-1.5 rounded-full text-xs font-semibold animate-pulse shadow-xs">
                <Package className="w-4 h-4 text-blue-600" />
                <span>[PUB] Transmitting command: &#123; "command": "feed", "portion": 1 &#125; ➔ Broker</span>
              </div>
            )}

            {currentStep === 2 && (
              <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-900 border border-amber-300 px-3.5 py-1.5 rounded-full text-xs font-semibold animate-pulse shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-amber-600" />
                <span>[PUBACK] Broker receives packet & sends Instant Acknowledgment (&lt;50ms)</span>
              </div>
            )}

            {currentStep === 3 && (
              <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-900 border border-purple-300 px-3.5 py-1.5 rounded-full text-xs font-semibold animate-pulse shadow-xs">
                <ArrowRight className="w-4 h-4 text-purple-600" />
                <span>[ROUTE] Broker matches topic filter & pushes packet to Arduino Subscriber</span>
              </div>
            )}

            {currentStep === 4 && (
              <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-900 border border-emerald-300 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>[ACTUATE] Servo rotates 90° ➔ Food Dispensed ➔ Feeder publishes Response!</span>
              </div>
            )}
          </div>
        </div>

        {/* 4 Step Cards (Compact Visual Flow) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div className={`p-3 rounded-xl border text-xs space-y-1 transition-all ${
            currentStep >= 1 ? 'border-blue-300 bg-blue-50/40' : 'border-stone-200 bg-stone-50/40 text-gray-400'
          }`}>
            <span className="font-bold text-blue-700">Step 1: Publish</span>
            <p className="text-gray-700 font-medium">Browser clicks Feed Now. Backend publishes MQTT packet.</p>
          </div>

          <div className={`p-3 rounded-xl border text-xs space-y-1 transition-all ${
            currentStep >= 2 ? 'border-amber-300 bg-amber-50/40' : 'border-stone-200 bg-stone-50/40 text-gray-400'
          }`}>
            <span className="font-bold text-amber-800">Step 2: Broker ACK</span>
            <p className="text-gray-700 font-medium">Broker returns QoS 1 PUBACK confirmation immediately.</p>
          </div>

          <div className={`p-3 rounded-xl border text-xs space-y-1 transition-all ${
            currentStep >= 3 ? 'border-purple-300 bg-purple-50/40' : 'border-stone-200 bg-stone-50/40 text-gray-400'
          }`}>
            <span className="font-bold text-purple-800">Step 3: Route Packet</span>
            <p className="text-gray-700 font-medium">Broker pushes command to subscribers of <code className="text-[10px]">smartcat/geo123/...</code></p>
          </div>

          <div className={`p-3 rounded-xl border text-xs space-y-1 transition-all ${
            currentStep >= 4 ? 'border-emerald-300 bg-emerald-50/40' : 'border-stone-200 bg-stone-50/40 text-gray-400'
          }`}>
            <span className="font-bold text-emerald-800">Step 4: Dispense</span>
            <p className="text-gray-700 font-medium">Arduino rotates servo to 90°, drops kibble, and replies success.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
