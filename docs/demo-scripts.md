# Mobile SOS Demo Scripts

## Script A: What This Repo Can Demo Today (Browser PoC)

### Goal
Show live victim/helper room communication and server-side dynamic SOS helper lookup with Redis.

### Setup (Presenter)
1. Start Redis:
   - `docker compose up -d redis`
2. Start backend server:
   - `cd backend`
   - `node src/server.js`
3. Open two browser windows:
   - `http://localhost:3000` (Window 1 = Victim view)
   - `http://localhost:3000` (Window 2 = Helper view)

### Narration + Actions
1. Say: "First, I will connect both devices to the same incident room."
   - In both windows, keep room ID `999`.
   - In Window 1 click `Join Incident as Victim`.
   - In Window 2 click `Join Incident as Helper`.
2. Say: "Now I will stream the helper location to the victim in real time."
   - In Window 2 click `Start Running to Victim (Send GPS)`.
   - In Window 1 point to the live map log updates (`Helper is at Lat..., Lng...`).
3. Say: "Now I will trigger SOS helper discovery with dynamic radius on the backend."
   - In a terminal run:
     - `cd backend`
     - `node scripts/testPoC.js`
   - Point to output sections:
     - nearest helper ranking
     - rejection filter behavior
     - ripple expansion behavior
     - fallback escalation (`CALL_EMERGENCY_CONTACTS`)

### Expected Audience Outcome
They see that:
- real-time room routing works,
- helper updates are isolated to the correct incident,
- dynamic radius helper selection works with rejection and escalation logic.

---

## Script B: Intended Production-Style Flow (Simulated Steps Marked)

### Goal
Present the target end-to-end architecture and clearly separate what is currently simulated.

### Narration + Actions
1. Say: "The victim presses SOS on their phone."
   - `[SIMULATED]` Use terminal call instead of mobile app button:
   - `curl -X POST http://localhost:3000/api/sos/trigger -H "Content-Type: application/json" -d "{\"victimLat\":33.4255,\"victimLng\":-111.94,\"rejectIds\":[]}"`
2. Say: "Backend runs dynamic radius search and finds the best nearby helpers."
   - Point to JSON response ordering by nearest distance.
3. Say: "Backend would now notify nearby helpers with this incident ID."
   - `[SIMULATED]` No FCM/APNS push integration in this repo yet.
4. Say: "Helper accepts alert and joins the incident room."
   - Use browser Window 2 (`Join Incident as Helper`) with the same incident ID.
5. Say: "Victim is already in the room and receives live helper movement."
   - In Window 2 click `Start Running to Victim (Send GPS)`.
   - Show Window 1 receiving live updates.
6. Say: "If helpers decline, backend excludes them and expands search radius."
   - `[SIMULATED]` Trigger with reject IDs:
   - `curl -X POST http://localhost:3000/api/sos/trigger -H "Content-Type: application/json" -d "{\"victimLat\":33.4255,\"victimLng\":-111.94,\"rejectIds\":[\"user_center_1\",\"user_center_2\"]}"`
7. Say: "If no one is found in range, it escalates to emergency contacts."
   - `[SIMULATED]` Trigger sparse-area request:
   - `curl -X POST http://localhost:3000/api/sos/trigger -H "Content-Type: application/json" -d "{\"victimLat\":0,\"victimLng\":0,\"rejectIds\":[]}"`

### What Is Real vs Simulated
- Real today:
  - Socket room routing and live helper-to-victim updates.
  - Dynamic radius helper lookup in Redis/H3.
  - HTTP and socket entry points into SOS lookup.
- Simulated today:
  - Mobile app UI flows.
  - Incident creation via MongoDB lifecycle.
  - Push notification fanout (FCM/APNS).
