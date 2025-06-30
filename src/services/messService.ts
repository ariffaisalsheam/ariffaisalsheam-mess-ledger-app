
import { db, auth, storage } from '@/lib/firebase';
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
  writeBatch,
  onSnapshot,
  orderBy,
  documentId,
  increment
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile, type User as FirebaseUser } from 'firebase/auth';

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

export interface Mess {
    id: string;
    name: string;
    managerId: string;
    inviteCode: string;
    mealSettings: MealSettings;
    summary: {
        totalExpenses: number;
        totalDeposits: number;
        totalMeals: number;
        mealRate: number;
    }
}

export interface Expense {
    id: string;
    amount: number;
    description: string;
    addedBy: string; // User's name
    date: string; // ISO string
    userId: string;
    receiptUrl?: string;
    // For pending requests
    type?: 'new' | 'edit' | 'delete';
    originalId?: string;
    originalData?: {
        amount: number;
        description: string;
    };
}

export interface Deposit {
    id: string;
    amount: number;
    memberName: string; // Submitter's name
    date: string; // ISO string
    userId: string;
    // For pending requests
    type?: 'new' | 'edit' | 'delete';
    originalId?: string;
    originalAmount?: number;
}

export interface MealSettings {
    breakfastCutoff: string; // "HH:mm"
    lunchCutoff: string;
    dinnerCutoff: string;
    isBreakfastOn: boolean;
    isLunchOn: boolean;
    isDinnerOn: boolean;
    isCutoffEnabled: boolean;
}

export interface MealStatus {
    breakfast: number;
    lunch: number;
    dinner: number;
    isSetByUser?: boolean;
    guestBreakfast?: number;
    guestLunch?: number;
    guestDinner?: number;
}

export interface MealLedgerEntry extends MealStatus {
    date: string; // "YYYY-MM-DD"
}

export interface MessMealHistoryEntry extends MealLedgerEntry {
    memberName: string;
    memberId: string;
}

export interface Notification {
    id: string;
    userId: string; // Specific user ID or 'manager' for all managers
    message: string;
    link?: string;
    read: boolean;
    timestamp: Timestamp;
}


export interface MemberReport {
    memberId: string;
    memberName: string;
    avatar: string;
    totalMeals: number;
    totalGuestMeals: number;
    mealCost: number;
    totalDeposits: number;
    finalBalance: number;
}

export interface MonthlyReport {
    month: string;
    year: number;
    totalExpenses: number;
    totalDeposits: number;
    totalMeals: number;
    mealRate: number;
    memberReports: MemberReport[];
    expenses: Expense[];
    deposits: Deposit[];
}


// --- Notifications ---

export const createNotification = async (messId: string, notificationData: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    if (!db) return;
    try {
        const notificationsRef = collection(db, 'messes', messId, 'notifications');
        await addDoc(notificationsRef, {
            ...notificationData,
            read: false,
            timestamp: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error creating notification:", error);
    }
};

export const onNotificationsChange = (messId: string, userId: string, role: 'manager' | 'member' | undefined, callback: (notifications: Notification[]) => void) => {
    if (!db || !role) return () => {};

    let q;
    const notificationsRef = collection(db, 'messes', messId, 'notifications');

    if (role === 'manager') {
        q = query(notificationsRef, where('userId', 'in', ['manager', userId]));
    } else {
        q = query(notificationsRef, where('userId', '==', userId));
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Notification);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const filtered = notifications.filter(n => n.timestamp && n.timestamp.toDate() > thirtyDaysAgo);
        
        // Sort client-side to avoid needing a composite index
        filtered.sort((a, b) => {
            const dateA = a.timestamp?.toDate()?.getTime() || 0;
            const dateB = b.timestamp?.toDate()?.getTime() || 0;
            return dateB - dateA;
        });

        callback(filtered);
    }, (error) => console.error("Error on notifications snapshot:", error));

    return unsubscribe;
}

export const markNotificationAsRead = async (messId: string, notificationId: string) => {
    if (!db) return;
    try {
        const notificationRef = doc(db, 'messes', messId, 'notifications', notificationId);
        await updateDoc(notificationRef, { read: true });
    } catch (error) {
        console.error("Error marking notification as read:", error);
        throw error;
    }
}

export const markAllNotificationsAsRead = async (messId: string, userId: string, role: 'manager' | 'member') => {
    if (!db || !role) return;
    try {
        const notificationsRef = collection(db, 'messes', messId, 'notifications');
        let q;
        if (role === 'manager') {
            q = query(notificationsRef, where('userId', 'in', ['manager', userId]), where('read', '==', false));
        } else {
            q = query(notificationsRef, where('userId', '==', userId), where('read', '==', false));
        }
        
        const snapshot = await getFirestoreDocs(q);

        if (snapshot.empty) {
            return;
        }

        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { read: true });
        });
        await batch.commit();
    } catch (error) {
        console.error("Error marking all notifications as read:", error);
        throw error;
    }
};

export const deleteNotification = async (messId: string, notificationId: string) => {
    if (!db) return;
    try {
        const notificationRef = doc(db, 'messes', messId, 'notifications', notificationId);
        await deleteDoc(notificationRef);
    } catch (error) {
        console.error("Error deleting notification:", error);
        throw error;
    }
};

export const deleteAllNotificationsForUser = async (messId: string, userId: string, role: 'manager' | 'member') => {
    if (!db || !role) return;
    try {
        const notificationsRef = collection(db, 'messes', messId, 'notifications');
        let q;
        if (role === 'manager') {
            q = query(notificationsRef, where('userId', 'in', ['manager', userId]));
        } else {
            q = query(notificationsRef, where('userId', '==', userId));
        }
        
        const snapshot = await getFirestoreDocs(q);

        if (snapshot.empty) {
            return;
        }

        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
    } catch (error) {
        console.error("Error deleting all notifications:", error);
        throw error;
    }
};


