// This file MUST be in the /public directory

// Import the Firebase app and messaging libraries
import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

// IMPORTANT: Replace this with your project's Firebase config object
// You can find this in your Firebase project settings.
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
};


// Initialize the Firebase app in the service worker
try {
    const app = initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    onBackgroundMessage(messaging, (payload) => {
        console.log('[firebase-messaging-sw.js] Received background message ', payload);
        
        const notificationTitle = payload.notification?.title || "New Notification";
        const notificationOptions = {
            body: payload.notification?.body || "You have a new update.",
            icon: '/icon-192x192.png'
        };

        self.registration.showNotification(notificationTitle, notificationOptions);
    });
} catch (error) {
    console.error("Error initializing Firebase in service worker:", error);
}
