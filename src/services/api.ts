import { auth, db, functions } from '../firebase';
import { collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

export const authService = {
  logout: async () => {
    await auth.signOut();
  }
};

export const supportService = {
  submitTicket: async (ticketData: any) => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    await addDoc(collection(db, 'support_tickets'), {
      ...ticketData,
      userId: auth.currentUser.uid,
      createdAt: serverTimestamp()
    });
    return { success: true };
  }
};

export const shopService = {
  create: async (shopData: any) => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    const docRef = await addDoc(collection(db, 'shops'), {
      ...shopData,
      userId: auth.currentUser.uid,
      createdAt: serverTimestamp()
    });
    return { id: docRef.id, ...shopData };
  },
  update: async (id: string, shopData: any) => {
    const shopRef = doc(db, 'shops', id);
    await updateDoc(shopRef, shopData);
    return { id, ...shopData };
  }
};

export const userService = {
  getDashboard: async () => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    const uid = auth.currentUser.uid;
    const userDoc = await getDoc(doc(db, 'users', uid));
    
    const shopsQuery = query(collection(db, 'shops'), where('userId', '==', uid));
    const shopsSnapshot = await getDocs(shopsQuery);
    const shop = shopsSnapshot.docs.length > 0 ? { id: shopsSnapshot.docs[0].id, ...shopsSnapshot.docs[0].data() } : null;

    const userData: any = userDoc.exists() ? userDoc.data() : {};
    return {
      profile: {
        is_active: userData.is_active !== false,
        plan: userData.plan || 'basic',
        is_admin: userData.is_admin || false,
        name: userData.name,
      },
      shop: shop,
      is_gst_pending: shop ? shop.gst_number === 'PENDING_GST' : false,
    };
  },
  updatePlan: async (plan: string) => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    const userRef = doc(db, 'users', auth.currentUser.uid);
    await updateDoc(userRef, { plan });
    return { plan };
  },
  payPendingAmount: async () => {
    return { success: true };
  }
};

export const paymentService = {
  createRazorpayOrder: async () => {
    const createOrder = httpsCallable(functions, 'createRazorpayOrder');
    const result = await createOrder();
    return result.data;
  },
  verifyRazorpayPayment: async (data: any) => {
    const verifyPayment = httpsCallable(functions, 'verifyRazorpayPayment');
    const result = await verifyPayment(data);
    return result.data;
  }
};

export const adminService = {
  getStats: async () => {
    return { total_users: 0, total_revenue: 0, active_shops: 0 };
  },
  listUsers: async () => {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  updateUser: async (id: string, data: any) => {
    await updateDoc(doc(db, 'users', id), data);
    return { id, ...data };
  },
  toggleRestriction: async (id: string) => {
    const userRef = doc(db, 'users', id);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
       const current = snap.data().is_active !== false;
       await updateDoc(userRef, { is_active: !current });
    }
    return { success: true };
  }
};

export const categoryService = {
  list: async () => ['Grocery', 'Electronics', 'Clothing', 'Others'],
  save: async (categories: string[]) => ({ categories })
};

export const inventoryService = {
  list: async () => {
    if (!auth.currentUser) return [];
    const q = query(collection(db, 'inventory'), where('userId', '==', auth.currentUser.uid));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  create: async (data: any) => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    const docRef = await addDoc(collection(db, 'inventory'), {
      ...data,
      userId: auth.currentUser.uid,
      createdAt: serverTimestamp()
    });
    return { id: docRef.id, ...data };
  },
  update: async (id: string, data: any) => {
    await updateDoc(doc(db, 'inventory', id), data);
    return { id, ...data };
  },
  delete: async (id: string) => {
    await deleteDoc(doc(db, 'inventory', id));
    return { success: true };
  },
  getStats: async () => ({ total_items: 0, low_stock: 0, out_of_stock: 0 }),
  searchGlobal: async (queryStr: string) => []
};

// Aliasing userItemService to inventoryService for the transition
export const userItemService = inventoryService as any;

export const posService = {
  generateBill: async (data: any) => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    const docRef = await addDoc(collection(db, 'bills'), {
      ...data,
      userId: auth.currentUser.uid,
      createdAt: serverTimestamp()
    });
    return { id: docRef.id, ...data };
  },
  downloadBillsPDF: async () => {
    throw new Error("PDF generation requires Cloud Functions implementation.");
  }
};

export const billingService = {
  generate: async (formData: any) => {
    throw new Error("Requires Cloud Functions");
  },
  getRuns: async () => [],
  downloadPDF: async (runId: string) => {
    throw new Error("Requires Cloud Functions");
  }
};

export default {};
