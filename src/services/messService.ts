
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
  writeBatch,
  onSnapshot,
  orderBy
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

export interface MealSettings {
    breakfastCutoff: string; // "HH:mm"
    lunchCutoff: string;
    dinnerCutoff: string;
    isBreakfastOn: boolean;
    isLunchOn: boolean;
    isDinnerOn: boolean;
}

export interface MealStatus {
    breakfast: number;
    lunch: number;
    dinner: number;
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

    const notificationsRef = collection(db, 'messes', messId, 'notifications');
    let personalNotifications: Notification[] = [];
    let managerNotifications: Notification[] = [];
    const unsubscribes: (() => void)[] = [];

    const combineAndCallback = () => {
        // Combine, sort by timestamp descending, and take the most recent 20
        const allNotifications = [...personalNotifications, ...managerNotifications];
        allNotifications.sort((a, b) => {
            const timeA = a.timestamp?.toMillis() || 0;
            const timeB = b.timestamp?.toMillis() || 0;
            return timeB - timeA;
        });
        callback(allNotifications.slice(0, 20));
    };

    // Listener for personal notifications
    const personalQuery = query(notificationsRef, where('userId', '==', userId));
    const personalUnsubscribe = onSnapshot(personalQuery, (snapshot) => {
        personalNotifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp as Timestamp
        })) as Notification[];
        combineAndCallback();
    }, (error) => {
        console.error("Error fetching personal notifications:", error);
    });
    unsubscribes.push(personalUnsubscribe);

    // If the user is a manager, also listen for manager-wide notifications
    if (role === 'manager') {
        const managerQuery = query(notificationsRef, where('userId', '==', 'manager'));
        const managerUnsubscribe = onSnapshot(managerQuery, (snapshot) => {
            managerNotifications = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp as Timestamp
            })) as Notification[];
            combineAndCallback();
        }, (error) => {
            console.error("Error fetching manager notifications:", error);
        });
        unsubscribes.push(managerUnsubscribe);
    }
    
    // Return a single function that unsubscribes from all listeners
    return () => {
        unsubscribes.forEach(unsub => unsub());
    };
}