// Create or update user in Firestore
export const upsertUser = async (user: FirebaseUser) => {
  const userRef = doc(db!, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  
  const userData: Partial<UserProfile> = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };

  if(userSnap.exists()){
     await updateDoc(userRef, {
        displayName: user.displayName,
        photoURL: user.photoURL,
     });
  } else {
     await setDoc(userRef, userData, { merge: true });
  }

  return userRef;
};

export const updateUserProfile = async (
    userId: string,
    updates: {
      displayName?: string;
      newImageFile?: File | null;
    }
  ) => {
    if (!db || !auth) throw new Error("Firebase not initialized");
  
    const { displayName, newImageFile } = updates;
    const user = auth.currentUser;
    if (!user || user.uid !== userId) {
      throw new Error("Authentication error.");
    }
  
    const userDocRef = doc(db, 'users', userId);
    const userProfile = await getUserProfile(userId);
  
    let newPhotoURL: string | undefined = undefined;
  
    // 1. Upload new image if it exists
    if (newImageFile && storage) {
      const storageRef = ref(storage, `profile-pictures/${userId}/${newImageFile.name}`);
      const snapshot = await uploadBytes(storageRef, newImageFile);
      newPhotoURL = await getDownloadURL(snapshot.ref);
    }
  
    // 2. Prepare data for Firebase Auth and Firestore
    const authUpdateData: { displayName?: string; photoURL?: string } = {};
    const firestoreUpdateData: { displayName?: string; photoURL?: string } = {};
  
    if (displayName && displayName !== user.displayName) {
      authUpdateData.displayName = displayName;
      firestoreUpdateData.displayName = displayName;
    }
    if (newPhotoURL && newPhotoURL !== user.photoURL) {
      authUpdateData.photoURL = newPhotoURL;
      firestoreUpdateData.photoURL = newPhotoURL;
    }
  
    // 3. Update Firebase Auth profile
    if (Object.keys(authUpdateData).length > 0) {
      await updateProfile(user, authUpdateData);
    }
  
    // 4. Update Firestore user profile
    if (Object.keys(firestoreUpdateData).length > 0) {
      await updateDoc(userDocRef, firestoreUpdateData);
    }
  
    // 5. Update name in mess members subcollection if user is in a mess
    if (userProfile?.messId && displayName) {
      const memberRef = doc(db, 'messes', userProfile.messId, 'members', userId);
      const memberSnap = await getDoc(memberRef);
      if (memberSnap.exists()) {
        await updateDoc(memberRef, { name: displayName });
      }
    }
  
    return { ...authUpdateData };
  };

// Create a new mess
export const createMess = async (messName: string, user: FirebaseUser) => {
  if (!db) throw new Error("Firestore not initialized");

  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const batch = writeBatch(db);
  const messRef = doc(collection(db, 'messes'));

  // 1. Create the mess document with default meal settings and summary
  batch.set(messRef, {
    name: messName,
    managerId: user.uid,
    createdAt: serverTimestamp(),
    inviteCode: inviteCode,
    mealSettings: {
        breakfastCutoff: "02:00",
        lunchCutoff: "13:00",
        dinnerCutoff: "20:00",
        isBreakfastOn: true,
        isLunchOn: true,
        isDinnerOn: true,
        isCutoffEnabled: true,
    },
    summary: {
        totalExpenses: 0,
        totalDeposits: 0,
        totalMeals: 0,
        mealRate: 0,
    }
  });

  // 2. Update the user's profile
  const userRef = doc(db, 'users', user.uid);
  batch.update(userRef, {
    messId: messRef.id,
    role: 'manager',
  });

  // 3. Add user as the first member
  const memberRef = doc(db, 'messes', messRef.id, 'members', user.uid);
  batch.set(memberRef, {
      name: user.displayName,
      email: user.email,
      role: 'manager',
      balance: 0,
      meals: 0, // This is the member's meal count for the current cycle
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
    await createNotification(messId, {
        userId: 'manager',
        message: `${user.displayName || 'A new member'} has joined the mess.`,
        link: '/dashboard/members'
    });

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

export const getMessById = async (messId: string): Promise<Mess | null> => {
    if (!db) throw new Error("Firestore not initialized");
    const messRef = doc(db, 'messes', messId);
    const messSnap = await getDoc(messRef);
    if (messSnap.exists()) {
        return { id: messSnap.id, ...messSnap.data() } as Mess;
    }
    return null;
}

export const updateMessName = async (messId: string, newName: string) => {
    if (!db) throw new Error("Firestore not initialized");
    if (!newName.trim()) throw new Error("Mess name cannot be empty.");
    
    const messRef = doc(db, 'messes', messId);
    await updateDoc(messRef, { name: newName.trim() });
};

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

export const onMemberDetailsChange = (messId: string, userId: string, callback: (member: Member | null) => void) => {
    if (!db) throw new Error("Firestore not initialized");
    const memberRef = doc(db, 'messes', messId, 'members', userId);
    
    const unsubscribe = onSnapshot(memberRef, async (memberSnap) => {
        if (memberSnap.exists()) {
            const data = memberSnap.data();
            const userProfile = await getUserProfile(userId);
            const member: Member = {
                id: userId,
                name: data.name || "Unnamed Member",
                role: data.role,
                balance: data.balance ?? 0,
                meals: data.meals ?? 0,
                avatar: userProfile?.photoURL || 'https://placehold.co/40x40.png',
            };
            callback(member);
        } else {
            callback(null);
        }
    });

    return unsubscribe;
};

export const onPendingItemsChange = (messId: string, callback: (count: number) => void) => {
    if (!db) throw new Error("Firestore not initialized");

    const pendingDepositsRef = collection(db, 'messes', messId, 'pendingDeposits');
    const pendingExpensesRef = collection(db, 'messes', messId, 'pendingExpenses');

    let depositCount = 0;
    let expenseCount = 0;

    const updateCount = () => {
        callback(depositCount + expenseCount);
    };

    const unsubDeposits = onSnapshot(pendingDepositsRef, (snapshot) => {
        depositCount = snapshot.size;
        updateCount();
    });

    const unsubExpenses = onSnapshot(pendingExpensesRef, (snapshot) => {
        expenseCount = snapshot.size;
        updateCount();
    });

    return () => {
        unsubDeposits();
        unsubExpenses();
    };
};

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

// Helper to robustly handle date conversion from Firestore
const safeDateToISOString = (dateValue: any): string => {
    if (!dateValue) return new Date().toISOString();
    
    if (typeof dateValue.toDate === 'function') {
        return dateValue.toDate().toISOString(); // It's a Firestore Timestamp
    }
    
    // It's likely a string, number, or Date object already
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
        return date.toISOString();
    }

    return new Date().toISOString(); // Fallback
};


export const getExpenses = async (messId: string, count?: number): Promise<Expense[]> => {
    if (!db) return [];
    const expensesCol = collection(db, 'messes', messId, 'expenses');
    const constraints = [orderBy("date", "desc")];
    if (count) {
        constraints.push(limit(count));
    }
    const snapshot = await getFirestoreDocs(query(expensesCol, ...constraints));
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, date: safeDateToISOString(data.date) } as Expense;
    });
};

