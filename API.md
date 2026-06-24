# API.md — SmartCat Feeder REST API Reference

**Base URL:** `http://localhost:5000/api`  
**Auth:** All endpoints except `/auth/register` and `/auth/login` require:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## Auth Endpoints

### POST /api/auth/register
Create a new user account.
```json
// Request body
{ "name": "Geo", "email": "geo@example.com", "password": "secret123" }

// Response 201
{ "user": { "id": "...", "name": "Geo", "email": "...", "role": "USER" }, "token": "JWT..." }
```

### POST /api/auth/login
Sign in and get a JWT token.
```json
// Request body
{ "email": "geo@example.com", "password": "secret123" }

// Response 200
{ "user": { ... }, "token": "JWT..." }
```

### GET /api/auth/me
Get current logged-in user.
```json
// Response 200
{ "user": { "id": "...", "name": "...", "email": "...", "role": "USER" } }
```

---

## Feed Endpoints

### POST /api/feeds/now
Trigger an immediate feed. Publishes MQTT command and waits for Arduino response.
```json
// Request body (optional)
{ "portion": 1 }

// Response 200 (success)
{ "success": true, "message": "Food dispensed", "requestId": "abc123", "feedLogId": "..." }

// Response 400 (cooldown or limit)
{ "success": false, "message": "Feeder is cooling down. Please wait 45 seconds." }
```

### GET /api/feeds
Get paginated feed history with optional filters.
```
Query params: source, status, from, to, limit (default 20), page (default 1)
```
```json
// Response
{ "feeds": [...], "total": 42, "page": 1, "limit": 20 }
```

### GET /api/feeds/today
Get all feeds from today.
```json
{ "feeds": [...], "count": 3 }
```

### GET /api/feeds/stats
Get feed statistics and 7-day chart data.
```json
{
  "total": 150,
  "todayCount": 3,
  "successCount": 140,
  "failedCount": 10,
  "daily": [
    { "date": "2024-01-10", "success": 3, "failed": 0, "total": 3 }
  ],
  "lastFeed": { ... }
}
```

### GET /api/feeds/:id
Get a single feed log by ID.

---

## Schedule Endpoints

### POST /api/schedules
Create a feeding schedule.
```json
// Request body
{
  "name": "Morning Feeding",
  "time": "08:00",
  "portion": 1,
  "enabled": true,
  "daysOfWeek": "1,2,3,4,5"
}
// daysOfWeek: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
```

### GET /api/schedules
List all schedules for the current user.

### PUT /api/schedules/:id
Update a schedule (full or partial body).

### DELETE /api/schedules/:id
Delete a schedule.

### PATCH /api/schedules/:id/toggle
Toggle enabled/disabled state.

---

## Device Endpoints

### GET /api/device/status
```json
{
  "device": {
    "id": "device-1",
    "status": "ONLINE",
    "lastHeartbeatAt": "2024-01-15T08:30:00Z",
    "uptimeSeconds": 3600,
    "wifiStrength": -55,
    "lastMessage": "Heartbeat at ..."
  },
  "mqttConnected": true
}
```

### GET /api/device/heartbeat
Lightweight heartbeat summary.

---

## Health Check

### GET /api/health
```json
{ "status": "ok", "service": "SmartCat Feeder Backend", "timestamp": "..." }
```

---

## Error Responses

All errors return:
```json
{ "error": "Human-readable message" }
```

Validation errors return:
```json
{
  "error": "Validation error",
  "details": [{ "field": "email", "message": "Invalid email address" }]
}
```

| Status | Meaning |
|---|---|
| 400 | Bad request / validation error |
| 401 | Missing or invalid JWT token |
| 403 | Forbidden (wrong role) |
| 404 | Resource not found |
| 409 | Conflict (e.g. email already registered) |
| 500 | Internal server error |
