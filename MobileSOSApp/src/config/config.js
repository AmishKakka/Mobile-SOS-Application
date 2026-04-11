let BACKEND_URL;

if (__DEV__) {

    // DEVELOPMENT MODE: Running locally via Emulator
    const IP_ADDRESS = '192.168.0.93'; // Update this if your laptop IP changes
    const PORT = '3000';
    BACKEND_URL = `http://${IP_ADDRESS}:${PORT}`;

} else {

    // PRODUCTION MODE: App is downloaded from App Store/Play Store
    BACKEND_URL = 'https://api.safeguard.com'; // Your future cloud server URL
}

export const API_BASE_URL = `${BACKEND_URL}/api`;