export const markNotificationsAsRead = async (messId: string, notificationIds: string[]) => {
    if (!db || notificationIds.length === 0) return;
    try {
        const batch = writeBatch(db);
        notificationIds.forEach(id => {
            const notifRef = doc(db, 'messes', messId, 'notifications', id);
            batch.update(notifRef, { read: true });
        });
        await batch.commit();
    } catch (error) {
        console.error("Error marking notifications as read:", error);
    }
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
  const messRef = doc(collection(db, 'messes'));

  // 1. Create the mess document with default meal settings
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

export const getMessById = async (messId: string) => {
    if (!db) throw new Error("Firestore not initialized");
    const messRef = doc(db, 'messes', messId);
    const messSnap = await getDoc(messRef);
    if (messSnap.exists()) {
        const data = messSnap.data();
        return { 
            id: messSnap.id, 
            ...data,
            mealSettings: data.mealSettings as MealSettings | undefined
        };
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

export const getExpenses = async (messId: string): Promise<Expense[]> => {
    if (!db) return [];
    const expensesCol = collection(db, 'messes', messId, 'expenses');
    const snapshot = await getFirestoreDocs(query(expensesCol, orderBy("date", "desc")));
    return snapshot.docs.map(doc => {
        const data = doc.data();
        const date = (data.date as Timestamp).toDate().toISOString();
        return { id: doc.id, ...data, date } as Expense;
    });
};

export const getDeposits = async (messId: string): Promise<Deposit[]> => {
    if (!db) return [];
    const depositsCol = collection(db, 'messes', messId, 'deposits');
    const snapshot = await getFirestoreDocs(query(depositsCol, orderBy("date", "desc")));
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
    await createNotification(messId, {
        userId: 'manager',
        message: `${user?.displayName} submitted a new deposit of ৳${amount} for review.`,
        link: '/dashboard/review'
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
    await createNotification(messId, {
        userId: 'manager',
        message: `${user?.displayName} submitted a new expense of ৳${amount} for review.`,
        link: '/dashboard/review'
    });
};

export const getPendingDeposits = async (messId: string): Promise<Deposit[]> => {
    if (!db) return [];
    const depositsCol = collection(db, 'messes', messId, 'pendingDeposits');
    const snapshot = await getFirestoreDocs(query(depositsCol, orderBy("date", "desc")));
    return snapshot.docs.map(doc => {
        const data = doc.data();
        const date = (data.date as Timestamp)?.toDate().toISOString() || new Date().toISOString();
        return { id: doc.id, ...data, date } as Deposit;
    });
};

export const getPendingExpenses = async (messId: string): Promise<Expense[]> => {
    if (!db) return [];
    const expensesCol = collection(db, 'messes', messId, 'pendingExpenses');
    const snapshot = await getFirestoreDocs(query(expensesCol, orderBy("date", "desc")));
    return snapshot.docs.map(doc => {
        const data = doc.data();
        const date = (data.date as Timestamp)?.toDate().toISOString() || new Date().toISOString();
        return { id: doc.id, ...data, date } as Expense;
    });
};

export const approveDeposit = async (messId: string, depositId: string) => {
    if (!db) throw new Error("Firestore not initialized");
    const pendingDepositRef = doc(db, 'messes', messId, 'pendingDeposits', depositId);
    let pendingData: any = null;

    await runTransaction(db, async (transaction) => {
        const pendingDoc = await transaction.get(pendingDepositRef);
        if (!pendingDoc.exists()) {
            throw "Pending deposit document does not exist!";
        }

        pendingData = pendingDoc.data();
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

    if (pendingData) {
        await createNotification(messId, {
            userId: pendingData.userId,
            message: `Your deposit of ৳${pendingData.amount.toFixed(2)} was approved.`,
            link: '/dashboard'
        });
    }
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
            message: `Your deposit of ৳${depositData.amount.toFixed(2)} was rejected.`
        });
    }
};

export const approveExpense = async (messId: string, expenseId: string) => {
    if (!db) throw new Error("Firestore not initialized");
    const pendingExpenseRef = doc(db, 'messes', messId, 'pendingExpenses', expenseId);
    let pendingData: any = null;
    
    await runTransaction(db, async (transaction) => {
        const pendingDoc = await transaction.get(pendingExpenseRef);
        if (!pendingDoc.exists()) {
            throw "Pending expense document does not exist!";
        }
        
        pendingData = pendingDoc.data();
        const newExpenseRef = doc(collection(db, 'messes', messId, 'expenses'));
        transaction.set(newExpenseRef, {
            ...pendingData,
            status: 'approved',
            approvedAt: serverTimestamp(),
        });
        
        transaction.delete(pendingExpenseRef);
    });

    if (pendingData) {
        await createNotification(messId, {
            userId: pendingData.userId,
            message: `Your expense for "${pendingData.description}" (৳${pendingData.amount.toFixed(2)}) was approved.`,
            link: '/dashboard'
        });
    }
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
            message: `Your expense for "${expenseData.description}" was rejected.`
        });
    }
};


// ---- Meal Calculation and Management ----

export const getTotalMessMeals = async (messId: string): Promise<number> => {
    if (!db) return 0;
    const membersColRef = collection(db, 'messes', messId, 'members');
    const membersSnap = await getFirestoreDocs(membersColRef);

    if (membersSnap.empty) {
        return 0;
    }

    let totalMeals = 0;
    membersSnap.docs.forEach(doc => {
        totalMeals += doc.data().meals || 0;
    });

    return totalMeals;
};

export const updateMealSettings = async (messId: string, settings: MealSettings) => {
    if (!db) throw new Error("Firestore not initialized");
    const messRef = doc(db, 'messes', messId);
    await updateDoc(messRef, { mealSettings: settings });
}

export const getTodaysMealStatus = async (messId: string, userId: string): Promise<MealStatus> => {
    if (!db) throw new Error("Firestore not initialized");
    const todayStr = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    const mealDocRef = doc(db, 'messes', messId, 'members', userId, 'meals', todayStr);
    const mealDocSnap = await getDoc(mealDocRef);

    if (mealDocSnap.exists()) {
        return mealDocSnap.data() as MealStatus;
    } else {
        // Doc doesn't exist for today, create it with defaults and return them
        const defaultStatus: MealStatus = { breakfast: 0, lunch: 0, dinner: 0 };
        // Don't auto-create here, let ensureDailyMealDocs handle it.
        return defaultStatus;
    }
}

export const updateMealForToday = async (messId: string, userId: string, meal: keyof MealStatus, newCount: number) => {
    if (!db) throw new Error("Firestore not initialized");

    const todayStr = new Date().toISOString().split('T')[0];
    const memberRef = doc(db, 'messes', messId, 'members', userId);
    const mealDocRef = doc(db, 'messes', messId, 'members', userId, 'meals', todayStr);

    await runTransaction(db, async (transaction) => {
        const mealDoc = await transaction.get(mealDocRef);
        const memberDoc = await transaction.get(memberRef);

        if (!memberDoc.exists()) {
            throw `Member with ID ${userId} not found in mess ${messId}`;
        }
        
        let currentCount = 0;
        if (mealDoc.exists()) {
            currentCount = mealDoc.data()[meal] || 0;
        }

        if (currentCount === newCount) {
            return; // No change needed
        }

        const mealCountChange = newCount - currentCount;
        const currentTotalMeals = memberDoc.data().meals || 0;
        const newTotalMeals = currentTotalMeals + mealCountChange;

        // Update member's total meal count
        transaction.update(memberRef, { meals: newTotalMeals });

        // Update today's meal status document
        transaction.set(mealDocRef, { [meal]: newCount }, { merge: true });
    });
};

export const getMealStatusForDate = async (messId: string, userId: string, dateStr: string): Promise<MealStatus> => {
    if (!db) throw new Error("Firestore not initialized");
    const mealDocRef = doc(db, 'messes', messId, 'members', userId, 'meals', dateStr);
    const mealDocSnap = await getDoc(mealDocRef);

    if (mealDocSnap.exists()) {
        return mealDocSnap.data() as MealStatus;
    } else {
        return { breakfast: 0, lunch: 0, dinner: 0 };
    }
}

export const updateMealForDate = async (messId: string, userId: string, date: string, newMeals: MealStatus) => {
    if (!db) throw new Error("Firestore not initialized");

    const memberRef = doc(db, 'messes', messId, 'members', userId);
    const mealDocRef = doc(db, 'messes', messId, 'members', userId, 'meals', date);

    await runTransaction(db, async (transaction) => {
        const mealDoc = await transaction.get(mealDocRef);
        const memberDoc = await transaction.get(memberRef);

        if (!memberDoc.exists()) {
            throw `Member with ID ${userId} not found in mess ${messId}`;
        }
        
        let oldMeals: MealStatus = { breakfast: 0, lunch: 0, dinner: 0 };
        if (mealDoc.exists()) {
            oldMeals = mealDoc.data() as MealStatus;
        }

        const breakfastDiff = newMeals.breakfast - oldMeals.breakfast;
        const lunchDiff = newMeals.lunch - oldMeals.lunch;
        const dinnerDiff = newMeals.dinner - oldMeals.dinner;
        const totalMealDiff = breakfastDiff + lunchDiff + dinnerDiff;

        if (totalMealDiff === 0) {
            return; // No change needed
        }

        const currentTotalMeals = memberDoc.data().meals || 0;
        const newTotalMeals = currentTotalMeals + totalMealDiff;

        // Update member's total meal count
        transaction.update(memberRef, { meals: newTotalMeals });

        // Update the meal status document for the specified date
        transaction.set(mealDocRef, newMeals, { merge: true });
    });
};

export const getMealLedgerForUser = async (messId: string, userId: string, days: number = 30): Promise<MealLedgerEntry[]> => {
    if (!db) throw new Error("Firestore not initialized");
    
    const mealsColRef = collection(db, 'messes', messId, 'members', userId, 'meals');

    // Calculate the date `days` ago to create a start bound for the query
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days -1));
    const startDateString = startDate.toISOString().split('T')[0];
    
    const q = query(mealsColRef, where('__name__', '>=', startDateString));
    const querySnapshot = await getFirestoreDocs(q);

    const ledger: MealLedgerEntry[] = [];
    querySnapshot.forEach(doc => {
        ledger.push({
            date: doc.id,
            ...(doc.data() as MealStatus)
        });
    });

    // Sort by date descending on the client side
    ledger.sort((a, b) => b.date.localeCompare(a.date));

    return ledger.slice(0, days);
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
    
    // Sort by date (most recent first), then by member name
    flatHistory.sort((a, b) => {
        if (a.date > b.date) return -1;
        if (a.date < b.date) return 1;
        if (a.memberName < b.memberName) return -1;
        if (a.memberName > b.memberName) return 1;
        return 0;
    });

    return flatHistory;
}


