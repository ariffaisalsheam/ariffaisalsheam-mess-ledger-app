





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
}

export interface MealStatus {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
}

export interface MealLedgerEntry extends MealStatus {
    date: string; // "YYYY-MM-DD"
}

export interface MessMealHistoryEntry extends MealLedgerEntry {
    memberName: string;
    memberId: string;
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
  
  // 4. Create today's meal doc for the new manager
  const today = new Date().toISOString().split('T')[0];
  const mealDocRef = doc(db, 'messes', messRef.id, 'members', user.uid, 'meals', today);
  batch.set(mealDocRef, {
      breakfast: true,
      lunch: true,
      dinner: true,
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
    
    // Create today's meal doc for the joining member
    const today = new Date().toISOString().split('T')[0];
    const mealDocRef = doc(db, 'messes', messId, 'members', user.uid, 'meals', today);
    batch.set(mealDocRef, {
        breakfast: true,
        lunch: true,
        dinner: true,
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
        const defaultStatus: MealStatus = { breakfast: true, lunch: true, dinner: true };
        await setDoc(mealDocRef, defaultStatus);
        return defaultStatus;
    }
}

export const updateMealForToday = async (messId: string, userId: string, meal: keyof MealStatus, newStatus: boolean) => {
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
        
        // Ensure meal doc exists before trying to read from it
        let currentStatus = false;
        if (mealDoc.exists()) {
            currentStatus = mealDoc.data()[meal] as boolean;
        } else {
            // If doc doesn't exist, we assume the meal was off if new status is on,
            // and on if new status is off to calculate the delta.
            // A better approach is to rely on ensureDailyMealDocs creating the doc first.
            // For simplicity, we assume default is false if doc not found.
        }

        if (currentStatus === newStatus) {
            return; // No change needed
        }

        const mealCountChange = newStatus ? 1 : -1;
        const currentTotalMeals = memberDoc.data().meals || 0;
        const newTotalMeals = currentTotalMeals + mealCountChange;

        // Update member's total meal count
        transaction.update(memberRef, { meals: newTotalMeals });

        // Update today's meal status document
        transaction.set(mealDocRef, { [meal]: newStatus }, { merge: true });
    });
};

export const getMealLedgerForUser = async (messId: string, userId: string, days: number = 30): Promise<MealLedgerEntry[]> => {
    if (!db) throw new Error("Firestore not initialized");
    
    const mealsColRef = collection(db, 'messes', messId, 'members', userId, 'meals');
    const q = query(mealsColRef, orderBy('__name__', 'asc'));
    const querySnapshot = await getFirestoreDocs(q);

    const ledger: MealLedgerEntry[] = [];
    querySnapshot.forEach(doc => {
        ledger.push({
            date: doc.id,
            ...(doc.data() as MealStatus)
        });
    });

    return ledger.slice(-days).reverse();
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
            statuses[userId] = { breakfast: true, lunch: true, dinner: true };
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
            const memberDoc = membersSnap.docs[index];
            const mealDocRef = doc(db, 'messes', messId, 'members', memberDoc.id, 'meals', todayStr);
            batch.set(mealDocRef, {
                breakfast: true,
                lunch: true,
                dinner: true,
            });
            writes++;
        }
    });
    
    if (writes > 0) {
        await batch.commit();
    }
};
