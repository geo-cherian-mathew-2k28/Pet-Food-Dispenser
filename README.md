# SmartCat Feeder 🐱

> An automatic IoT cat food dispenser built with Arduino UNO R4 WiFi, MQTT, Node.js, React, and a Telegram bot — using 100% free tools and DIY cardboard hardware.

⚠️ **Hobby Prototype Notice:** This is not a certified pet safety device. Test thoroughly before leaving with a real cat.

---

## Features

- 🍽️ **Feed Now** from web dashboard with one click
- ⏰ **Scheduled feeding** with day-of-week and time configuration
- 📱 **Telegram bot** for remote control: `/feed`, `/status`, `/history`
- 📡 **MQTT device communication** over TLS (HiveMQ Cloud free tier)
- 🔴🟢 **Real-time device status** via 30-second heartbeat
- 📊 **Feed history** with charts, filters, and export
- 🔐 **JWT login system** with bcrypt password hashing
- 🛡️ **Safety limits**: cooldown between feeds, max daily feeds
- 🧱 **Cardboard dispenser** built from free/cheap materials

---

## Architecture

```
Web Dashboard (React + Vite)
         │
         │ HTTP / REST API
         ▼
Backend API (Express + TypeScript)  ←→  PostgreSQL (Supabase)
         │
         │ MQTT over TLS
         ▼
    MQTT Broker (HiveMQ Cloud)
         │
         │ MQTT Subscribe
         ▼
Arduino UNO R4 WiFi
         │
         ▼
    Servo Motor
         │
         ▼
Cardboard Food Dispenser → Bowl
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, TypeScript, Tailwind CSS, Recharts |
| Backend | Node.js, Express, TypeScript, Prisma ORM |
| Database | PostgreSQL via Supabase (free) |
| MQTT Broker | HiveMQ Cloud free tier |
| Scheduler | node-cron |
| Telegram Bot | Telegraf |
| Hardware | Arduino UNO R4 WiFi, SG90 servo |
| Auth | JWT + bcrypt |

---

## Free Services Used

| Service | Purpose | Free Tier |
|---|---|---|
| [Supabase](https://supabase.com) | PostgreSQL database | 500MB, unlimited API |
| [HiveMQ Cloud](https://www.hivemq.com/mqtt-cloud-broker/) | MQTT broker | 100 connections, TLS |
| [Telegram](https://core.telegram.org/bots) | Bot API | Completely free |
| [Vercel](https://vercel.com) | Frontend hosting | Free tier |
| [Render](https://render.com) | Backend hosting | Free tier (sleeps after inactivity) |
| [GitHub](https://github.com) | Version control | Free |

---

## Project Structure

```
smart-cat-feeder/
  frontend/           ← React + Vite dashboard
  backend/            ← Express + TypeScript API
    src/
      modules/        ← auth, feeds, schedules, device, mqtt, telegram
      middleware/     ← auth, error handling
      config/         ← env, prisma
      utils/          ← logger, requestId
    prisma/           ← schema.prisma
  arduino/
    smartcat_feeder/
      smartcat_feeder.ino  ← Complete Arduino firmware
  HARDWARE.md         ← Wiring and cardboard dispenser build guide
  MQTT.md             ← MQTT protocol documentation
  API.md              ← REST API reference
  README.md           ← This file
  docker-compose.yml  ← Local dev with PostgreSQL + MQTT
  .env.example        ← Environment variable template
```

---

## Setup Guide

### 1. Prerequisites

- Node.js 18+
- Arduino IDE 2.x
- Git

---

### 2. Clone & Install

```bash
git clone https://github.com/yourusername/smart-cat-feeder.git
cd smart-cat-feeder
```

---

### 3. Supabase Database Setup (Free)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to **Settings → Database → Connection String (URI)**
4. Copy the connection string
5. Replace `[YOUR-PASSWORD]` with your actual password

---

### 4. HiveMQ Cloud MQTT Setup (Free)

1. Go to [hivemq.com/mqtt-cloud-broker](https://www.hivemq.com/mqtt-cloud-broker/)
2. Sign up for free
3. Create a cluster
4. Go to **Access Management → Create Credentials**
5. Note: `your-cluster.s1.eu.hivemq.cloud`, port `8883`, username, and password

---

### 5. Telegram Bot Setup (Free)

1. Open Telegram and search for **@BotFather**
2. Send `/newbot` and follow instructions
3. Copy the bot token
4. Find your Telegram chat ID by messaging **@userinfobot**

---

### 6. Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in all values in .env

npm install
npm run prisma:push     # Creates database tables
npm run dev             # Starts development server on port 5000
```

