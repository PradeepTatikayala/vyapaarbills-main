import { BrowserRouter as Router, Routes, Route, Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { AlertTriangle, CreditCard, Loader2, Phone, ShieldCheck } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { RegisterPage } from './pages/RegisterPage';
import { ItemsPage } from './pages/ItemsPage';
import { BillingPage } from './pages/BillingPage';
import { PlansPage } from './pages/PlansPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { SettingsPage } from './pages/SettingsPage';
import { SupportPage } from './pages/SupportPage';
import { PaymentGatewayPage } from './pages/PaymentGatewayPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { userService } from './services/api';

const SUPPORT_PHONE = '9133410628';

const AccountLockPage = ({ dashboard }: { dashboard: any }) => {
  const navigate = useNavigate();
  const profile = dashboard?.profile || {};
  const pendingAmount = parseFloat(profile.pending_amount || '0');
  const formatDate = (value?: string) =>
    value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set';

  const handlePayNow = () => {
    navigate('/pay');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-4xl rounded-[28px] border border-white/10 bg-white/10 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="grid md:grid-cols-[1.1fr_0.9fr]">
          <section className="p-8 md:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-200 mb-6">
              <AlertTriangle size={14} />
              Access paused
            </div>
            <h1 className="text-4xl font-black tracking-tight mb-4">Clear the bill</h1>
            <p className="text-slate-300 font-semibold leading-relaxed max-w-xl">
              Your VyapaarBills workspace is restricted because payment was not completed within 3 days after the billing date. Settle the outstanding balance to reactivate billing, inventory, reports, and POS access.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
                <div className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                  Pending amount
                </div>
                <div className="text-3xl font-black mt-2">
                  Rs {pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
                <div className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                  Billing date
                </div>
                <div className="text-lg font-black mt-2">{formatDate(profile.billing_date)}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
                <div className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                  Final due date
                </div>
                <div className="text-lg font-black mt-2">{formatDate(profile.payment_due_date)}</div>
              </div>
            </div>
          </section>

          <aside className="bg-white text-slate-900 p-8 md:p-10 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-vyapaar-blue flex items-center justify-center mb-5">
                <ShieldCheck size={24} />
              </div>
              <h2 className="text-2xl font-black mb-2">
                Admin verification required
              </h2>
              <p className="text-sm text-slate-500 font-semibold leading-relaxed">
                Pay the pending amount using Razorpay. After successful payment, VyapaarBills verifies the payment and reactivates your account automatically.
              </p>
            </div>

            <div className="mt-10 space-y-3">
              <button type="button" onClick={handlePayNow} className="btn-primary w-full py-3.5 font-black">
                <CreditCard size={18} />
                Pay Rs {pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </button>
              <a href={`tel:${SUPPORT_PHONE}`} className="btn-secondary w-full py-3.5 font-black">
                <Phone size={18} />
                Call {SUPPORT_PHONE}
              </a>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

const DashboardLayout = () => {
  const [dashboard, setDashboard] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);
  const location = useLocation();

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const data = await userService.getDashboard();
      setDashboard(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-vyapaar-blue" size={40} />
      </div>
    );
  }

  const isAdmin = Boolean(dashboard?.is_admin || dashboard?.profile?.is_admin);
  const customPlanPrice = parseFloat(dashboard?.profile?.custom_plan_price || '0');
  const customMonthlyRuns = Number(dashboard?.profile?.custom_monthly_runs || 0);
  const isCustomPendingAdmin =
    !isAdmin &&
    dashboard?.profile?.plan === 'custom' &&
    (!dashboard.profile.is_active || customPlanPrice <= 0 || customMonthlyRuns <= 0);
  const isGstPending = !isAdmin && Boolean(dashboard?.is_gst_pending);
  const isAccountPending = isCustomPendingAdmin || isGstPending;

  if (dashboard?.profile && !dashboard.profile.is_active && !isCustomPendingAdmin) {
    return <AccountLockPage dashboard={dashboard} />;
  }

  if (location.pathname.startsWith('/users') && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (isAccountPending && location.pathname !== '/') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar isAdmin={isAdmin} isAccountPending={isAccountPending} onExpandedChange={setIsSidebarExpanded} />
      <main
        className="flex-1 min-w-0 pb-20 transition-all duration-300 ease-out md:pb-0"
        style={{ marginLeft: isDesktop ? (isSidebarExpanded ? 260 : 80) : 0 }}
      >
        <Outlet context={{ dashboard, isAdmin, refreshDashboard: loadDashboard }} />
      </main>
    </div>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('vyapaar-theme') === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = savedTheme;
    document.documentElement.style.colorScheme = savedTheme;
  }, []);

  return (
    <AuthProvider>
      <Router>
      <Toaster 
        position="top-right"
        toastOptions={{
          className: 'shadow-elevated rounded-xl border border-slate-100',
          style: {
            background: '#ffffff',
            color: '#1e293b',
            padding: '16px',
          },
          success: {
            iconTheme: { primary: '#059669', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          }
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/pay" element={<ProtectedRoute><PaymentGatewayPage /></ProtectedRoute>} />
        
        <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="items" element={<ItemsPage />} />
          <Route path="plans" element={<PlansPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
