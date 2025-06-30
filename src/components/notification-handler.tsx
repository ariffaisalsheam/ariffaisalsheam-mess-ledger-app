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
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            console.log('Notification permission granted.');

            const currentToken = await getToken(messaging, {
              vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY, // Make sure to add this to your .env.local file
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

      requestPermission();

      const unsubscribe = onMessage(messaging!, (payload) => {
        console.log('Foreground message received.', payload);
        toast({
          title: payload.notification?.title || 'New Notification',
          description: payload.notification?.body || '',
        });
      });

      return () => {
        unsubscribe();
      };
    }
  }, [toast]);

  return null;
};

export default NotificationHandler;
