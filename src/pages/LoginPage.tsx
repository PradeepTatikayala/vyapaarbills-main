import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import {
  LogIn, Loader2, Store, ShoppingBag, Shirt, Layers,
  Eye, EyeOff, Lock, Mail, Check, Zap, Star, Building2
} from 'lucide-react';

import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

const plans = [
  {
    name: 'Basic',
    price: '₹1,000',
    period: '/month',
    subtitle: 'Below ₹1 Cr Income',
    color: '#e55a1b',
    bg: '#fff3ee',
    border: '#fdd0bb',
    icon: Store,
    features: ['3 Bills / month', 'GST Invoicing', 'Barcode Generator', 'WhatsApp Sharing'],
    badge: null,
  },
  {
    name: 'Medium',
    price: '₹2,500',
    period: '/month',
    subtitle: 'Above ₹1 Cr Income',
    color: '#1e2d6b',
    bg: '#eef0fb',
    border: '#c7ccee',
    icon: Star,
    features: ['5 Bills / month', 'All Basic Features', 'HSN Auto-Lookup', 'Priority Support'],
    badge: 'POPULAR',
  },
  {
    name: 'Custom',
    price: "Let's Talk",
    period: '',
    subtitle: 'Above ₹3 Cr Income',
    color: '#1a1a2e',
    bg: '#f5f6fa',
    border: '#e0e3f0',
    icon: Building2,
    features: ['Unlimited Bills', 'All Medium Features', 'Dedicated Manager', 'Custom Integrations'],
    badge: 'ENTERPRISE',
  },
];

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Pranam! Welcome back to VyapaarBills.');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Invalid credentials. Please verify your email/password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden flex flex-col font-sans" style={{ background: '#f5f6fa' }}>

      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-[420px] h-[420px] rounded-full opacity-[0.07] pointer-events-none z-0"
        style={{ background: '#1e2d6b', filter: 'blur(100px)' }} />
      <div className="absolute bottom-0 left-0 w-[320px] h-[320px] rounded-full opacity-[0.05] pointer-events-none z-0"
        style={{ background: '#e55a1b', filter: 'blur(90px)' }} />

      {/* Navigation Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between relative z-10">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-all duration-300"
            style={{ background: 'linear-gradient(135deg, #1e2d6b, #2d3f8f)' }}>
            <Store size={22} className="group-hover:rotate-6 transition-transform duration-300" />
          </div>
          <span className="font-display text-2xl font-bold tracking-tight">
            <span style={{ color: '#1e2d6b' }}>vyapaar</span>
            <span style={{ color: '#e55a1b' }}>bills</span>
            <span className="text-sm font-semibold ml-0.5" style={{ color: '#1e2d6b' }}>.com</span>
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-xs sm:text-sm text-gray-500 hidden sm:inline">New to vyapaarbills?</span>
          <Link
            to="/register"
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 shadow-sm hover:shadow-md border"
            style={{ borderColor: '#1e2d6b', color: '#1e2d6b', background: 'white' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1e2d6b'; (e.currentTarget as HTMLElement).style.color = 'white'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'white'; (e.currentTarget as HTMLElement).style.color = '#1e2d6b'; }}
          >
            Register Store
          </Link>
        </div>
      </header>

      {/* ─── Hero + Login Grid ─── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-6 lg:py-14 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center relative z-10">

        {/* Left Column */}
        <section className="lg:col-span-7 flex flex-col justify-center order-last lg:order-first">

          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full w-fit mb-6 shadow-sm border"
            style={{ background: 'white', borderColor: '#e0e3f0' }}
          >
            <span className="text-sm">🇮🇳</span>
            <span className="text-xs sm:text-sm font-medium tracking-wide" style={{ color: '#1e2d6b' }}>
              Designed for Indian Shopkeepers &amp; Vyapaaris
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6"
            style={{ color: '#1a1a2e' }}
          >
            Digitalize Your <span style={{ color: '#e55a1b' }}>Vyapaar</span>,{' '}
            <br className="hidden sm:inline" />
            Invoice in <span style={{ color: '#1e2d6b' }}>1-Click</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base sm:text-lg max-w-xl mb-10 leading-relaxed text-gray-500"
          >
            Experience swift GST billing, automatic barcode generation, smart HSN lookup, and WhatsApp invoice sharing. Seeded with over 890+ authentic retail goods for instant setup!
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="space-y-4 max-w-2xl"
          >
            {/* Kirana */}
            <div className="p-4 rounded-2xl flex gap-4 group shadow-sm hover:shadow-md transition-all duration-300 border"
              style={{ background: 'white', borderColor: '#e0e3f0' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300"
                style={{ background: '#fff3ee', border: '1px solid #fdd0bb', color: '#e55a1b' }}>
                <ShoppingBag size={22} />
              </div>
              <div>
                <h3 className="font-semibold text-base sm:text-lg mb-1 flex items-center gap-2" style={{ color: '#1a1a2e' }}>
                  Grocery &amp; Kirana Stores
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#fff3ee', color: '#e55a1b', border: '1px solid #fdd0bb' }}>Auto Catalog</span>
                </h3>
                <p className="text-sm text-gray-500">Select your grocery categories and instantly see pre-seeded items. Quick search by name or barcode, automatic HSN loading, and dynamic stock levels.</p>
              </div>
            </div>

            {/* Garments */}
            <div className="p-4 rounded-2xl flex gap-4 group shadow-sm hover:shadow-md transition-all duration-300 border"
              style={{ background: 'white', borderColor: '#e0e3f0' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300"
                style={{ background: '#eef0fb', border: '1px solid #c7ccee', color: '#1e2d6b' }}>
                <Shirt size={22} />
              </div>
              <div>
                <h3 className="font-semibold text-base sm:text-lg mb-1 flex items-center gap-2" style={{ color: '#1a1a2e' }}>
                  Readymade Garment Shops
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#eef0fb', color: '#1e2d6b', border: '1px solid #c7ccee' }}>Barcode Generator</span>
                </h3>
                <p className="text-sm text-gray-500">Generate unique 13-digit EAN barcodes starting with 890 (India), print tags, set custom MRP margins, and filter by apparel size &amp; category formats.</p>
              </div>
            </div>

            {/* Fancy */}
            <div className="p-4 rounded-2xl flex gap-4 group shadow-sm hover:shadow-md transition-all duration-300 border"
              style={{ background: 'white', borderColor: '#e0e3f0' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300"
                style={{ background: '#eef0fb', border: '1px solid #c7ccee', color: '#1e2d6b' }}>
                <Layers size={22} />
              </div>
              <div>
                <h3 className="font-semibold text-base sm:text-lg mb-1 flex items-center gap-2" style={{ color: '#1a1a2e' }}>
                  Fancy Shops &amp; Small Retail
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#eef0fb', color: '#1e2d6b', border: '1px solid #c7ccee' }}>GST &amp; Composite</span>
                </h3>
                <p className="text-sm text-gray-500">Choose Regular GST scheme or Composite flat-rate billing. Send invoices directly to customers on WhatsApp, track active sales, and enjoy fast checkout.</p>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.5 }}
            className="grid grid-cols-3 gap-4 mt-10 pt-8 max-w-xl border-t" style={{ borderColor: '#e0e3f0' }}
          >
            {/* <div>
              <div className="text-2xl font-bold font-display" style={{ color: '#1a1a2e' }}>10,000+</div>
              <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mt-1">Vyapaars Active</div>
            </div> */}
            <div>
              <div className="text-2xl font-bold font-display" style={{ color: '#e55a1b' }}>1-Click</div>
              <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mt-1">GST Billing</div>
            </div>
            <div>
              <div className="text-2xl font-bold font-display" style={{ color: '#1e2d6b' }}>100% Safe</div>
              <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mt-1">Cloud Protected</div>
            </div>
          </motion.div>
        </section>

        {/* Right Column: Login Card */}
        <section className="lg:col-span-5 relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, type: 'spring', stiffness: 100 }}
            className="w-full"
          >
            <div className="relative rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-10 border"
              style={{ background: 'white', borderColor: '#e0e3f0', boxShadow: '0 20px 60px rgba(30,45,107,0.12)' }}>

              {/* Gradient top bar */}
              <div className="absolute top-0 left-0 right-0 h-[4px]"
                style={{ background: 'linear-gradient(90deg, #1e2d6b 0%, #e55a1b 100%)' }} />

              {/* Login Title — Shop Icon */}
              <div className="text-center mb-8 pt-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl text-white shadow-xl mb-4"
                  style={{ background: 'linear-gradient(135deg, #1e2d6b, #2d3f8f)', boxShadow: '0 8px 24px rgba(30,45,107,0.35)' }}>
                  <Store size={30} />
                </div>
                <h2 className="text-2xl font-extrabold font-display mb-1.5" style={{ color: '#1a1a2e' }}>Welcome, Vyapaari!</h2>
                <p className="text-sm text-gray-500">Securely login to manage your bills on vyapaarbills.com</p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#1e2d6b' }}>Email Address</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"><Mail size={18} /></div>
                    <input
                      type="email"
                      className="w-full rounded-xl pl-11 pr-4 py-3.5 text-sm sm:text-base font-medium transition-all duration-300 outline-none border"
                      style={{ background: '#f5f6fa', borderColor: '#d1d5e8', color: '#1a1a2e' }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#1e2d6b'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,45,107,0.1)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#d1d5e8'; e.currentTarget.style.boxShadow = 'none'; }}
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: '#1e2d6b' }}>Password</label>
                    <a href="#" className="text-xs font-semibold transition-colors" style={{ color: '#e55a1b' }}>Forgot Password?</a>
                  </div>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"><Lock size={18} /></div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="w-full rounded-xl pl-11 pr-12 py-3.5 text-sm sm:text-base font-medium transition-all duration-300 outline-none border"
                      style={{ background: '#f5f6fa', borderColor: '#d1d5e8', color: '#1a1a2e' }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#1e2d6b'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,45,107,0.1)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#d1d5e8'; e.currentTarget.style.boxShadow = 'none'; }}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-1 transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full text-white font-extrabold rounded-xl py-3.5 transition-all duration-300 flex items-center justify-center gap-2.5 text-sm sm:text-base tracking-wider uppercase cursor-pointer disabled:opacity-60"
                  style={{ background: isLoading ? '#aaa' : 'linear-gradient(135deg, #e55a1b, #c94d14)', boxShadow: '0 4px 20px rgba(229,90,27,0.35)' }}
                >
                  {isLoading
                    ? <><Loader2 className="animate-spin" size={20} /><span>Verifying...</span></>
                    : <><LogIn size={20} /><span>Secure Login</span></>
                  }
                </motion.button>
              </form>

              <div className="mt-8 text-center text-sm pt-6 border-t" style={{ borderColor: '#e0e3f0' }}>
                <span className="text-gray-500">New Store Owner? </span>
                <Link to="/register" className="font-bold hover:underline transition-all" style={{ color: '#e55a1b' }}>
                  Register Your Shop
                </Link>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      {/* ─── Plans Section ─── */}
      <section className="w-full max-w-7xl mx-auto px-6 pb-16 pt-6 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full w-fit mx-auto mb-4 border"
            style={{ background: '#eef0fb', borderColor: '#c7ccee' }}>
            <Zap size={14} style={{ color: '#1e2d6b' }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#1e2d6b' }}>Transparent Pricing</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-display mb-3" style={{ color: '#1a1a2e' }}>
            Simple Plans for Every <span style={{ color: '#e55a1b' }}>Vyapaari</span>
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto">
            No hidden charges. Pick a plan that matches your shop's scale. Upgrade or downgrade anytime.
          </p>
        </motion.div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, i) => {
            const Icon = plan.icon;
            const isPopular = plan.badge === 'POPULAR';
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * i }}
                className="relative rounded-2xl p-6 border-2 flex flex-col gap-5 transition-all duration-300 hover:shadow-xl"
                style={{
                  background: isPopular ? '#1e2d6b' : 'white',
                  borderColor: isPopular ? '#1e2d6b' : '#e0e3f0',
                  boxShadow: isPopular ? '0 20px 50px rgba(30,45,107,0.25)' : '0 4px 20px rgba(30,45,107,0.06)',
                  transform: isPopular ? 'scale(1.03)' : 'scale(1)',
                }}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute top-4 right-4 text-[10px] font-extrabold px-2.5 py-1 rounded-full tracking-wider"
                    style={{
                      background: isPopular ? '#e55a1b' : '#eef0fb',
                      color: isPopular ? 'white' : '#1e2d6b',
                    }}>
                    {plan.badge}
                  </div>
                )}

                {/* Icon + Name */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: isPopular ? 'rgba(255,255,255,0.12)' : plan.bg,
                      border: `1px solid ${isPopular ? 'rgba(255,255,255,0.2)' : plan.border}`,
                      color: isPopular ? 'white' : plan.color,
                    }}>
                    <Icon size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight" style={{ color: isPopular ? 'white' : '#1a1a2e' }}>{plan.name}</h3>
                    <p className="text-xs mt-0.5" style={{ color: isPopular ? 'rgba(255,255,255,0.6)' : '#9ca3af' }}>{plan.subtitle}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="border-t border-b py-4" style={{ borderColor: isPopular ? 'rgba(255,255,255,0.15)' : '#f0f1f7' }}>
                  <span className="text-3xl font-extrabold font-display" style={{ color: isPopular ? 'white' : plan.color }}>
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-sm ml-1" style={{ color: isPopular ? 'rgba(255,255,255,0.5)' : '#9ca3af' }}>{plan.period}</span>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2.5 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm font-medium"
                      style={{ color: isPopular ? 'rgba(255,255,255,0.85)' : '#4b5563' }}>
                      <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: isPopular ? 'rgba(229,90,27,0.25)' : '#fff3ee' }}>
                        <Check size={12} style={{ color: isPopular ? '#ffb899' : '#e55a1b' }} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {plan.name === 'Custom' ? (
                  <Link
                    to="/register?plan=custom"
                    className="block text-center font-bold py-3 rounded-xl text-sm tracking-wide transition-all duration-300 hover:shadow-lg"
                    style={{ background: '#eef0fb', color: '#1e2d6b', border: '1px solid #c7ccee' }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = '#1e2d6b';
                      (e.currentTarget as HTMLElement).style.color = 'white';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = '#eef0fb';
                      (e.currentTarget as HTMLElement).style.color = '#1e2d6b';
                    }}
                  >
                    Register Custom Plan
                  </Link>
                ) : (
                  <Link
                    to="/register"
                    className="block text-center font-bold py-3 rounded-xl text-sm tracking-wide transition-all duration-300 hover:shadow-lg"
                    style={
                      isPopular
                        ? { background: 'linear-gradient(135deg, #e55a1b, #c94d14)', color: 'white', boxShadow: '0 4px 14px rgba(229,90,27,0.4)' }
                        : { background: '#eef0fb', color: '#1e2d6b', border: '1px solid #c7ccee' }
                    }
                    onMouseEnter={e => {
                      if (!isPopular) {
                        (e.currentTarget as HTMLElement).style.background = '#1e2d6b';
                        (e.currentTarget as HTMLElement).style.color = 'white';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isPopular) {
                        (e.currentTarget as HTMLElement).style.background = '#eef0fb';
                        (e.currentTarget as HTMLElement).style.color = '#1e2d6b';
                      }
                    }}
                  >
                    Get Started
                  </Link>
                )}
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 mt-auto text-center text-xs text-gray-400 relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t" style={{ borderColor: '#e0e3f0' }}>
        <div>
          &copy; {new Date().getFullYear()}{' '}
          <span className="font-semibold" style={{ color: '#1e2d6b' }}>vyapaarbills.com</span>. All rights reserved.
        </div>
        <div className="flex gap-6">
          <a href="#" className="hover:text-gray-600 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-gray-600 transition-colors">Terms of Service</a>
          <Link to="/support" className="hover:text-gray-600 transition-colors">Help &amp; Support</Link>
        </div>
      </footer>
    </div>
  );
};
