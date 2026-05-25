import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, CreditCard, IndianRupee, Loader2, Mail, Phone, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { paymentService, userService } from '../services/api';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, any>) => { open: () => void };
  }
}

const RAZORPAY_CHECKOUT_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

const loadRazorpayScript = () =>
  new Promise<boolean>((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${RAZORPAY_CHECKOUT_SCRIPT}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true), { once: true });
      existingScript.addEventListener('error', () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_CHECKOUT_SCRIPT;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export const PaymentGatewayPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({
    amount: 0,
    email: '',
    phone: '',
    plan: '',
  });

  const loadPaymentDetails = async () => {
    setIsLoading(true);
    try {
      const dashboard = await userService.getDashboard();
      const profile = dashboard?.profile || {};
      const pendingAmount = Number.parseFloat(profile.pending_amount || '0');
      const fallbackAmount = Number.parseFloat(profile.total_amount_due || '0');
      setPaymentDetails({
        amount: pendingAmount > 0 ? pendingAmount : fallbackAmount,
        email: profile.email || '',
        phone: profile.phone_number || '',
        plan: profile.plan || '',
      });
    } catch {
      toast.error('Failed to load payment details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentDetails();
  }, []);

  const amountLabel = paymentDetails.amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const handlePayNow = async () => {
    setIsPaying(true);
    try {
      const scriptReady = await loadRazorpayScript();
      if (!scriptReady || !window.Razorpay) {
        toast.error('Unable to load Razorpay Checkout. Please check your internet connection.');
        return;
      }

      const order = await paymentService.createRazorpayOrder();
      if (order.key_mode === 'test') {
        toast.error('Razorpay is in test mode. Real PhonePe/GPay apps cannot verify test UPI QR codes.');
      }
      const checkout = new window.Razorpay({
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: order.name,
        description: order.description,
        order_id: order.order_id,
        prefill: order.prefill,
        notes: {
          plan: paymentDetails.plan,
        },
        theme: {
          color: '#0f4c81',
        },
        method: {
          upi: true,
          card: true,
          netbanking: true,
          wallet: true,
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await paymentService.verifyRazorpayPayment(response);
            setIsPaid(true);
            toast.success('Payment verified successfully.');
            await loadPaymentDetails();
          } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Payment verification failed.');
          }
        },
        modal: {
          ondismiss: () => {
            toast.error('Payment was not completed.');
          },
        },
      });

      checkout.open();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Unable to start Razorpay payment.');
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="min-h-16 border-b border-white/10 bg-slate-900 px-5 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <div className="flex items-center gap-2 text-sm font-black">
          <CreditCard size={18} className="text-vyapaar-saffron" />
          VyapaarBills Razorpay Payment
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-emerald-300">
          <ShieldCheck size={16} /> Signature verified
        </div>
      </header>

      <main className="flex-1 bg-slate-100 text-slate-900 p-4 md:p-8">
        {isLoading ? (
          <div className="min-h-[70vh] flex items-center justify-center">
            <Loader2 className="animate-spin text-vyapaar-blue" size={38} />
          </div>
        ) : isPaid ? (
          <section className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center shadow-sm border border-slate-200">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-vyapaar-emerald">
              <CheckCircle2 size={44} />
            </div>
            <h1 className="text-3xl font-black text-slate-950">Payment Successful</h1>
            <p className="mt-3 text-sm font-semibold text-slate-500">
              Razorpay verified the payment and your account payment status was updated automatically.
            </p>
            <button type="button" onClick={() => navigate('/')} className="btn-primary mx-auto mt-7 px-7 py-3 font-black">
              Go to Dashboard
            </button>
          </section>
        ) : (
          <section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_0.85fr]">
            <div className="rounded-2xl bg-white p-6 md:p-8 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
                <div className="rounded-xl bg-blue-50 p-3 text-vyapaar-blue">
                  <IndianRupee size={26} />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-950">Pay Pending Amount</h1>
                  <p className="text-sm font-semibold text-slate-500">Use the Razorpay Checkout window, not a separate QR scanner.</p>
                </div>
              </div>

              <div className="mt-7 rounded-2xl border border-vyapaar-blue/20 bg-blue-50 p-6">
                <div className="text-sm font-black uppercase tracking-wider text-vyapaar-blue">Amount locked for payment</div>
                <div className="mt-3 text-5xl font-black text-slate-950">Rs {amountLabel}</div>
                <p className="mt-3 text-sm font-semibold text-slate-600">
                  When Razorpay Checkout opens, PhonePe/GPay/UPI receives this amount from the Razorpay order. If you use test keys, real UPI apps may show an unverifiable QR.
                </p>
              </div>

              <button
                type="button"
                onClick={handlePayNow}
                disabled={isPaying || paymentDetails.amount <= 0}
                className="btn-primary mt-7 w-full justify-center py-4 text-base font-black disabled:opacity-60"
              >
                {isPaying ? <Loader2 className="animate-spin" size={20} /> : <CreditCard size={20} />}
                Pay Rs {amountLabel}
              </button>
            </div>

            <aside className="rounded-2xl bg-white p-6 md:p-8 shadow-sm border border-slate-200">
              <div className="text-xs font-black uppercase tracking-wider text-slate-400">Account details</div>
              <div className="mt-5 space-y-3 text-sm font-bold text-slate-600">
                <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <Mail size={17} className="text-vyapaar-blue" />
                  <span>{paymentDetails.email || 'No email'}</span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <Phone size={17} className="text-vyapaar-blue" />
                  <span>{paymentDetails.phone || 'No phone'}</span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 capitalize">
                  {paymentDetails.plan || 'Plan'} plan
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                After successful payment, the backend verifies the Razorpay signature and updates your paid amount in the database automatically.
              </div>
            </aside>
          </section>
        )}
      </main>
    </div>
  );
};
