# SmartCat Feeder — Open IoT Telemetry & Food Dispenser

> A production-grade, event-driven IoT Pet Food Dispenser powered by **Arduino UNO R4 WiFi**, **MQTT Pub/Sub over TLS**, **Node.js Express**, **React 19**, and **Telegram Bot Integration**. Built for real-time remote telemetry, scheduled automated feeding, and strict security validation.

---

## 🌟 Key Features

- **Instant Event-Driven Feeding**: Sub-second remote feeding via web app or Telegram bot.
- **Bi-Directional MQTT Pub/Sub**: Real-time two-way communication between cloud backend and micro-controllers.
- **Admin Visibility Control**: Toggle Architecture & Telemetry visibility for non-admin users directly from the Admin Panel.
- **7-Layer Security Safeguards**: Topic isolation, payload size limits (2KB), regex request ID validation, duplicate deduplication, and TLS 1.2 encryption.
- **Multi-Client Support**: Scalable Pub/Sub model supporting multiple administrative web instances, mobile devices, and physical hardware nodes.
- **Automated Cron Scheduling**: Configurable daily feeding schedules with timezone awareness and database persistence.
- **Built-in Hardware Matrix Display**: Animated LED feedback on the Arduino UNO R4 WiFi (Connecting, WiFi OK, MQTT Happy Face, Dispensing, Error).

---

## 📐 System Architecture & Flowchart

### 1. High-Level End-to-End Architecture

```
┌────────────────────────────────┐       ┌────────────────────────────────┐
│   React 19 Web Dashboard       │       │    Telegram Bot Interface      │
│   (Vite + Tailwind + Recharts) │       │   (Telegraf Command Guard)     │
└───────────────┬────────────────┘       └───────────────┬────────────────┘
                │                                        │
                │ HTTP REST / JWT                        │ HTTPS Webhooks
                ▼                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                 Node.js Express API Server (Backend)                    │
│   • Auth & Role Check          • 60s Cooldown Guard                     │
│   • Daily Feed Limit Check     • Dual In-Memory Dispensing Lock         │
└───────────────┬────────────────────────────────────────┬────────────────┘
                │                                        │
                │ PostgreSQL (Prisma ORM)                │ MQTTS (QoS 1 over TLS 8883)
                ▼                                        ▼
┌────────────────────────────────┐       ┌────────────────────────────────┐
│      Supabase PostgreSQL       │       │     HiveMQ Cloud MQTT Broker    │
│  (Users, Feeds, Schedules, DB) │       │  (Pub/Sub Packet Router)       │
└────────────────────────────────┘       └───────────────┬────────────────┘
                                                         │
                                                         │ MQTTS Topic Delivery
                                                         ▼
                                         ┌────────────────────────────────┐
                                         │     Arduino UNO R4 WiFi        │
                                         │  (Firmware + LED Matrix 12×8)  │
                                         └───────────────┬────────────────┘
                                                         │
                                                         │ PWM Signal (Pin D9)
                                                         ▼
                                         ┌────────────────────────────────┐
                                         │     SG90 Servo Dispenser       │
                                         │  (0° → 160° Open → 0° Closed)  │
                                         └────────────────────────────────┘
```

---

### 2. Two-Way MQTT Pub/Sub Flowchart (Many-to-Many Topology)