---

### 7. Frontend Setup

```bash
cd frontend
cp .env.example .env
# .env already has: VITE_API_BASE_URL=http://localhost:5000/api

npm install
npm run dev             # Starts on http://localhost:5173
```

---

### 8. Arduino Setup

1. Open Arduino IDE
2. Go to **Board Manager** → Install **Arduino UNO R4 Boards**
3. Go to **Library Manager** → Install:
   - `ArduinoMqttClient` by Arduino
   - `ArduinoJson` by Benoit Blanchon
4. Open `arduino/smartcat_feeder/smartcat_feeder.ino`
5. Fill in your WiFi credentials and MQTT settings at the top of the file
6. Select **Arduino UNO R4 WiFi** as board
7. Click **Upload**
8. Open **Serial Monitor** at 115200 baud
9. Type `feed` to test servo movement

---

### 9. Hardware Setup

See [HARDWARE.md](./HARDWARE.md) for:
- Full wiring diagram
- Cardboard dispenser build guide
- Servo configuration
- Testing steps
- Troubleshooting

---

## Local Development with Docker

Start a local PostgreSQL and Mosquitto broker:

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- Mosquitto MQTT on port 1883

Update your backend `.env`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smartcat
MQTT_BROKER_HOST=localhost
MQTT_BROKER_PORT=1883
```

---

## Deployment

### Frontend → Vercel (Free)
```bash
cd frontend
npm run build
# Push to GitHub, connect repo to Vercel, done!
```

### Backend → Render (Free)
1. Push to GitHub
2. Create new Web Service on [render.com](https://render.com)
3. Set environment variables in Render dashboard
4. Deploy!

> Note: Render free tier sleeps after 15min inactivity. Use [UptimeRobot](https://uptimerobot.com) (free) to ping it every 5 minutes.

---

## Testing Guide

### Test Web Feed
1. Open dashboard at http://localhost:5173
2. Log in
3. Click **Feed Cat Now**
4. Watch Arduino Serial Monitor for servo movement
5. See feed log update in history

### Test Telegram Feed
1. Start the bot with `/start`
2. Send `/feed`
3. Watch servo rotate
4. Send `/status` to check device

### Test Schedule
1. Go to **Schedules** page
2. Create a schedule 2 minutes from now
3. Watch the backend logs for cron execution
4. Verify servo rotates and history updates

---

## Common Errors

| Error | Fix |
|---|---|
| `Missing required environment variable` | Fill in all values in `.env` |
| `MQTT not connected` | Check HiveMQ credentials and host URL |
| `Device response timeout` | Arduino is offline. Check WiFi + MQTT in Serial Monitor |
| `Daily feed limit reached` | Wait until tomorrow or increase `MAX_FEEDS_PER_DAY` |
| `Access denied` in Telegram | Add your chat ID to `TELEGRAM_ALLOWED_CHAT_IDS` |
| Prisma schema error | Run `npm run prisma:push` again |

---

## Safety Guidelines

- ✅ Cooldown: 60 seconds minimum between feeds (configurable)
- ✅ Daily limit: max 10 feeds per day (configurable)
- ✅ Unknown Telegram users are denied access
- ✅ Web dashboard requires login
- ✅ MQTT credentials are never exposed to frontend
- ✅ All inputs are validated with Zod
- ⚠️ Test hardware before leaving with a real cat
- ⚠️ Check food supply and dispenser daily

---

## License

MIT License — free to use, modify, and share.

Built with ❤️ for cats and Arduino enthusiasts.