export const getDeposits = async (messId: string, count?: number): Promise<Deposit[]> => {
    if (!db) return [];
    const depositsCol = collection(db, 'messes', messId, 'deposits');
    const constraints = [orderBy("date", "desc")];
    if (count) {
        constraints.push(limit(count));
    }
    const snapshot = await getFirestoreDocs(query(depositsCol, ...constraints));
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, date: safeDateToISOString(data.date) } as Deposit;
    });
};

// ---- Managerial Transaction Edits ----

export const getDepositsForUser = async (messId: string, userId: string): Promise<Deposit[]> => {
    if (!db) return [];
    const depositsCol = collection(db, 'messes', messId, 'deposits');
    const q = query(depositsCol, where("userId", "==", userId), orderBy("date", "desc"));
    const snapshot = await getFirestoreDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, date: safeDateToISOString(data.date) } as Deposit;
    });
};

export const getExpensesForUser = async (messId: string, userId: string): Promise<Expense[]> => {
    if (!db) return [];
    const expensesCol = collection(db, 'messes', messId, 'expenses');
    const q = query(expensesCol, where("userId", "==", userId), orderBy("date", "desc"));
    const snapshot = await getFirestoreDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, date: safeDateToISOString(data.date) } as Expense;
    });
};

export const updateDeposit = async (messId: string, deposit: Deposit, newAmount: number) => {
    if (!db) throw new Error("Firestore not initialized");

    await runTransaction(db, async (transaction) => {
        const depositRef = doc(db, 'messes', messId, 'deposits', deposit.id);
        const memberRef = doc(db, 'messes', messId, 'members', deposit.userId);
        const messRef = doc(db, 'messes', messId);
        
        const amountChange = newAmount - deposit.amount;
        
        transaction.update(memberRef, { balance: increment(amountChange) });
        transaction.update(depositRef, { amount: newAmount });
        transaction.update(messRef, { 'summary.totalDeposits': increment(amountChange) });
    });
};

export const deleteDeposit = async (messId: string, deposit: Deposit) => {
    if (!db) throw new Error("Firestore not initialized");

    await runTransaction(db, async (transaction) => {
        const depositRef = doc(db, 'messes', messId, 'deposits', deposit.id);
        const memberRef = doc(db, 'messes', messId, 'members', deposit.userId);
        const messRef = doc(db, 'messes', messId);
        
        transaction.update(memberRef, { balance: increment(-deposit.amount) });
        transaction.delete(depositRef);
        transaction.update(messRef, { 'summary.totalDeposits': increment(-deposit.amount) });
    });
};

export const updateExpense = async (messId: string, expenseId: string, amount: number, description: string) => {
    if (!db) throw new Error("Firestore not initialized");
    
    await runTransaction(db, async (transaction) => {
        const expenseRef = doc(db, 'messes', messId, 'expenses', expenseId);
        const messRef = doc(db, 'messes', messId);
        
        const expenseDoc = await transaction.get(expenseRef);

        if (!expenseDoc.exists()) throw new Error("Expense or Mess not found.");
        
        const oldAmount = expenseDoc.data().amount;
        const amountChange = amount - oldAmount;
        
        transaction.update(expenseRef, { amount, description });
        transaction.update(messRef, { 'summary.totalExpenses': increment(amountChange) });
        await updateMealRateInTransaction(transaction, messRef);
    });
};

export const deleteExpense = async (messId: string, expenseId: string) => {
    if (!db) throw new Error("Firestore not initialized");

     await runTransaction(db, async (transaction) => {
        const expenseRef = doc(db, 'messes', messId, 'expenses', expenseId);
        const messRef = doc(db, 'messes', messId);

        const expenseDoc = await transaction.get(expenseRef);

        if (!expenseDoc.exists()) throw new Error("Expense not found.");
        
        const oldAmount = expenseDoc.data().amount;
        
        transaction.delete(expenseRef);
        transaction.update(messRef, { 'summary.totalExpenses': increment(-oldAmount) });
        await updateMealRateInTransaction(transaction, messRef);
    });
};


// ---- Pending Transactions ----

export const addDeposit = async (messId: string, userId: string, amount: number) => {
    if (!db) throw new Error("Firestore not initialized");
    const user = await getUserProfile(userId);
    const pendingDepositsRef = collection(db, 'messes', messId, 'pendingDeposits');
    await addDoc(pendingDepositsRef, {
        type: 'new',
        amount,
        userId,
        memberName: user?.displayName || "Unknown Member",
        date: serverTimestamp(),
        status: 'pending'
    });
    await createNotification(messId, {
        userId: 'manager',
        message: `${user?.displayName} submitted a new deposit of ৳${amount} for review.`,
        link: '/dashboard/review'
    });
};

