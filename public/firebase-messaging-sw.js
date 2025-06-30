// DO NOT MODIFY. This file is generated and managed by Firebase.
// https://firebase.google.com/docs/web/setup
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

/*
 ***************************************************************************************
 *  IMPORTANT: YOU MUST MANUALLY REPLACE THE PLACEHOLDER CONFIG WITH YOUR OWN.          *
 *  This service worker runs in the background and cannot access environment variables.*
 *  Copy the config from your `.env.local` file and paste it here.                     *
 ***************************************************************************************
*/
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_AUTH_DOMAIN_HERE",
  projectId: "YOUR_PROJECT_ID_HERE",
  storageBucket: "YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID_HERE",
  appId: "YOUR_APP_ID_HERE",
};

// Initialize the Firebase app in the service worker with the background messaging service.
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Optional: If you want to handle background messages here, you can do so.
// For example, to show a custom notification.
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/icon-192x192.png',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
