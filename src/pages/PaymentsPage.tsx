import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IndianRupee, 
  ShieldCheck, 
  AlertTriangle, 
  Loader2, 
  ArrowUpRight,
  TrendingUp,
  Receipt,
  FileCheck,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { UiCard } from '../components/UiCard';
import { userService } from '../services/api';

export const PaymentsPage = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [upiRefId, setUpiRefId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'options' | 'verify' | 'success'>('options');

  const fetchDashboard = async () => {
    try {
      const data = await userService.getDashboard();
      setDashboardData(data);
    } catch (error) {
      toast.error('Failed to load payment ledger.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const currentPlan = dashboardData?.profile?.plan || 'basic';
  const pendingAmount = parseFloat(dashboardData?.profile?.pending_amount || '0');
  const amountPaid = parseFloat(dashboardData?.profile?.amount_paid || '0');
  const totalAmountDue = parseFloat(dashboardData?.profile?.total_amount_due || '0');

  const handleLaunchPaymentGate = () => {
    window.location.href = '/pay';
  };

  const handleVerifySettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upiRefId || upiRefId.trim().length !== 12 || isNaN(Number(upiRefId))) {
      return toast.error('Please enter a valid 12-digit UPI Transaction Ref ID.');
    }

    setIsProcessing(true);
    try {
      setPaymentStep('success');
      toast.success('Payment reference submitted. Admin will verify and update your account.');
      await fetchDashboard();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to settle balance. Try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Mock list of transactions built based on user's payments
  const transactionHistory = [
    {
      id: 'TXN-90281923',
      date: new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }),
      description: `License subscription renewal (${currentPlan.toUpperCase()} Node)`,
      amount: amountPaid > 0 ? amountPaid : totalAmountDue,
      status: amountPaid > 0 ? 'COMPLETED' : 'PENDING',
      method: amountPaid > 0 ? 'UPI (Razorpay)' : 'CREDIT DUE'
    }
  ];

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-vyapaar-blue w-12 h-12" />
          <p className="text-slate-500 font-semibold">Loading financial ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 pb-24 max-w-7xl mx-auto">
      
      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl font-black text-vyapaar-text mb-2 flex items-center gap-2">
          <IndianRupee className="text-vyapaar-blue" size={32} /> Payments & Ledger Summary
        </h1>
        <p className="text-slate-500 font-medium">Verify payment statuses, settle pending balances, and audit historical invoices.</p>
      </header>

      {/* Grid Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        
        {/* Paid Card */}
        <UiCard className="p-6 border-t-4 border-t-vyapaar-emerald bg-white flex justify-between items-start">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Amount Paid</span>
            <span className="text-3xl font-black text-vyapaar-emerald mt-2 block">₹{amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            <span className="text-xs text-slate-400 font-semibold mt-1 block">Successfully cleared in DB</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-vyapaar-emerald flex items-center justify-center">
            <FileCheck size={20} />
          </div>
        </UiCard>

        {/* Due Card */}
        <UiCard className={`p-6 border-t-4 bg-white flex justify-between items-start ${pendingAmount > 0 ? 'border-t-red-500' : 'border-t-slate-200'}`}>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Pending Dues</span>
            <span className={`text-3xl font-black mt-2 block ${pendingAmount > 0 ? 'text-red-500' : 'text-slate-600'}`}>
              ₹{pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            {pendingAmount > 0 ? (
              <button 
                onClick={() => {
                  setPaymentStep('options');
                  setUpiRefId('');
                  setShowSettleModal(true);
                }}
                className="text-xs font-bold text-vyapaar-saffron hover:text-vyapaar-saffronHover underline mt-2 flex items-center gap-0.5"
              >
                Settle Balance Now <ArrowUpRight size={14} />
              </button>
            ) : (
              <span className="text-xs text-slate-400 font-semibold mt-1 block">Ledger fully settled</span>
            )}
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${pendingAmount > 0 ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'}`}>
            <AlertTriangle size={20} />
          </div>
        </UiCard>

        {/* Total due */}
        <UiCard className="p-6 border-t-4 border-t-vyapaar-blue bg-white flex justify-between items-start">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total License Cost</span>
            <span className="text-3xl font-black text-vyapaar-text mt-2 block">₹{totalAmountDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            <span className="text-xs text-slate-400 font-semibold mt-1 block uppercase">Plan: {currentPlan}</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 text-vyapaar-blue flex items-center justify-center">
            <TrendingUp size={20} />
          </div>
        </UiCard>

      </div>

      {/* Transaction History */}
      <UiCard className="p-6 bg-white border border-slate-100 rounded-2xl">
        <h3 className="font-extrabold text-lg text-vyapaar-text mb-6 flex items-center gap-2">
          <Receipt className="text-slate-500" size={20} /> Transaction Audit History
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider bg-slate-50/50">
                <th className="py-4 px-4 rounded-l-xl">Txn ID</th>
                <th className="py-4 px-4">Date</th>
                <th className="py-4 px-4">Description</th>
                <th className="py-4 px-4">Method</th>
                <th className="py-4 px-4 text-right">Amount</th>
                <th className="py-4 px-4 text-center rounded-r-xl">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-vyapaar-text font-semibold text-sm">
              {transactionHistory.map((txn, i) => (
                <tr key={i} className="hover:bg-slate-50/30">
                  <td className="py-4 px-4 font-mono font-bold text-vyapaar-blue">{txn.id}</td>
                  <td className="py-4 px-4 text-slate-500 font-semibold">{txn.date}</td>
                  <td className="py-4 px-4 text-slate-700 font-bold">{txn.description}</td>
                  <td className="py-4 px-4 text-slate-500 font-semibold">{txn.method}</td>
                  <td className="py-4 px-4 text-right font-mono font-black">₹{txn.amount.toFixed(2)}</td>
                  <td className="py-4 px-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-black tracking-wide ${
                      txn.status === 'COMPLETED' 
                        ? 'bg-emerald-50 text-vyapaar-emerald border border-emerald-100' 
                        : 'bg-red-50 text-red-500 border border-red-100'
                    }`}>
                      {txn.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </UiCard>

      {/* Settle modal */}
      <AnimatePresence>
        {showSettleModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => !isProcessing && setShowSettleModal(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 z-10"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-950 to-vyapaar-blue text-white p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-white flex items-center justify-center shadow-md">
                    <span className="text-vyapaar-blue font-black text-xl leading-none">Rz</span>
                  </div>
                  <div>
                    <div className="font-extrabold text-lg">Settle Balance</div>
                    <div className="text-xs text-blue-200 flex items-center gap-1 font-semibold">
                      <ShieldCheck size={14} className="text-emerald-400" /> Secure Settlement
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-blue-300 font-bold uppercase tracking-wider">Dues</div>
                  <div className="font-mono font-black text-2xl text-vyapaar-saffron">
                    ₹{pendingAmount.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6">
                {paymentStep === 'options' && (
                  <div className="space-y-5">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-800 font-semibold leading-relaxed flex gap-2.5">
                      <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-600" />
                      <p>Clear outstanding balances to keep the dashboard operational. Clicking UPI opens the secure Razorpay payment screen inside VyapaarBills.</p>
                    </div>

                    <button 
                      onClick={handleLaunchPaymentGate}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-vyapaar-blue hover:bg-blue-50/50 transition-all font-bold text-slate-800 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">UPI</div>
                        <div className="text-left">
                          <div className="text-slate-800 font-extrabold">Pay dues with UPI</div>
                          <div className="text-xs text-slate-400 font-semibold font-mono">₹{pendingAmount}</div>
                        </div>
                      </div>
                      <ArrowUpRight size={18} className="text-slate-400" />
                    </button>
                  </div>
                )}

                {paymentStep === 'verify' && (
                  <form onSubmit={handleVerifySettle} className="space-y-5">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-vyapaar-blue font-semibold leading-relaxed">
                      UPI Link opened. Paste the 12-digit transaction Ref Number below. Admin will verify it before updating your account.
                    </div>

                    <div>
                      <input 
                        type="text"
                        maxLength={12}
                        required
                        value={upiRefId}
                        onChange={e => setUpiRefId(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 518392018471"
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-center text-lg font-mono font-black text-vyapaar-text placeholder-slate-300 focus:outline-none focus:border-vyapaar-blue focus:bg-white transition-all"
                      />
                      <span className="text-[10px] font-bold text-slate-400 text-center block mt-1.5 uppercase">Digits: {upiRefId.length} / 12</span>
                    </div>

                    <div className="flex gap-3 pt-3 border-t border-slate-100">
                      <button 
                        type="button"
                        disabled={isProcessing}
                        onClick={() => setPaymentStep('options')}
                        className="btn-secondary w-1/3 py-2.5 text-sm"
                      >
                        Back
                      </button>
                      <button 
                        type="submit"
                        disabled={isProcessing || upiRefId.length !== 12}
                        className="btn-primary w-2/3 py-2.5 text-sm font-extrabold disabled:opacity-50"
                      >
                        {isProcessing ? <Loader2 className="animate-spin" size={16} /> : 'Submit Reference'}
                      </button>
                    </div>
                  </form>
                )}

                {paymentStep === 'success' && (
                  <div className="py-8 text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-emerald-100 text-vyapaar-emerald rounded-full flex items-center justify-center mb-4 shadow-inner">
                      <CheckCircle2 size={36} className="animate-bounce" />
                    </div>
                    
                    <h3 className="text-2xl font-black text-vyapaar-text mb-2">Reference Submitted</h3>
                    <p className="text-slate-500 font-semibold text-sm max-w-sm mx-auto leading-relaxed">
                      Your payment reference was received. Your pending balance will change only after admin verification.
                    </p>

                    <button 
                      onClick={() => setShowSettleModal(false)}
                      className="mt-8 btn-primary px-8 py-2.5 text-sm font-extrabold"
                    >
                      Close Ledger
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