export const addExpense = async (messId: string, userId: string, amount: number, description: string, receiptUrl: string | null = null) => {
    if (!db) throw new Error("Firestore not initialized");
    const user = await getUserProfile(userId);
    const pendingExpensesRef = collection(db, 'messes', messId, 'pendingExpenses');
    const expenseData: any = {
        type: 'new',
        amount,
        description,
        userId,
        addedBy: user?.displayName || "Unknown Member",
        date: serverTimestamp(),
        status: 'pending'
    };
    if (receiptUrl) {
        expenseData.receiptUrl = receiptUrl;
    }
    await addDoc(pendingExpensesRef, expenseData);
    await createNotification(messId, {
        userId: 'manager',
        message: `${user?.displayName} submitted a new expense of ৳${amount} for review.`,
        link: '/dashboard/review'
    });
};

export const requestDepositEdit = async (messId: string, deposit: Deposit, newAmount: number) => {
    if (!db) throw new Error("Firestore not initialized");
    const user = await getUserProfile(deposit.userId);
    const pendingDepositsRef = collection(db, 'messes', messId, 'pendingDeposits');
    await addDoc(pendingDepositsRef, {
        type: 'edit',
        originalId: deposit.id,
        originalAmount: deposit.amount,
        amount: newAmount, // The new amount
        userId: deposit.userId,
        memberName: user?.displayName || "Unknown Member",
        date: serverTimestamp(),
        status: 'pending'
    });
    await createNotification(messId, {
        userId: 'manager',
        message: `${user?.displayName} requested to edit a deposit.`,
        link: '/dashboard/review'
    });
};

export const requestDepositDelete = async (messId: string, deposit: Deposit) => {
    if (!db) throw new Error("Firestore not initialized");
    const user = await getUserProfile(deposit.userId);
    const pendingDepositsRef = collection(db, 'messes', messId, 'pendingDeposits');
    await addDoc(pendingDepositsRef, {
        type: 'delete',
        originalId: deposit.id,
        amount: deposit.amount, // The amount to be reversed
        userId: deposit.userId,
        memberName: user?.displayName || "Unknown Member",
        date: serverTimestamp(),
        status: 'pending'
    });
    await createNotification(messId, {
        userId: 'manager',
        message: `${user?.displayName} requested to delete a deposit.`,
        link: '/dashboard/review'
    });
};

export const requestExpenseEdit = async (messId: string, expense: Expense, newAmount: number, newDescription: string) => {
    if (!db) throw new Error("Firestore not initialized");
    const user = await getUserProfile(expense.userId);
    const pendingExpensesRef = collection(db, 'messes', messId, 'pendingExpenses');
    await addDoc(pendingExpensesRef, {
        type: 'edit',
        originalId: expense.id,
        originalData: {
            amount: expense.amount,
            description: expense.description
        },
        amount: newAmount,
        description: newDescription,
        userId: expense.userId,
        addedBy: user?.displayName || "Unknown Member",
        date: serverTimestamp(),
        status: 'pending'
    });
    await createNotification(messId, {
        userId: 'manager',
        message: `${user?.displayName} requested to edit an expense.`,
        link: '/dashboard/review'
    });
};

export const requestExpenseDelete = async (messId: string, expense: Expense) => {
    if (!db) throw new Error("Firestore not initialized");
    const user = await getUserProfile(expense.userId);
    const pendingExpensesRef = collection(db, 'messes', messId, 'pendingExpenses');
    await addDoc(pendingExpensesRef, {
        type: 'delete',
        originalId: expense.id,
        amount: expense.amount,
        description: expense.description,
        userId: expense.userId,
        addedBy: user?.displayName || "Unknown Member",
        date: serverTimestamp(),
        status: 'pending'
    });
    await createNotification(messId, {
        userId: 'manager',
        message: `${user?.displayName} requested to delete an expense.`,
        link: '/dashboard/review'
    });
};

export const getPendingDeposits = async (messId: string): Promise<Deposit[]> => {
    if (!db) return [];
    const depositsCol = collection(db, 'messes', messId, 'pendingDeposits');
    const snapshot = await getFirestoreDocs(query(depositsCol, orderBy("date", "desc")));
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, date: safeDateToISOString(data.date) } as Deposit;
    });
};

export const getPendingExpenses = async (messId: string): Promise<Expense[]> => {
    if (!db) return [];
    const expensesCol = collection(db, 'messes', messId, 'pendingExpenses');
    const snapshot = await getFirestoreDocs(query(expensesCol, orderBy("date", "desc")));
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, date: safeDateToISOString(data.date) } as Expense;
    });
};

export const approveDeposit = async (messId: string, pendingDeposit: Deposit) => {
    if (!db) throw new Error("Firestore not initialized");
    
    await runTransaction(db, async (transaction) => {
        const pendingDepositRef = doc(db, 'messes', messId, 'pendingDeposits', pendingDeposit.id);
        const messRef = doc(db, 'messes', messId);

        const pendingDepositSnap = await transaction.get(pendingDepositRef);
        
        if (!pendingDepositSnap.exists()) {
             console.log("Pending deposit does not exist, likely already processed.");
             return;
        }
        
        const type = pendingDeposit.type || 'new';
        const memberRef = doc(db, 'messes', messId, 'members', pendingDeposit.userId);

        if (type === 'new') {
            const newDepositRef = doc(collection(db!, 'messes', messId, 'deposits'));
            const { id, status, ...finalDepositData } = pendingDeposit;

            transaction.set(newDepositRef, { ...finalDepositData, date: new Date(pendingDeposit.date), status: 'approved', approvedAt: serverTimestamp() });
            transaction.update(memberRef, { balance: increment(pendingDeposit.amount) });
            transaction.update(messRef, { 'summary.totalDeposits': increment(pendingDeposit.amount) });
        
        } else if (type === 'edit') {
            const originalDepositRef = doc(db, 'messes', messId, 'deposits', pendingDeposit.originalId!);
            const originalDepositDoc = await transaction.get(originalDepositRef);
            if (!originalDepositDoc.exists()) throw new Error("Original deposit not found.");
            
            const amountChange = pendingDeposit.amount - originalDepositDoc.data().amount;
            
            transaction.update(originalDepositRef, { amount: pendingDeposit.amount });
            transaction.update(memberRef, { balance: increment(amountChange) });
            transaction.update(messRef, { 'summary.totalDeposits': increment(amountChange) });

        } else if (type === 'delete') {
            const originalDepositRef = doc(db, 'messes', messId, 'deposits', pendingDeposit.originalId!);
            const originalDepositDoc = await transaction.get(originalDepositRef);
            if (!originalDepositDoc.exists()) throw new Error("Original deposit not found.");
            
            const amountToReverse = originalDepositDoc.data().amount;

            transaction.delete(originalDepositRef);
            transaction.update(memberRef, { balance: increment(-amountToReverse) });
            transaction.update(messRef, { 'summary.totalDeposits': increment(-amountToReverse) });
        }
        
        // Always delete the pending request at the end.
        transaction.delete(pendingDepositRef);
    });

    await createNotification(messId, {
        userId: pendingDeposit.userId,
        message: `Your deposit request was approved.`,
        link: '/dashboard'
    });
};

