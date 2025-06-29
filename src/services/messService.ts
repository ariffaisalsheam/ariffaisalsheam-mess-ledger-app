import { db } from '@/lib/firebase';
import {
  doc,
  setDoc,
  getDoc,
  addDoc,
  collection,
  updateDoc,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';

if (!db) {
  throw new Error("Firestore is not initialized");
}

export type UserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  messId?: string;
  role?: 'manager' | 'member';
};

export type Member = {
  id: string;
  name: string;
  role: "manager" | "member";
  balance: number;
  meals: number;
  avatar: string;
};


// Create or update user in Firestore
export const upsertUser = async (user: FirebaseUser) => {
  const userRef = doc(db!, 'users', user.uid);
  const userData: Partial<UserProfile> = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
  await setDoc(userRef, userData, { merge: true });
  return userRef;
};

// Create a new mess
export const createMess = async (messName: string, user: FirebaseUser) => {
  if (!db) throw new Error("Firestore not initialized");

  // 1. Create the mess document
  const messRef = await addDoc(collection(db, 'messes'), {
    name: messName,
    managerId: user.uid,
    createdAt: serverTimestamp(),
  });

  // 2. Update the user's profile with the new messId and role
  const userRef = doc(db, 'users', user.uid);
  await updateDoc(userRef, {
    messId: messRef.id,
    role: 'manager',
  });

  // 3. Add user as the first member (manager) of the mess
  const memberRef = doc(db, 'messes', messRef.id, 'members', user.uid);
  await setDoc(memberRef, {
      name: user.displayName,
      email: user.email,
      role: 'manager',
  });

  return messRef.id;
};

// Get user profile from Firestore
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  if (!db) throw new Error("Firestore not initialized");
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    return userSnap.data() as UserProfile;
  }
  return null;
};

// Get Mess data
export const getMessById = async (messId: string) => {
    if (!db) throw new Error("Firestore not initialized");
    const messRef = doc(db, 'messes', messId);
    const messSnap = await getDoc(messRef);
    if (messSnap.exists()) {
        return { id: messSnap.id, ...messSnap.data() };
    }
    return null;
}

// Get all members of a mess
export const getMembersOfMess = async (messId: string): Promise<Member[]> => {
    if (!db) throw new Error("Firestore not initialized");

    const membersColRef = collection(db, 'messes', messId, 'members');
    const membersSnap = await getDocs(membersColRef);
    const memberDocs = membersSnap.docs;

    const userProfilePromises = memberDocs.map(doc => getUserProfile(doc.id));
    const userProfiles = await Promise.all(userProfilePromises);

    const members: Member[] = memberDocs.map((doc, index) => {
        const data = doc.data();
        const profile = userProfiles[index];
        return {
            id: doc.id,
            name: data.name || "Unnamed Member",
            role: data.role,
            // Mock data for fields not yet in DB
            balance: Math.random() * 600 - 300,
            meals: Math.floor(Math.random() * 30) + 1,
            avatar: profile?.photoURL || 'https://placehold.co/40x40.png',
        };
    });

    return members;
}
