# Mobile-SOS-Application

## Project Structure

```
Mobile-SOS-Application/
├── backend/                    # Express.js + Socket.IO server
│   ├── src/
│   │   ├── api/               # Layer 1: HTTP REST API
│   │   │   ├── routes/        # Defines endpoints (POST /api/sos)
│   │   │   ├── controllers/   # Handles Requests/Responses
│   │   │   └── middlewares/   # JWT Auth, Error handling
│   │   ├── sockets/           # Layer 2: Real-Time Engine
│   │   │   ├── events/        # Individual event listeners
│   │   │   └── socketManager.js
│   │   ├── services/          # Layer 3: Business Logic
│   │   │   ├── proximityService.js  # H3 k-ring expansion
│   │   │   ├── escalationService.js # 15-min timeout logic
│   │   │   └── firebaseService.js   # Push notifications
│   │   ├── dal/               # Layer 4: Data Access Layer
│   │   │   ├── mongoDb.js     # Permanent storage
│   │   │   └── redisDb.js     # Fast GPS coordinates
│   │   ├── models/            # Mongoose schemas
│   │   │   ├── User.js
│   │   │   └── Incident.js
│   │   ├── config/            # Configuration files
│   │   ├── utils/             # Haversine, logger
│   │   ├── app.js             # Express setup
│   │   └── server.js          # Main entry point
│   ├── package.json
│   ├── .env
│   └── .gitignore
│
└── mobile-app/                # Expo + React Native app
    ├── app/                   # Expo Router screens
    │   ├── (tabs)/
    │   ├── index.tsx
    │   └── track.tsx          # Real-time tracking screen
    ├── src/
    │   ├── screens/
    │   │   └── HelperMapScreen.tsx
    │   └── services/
    │       └── socket.ts      # Socket.IO client
    ├── components/
    ├── assets/
    └── package.json
```

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