export const rejectDeposit = async (messId: string, depositId: string) => {
    if (!db) throw new Error("Firestore not initialized");
    const depositRef = doc(db, 'messes', messId, 'pendingDeposits', depositId);
    const depositSnap = await getDoc(depositRef);

    if (depositSnap.exists()) {
        const depositData = depositSnap.data();
        await deleteDoc(depositRef);
        await createNotification(messId, {
            userId: depositData.userId,
            message: `Your deposit request was rejected.`
        });
    }
};

const updateMealRateInTransaction = async (transaction: any, messRef: any) => {
    const messDoc = await transaction.get(messRef);
    if (!messDoc.exists()) {
        console.warn("Mess document not found for meal rate calculation.");
        return;
    }
    
    const summary = (messDoc.data() as Mess).summary || { totalExpenses: 0, totalMeals: 0 };
    const newMealRate = (summary.totalMeals ?? 0) > 0 ? (summary.totalExpenses ?? 0) / summary.totalMeals : 0;
    
    transaction.update(messRef, { 'summary.mealRate': newMealRate });
};

export const approveExpense = async (messId: string, pendingExpense: Expense) => {
    if (!db) throw new Error("Firestore not initialized");
    
    await runTransaction(db, async (transaction) => {
        const pendingExpenseRef = doc(db, 'messes', messId, 'pendingExpenses', pendingExpense.id);
        const messRef = doc(db, 'messes', messId);

        const pendingExpenseSnap = await transaction.get(pendingExpenseRef);

        if (!pendingExpenseSnap.exists()) {
            console.log("Pending expense does not exist, likely already processed.");
            return;
        }

        const type = pendingExpense.type || 'new';

        if (type === 'new') {
            const newExpenseRef = doc(collection(db!, 'messes', messId, 'expenses'));
            const { id, status, ...finalExpenseData } = pendingExpense;

            transaction.set(newExpenseRef, { ...finalExpenseData, date: new Date(pendingExpense.date), status: 'approved', approvedAt: serverTimestamp() });
            transaction.update(messRef, { 'summary.totalExpenses': increment(pendingExpense.amount) });
        
        } else if (type === 'edit') {
            const originalExpenseRef = doc(db, 'messes', messId, 'expenses', pendingExpense.originalId!);
            const originalExpenseDoc = await transaction.get(originalExpenseRef);
            if (!originalExpenseDoc.exists()) throw new Error("Original expense not found.");
            
            const oldAmount = originalExpenseDoc.data().amount;
            const amountChange = pendingExpense.amount - oldAmount;
            
            transaction.update(originalExpenseRef, { amount: pendingExpense.amount, description: pendingExpense.description });
            transaction.update(messRef, { 'summary.totalExpenses': increment(amountChange) });

        } else if (type === 'delete') {
            const originalExpenseRef = doc(db, 'messes', messId, 'expenses', pendingExpense.originalId!);
            const originalExpenseDoc = await transaction.get(originalExpenseRef);
            if (!originalExpenseDoc.exists()) throw new Error("Original expense not found.");
            
            const oldAmount = originalExpenseDoc.data().amount;
            
            transaction.delete(originalExpenseRef);
            transaction.update(messRef, { 'summary.totalExpenses': increment(-oldAmount) });
        }
        
        await updateMealRateInTransaction(transaction, messRef);
        transaction.delete(pendingExpenseRef);
    });
    
    await createNotification(messId, {
        userId: pendingExpense.userId,
        message: `Your expense request for "${pendingExpense.description}" was approved.`,
        link: '/dashboard'
    });
};

export const rejectExpense = async (messId: string, expenseId: string) => {
    if (!db) throw new Error("Firestore not initialized");
    const expenseRef = doc(db, 'messes', messId, 'pendingExpenses', expenseId);
    const expenseSnap = await getDoc(expenseRef);
    if(expenseSnap.exists()) {
        const expenseData = expenseSnap.data();
        await deleteDoc(expenseRef);
        await createNotification(messId, {
            userId: expenseData.userId,
            message: `Your expense request for "${expenseData.description}" was rejected.`
        });
    }
};


// ---- Meal Calculation and Management ----

