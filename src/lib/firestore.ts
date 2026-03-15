import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';

export interface Transaction {
  id?: string;
  userId: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
  notes?: string;
  paymentMethod?: string;
  source?: string;
  tags?: string[];
  workspace?: 'personal' | 'family';
  familyMember?: string;
  createdAt: any;
}

export const addTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, 'transactions'), {
      ...transaction,
      workspace: transaction.workspace || 'personal',
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding transaction: ", error);
    throw error;
  }
};

export const updateTransaction = async (id: string, data: Partial<Transaction>) => {
  try {
    const docRef = doc(db, 'transactions', id);
    await updateDoc(docRef, data);
  } catch (error) {
    console.error("Error updating transaction: ", error);
    throw error;
  }
};

export const deleteTransaction = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'transactions', id));
  } catch (error) {
    console.error("Error deleting transaction: ", error);
    throw error;
  }
};

export const subscribeToTransactions = (userId: string, workspace: 'personal' | 'family', callback: (transactions: Transaction[]) => void) => {
  const q = query(
    collection(db, 'transactions'),
    where('userId', '==', userId)
  );

  return onSnapshot(q, (snapshot) => {
    const transactions: Transaction[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const docWorkspace = data.workspace || 'personal';
      if (docWorkspace === workspace) {
        transactions.push({ id: doc.id, ...data } as Transaction);
      }
    });
    
    // Sort client-side to avoid requiring a composite index
    transactions.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
    });
    
    callback(transactions);
  }, (error) => {
    console.error("Error fetching transactions: ", error);
  });
};

export interface Budget {
  id?: string;
  userId: string;
  category: string;
  amount: number;
  month: string;
  workspace?: 'personal' | 'family';
  createdAt: any;
}

export const addBudget = async (budget: Omit<Budget, 'id' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, 'budgets'), {
      ...budget,
      workspace: budget.workspace || 'personal',
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding budget: ", error);
    throw error;
  }
};

export const deleteBudget = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'budgets', id));
  } catch (error) {
    console.error("Error deleting budget: ", error);
    throw error;
  }
};

export const subscribeToBudgets = (userId: string, workspace: 'personal' | 'family', callback: (budgets: Budget[]) => void) => {
  const q = query(
    collection(db, 'budgets'),
    where('userId', '==', userId)
  );

  return onSnapshot(q, (snapshot) => {
    const budgets: Budget[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const docWorkspace = data.workspace || 'personal';
      if (docWorkspace === workspace) {
        budgets.push({ id: doc.id, ...data } as Budget);
      }
    });

    // Sort client-side to avoid requiring a composite index
    budgets.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });

    callback(budgets);
  }, (error) => {
    console.error("Error fetching budgets: ", error);
  });
};

export interface Investment {
  id?: string;
  userId: string;
  symbol: string;
  type: string;
  amount: number;
  purchasePrice: number;
  workspace?: 'personal' | 'family';
  createdAt: any;
}

export const addInvestment = async (investment: Omit<Investment, 'id' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, 'investments'), {
      ...investment,
      workspace: investment.workspace || 'personal',
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding investment: ", error);
    throw error;
  }
};

export const deleteInvestment = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'investments', id));
  } catch (error) {
    console.error("Error deleting investment: ", error);
    throw error;
  }
};

export const subscribeToInvestments = (userId: string, workspace: 'personal' | 'family', callback: (investments: Investment[]) => void) => {
  const q = query(
    collection(db, 'investments'),
    where('userId', '==', userId)
  );

  return onSnapshot(q, (snapshot) => {
    const investments: Investment[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const docWorkspace = data.workspace || 'personal';
      if (docWorkspace === workspace) {
        investments.push({ id: doc.id, ...data } as Investment);
      }
    });

    // Sort client-side to avoid requiring a composite index
    investments.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });

    callback(investments);
  }, (error) => {
    console.error("Error fetching investments: ", error);
  });
};

export interface Subscription {
  id?: string;
  userId: string;
  name: string;
  amount: number;
  billingCycle: 'monthly' | 'yearly';
  nextBillingDate: string;
  workspace?: 'personal' | 'family';
  createdAt: any;
}

export const addSubscription = async (subscription: Omit<Subscription, 'id' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, 'subscriptions'), {
      ...subscription,
      workspace: subscription.workspace || 'personal',
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding subscription: ", error);
    throw error;
  }
};

export const deleteSubscription = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'subscriptions', id));
  } catch (error) {
    console.error("Error deleting subscription: ", error);
    throw error;
  }
};

export const subscribeToSubscriptions = (userId: string, workspace: 'personal' | 'family', callback: (subscriptions: Subscription[]) => void) => {
  const q = query(
    collection(db, 'subscriptions'),
    where('userId', '==', userId)
  );

  return onSnapshot(q, (snapshot) => {
    const subscriptions: Subscription[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const docWorkspace = data.workspace || 'personal';
      if (docWorkspace === workspace) {
        subscriptions.push({ id: doc.id, ...data } as Subscription);
      }
    });

    // Sort client-side to avoid requiring a composite index
    subscriptions.sort((a, b) => {
      const dateA = new Date(a.nextBillingDate).getTime();
      const dateB = new Date(b.nextBillingDate).getTime();
      return (isNaN(dateA) ? 0 : dateA) - (isNaN(dateB) ? 0 : dateB);
    });

    callback(subscriptions);
  }, (error) => {
    console.error("Error fetching subscriptions: ", error);
  });
};
