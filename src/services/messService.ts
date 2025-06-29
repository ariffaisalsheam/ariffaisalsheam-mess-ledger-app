

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
  Timestamp,
  runTransaction,
  deleteDoc,
  writeBatch
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

  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const batch = writeBatch(db);

  // 1. Create the mess document
  const messRef = doc(collection(db, 'messes'));
  batch.set(messRef, {
    name: messName,
    managerId: user.uid,
    createdAt: serverTimestamp(),
    inviteCode: inviteCode,
  });

  // 2. Update the user's profile with the new messId and role
  const userRef = doc(db, 'users', user.uid);
  batch.update(userRef, {
    messId: messRef.id,
    role: 'manager',
  });

  // 3. Add user as the first member (manager) of the mess
  const memberRef = doc(db, 'messes', messRef.id, 'members', user.uid);
  batch.set(memberRef, {
      name: user.displayName,
      email: user.email,
      role: 'manager',
      balance: 0,
      meals: 0,
  });

  await batch.commit();
  return messRef.id;
};

// Join a mess using an invite code
export const joinMessByInviteCode = async (inviteCode: string, user: FirebaseUser) => {
    if (!db) throw new Error("Firestore not initialized");

    const messesRef = collection(db, 'messes');
    const q = query(messesRef, where("inviteCode", "==", inviteCode.toUpperCase()), limit(1));
    const querySnapshot = await getFirestoreDocs(q);

    if (querySnapshot.empty) {
        throw new Error("Invalid invite code. No mess found.");
    }

    const messDoc = querySnapshot.docs[0];
    const messId = messDoc.id;

    const userProfile = await getUserProfile(user.uid);
    if (userProfile?.messId) {
        throw new Error("You are already a member of a mess.");
    }
    
    const batch = writeBatch(db);

    const userRef = doc(db, 'users', user.uid);
    batch.update(userRef, {
        messId: messId,
        role: 'member',
    });

    const memberRef = doc(db, 'messes', messId, 'members', user.uid);
    batch.set(memberRef, {
        name: user.displayName,
        email: user.email,
        role: 'member',
        balance: 0,
        meals: 0,
    });

    await batch.commit();
    return messId;
}

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  if (!db) throw new Error("Firestore not initialized");
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    return userSnap.data() as UserProfile;
  }
  return null;
};

export const getMessById = async (messId: string) => {
    if (!db) throw new Error("Firestore not initialized");
    const messRef = doc(db, 'messes', messId);
    const messSnap = await getDoc(messRef);
    if (messSnap.exists()) {
        return { id: messSnap.id, ...messSnap.data() };
    }
    return null;
}

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

// ---- Pending Transactions ----

export const addDeposit = async (messId: string, userId: string, amount: number) => {
    if (!db) throw new Error("Firestore not initialized");
    const user = await getUserProfile(userId);
    const pendingDepositsRef = collection(db, 'messes', messId, 'pendingDeposits');
    await addDoc(pendingDepositsRef, {
        amount,
        userId,
        memberName: user?.displayName || "Unknown Member",
        date: serverTimestamp(),
        status: 'pending'
    });
};

export const addExpense = async (messId: string, userId: string, amount: number, description: string) => {
    if (!db) throw new Error("Firestore not initialized");
    const user = await getUserProfile(userId);
    const pendingExpensesRef = collection(db, 'messes', messId, 'pendingExpenses');
    await addDoc(pendingExpensesRef, {
        amount,
        description,
        userId,
        addedBy: user?.displayName || "Unknown Member",
        date: serverTimestamp(),
        status: 'pending'
    });
};

export const getPendingDeposits = async (messId: string): Promise<Deposit[]> => {
    if (!db) return [];
    const depositsCol = collection(db, 'messes', messId, 'pendingDeposits');
    const snapshot = await getFirestoreDocs(depositsCol);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        const date = (data.date as Timestamp)?.toDate().toISOString() || new Date().toISOString();
        return { id: doc.id, ...data, date } as Deposit;
    });
};

export const getPendingExpenses = async (messId: string): Promise<Expense[]> => {
    if (!db) return [];
    const expensesCol = collection(db, 'messes', messId, 'pendingExpenses');
    const snapshot = await getFirestoreDocs(expensesCol);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        const date = (data.date as Timestamp)?.toDate().toISOString() || new Date().toISOString();
        return { id: doc.id, ...data, date } as Expense;
    });
};

export const approveDeposit = async (messId: string, depositId: string) => {
    if (!db) throw new Error("Firestore not initialized");
    const pendingDepositRef = doc(db, 'messes', messId, 'pendingDeposits', depositId);

    await runTransaction(db, async (transaction) => {
        const pendingDoc = await transaction.get(pendingDepositRef);
        if (!pendingDoc.exists()) {
            throw "Pending deposit document does not exist!";
        }

        const pendingData = pendingDoc.data();
        const memberRef = doc(db, 'messes', messId, 'members', pendingData.userId);
        
        const memberDoc = await transaction.get(memberRef);
        if (!memberDoc.exists()) {
            throw `Member with ID ${pendingData.userId} not found in mess ${messId}`;
        }

        const newBalance = (memberDoc.data().balance || 0) + pendingData.amount;

        const newDepositRef = doc(collection(db, 'messes', messId, 'deposits'));
        transaction.set(newDepositRef, {
            ...pendingData,
            status: 'approved',
            approvedAt: serverTimestamp(),
        });

        transaction.update(memberRef, { balance: newBalance });
        transaction.delete(pendingDepositRef);
    });
};

export const rejectDeposit = async (messId: string, depositId: string) => {
    if (!db) throw new Error("Firestore not initialized");
    await deleteDoc(doc(db, 'messes', messId, 'pendingDeposits', depositId));
};

export const approveExpense = async (messId: string, expenseId: string) => {
    if (!db) throw new Error("Firestore not initialized");
    const pendingExpenseRef = doc(db, 'messes', messId, 'pendingExpenses', expenseId);
    
    await runTransaction(db, async (transaction) => {
        const pendingDoc = await transaction.get(pendingExpenseRef);
        if (!pendingDoc.exists()) {
            throw "Pending expense document does not exist!";
        }

        const newExpenseRef = doc(collection(db, 'messes', messId, 'expenses'));
        transaction.set(newExpenseRef, {
            ...pendingDoc.data(),
            status: 'approved',
            approvedAt: serverTimestamp(),
        });
        
        transaction.delete(pendingExpenseRef);
    });
};

export const rejectExpense = async (messId: string, expenseId: string) => {
    if (!db) throw new Error("Firestore not initialized");
    await deleteDoc(doc(db, 'messes', messId, 'pendingExpenses', expenseId));
};