export const logGuestMeal = async (messId: string, hostUserId: string, date: string, guestMeals: { breakfast: number, lunch: number, dinner: number }) => {
    if (!db) throw new Error("Firestore not initialized");

    const hostMemberRef = doc(db, 'messes', messId, 'members', hostUserId);
    const guestLogRef = doc(collection(db, 'messes', messId, 'guestMealLog'));
    const dailyMealDocRef = doc(db, 'messes', messId, 'members', hostUserId, 'meals', date);

    const totalGuestMealsChange = (guestMeals.breakfast || 0) + (guestMeals.lunch || 0) + (guestMeals.dinner || 0);

    if (totalGuestMealsChange <= 0) {
        throw new Error("No guest meals to log.");
    }
    
    const userProfile = await getUserProfile(hostUserId);

    await runTransaction(db, async (transaction) => {
        const messRef = doc(db, 'messes', messId);
        
        transaction.update(hostMemberRef, { meals: increment(totalGuestMealsChange) });
        transaction.set(dailyMealDocRef, {
            guestBreakfast: increment(guestMeals.breakfast || 0),
            guestLunch: increment(guestMeals.lunch || 0),
            guestDinner: increment(guestMeals.dinner || 0),
        }, { merge: true });
        transaction.update(messRef, { 'summary.totalMeals': increment(totalGuestMealsChange) });
        
        await updateMealRateInTransaction(transaction, messRef);
        
        transaction.set(guestLogRef, {
            hostUserId,
            hostUserName: userProfile?.displayName || 'Unknown',
            date,
            loggedAt: serverTimestamp(),
            ...guestMeals
        });
    });

    await createNotification(messId, {
        userId: 'manager',
        message: `${userProfile?.displayName} logged ${totalGuestMealsChange} guest meal(s).`
    });
};

export const updateMealSettings = async (messId: string, settings: MealSettings) => {
    if (!db) throw new Error("Firestore not initialized");
    const messRef = doc(db, 'messes', messId);
    await updateDoc(messRef, { mealSettings: settings });
}

export const getTodaysMealStatus = async (messId: string, userId: string): Promise<MealStatus> => {
    if (!db) throw new Error("Firestore not initialized");
    const todayStr = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    return getMealStatusForDate(messId, userId, todayStr);
}

export const updateMealsForToday = async (messId: string, userId: string, newMeals: MealStatus) => {
    if (!db) throw new Error("Firestore not initialized");
    await updateMealForDate(messId, userId, new Date().toISOString().split('T')[0], { ...newMeals, isSetByUser: true });
};

export const getMealStatusForDate = async (messId: string, userId: string, dateStr: string): Promise<MealStatus> => {
    if (!db) throw new Error("Firestore not initialized");
    const mealDocRef = doc(db, 'messes', messId, 'members', userId, 'meals', dateStr);
    const mealDocSnap = await getDoc(mealDocRef);

    if (mealDocSnap.exists()) {
        const data = mealDocSnap.data();
        return {
            breakfast: data.breakfast ?? 0,
            lunch: data.lunch ?? 0,
            dinner: data.dinner ?? 0,
            isSetByUser: data.isSetByUser ?? false,
            guestBreakfast: data.guestBreakfast ?? 0,
            guestLunch: data.guestLunch ?? 0,
            guestDinner: data.guestDinner ?? 0,
        };
    } else {
        return { breakfast: 0, lunch: 0, dinner: 0, guestBreakfast: 0, guestLunch: 0, guestDinner: 0, isSetByUser: false };
    }
}

export const updateMealForDate = async (messId: string, userId: string, date: string, newMeals: Partial<MealStatus>) => {
    if (!db) throw new Error("Firestore not initialized");

    await runTransaction(db, async (transaction) => {
        const memberRef = doc(db, 'messes', messId, 'members', userId);
        const mealDocRef = doc(db, 'messes', messId, 'members', userId, 'meals', date);
        const messRef = doc(db, 'messes', messId);

        const mealDoc = await transaction.get(mealDocRef);
        
        const oldMealData: MealStatus = mealDoc.exists() ? (mealDoc.data() as MealStatus) : { breakfast: 0, lunch: 0, dinner: 0, guestBreakfast: 0, guestLunch: 0, guestDinner: 0, isSetByUser: false };
        
        const oldPersonalMeals = (oldMealData.breakfast || 0) + (oldMealData.lunch || 0) + (oldMealData.dinner || 0);
        const newPersonalMeals = (newMeals.breakfast ?? oldMealData.breakfast ?? 0) + (newMeals.lunch ?? oldMealData.lunch ?? 0) + (newMeals.dinner ?? oldMealData.dinner ?? 0);
        
        const oldGuestMeals = (oldMealData.guestBreakfast || 0) + (oldMealData.guestLunch || 0) + (oldMealData.guestDinner || 0);
        const newGuestMeals = (newMeals.guestBreakfast ?? oldMealData.guestBreakfast ?? 0) + (newMeals.guestLunch ?? oldMealData.guestLunch ?? 0) + (newMeals.guestDinner ?? oldMealData.guestDinner ?? 0);
        
        const totalMealChange = (newPersonalMeals + newGuestMeals) - (oldPersonalMeals + oldGuestMeals);

        if (totalMealChange !== 0) {
            transaction.update(memberRef, { meals: increment(totalMealChange) });
            transaction.update(messRef, { 'summary.totalMeals': increment(totalMealChange) });
            await updateMealRateInTransaction(transaction, messRef);
        }
        
        transaction.set(mealDocRef, newMeals, { merge: true });
    });
};

export const getMealLedgerForUser = async (messId: string, userId: string, days: number = 30): Promise<MealLedgerEntry[]> => {
    if (!db) throw new Error("Firestore not initialized");
    
    const mealsColRef = collection(db, 'messes', messId, 'members', userId, 'meals');
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);
    const dateLimitStr = dateLimit.toISOString().split('T')[0];

    const q = query(mealsColRef, where(documentId(), ">=", dateLimitStr));
    const querySnapshot = await getFirestoreDocs(q);
    
    const ledger = querySnapshot.docs.map(doc => ({
        date: doc.id,
        ...(doc.data() as MealStatus)
    }));

    // Sort client-side to avoid needing a composite index
    ledger.sort((a, b) => b.date.localeCompare(a.date));

    return ledger;
}

