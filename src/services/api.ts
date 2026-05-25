import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Intercept requests to attach auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authService = {
  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login/', { email, password });
    return res.data;
  },
  register: async (userData: any) => {
    const res = await api.post('/auth/register/', userData);
    return res.data;
  },
  logout: async () => {
    await api.post('/auth/logout/');
    localStorage.removeItem('token');
  }
};

export const supportService = {
  submitTicket: async (ticketData: { customer_name: string; shop_name: string; shop_type: string; description: string }) => {
    const res = await api.post('/support/ticket/', ticketData);
    return res.data;
  }
};

export const shopService = {
  create: async (shopData: any) => {
    const res = await api.post('/shops/', shopData);
    return res.data;
  },
  update: async (id: number, shopData: any) => {
    const res = await api.patch(`/shops/${id}/`, shopData);
    return res.data;
  }
};

export const userService = {
  getDashboard: async () => {
    const res = await api.get('/user/dashboard/');
    return res.data;
  },
  updatePlan: async (plan: string) => {
    const res = await api.post('/user/plan/', { plan });
    return res.data;
  },
  payPendingAmount: async () => {
    const res = await api.post('/user/pay/');
    return res.data;
  }
};

export const paymentService = {
  createRazorpayOrder: async () => {
    const res = await api.post('/payments/razorpay/order/');
    return res.data;
  },
  verifyRazorpayPayment: async (data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => {
    const res = await api.post('/payments/razorpay/verify/', data);
    return res.data;
  }
};

export const adminService = {
  getStats: async () => {
    const res = await api.get('/admin/stats/');
    return res.data;
  },
  listUsers: async () => {
    const res = await api.get('/admin/users/');
    return res.data;
  },
  updateUser: async (id: number, data: any) => {
    const res = await api.patch(`/admin/users/${id}/`, data);
    return res.data;
  },
  toggleRestriction: async (id: number) => {
    const res = await api.post(`/admin/users/${id}/toggle-restriction/`);
    return res.data;
  }
};

export const categoryService = {
  list: async () => {
    const res = await api.get('/user/categories/');
    return res.data;
  },
  save: async (categories: string[]) => {
    const res = await api.post('/user/categories/', { categories });
    return res.data;
  }
};

export const userItemService = {
  list: async (params?: { search?: string; category?: string; is_active?: boolean }) => {
    const res = await api.get('/user-items/', { params });
    return res.data;
  },
  update: async (id: number, data: { selling_price?: number; mrp?: number; stock_quantity?: number; is_active?: boolean }) => {
    const res = await api.patch(`/user-items/${id}/`, data);
    return res.data;
  },
  addCustom: async (data: { item_name: string; unit_of_measure: string; selling_price: number; mrp: number; stock_quantity: number }) => {
    const res = await api.post('/user-items/add-custom/', data);
    return res.data;
  },
  searchGlobal: async (query: string) => {
    const res = await api.get('/user-items/search-global/', { params: { q: query } });
    return res.data;
  },
  addFromGlobal: async (data: { item_id: number; selling_price: number; mrp: number; stock_quantity: number }) => {
    const res = await api.post('/user-items/add-from-global/', data);
    return res.data;
  }
};

export const inventoryService = {
  list: async () => {
    const res = await api.get('/inventory/');
    return res.data;
  },
  create: async (data: { item_id?: number; item_name?: string; buying_price: number; selling_price: number; stock_qty: number }) => {
    const res = await api.post('/inventory/', data);
    return res.data;
  },
  update: async (id: number, data: { buying_price?: number; selling_price?: number; stock_qty?: number }) => {
    const res = await api.patch(`/inventory/${id}/`, data);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/inventory/${id}/`);
    return res.data;
  },
  getStats: async () => {
    const res = await api.get('/inventory/dashboard-stats/');
    return res.data;
  },
  searchGlobal: async (query: string) => {
    const res = await api.get('/items/', { params: { search: query } });
    return res.data;
  }
};

export const posService = {
  generateBill: async (data: { customer_name: string; cart: Array<{ inventory_item_id: number; quantity: number; selling_price: number }> }) => {
    const res = await api.post('/pos/generate-bill/', data);
    return res.data;
  },
  downloadBillsPDF: async () => {
    const res = await api.get('/pos/download-bills-pdf/', { responseType: 'blob' });
    return res.data;
  }
};

export const billingService = {
  generate: async (formData: any) => {
    const res = await api.post('/generate/', formData);
    return res.data;
  },
  getRuns: async () => {
    const res = await api.get('/generation-runs/');
    return res.data;
  },
  downloadPDF: async (runId: number) => {
    const res = await api.get(`/generation-runs/${runId}/download-pdf/`, { responseType: 'blob' });
    return res.data;
  }
};

export default api;
