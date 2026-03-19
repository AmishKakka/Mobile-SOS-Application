# Mobile-SOS-Application

## Installation

1. #### Backend - We will be using Express.js as the engine working with APIs and doing the workload. Also, we have external libraries.

    1. Socket.io: The "Live Pipe" for real-time location streaming between Victim and Helper.

    2. Mongoose: Manages static, permanent data (User Profiles, Medical Data) in MongoDB.

    3. ioredis: Manages fast, volatile data (Live GPS coordinates) in Redis.

    4. h3-js: The algorithmic engine that converts raw GPS coordinates into hexagonal grid cells for the dynamic radius search.

    ```sh
    cd backend
    npm install express mongoose ioredis socket.io h3-js dotenv cors
    ```


2. #### Frontend - We will be using React-Native for the UI of the application. Easy to use and access OS-level functions (what we need for our application). 
    Since, our goal is to be cross-platform (iOS and Android), we would need to setup our frontend seperately once for our iOS and then for Android.
    This will create all the dependencies for our project on the Frontend side.

    ```sh
    npx @react-native-community/cli@latest init frontend
    ```

    After updating your code run the commands below and it takes 1–3 minutes to build the app and launch it on the virtual phone.

    Run instructions for Android:

        • Have an Android emulator running (quickest way to get started), or a device connected.
        • cd "/path/to/Mobile-SOS-Application/frontend" && npx react-native run-android
    
    Run instructions for iOS:

        • cd "/path/to/Mobile-SOS-Application/frontend"
        • npx react-native run-ios
        - or -
        • Open frontend/ios/frontend.xcworkspace in Xcode or run "xed -b ios"
        • Hit the Run button

## Demo Scripts

Demo narration scripts are available at:

- `docs/demo-scripts.md`

They include:

- Browser PoC script (what can be shown today)
- Production-style script with clearly marked `[SIMULATED]` steps

## Redis (Docker Compose)

From the repository root:

```sh
docker compose up -d redis
docker compose ps
```

## Backend Test Commands

From `backend/`:

```sh
npm run test:server
npm run test:redis-demo
npm run test:e2e
npm run test:all
```

### Test Coverage Matrix

| Command | Redis required | What it validates |
| --- | --- | --- |
| `npm run test:server` | No | Root endpoint response, Socket room routing/isolation, HTTP `/api/sos/trigger` payload validation, and socket `trigger_sos` payload validation. |
| `npm run test:redis-demo` | Yes | Redis hash/set update flow in `RedisDemo.js`, including location key replacement and `last-location` snapshot updates. |
| `npm run test:e2e` | Yes | End-to-end HTTP + socket SOS behavior with seeded helper data, reject-list exclusion, sorted nearest-helper results, fallback escalation, and malformed payload handling. |
| `npm run test:all` | Yes | Runs all backend test suites in sequence. |

### Notes

- Start Redis before running Redis-dependent suites:

```sh
docker compose up -d redis
```

- The validation tests now explicitly cover:
  - non-numeric `victimLat` / `victimLng`
  - non-array `rejectIds`

## UI Design

POC UI design updates in progress.
