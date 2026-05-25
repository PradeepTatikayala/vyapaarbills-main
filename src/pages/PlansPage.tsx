import { type FormEvent, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, 
  ShieldCheck, 
  Check, 
  AlertTriangle, 
  Loader2, 
  Sparkles, 
  ChevronRight, 
  Coins, 
  CheckCircle2, 
  ArrowUpRight,
  ExternalLink,
  Phone
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { UiCard } from '../components/UiCard';
import { userService } from '../services/api';

const CUSTOM_PLAN_PHONE = '9133410628';

export const PlansPage = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'medium'>('basic');
  const [upiRefId, setUpiRefId] = useState('');
  const [isProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'options' | 'verify' | 'success'>('options');
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);

  const fetchDashboard = async () => {
    try {
      const data = await userService.getDashboard();
      setDashboardData(data);
    } catch (error) {
      toast.error('Failed to load subscription details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const currentPlan = dashboardData?.profile?.plan || 'basic';
  const pendingAmount = parseFloat(dashboardData?.profile?.pending_amount || '0');
  const runsUsed = dashboardData?.monthly_runs || 0;
  const runsAllowed = dashboardData?.profile?.allowed_runs || 3;
  const planRunLimits = { basic: 3, medium: 5 };

  const handleSelectPlanToUpgrade = async (plan: 'basic' | 'medium') => {
    if (runsUsed > planRunLimits[plan]) {
      toast.error(`Cannot change to ${plan}. You already used ${runsUsed} runs, but this plan allows only ${planRunLimits[plan]}.`);
      return;
    }

    setSelectedPlan(plan);
    setIsUpdatingPlan(true);
    try {
      await userService.updatePlan(plan);
      await fetchDashboard();
      toast.success(`Plan changed to ${plan}. Runs and bill amount updated.`);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update plan.');
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  const handleContactCustomPlan = () => {
    window.location.href = `tel:${CUSTOM_PLAN_PHONE}`;
  };

  const handleOpenSettleDues = () => {
    setSelectedPlan(currentPlan === 'medium' ? 'medium' : 'basic');
    setPaymentStep('options');
    setShowCheckoutModal(true);
  };

  const handlePayAndLaunchLink = () => {
    window.location.href = '/pay';
  };

  const handleVerifyAndActivate = async (e: FormEvent) => {
    e.preventDefault();
    toast.error('Manual payment verification is disabled. Please complete payment through Razorpay Checkout.');
  };

  const plansList = [
    {
      id: 'basic' as const,
      name: 'Basic Node',
      price: '1,000',
      period: 'month',
      runs: 3,
      popular: false,
      color: 'from-blue-500 to-indigo-600',
      features: [
        '3 Billing Runs / Month',
        'Unlimited Invoices / Run',
        'GST Compliant Calculation',
        'Full PDF Report Downloads',
        'Standard Catalog Access',
        'Email Support'
      ]
    },
    {
      id: 'medium' as const,
      name: 'Medium Node',
      price: '2,500',
      period: 'month',
      runs: 5,
      popular: true,
      color: 'from-vyapaar-saffron to-amber-500',
      features: [
        '5 Billing Runs / Month',
        'Unlimited Invoices / Run',
        'Priority GST Legal Compliance',
        'Priority PDF Report Downloads',
        'Smart AI Pricing Catalog',
        'Advanced Store Metrics',
        '24/7 Premium Support'
      ]
    },
    {
      id: 'custom' as const,
      name: 'Custom Node',
      price: 'Custom',
      period: 'contact',
      runs: 'Flexible',
      popular: false,
      color: 'from-emerald-500 to-teal-600',
      contactNumber: CUSTOM_PLAN_PHONE,
      features: [
        'Custom Billing Runs / Month',
        'Unlimited Invoices / Run',
        'Custom Plan Pricing',
        'Dedicated Setup Support',
        'Advanced Store Configuration',
        'Direct Phone Assistance'
      ]
    }
  ];

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-vyapaar-blue w-12 h-12" />
          <p className="text-slate-500 font-semibold">Loading subscriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 pb-24 max-w-7xl mx-auto">
      
      {/* Header */}
      <header className="mb-10 text-center md:text-left">
        <h1 className="text-3xl font-black text-vyapaar-text mb-2 flex flex-col md:flex-row items-center gap-2">
          <CreditCard className="text-vyapaar-blue" size={32} /> Upgrade Subscription Plans
        </h1>
        <p className="text-slate-500 font-medium">Select a premium license and extend your monthly billing thresholds safely.</p>
      </header>

      {/* Subscription Status Card */}
      <div className="mb-12">
        <UiCard className="p-6 bg-gradient-to-r from-vyapaar-blueDark via-blue-950 to-vyapaar-blue text-white shadow-xl relative overflow-hidden rounded-2xl">
          {/* Decorative glows */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-blue-500/10 rounded-full blur-2xl -ml-20 -mb-20 pointer-events-none"></div>
          
          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8 z-10">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="bg-vyapaar-saffron text-white text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                  Active Tier
                </span>
                <span className="text-blue-200 text-sm font-semibold">Vyapaar License</span>
              </div>
              <h2 className="text-3xl font-black capitalize tracking-tight">{currentPlan} Plan</h2>
              <p className="text-blue-200 text-sm font-medium mt-1">Automatic renewal date: 15 Oct, 2026</p>
            </div>

            <div className="flex gap-8 divide-x divide-white/10">
              <div className="pl-0">
                <span className="text-xs text-blue-300 font-bold uppercase tracking-wider block">Allowed runs</span>
                <span className="text-2xl font-black mt-1 block">{runsAllowed} Runs</span>
              </div>
              <div className="pl-6">
                <span className="text-xs text-blue-300 font-bold uppercase tracking-wider block">Runs completed</span>
                <span className="text-2xl font-black mt-1 block">{runsUsed} Runs</span>
              </div>
              <div className="pl-6">
                <span className="text-xs text-blue-300 font-bold uppercase tracking-wider block">Available runs</span>
                <span className="text-2xl font-black mt-1 text-vyapaar-saffron block">{Math.max(0, runsAllowed - runsUsed)} Runs</span>
              </div>
            </div>

            <div>
              {pendingAmount > 0 ? (
                <div className="bg-red-500/20 border border-red-500/30 p-4 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="text-rose-400 shrink-0 mt-0.5" size={20} />
                  <div>
                    <span className="text-xs font-bold text-red-200 uppercase tracking-wider block">Pending Payment</span>
                    <span className="text-lg font-black block">₹{pendingAmount.toFixed(2)} Due</span>
                    <button 
                      onClick={handleOpenSettleDues}
                      className="mt-2 text-xs font-extrabold text-white underline hover:text-orange-200 flex items-center gap-0.5"
                    >
                      Clear Dues Now <ArrowUpRight size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-vyapaar-emerald/20 border border-vyapaar-emerald/30 p-4 rounded-xl flex items-center gap-3">
                  <CheckCircle2 className="text-emerald-400 shrink-0" size={24} />
                  <div>
                    <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider block">Dues Settled</span>
                    <span className="text-sm font-extrabold block">All invoices cleared!</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </UiCard>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plansList.map((plan) => {
          const isActive = currentPlan === plan.id;
          const isCustomPlan = plan.id === 'custom';
          const isRunDowngradeBlocked = !isCustomPlan && runsUsed > plan.runs;
          return (
            <UiCard 
              key={plan.id} 
              className={`p-8 bg-white border flex flex-col justify-between relative rounded-2xl ${
                isActive 
                  ? 'border-2 border-vyapaar-blue shadow-xl ring-4 ring-blue-50'
                  : 'border-slate-100'
              }`}
            >
              <div>
                <div className="mb-6">
                  <div className="min-h-8 mb-3 flex items-center gap-2">
                    {isActive && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-vyapaar-blue px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-white shadow-sm">
                        <CheckCircle2 size={13} /> Current Plan
                      </span>
                    )}
                    {plan.popular && !isActive && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-vyapaar-saffron">
                        <Sparkles size={13} /> Recommended Upgrade
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-extrabold text-vyapaar-text">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-3">
                    <span className="text-4xl font-black text-slate-900">{isCustomPlan ? plan.price : `₹${plan.price}`}</span>
                    <span className="text-slate-400 font-semibold text-sm">/ {plan.period}</span>
                  </div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-2 flex items-center gap-1.5">
                    <Coins size={14} className="text-vyapaar-saffron" /> Includes {plan.runs} billing runs / month
                  </p>
                  {isCustomPlan && (
                    <p className="text-vyapaar-blue text-sm font-black mt-3 flex items-center gap-2">
                      <Phone size={16} /> {plan.contactNumber}
                    </p>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-6 mb-8">
                  <ul className="space-y-3.5">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm font-semibold text-slate-600">
                        <Check size={18} className="text-vyapaar-emerald shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                {isActive ? (
                  <div className="w-full bg-slate-100 text-slate-500 font-extrabold py-3.5 rounded-xl text-center border border-slate-200 tracking-wide">
                    Active Subscription
                  </div>
                ) : isCustomPlan ? (
                  <button 
                    onClick={handleContactCustomPlan}
                    className="w-full py-3.5 rounded-xl font-black tracking-wide flex justify-center items-center gap-2 shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 bg-vyapaar-emerald text-white hover:bg-emerald-700"
                  >
                    Call {plan.contactNumber} <Phone size={18} />
                  </button>
                ) : (
                  <button 
                    onClick={() => handleSelectPlanToUpgrade(plan.id)}
                    disabled={isUpdatingPlan || isRunDowngradeBlocked}
                    title={isRunDowngradeBlocked ? `You already used ${runsUsed} runs this month. ${plan.name} allows only ${plan.runs}.` : undefined}
                    className={`w-full py-3.5 rounded-xl font-black tracking-wide flex justify-center items-center gap-2 shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 ${
                      plan.popular 
                        ? 'bg-vyapaar-saffron text-white hover:bg-vyapaar-saffronHover shadow-orange-500/10 disabled:opacity-60 disabled:hover:translate-y-0' 
                        : 'bg-vyapaar-blue text-white hover:bg-vyapaar-blueDark disabled:opacity-60 disabled:hover:translate-y-0 disabled:cursor-not-allowed'
                    }`}
                  >
                    {isUpdatingPlan && selectedPlan === plan.id ? (
                      <><Loader2 className="animate-spin" size={18} /> Updating...</>
                    ) : isRunDowngradeBlocked ? (
                      <>Downgrade Locked</>
                    ) : (
                      <>Change to {plan.name} <ChevronRight size={18} /></>
                    )}
                  </button>
                )}
              </div>
            </UiCard>
          );
        })}
      </div>

      {/* Payments Loophole Resolution Modal */}
      <AnimatePresence>
        {showCheckoutModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => !isProcessing && setShowCheckoutModal(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 z-10"
            >
              {/* Razorpay Styled Header */}
              <div className="bg-gradient-to-r from-blue-950 to-vyapaar-blue text-white p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-white flex items-center justify-center shadow-md">
                    <span className="text-vyapaar-blue font-black text-xl leading-none">Rz</span>
                  </div>
                  <div>
                    <div className="font-extrabold text-lg">VyapaarBills</div>
                    <div className="text-xs text-blue-200 flex items-center gap-1 font-semibold">
                      <ShieldCheck size={14} className="text-emerald-400" /> Verified Merchant
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-blue-300 font-bold uppercase tracking-wider">Amount Due</div>
                  <div className="font-mono font-black text-2xl text-vyapaar-saffron">
                    ₹{selectedPlan === 'basic' ? '1,000' : '2,500'}
                  </div>
                </div>
              </div>

              {/* Checkout Steps Body */}
              <div className="p-6">
                
                {/* STEP 1: PAYMENT GATEWAY SELECTION */}
                {paymentStep === 'options' && (
                  <div className="space-y-5">
                    <div className="text-sm font-bold text-slate-500 border-b border-slate-100 pb-3 flex justify-between">
                      <span>Subscribed Node Plan:</span>
                      <span className="text-vyapaar-text capitalize">{selectedPlan} Plan</span>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-800 font-semibold leading-relaxed flex gap-2.5">
                      <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-600" />
                      <p>Clicking UPI opens Razorpay Checkout. After successful payment, VyapaarBills verifies Razorpay and updates dues automatically.</p>
                    </div>

                    <button 
                      onClick={handlePayAndLaunchLink}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-vyapaar-blue hover:bg-blue-50/50 transition-all font-bold text-slate-800 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">UPI</div>
                        <div className="text-left">
                          <div className="text-slate-800 font-extrabold">Pay via UPI (GPay, PhonePe, Paytm)</div>
                          <div className="text-xs text-slate-400 font-semibold">Auto-updated after successful payment</div>
                        </div>
                      </div>
                      <ExternalLink size={18} className="text-slate-400" />
                    </button>

                  </div>
                )}

                {/* STEP 2: VERIFICATION PANEL */}
                {paymentStep === 'verify' && (
                  <form onSubmit={handleVerifyAndActivate} className="space-y-5">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-vyapaar-blue font-semibold leading-relaxed">
                      <p className="font-extrabold mb-1">✓ UPI Payment Portal Triggered</p>
                      Please check the newly opened tab. Copy your **12-digit UPI / Bank Transaction Ref ID / UTR** from your payment receipt and paste it below.
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">12-Digit Reference ID (UTR / Ref No.)</label>
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
                        {isProcessing ? (
                          <>
                            <Loader2 className="animate-spin" size={16} /> Submitting...
                          </>
                        ) : (
                          'Submit Reference'
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {/* STEP 3: SUCCESS PANEL */}
                {paymentStep === 'success' && (
                  <div className="py-8 text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-emerald-100 text-vyapaar-emerald rounded-full flex items-center justify-center mb-4 shadow-inner">
                      <CheckCircle2 size={36} className="animate-bounce" />
                    </div>
                    
                    <h3 className="text-2xl font-black text-vyapaar-text mb-2">Reference Submitted</h3>
                    <p className="text-slate-500 font-semibold text-sm max-w-sm mx-auto leading-relaxed">
                      Your UPI reference was received. Pending dues will update only after admin verifies the payment.
                    </p>

                    <button 
                      onClick={() => setShowCheckoutModal(false)}
                      className="mt-8 btn-primary px-8 py-2.5 text-sm font-extrabold"
                    >
                      Return to Dashboard
                    </button>
                  </div>
                )}

              </div>

              {/* Processing Secured overlay */}
              {paymentStep !== 'success' && (
                <div className="bg-slate-50 py-3 px-6 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <ShieldCheck size={14} className="text-vyapaar-emerald" /> Secured by Razorpay Payment Systems
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
