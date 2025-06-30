
"use client";

import { useEffect } from 'react';
import { messaging, auth } from '@/lib/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { useToast } from '@/hooks/use-toast';
import { saveUserFCMToken } from '@/services/messService';

const NotificationHandler = () => {
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const requestPermission = async () => {
        if (!messaging || !auth.currentUser) return;

        try {
          // Check for VAPID key first
          if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY) {
            console.error("VAPID key is missing. Push notifications will not work. Please add NEXT_PUBLIC_FIREBASE_VAPID_KEY to your .env.local file.");
            toast({
                title: "Push Notification Error",
                description: "Configuration for push notifications is incomplete.",
                variant: "destructive",
            });
            return;
          }

          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            console.log('Notification permission granted.');

            const currentToken = await getToken(messaging, {
              vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
            });

            if (currentToken) {
              console.log('FCM Token:', currentToken);
              await saveUserFCMToken(auth.currentUser.uid, currentToken);
            } else {
              console.log('No registration token available. Request permission to generate one.');
            }
          } else {
            console.log('Unable to get permission to notify.');
          }
        } catch (error) {
          console.error('An error occurred while retrieving token. ', error);
        }
      };

      // Delay permission request slightly to ensure auth state is settled
      const timer = setTimeout(() => {
        if (auth.currentUser) {
            requestPermission();
        } else {
            const unsubscribe = auth.onAuthStateChanged(user => {
                if (user) {
                    requestPermission();
                    unsubscribe();
                }
            });
        }
      }, 2000);
      

      const unsubscribeOnMessage = onMessage(messaging, (payload) => {
        console.log('Foreground message received.', payload);
        toast({
          title: payload.notification?.title || 'New Notification',
          description: payload.notification?.body || '',
        });
      });

      return () => {
        clearTimeout(timer);
        unsubscribeOnMessage();
      };
    }
  }, [toast]);

  return null;
};

export default NotificationHandler;