export const getMealHistoryForMess = async (messId: string, days: number = 7): Promise<MessMealHistoryEntry[]> => {
    if (!db) throw new Error("Firestore not initialized");

    const members = await getMembersOfMess(messId);
    if (!members.length) {
        return [];
    }

    const allHistoryPromises = members.map(async (member) => {
        const memberLedger = await getMealLedgerForUser(messId, member.id, days);
        return memberLedger.map(entry => ({
            ...entry,
            memberId: member.id,
            memberName: member.name,
        }));
    });

    const nestedHistory = await Promise.all(allHistoryPromises);
    const flatHistory = nestedHistory.flat();
    
    flatHistory.sort((a, b) => {
        if (a.date > b.date) return -1;
        if (a.date < b.date) return 1;
        if (a.memberName < b.memberName) return -1;
        if (a.memberName > b.memberName) return 1;
        return 0;
    });

    return flatHistory;
}


export const ensureDailyMealDocs = async (messId: string) => {
    if (!db) throw new Error("Firestore not initialized");

    const todayStr = new Date().toISOString().split('T')[0];
    
    // Get member references OUTSIDE the transaction, as queries are not allowed inside.
    const membersRef = collection(db, 'messes', messId, 'members');
    const membersQuerySnap = await getFirestoreDocs(query(membersRef));
    const memberDocs = membersQuerySnap.docs;

    if (memberDocs.length === 0) {
        return; // No members to process, exit early.
    }

    await runTransaction(db, async (transaction) => {
        const messRef = doc(db, 'messes', messId);
        
        const messDoc = await transaction.get(messRef);
        
        if(!messDoc.exists()) throw new Error("Mess not found");
        
        const messData = messDoc.data() as Mess;

        // Read meal docs for each member INSIDE the transaction using their specific refs.
        const mealDocRefs = memberDocs.map(memberDoc => doc(db, 'messes', messId, 'members', memberDoc.id, 'meals', todayStr));
        const mealDocsSnaps = await Promise.all(mealDocRefs.map(ref => transaction.get(ref)));

        let totalDefaultMealsAdded = 0;

        memberDocs.forEach((memberDocSnap, index) => {
            const mealDoc = mealDocsSnaps[index];
            if (!mealDoc.exists()) {
                const defaultStatus: MealStatus = {
                    breakfast: messData?.mealSettings?.isBreakfastOn ? 1 : 0,
                    lunch: messData?.mealSettings?.isLunchOn ? 1 : 0,
                    dinner: messData?.mealSettings?.isDinnerOn ? 1 : 0,
                    isSetByUser: false,
                    guestBreakfast: 0,
                    guestLunch: 0,
                    guestDinner: 0,
                };
                const mealTotal = (defaultStatus.breakfast || 0) + (defaultStatus.lunch || 0) + (defaultStatus.dinner || 0);
                
                if (mealTotal > 0) {
                    // Use the reference from the snapshot we fetched before the transaction
                    transaction.update(memberDocSnap.ref, { meals: increment(mealTotal) });
                    totalDefaultMealsAdded += mealTotal;
                }
                
                // Use the ref we created for the read
                transaction.set(mealDocRefs[index], defaultStatus);
            }
        });

        if (totalDefaultMealsAdded > 0) {
            transaction.update(messRef, { 'summary.totalMeals': increment(totalDefaultMealsAdded) });
            await updateMealRateInTransaction(transaction, messRef);
        }
    });
};

export const transferManagerRole = async (messId: string, currentManagerId: string, newManagerId: string) => {
    if (!db) throw new Error("Firestore not initialized");

    await runTransaction(db, async (transaction) => {
        const messRef = doc(db, 'messes', messId);
        const oldManagerMemberRef = doc(db, 'messes', messId, 'members', currentManagerId);
        const newManagerMemberRef = doc(db, 'messes', messId, 'members', newManagerId);
        const oldManagerUserRef = doc(db, 'users', currentManagerId);
        const newManagerUserRef = doc(db, 'users', newManagerId);

        // Verify old manager is actually the manager
        const messDoc = await transaction.get(messRef);
        if (!messDoc.exists() || messDoc.data().managerId !== currentManagerId) {
            throw new Error("You are not the manager of this mess or the mess does not exist.");
        }

        // Update mess document
        transaction.update(messRef, { managerId: newManagerId });

        // Update roles in members subcollection
        transaction.update(oldManagerMemberRef, { role: 'member' });
        transaction.update(newManagerMemberRef, { role: 'manager' });

        // Update roles in users collection
        transaction.update(oldManagerUserRef, { role: 'member' });
        transaction.update(newManagerUserRef, { role: 'manager' });
    });

    // Send notifications after transaction succeeds
    await createNotification(messId, {
        userId: newManagerId,
        message: "You have been made the new manager of the mess.",
        link: '/dashboard/settings'
    });
    await createNotification(messId, {
        userId: currentManagerId,
        message: "Your manager role has been transferred. You are now a member.",
        link: '/dashboard/settings'
    });
};

export const removeMemberFromMess = async (messId: string, memberId: string) => {
    if (!db) throw new Error("Firestore not initialized");

    await runTransaction(db, async (transaction) => {
        const memberRef = doc(db, 'messes', messId, 'members', memberId);
        const userRef = doc(db, 'users', memberId);

        const [memberDoc, userDoc] = await Promise.all([
            transaction.get(memberRef),
            transaction.get(userRef)
        ]);
        
        if (!memberDoc.exists()) {
            return;
        }
        
        const memberData = memberDoc.data();
        if (memberData.role === 'manager') {
            throw new Error("A manager cannot be removed. Transfer the role first.");
        }

        if (userDoc.exists()) {
            transaction.update(userRef, { messId: '', role: '' });
        }
        transaction.delete(memberRef);
    });
};

