import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ChevronRight, CreditCard, FileText, IndianRupee, Loader2, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UiCard } from '../components/UiCard';
import { userService } from '../services/api';

const CUSTOM_PLAN_PHONE = '9133410628';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await userService.getDashboard();
        setDashboardData(data);
      } catch (error) {
        console.error('Failed to load dashboard data', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const billsGenerated = dashboardData?.monthly_runs || 0;
  const totalBills = dashboardData?.profile?.allowed_runs ?? 0;
  const currentPlan = dashboardData?.profile?.plan || 'Unknown Plan';
  const pendingAmount = parseFloat(dashboardData?.profile?.pending_amount || '0');
  const customPlanPrice = parseFloat(dashboardData?.profile?.custom_plan_price || '0');
  const customMonthlyRuns = Number(dashboardData?.profile?.custom_monthly_runs || 0);
  const isCustomPendingAdmin =
    currentPlan === 'custom' &&
    (!dashboardData?.profile?.is_active || customPlanPrice <= 0 || customMonthlyRuns <= 0);
  const isGstPending = Boolean(dashboardData?.is_gst_pending);
  const isAccountPending = isCustomPendingAdmin || isGstPending;
  const shop = dashboardData?.shop;
  const usagePercent = totalBills > 0 ? Math.min((billsGenerated / totalBills) * 100, 100) : 0;
  const formatMoney = (amount: number) =>
    `Rs ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatDate = (value?: string) =>
    value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set';

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-vyapaar-blue w-12 h-12" />
      </div>
    );
  }

  return (
    <div className="p-8 pb-20">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-vyapaar-text mb-1">Welcome, {shop?.name || 'Kirana Shop'}</h1>
          <p className="text-slate-500">Manage your GST bills and shop subscription here.</p>
        </div>
        <button
          onClick={() => !isAccountPending && navigate('/billing')}
          disabled={isAccountPending}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          title={isAccountPending ? 'Admin approval is required before billing can be used' : undefined}
        >
          <FileText size={18} /> {isAccountPending ? 'Billing Locked' : 'Create New Bill'}
        </button>
      </header>

      {isAccountPending && (
        <UiCard className="mb-8 p-5 bg-amber-50 border-l-4 border-l-vyapaar-saffron flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-white text-vyapaar-saffron flex items-center justify-center shrink-0 shadow-sm">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h2 className="font-black text-vyapaar-text">
                {isGstPending ? 'GSTIN waiting for admin approval' : 'Custom plan waiting for admin approval'}
              </h2>
              <p className="text-sm text-slate-600 font-semibold mt-1">
                Call {CUSTOM_PLAN_PHONE}. Billing, inventory, payments, reports, and settings stay disabled until admin {isGstPending ? 'adds your GST number.' : 'adds your monthly amount and allowed runs.'}
              </p>
            </div>
          </div>
          <a href={`tel:${CUSTOM_PLAN_PHONE}`} className="btn-primary shrink-0">
            Call {CUSTOM_PLAN_PHONE}
          </a>
        </UiCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <UiCard interactive className="p-6 border-t-4 border-t-vyapaar-saffron">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-bold text-vyapaar-text">Monthly Bills</h2>
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-vyapaar-saffron">
              <FileText size={20} />
            </div>
          </div>

          <div className="mb-2 flex justify-between items-end">
            <span className="text-3xl font-bold text-vyapaar-text">{billsGenerated}</span>
            <span className="text-sm font-semibold text-slate-500 mb-1">/ {totalBills} used</span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-2.5 mb-3 overflow-hidden">
            <motion.div
              className={`h-2.5 rounded-full ${billsGenerated >= totalBills ? 'bg-red-500' : 'bg-vyapaar-saffron'}`}
              initial={{ width: 0 }}
              animate={{ width: `${usagePercent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>

          {!isAccountPending && billsGenerated >= totalBills - 1 && (
            <p className="text-xs text-red-600 font-semibold flex items-center gap-1 mt-3 bg-red-50 p-2 rounded border border-red-100">
              <AlertTriangle size={14} /> You are reaching your monthly limit!
            </p>
          )}
        </UiCard>

        <UiCard interactive className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-bold text-vyapaar-text">Shop Details</h2>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-vyapaar-blue">
              <Store size={20} />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase">GSTIN</div>
              <div className="font-medium text-vyapaar-text">{isGstPending ? 'Pending admin approval' : shop?.gst_number || 'Not Registered'}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase">Address</div>
              <div className="text-sm text-vyapaar-text">{shop?.address || 'No address provided'}</div>
            </div>
          </div>
        </UiCard>

        <UiCard interactive className="p-6 bg-gradient-to-br from-vyapaar-blue to-vyapaar-blueDark text-white">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-bold text-blue-100">Current Plan</h2>
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white">
              <CreditCard size={20} />
            </div>
          </div>

          <div className="text-3xl font-bold mb-1 capitalize">{currentPlan} Plan</div>
          <div className="text-sm text-blue-200 mb-6">
            {isGstPending ? 'Waiting for admin GSTIN approval.' : isCustomPendingAdmin ? 'Waiting for admin amount and monthly runs.' : `Billing date: ${formatDate(dashboardData?.profile?.billing_date)}`}
          </div>

          <button
            onClick={() => navigate('/plans')}
            className="w-full bg-white text-vyapaar-blue hover:bg-blue-50 font-bold py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2 shadow-sm"
          >
            View Plans <ChevronRight size={18} />
          </button>
        </UiCard>

        <UiCard interactive className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-bold text-vyapaar-text">Billing Cycle</h2>
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-vyapaar-saffron">
              <AlertTriangle size={20} />
            </div>
          </div>

          <div className="space-y-3 text-sm font-semibold">
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Registered</span>
              <span className="text-vyapaar-text">{formatDate(dashboardData?.profile?.registered_date)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Billing date</span>
              <span className="text-vyapaar-text">{formatDate(dashboardData?.profile?.billing_date)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Pay before</span>
              <span className={dashboardData?.profile?.is_payment_overdue ? 'text-rose-600 font-black' : 'text-vyapaar-text'}>
                {formatDate(dashboardData?.profile?.payment_due_date)}
              </span>
            </div>
          </div>
        </UiCard>

        <UiCard interactive className={`p-6 border-t-4 ${pendingAmount > 0 ? 'border-t-rose-500 bg-rose-50/40' : 'border-t-vyapaar-emerald bg-emerald-50/40'}`}>
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-bold text-vyapaar-text">Pending Amount</h2>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${pendingAmount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-vyapaar-emerald'}`}>
              <IndianRupee size={20} />
            </div>
          </div>

          <div className={`text-3xl font-black mb-2 ${pendingAmount > 0 ? 'text-rose-600' : 'text-vyapaar-emerald'}`}>
            {formatMoney(pendingAmount)}
          </div>
          <p className="text-sm font-semibold text-slate-500">
            {pendingAmount > 0 ? 'Amount currently due for this account.' : 'No dues pending for this account.'}
          </p>
        </UiCard>
      </div>

      <UiCard className="p-5 bg-orange-50 border-l-4 border-l-vyapaar-saffron flex items-start gap-4">
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-vyapaar-saffron shrink-0 shadow-sm mt-0.5">
          <AlertTriangle size={16} />
        </div>
        <div>
          <h4 className="text-vyapaar-text font-bold mb-1">Important: Billing Date Restriction</h4>
          <p className="text-sm text-slate-600">
            As per GST compliance rules, you can only generate bills for dates within the <strong>last 6 months</strong>.
            You cannot create bills for future dates. Please ensure the bill date is accurate before saving.
          </p>
        </div>
      </UiCard>
    </div>
  );
};