```
                       [ PUBLISHERS ]                                             [ SUBSCRIBERS ]
  
  ┌──────────────────────┐
  │  Web Dashboard #1    │───┐
  └──────────────────────┘   │
                             │  HTTP POST
  ┌──────────────────────┐   ├───► ┌─────────────────────────┐             ┌─────────────────────────┐
  │  Mobile Dashboard    │───┤     │ Node.js Backend Server  │  Publish    │   HiveMQ Cloud Broker   │
  └──────────────────────┘   │     │ (Validates & Enforces)  │────────────►│   (Central MQTTS Router)│
                             │     └─────────────────────────┘             └────────────┬────────────┘
  ┌──────────────────────┐   │           ▲                                              │
  │   Telegram Bot       │───┘           │                                              │ Topic Delivery
  └──────────────────────┘               │                                              │ smartcat/device/command
                                         │                                              ▼
                                         │                                 ┌─────────────────────────┐
                                         │                                 │   Arduino UNO R4 #1     │
                                         │                                 │ (Hardware Feeder Node)  │
                                         │                                 └────────────┬────────────┘
                                         │                                              │
                                         │  Publish ACK Response                        │ Executes Motor
                                         │  smartcat/device/response                    ▼
                                         └───────────────────────────────── ┌─────────────────────────┐
                                                                            │ SG90 Servo Dispense Door│
                                                                            └─────────────────────────┘
```

---

### 3. Topic Architecture Directory

| Topic Direction | MQTT Topic Address | QoS | Description |
|---|---|---|---|
| **Server ➔ Feeder** | `smartcat/device/command` | `1` | Delivers JSON payload `{ "command": "feed", "durationMs": 1500, "requestId": "..." }` |
| **Feeder ➔ Server** | `smartcat/device/response` | `1` | Hardware ACK response returning `{ "requestId": "...", "status": "success", "servoAngle": 160 }` |
| **Feeder ➔ Server** | `smartcat/device/heartbeat` | `0` | Telemetry pulse every 25s containing `{ "uptimeSeconds": 3600, "wifiStrength": -55 }` |

---

## 🛠️ Technology Stack

| Layer | Component | Technology / Library |
|---|---|---|
| **Frontend** | User Dashboard | React 19, Vite, TypeScript, Tailwind CSS, Lucide Icons, Axios |
| **Backend** | REST & MQTT Engine | Node.js, Express, TypeScript, Prisma ORM, MQTT.js, Winston |
| **Database** | Relational Database | PostgreSQL (Supabase Free Tier) |
| **Messaging** | Cloud MQTT Broker | HiveMQ Cloud (TLS / Port 8883) |
| **Hardware** | Micro-controller | Arduino UNO R4 WiFi (`WiFiS3`, `PubSubClient`, `ArduinoJson`, `Servo`) |
| **Bot** | Remote Operations | Telegraf Telegram Bot Framework |

---

## 🔒 7-Layer Security Shield

1. **Namespace Topic Isolation**: Device topics strictly partitioned under `smartcat/{namespace}/device/*`.
2. **Command Whitelisting**: Firmware drops all non-whitelisted payload strings (only accepts `"command": "feed"`).
3. **2KB Payload Size Cap**: Prevents memory buffer overflow and DoS attacks by dropping oversized MQTT packets.
4. **Dual Dispensing Locks**: Prevents race conditions or double-feeding exploits using server-side and board-side locks.
5. **30s Request Deduplication**: Micro-controller tracks executed `requestId`s to reject replayed duplicate commands.
6. **120s Watchdog Quarantine**: Automatically marks hardware `OFFLINE` if 2 heartbeats are missed.
7. **TLS 1.2 MQTTS Encryption**: Encrypted socket communication on port `8883`.

---

## 🚀 Quick Start Guide

### 1. Repository Setup

```bash
git clone https://github.com/geo-cherian-mathew-2k28/Pet-Food-Dispenser.git
cd Pet-Food-Dispenser
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Configure DATABASE_URL, JWT_SECRET, and MQTT credentials in .env

npm install
npm run prisma:push
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### 4. Arduino Firmware Upload

1. Open `arduino/smartcat_feeder/smartcat_feeder.ino` in **Arduino IDE 2.x**.
2. Select **Arduino UNO R4 WiFi** as your target board.
3. Configure your Wi-Fi SSID and MQTT Broker credentials at the top of the sketch.
4. Flash the board and open the **Serial Monitor (115200 baud)**.

---

## 📜 License

Distributed under the **MIT License**. Free for educational, hobby, and commercial modification.
