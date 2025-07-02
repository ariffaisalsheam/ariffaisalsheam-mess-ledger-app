import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// This function triggers when a new notification is created in any mess's
// 'notifications' subcollection. It then sends a push notification.
export const sendPushNotification = functions.firestore
  .document("messes/{messId}/notifications/{notificationId}")
  .onCreate(async (snap, context) => {
    const notificationData = snap.data();
    if (!notificationData) {
      console.log("No notification data found");
      return;
    }

    const messId = context.params.messId;
    const {userId, message, link} = notificationData;

    const targetUserIds: string[] = [];

    // Determine the target user(s)
    if (userId === "manager") {
      // If target is 'manager', find all users with manager role in this mess
      const membersRef = db.collection(`messes/${messId}/members`);
      const snapshot = await membersRef.where("role", "==", "manager").get();
      if (snapshot.empty) {
        console.log("No managers found for this mess.");
        return;
      }
      snapshot.forEach((doc) => {
        targetUserIds.push(doc.id);
      });
    } else {
      // Otherwise, target the specific user
      targetUserIds.push(userId);
    }

    if (targetUserIds.length === 0) {
      console.log("No target users found for notification.");
      return;
    }

    // Get FCM tokens for all target users
    const userDocs = await db.collection("users")
      .where(admin.firestore.FieldPath.documentId(), "in", targetUserIds)
      .get();

    const allTokens: string[] = [];
    userDocs.forEach((doc) => {
      const data = doc.data();
      if (data.fcmTokens && Array.isArray(data.fcmTokens)) {
        allTokens.push(...data.fcmTokens);
      }
    });

    if (allTokens.length === 0) {
      console.log("No FCM tokens found for target users.");
      return;
    }

    // Construct the push notification payload
    const payload = {
      notification: {
        title: "Mess Ledger",
        body: message,
      },
      webpush: {
        notification: {
          icon: "/icon-192x192.png",
        },
        fcm_options: {
          link: link || "/dashboard",
        },
      },
    };

    console.log(`Sending notification to ${allTokens.length} tokens.`);

    // Send the push notification
    const response = await admin.messaging().sendToDevice(allTokens, payload);

    // Clean up invalid tokens
    const tokensToRemove: Promise<unknown>[] = [];
    response.results.forEach((result, index) => {
      const error = result.error;
      if (error) {
        console.error("Failure sending notification to", allTokens[index], error);
        // Common error codes for invalid tokens
        if (
          error.code === "messaging/invalid-registration-token" ||
          error.code === "messaging/registration-token-not-registered"
        ) {
          const invalidToken = allTokens[index];
          console.log("Scheduling cleanup for invalid token:", invalidToken);
          // Find the user associated with the invalid token and remove it.
          // This is a simplified approach. A more robust system might batch these.
          userDocs.forEach((userDoc) => {
            const userData = userDoc.data();
            if (userData.fcmTokens && userData.fcmTokens.includes(invalidToken)) {
              const newTokens = userData.fcmTokens.filter(
                (t: string) => t !== invalidToken
              );
              tokensToRemove.push(userDoc.ref.update({fcmTokens: newTokens}));
            }
          });
        }
      }
    });

    return Promise.all(tokensToRemove);
  });