export const deleteMess = async (messId: string) => {
    if (!db || !auth?.currentUser) throw new Error("Authentication required.");

    const batch = writeBatch(db);
    const messRef = doc(db, 'messes', messId);

    // Verify the user is the manager
    const messSnap = await getDoc(messRef);
    if (!messSnap.exists() || messSnap.data().managerId !== auth.currentUser.uid) {
        throw new Error("You are not authorized to delete this mess.");
    }

    // 1. Get all members to update their user profiles and delete their subcollections
    const membersColRef = collection(db, 'messes', messId, 'members');
    const membersSnap = await getFirestoreDocs(membersColRef);
    for (const memberDoc of membersSnap.docs) {
        const memberId = memberDoc.id;
        
        // Delete member's 'meals' subcollection documents
        const mealsColRef = collection(db, 'messes', messId, 'members', memberId, 'meals');
        const mealsSnap = await getFirestoreDocs(mealsColRef);
        mealsSnap.docs.forEach(doc => batch.delete(doc.ref));

        // Delete the member document itself from the 'members' subcollection
        batch.delete(memberDoc.ref);
        
        // Update the user's main profile in the 'users' collection to clear mess details
        const userRef = doc(db, 'users', memberId);
        batch.update(userRef, { messId: '', role: '' });
    }

    // 2. Delete documents in other top-level subcollections
    const subcollectionsToDelete = [
        'expenses',
        'deposits',
        'pendingExpenses',
        'pendingDeposits',
        'notifications',
        'guestMealLog'
    ];

    for (const subcol of subcollectionsToDelete) {
        const subcolRef = collection(db, 'messes', messId, subcol);
        const subcolSnap = await getFirestoreDocs(subcolRef);
        subcolSnap.docs.forEach(doc => batch.delete(doc.ref));
    }

    // 3. Finally, delete the mess document itself
    batch.delete(messRef);

    // 4. Commit the entire batch
    await batch.commit();
};


// --- Reporting ---

const getExpensesForMonth = async (messId: string, year: number, month: number): Promise<Expense[]> => {
    if (!db) return [];
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);

    const expensesCol = collection(db, 'messes', messId, 'expenses');
    const q = query(expensesCol, where("date", ">=", Timestamp.fromDate(startDate)), where("date", "<=", Timestamp.fromDate(endDate)));
    const snapshot = await getFirestoreDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, date: safeDateToISOString(data.date) } as Expense;
    });
};

const getDepositsForMonth = async (messId: string, year: number, month: number): Promise<Deposit[]> => {
    if (!db) return [];
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);

    const depositsCol = collection(db, 'messes', messId, 'deposits');
    const q = query(depositsCol, where("date", ">=", Timestamp.fromDate(startDate)), where("date", "<=", Timestamp.fromDate(endDate)));
    const snapshot = await getFirestoreDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, date: safeDateToISOString(data.date) } as Deposit;
    });
};

const getMealsForMonth = async (messId: string, memberId: string, year: number, month: number): Promise<{personalMeals: number, guestMeals: number}> => {
    if (!db) return { personalMeals: 0, guestMeals: 0 };
    
    const monthStr = `${year}-${(month + 1).toString().padStart(2, '0')}`; // YYYY-MM
    const mealsColRef = collection(db, 'messes', messId, 'members', memberId, 'meals');
    const q = query(mealsColRef, where(documentId(), ">=", monthStr + '-01'), where(documentId(), "<=", monthStr + '-31'));
    const querySnapshot = await getFirestoreDocs(q);
    
    let totalPersonalMeals = 0;
    let totalGuestMeals = 0;

    querySnapshot.forEach(doc => {
        const data = doc.data() as MealStatus;
        totalPersonalMeals += (data.breakfast || 0) + (data.lunch || 0) + (data.dinner || 0);
        totalGuestMeals += (data.guestBreakfast || 0) + (data.guestLunch || 0) + (data.guestDinner || 0);
    });

    return { personalMeals: totalPersonalMeals, guestMeals: totalGuestMeals };
}


export const generateMonthlyReport = async (messId: string, year: number, month: number): Promise<MonthlyReport> => {
    if (!db) throw new Error("Firestore not initialized");
    
    // Caching layer for reports
    const reportId = `${messId}_${year}_${month}`;
    const reportRef = doc(db, 'monthlyReports', reportId);
    const reportSnap = await getDoc(reportRef);
    
    if (reportSnap.exists()) {
        console.log("Serving cached report for", reportId);
        return reportSnap.data() as MonthlyReport;
    }
    
    console.log("Generating new report for", reportId);

    const [members, expenses, deposits] = await Promise.all([
        getMembersOfMess(messId),
        getExpensesForMonth(messId, year, month),
        getDepositsForMonth(messId, year, month),
    ]);

    const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
    const totalDeposits = deposits.reduce((sum, item) => sum + item.amount, 0);
    
    const mealPromises = members.map(member => getMealsForMonth(messId, member.id, year, month));
    const memberMeals = await Promise.all(mealPromises);
    
    const memberData = members.map((member, index) => {
        const { personalMeals, guestMeals } = memberMeals[index];
        return {
            ...member,
            monthlyPersonalMeals: personalMeals,
            monthlyGuestMeals: guestMeals,
            monthlyTotalMeals: personalMeals + guestMeals,
            monthlyDeposits: deposits.filter(d => d.userId === member.id).reduce((sum, item) => sum + item.amount, 0)
        }
    });

    const totalMeals = memberData.reduce((sum, member) => sum + member.monthlyTotalMeals, 0);
    const mealRate = totalMeals > 0 ? totalExpenses / totalMeals : 0;
    
    const memberReports: MemberReport[] = memberData.map(member => {
        const mealCost = member.monthlyTotalMeals * mealRate;
        const finalBalance = member.monthlyDeposits - mealCost;

        return {
            memberId: member.id,
            memberName: member.name,
            avatar: member.avatar,
            totalMeals: member.monthlyTotalMeals,
            totalGuestMeals: member.monthlyGuestMeals,
            mealCost,
            totalDeposits: member.monthlyDeposits,
            finalBalance,
        };
    });
    
    const finalReport: MonthlyReport = {
        month: new Date(year, month).toLocaleString('default', { month: 'long' }),
        year,
        totalExpenses,
        totalDeposits,
        totalMeals,
        mealRate,
        memberReports,
        expenses,
        deposits,
    };

    // Save the generated report to the cache
    await setDoc(reportRef, finalReport);

    return finalReport;
};
