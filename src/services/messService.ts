
import { db } from '@/lib/firebase';
import {
  doc,
  setDoc,
  getDoc,
  addDoc,
  collection,
  updateDoc,
  serverTimestamp,
  getDocs as getFirestoreDocs,
  query,
  where,
  limit,
  Timestamp
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
  role: 'manager' | 'member';
  balance: number;
  meals: number;
  avatar: string;
};

export interface Expense {
    id: string;
    amount: number;
    description: string;
    addedBy: string; // User's name
    date: string; // ISO string
    userId: string;
}

export interface Deposit {
    id: string;
    amount: number;
    memberName: string; // Submitter's name
    date: string; // ISO string
    userId: string;
}


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

  // 1. Generate a simple unique invite code
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  // 2. Create the mess document
  const messRef = await addDoc(collection(db, 'messes'), {
    name: messName,
    managerId: user.uid,
    createdAt: serverTimestamp(),
    inviteCode: inviteCode,
  });

  // 3. Update the user's profile with the new messId and role
  const userRef = doc(db, 'users', user.uid);
  await updateDoc(userRef, {
    messId: messRef.id,
    role: 'manager',
  });

  // 4. Add user as the first member (manager) of the mess
  const memberRef = doc(db, 'messes', messRef.id, 'members', user.uid);
  await setDoc(memberRef, {
      name: user.displayName,
      email: user.email,
      role: 'manager',
      balance: 0,
      meals: 0,
  });

  return messRef.id;
};

// Join a mess using an invite code
export const joinMessByInviteCode = async (inviteCode: string, user: FirebaseUser) => {
    if (!db) throw new Error("Firestore not initialized");

    // 1. Find the mess with the given invite code
    const messesRef = collection(db, 'messes');
    const q = query(messesRef, where("inviteCode", "==", inviteCode.toUpperCase()), limit(1));
    const querySnapshot = await getFirestoreDocs(q);

    if (querySnapshot.empty) {
        throw new Error("Invalid invite code. No mess found.");
    }

    const messDoc = querySnapshot.docs[0];
    const messId = messDoc.id;

    // 2. Check if user is already in a mess
    const userProfile = await getUserProfile(user.uid);
    if (userProfile?.messId) {
        throw new Error("You are already a member of a mess.");
    }
    
    // 3. Update the user's profile with the new messId and role
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
        messId: messId,
        role: 'member',
    });

    // 4. Add user as a new member of the mess
    const memberRef = doc(db, 'messes', messId, 'members', user.uid);
    await setDoc(memberRef, {
        name: user.displayName,
        email: user.email,
        role: 'member',
        balance: 0,
        meals: 0,
    });

    return messId;
}

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
    const membersSnap = await getFirestoreDocs(membersColRef);
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
            balance: data.balance ?? 0,
            meals: data.meals ?? 0,
            avatar: profile?.photoURL || 'https://placehold.co/40x40.png',
        };
    });

    return members;
}

// Get a single member's details
export const getMemberDetails = async (messId: string, userId: string): Promise<Member | null> => {
    if (!db) throw new Error("Firestore not initialized");
    const memberRef = doc(db, 'messes', messId, 'members', userId);
    const memberSnap = await getDoc(memberRef);

    if (!memberSnap.exists()) {
        return null;
    }

    const userProfile = await getUserProfile(userId);
    const data = memberSnap.data();

    return {
        id: userId,
        name: data.name || "Unnamed Member",
        role: data.role,
        balance: data.balance ?? 0,
        meals: data.meals ?? 0,
        avatar: userProfile?.photoURL || 'https://placehold.co/40x40.png',
    };
};

// Get all expenses for a mess
export const getExpenses = async (messId: string): Promise<Expense[]> => {
    if (!db) return [];
    const expensesCol = collection(db, 'messes', messId, 'expenses');
    const snapshot = await getFirestoreDocs(expensesCol);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        const date = (data.date as Timestamp).toDate().toISOString();
        return { id: doc.id, ...data, date } as Expense;
    });
};

// Get all deposits for a mess
export const getDeposits = async (messId: string): Promise<Deposit[]> => {
    if (!db) return [];
    const depositsCol = collection(db, 'messes', messId, 'deposits');
    const snapshot = await getFirestoreDocs(depositsCol);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        const date = (data.date as Timestamp).toDate().toISOString();
        return { id: doc.id, ...data, date } as Deposit;
    });
};
