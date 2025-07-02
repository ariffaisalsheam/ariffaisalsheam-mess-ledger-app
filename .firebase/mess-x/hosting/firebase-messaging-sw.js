// This file must be in the public directory

// Import the Firebase app and messaging services
// Scripts for Firebase products are imported on-demand
// https://firebase.google.com/docs/web/modular-sdk
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// IMPORTANT: REPLACE WITH YOUR FIREBASE PROJECT CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyAE4clgZjZHdSuBgyfPvsSrRfCM_pBiVeg",
  authDomain: "mess-x.firebaseapp.com",
  projectId: "mess-x",
  storageBucket: "mess-x.firebasestorage.app",
  messagingSenderId: "1050676425130",
  appId: "1:1050676425130:web:522aaec85fd7fc98a5bbd3",
  measurementId: "G-K11D5CNLHP"
};

// Initialize the Firebase app in the service worker
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