export const getTodaysMealStatusesForMess = async (messId: string): Promise<Record<string, MealStatus>> => {
    if (!db) throw new Error("Firestore not initialized");
    const todayStr = new Date().toISOString().split('T')[0];
    const membersRef = collection(db, 'messes', messId, 'members');
    const membersSnap = await getFirestoreDocs(membersRef);
    
    const statuses: Record<string, MealStatus> = {};
    
    await Promise.all(membersSnap.docs.map(async (memberDoc) => {
        const userId = memberDoc.id;
        const mealDocRef = doc(db, 'messes', messId, 'members', userId, 'meals', todayStr);
        const mealDocSnap = await getDoc(mealDocRef);
        
        if (mealDocSnap.exists()) {
            statuses[userId] = mealDocSnap.data() as MealStatus;
        } else {
            // Defaulting to 0 for each meal if document doesn't exist
            statuses[userId] = { breakfast: 0, lunch: 0, dinner: 0 };
        }
    }));

    return statuses;
}

export const ensureDailyMealDocs = async (messId: string) => {
    if (!db) throw new Error("Firestore not initialized");

    const todayStr = new Date().toISOString().split('T')[0];
    const membersRef = collection(db, 'messes', messId, 'members');
    const membersSnap = await getFirestoreDocs(membersRef);

    const batch = writeBatch(db);
    let writes = 0;

    const mealDocPromises = membersSnap.docs.map(memberDoc => {
        const mealDocRef = doc(db, 'messes', messId, 'members', memberDoc.id, 'meals', todayStr);
        return getDoc(mealDocRef);
    });

    const mealDocSnaps = await Promise.all(mealDocPromises);
    
    mealDocSnaps.forEach((mealDocSnap, index) => {
        if (!mealDocSnap.exists()) {
            const mealDocRef = doc(db, 'messes', messId, 'members', membersSnap.docs[index].id, 'meals', todayStr);
            batch.set(mealDocRef, {
                breakfast: 0,
                lunch: 0,
                dinner: 0,
            });
            writes++;
        }
    });
    
    if (writes > 0) {
        await batch.commit();
    }
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

        const memberDoc = await transaction.get(memberRef);
        if (memberDoc.exists() && memberDoc.data().role === 'manager') {
            throw new Error("A manager cannot be removed. Transfer the role first.");
        }

        if (memberDoc.exists()) {
            transaction.delete(memberRef);
        }

        const userDoc = await transaction.get(userRef);
        if (userDoc.exists()) {
            transaction.update(userRef, { messId: '', role: '' });
        }
    });
};
