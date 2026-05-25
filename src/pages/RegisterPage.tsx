import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Check, Loader2, Store } from 'lucide-react';
import { authService, shopService, userService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const CUSTOM_PLAN_PHONE = '9133410628';

export const RegisterPage = () => {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    password: '',
    shopName: '',
    address: '',
    plan: searchParams.get('plan') === 'custom' ? 'custom' : 'basic',
    shopType: 'general',
    dealerType: 'regular',
    acceptedTerms: false
  });

  const { setToken } = useAuth();
  const navigate = useNavigate();

  const handleNext = () => setStep(prev => Math.min(prev + 1, 3));
  const handlePrev = () => setStep(prev => prev - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      handleNext();
      return;
    }
    if (!formData.acceptedTerms) {
      toast.error('Please accept the Terms and Conditions to continue.');
      return;
    }
    setIsLoading(true);
    try {
      await authService.register({
        email: formData.email || formData.mobile + '@temp.com',
        password: formData.password,
        phone_number: formData.mobile,
      });
      const authRes = await authService.login(formData.email || formData.mobile + '@temp.com', formData.password);
      setToken(authRes.token);
      await shopService.create({
        name: formData.shopName,
        shop_type: formData.shopType,
        dealer_type: formData.dealerType,
        address: formData.address,
        gst_number: 'PENDING_GST'
      });
      await userService.updatePlan(formData.plan);
      if (formData.plan === 'custom') {
        toast.success('Shop registered. Please call us to activate your custom plan.');
      } else {
        toast.success('Shop registered successfully! Welcome to VyapaarBills.');
      }
      navigate('/');
    } catch (error: any) {
      toast.error('Registration failed. Please check your details or try again.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full rounded-xl px-4 py-3 text-sm sm:text-base font-medium outline-none border transition-all duration-300";
  const inputStyle = { background: '#f5f6fa', borderColor: '#d1d5e8', color: '#1a1a2e' };
  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = '#1e2d6b';
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,45,107,0.1)';
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = '#d1d5e8';
    e.currentTarget.style.boxShadow = 'none';
  };

  return (
    <div className="min-h-screen overflow-x-hidden flex flex-col items-center justify-center p-4 py-10 font-sans relative"
      style={{ background: '#f5f6fa' }}>

      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full pointer-events-none z-0 opacity-[0.07]"
        style={{ background: '#1e2d6b', filter: 'blur(100px)' }} />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full pointer-events-none z-0 opacity-[0.05]"
        style={{ background: '#e55a1b', filter: 'blur(90px)' }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl relative z-10"
      >
        <div className="relative rounded-3xl overflow-hidden p-6 sm:p-10 border"
          style={{ background: 'white', borderColor: '#e0e3f0', boxShadow: '0 20px 60px rgba(30,45,107,0.12)' }}>

          {/* Top gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-[4px]"
            style={{ background: 'linear-gradient(90deg, #1e2d6b 0%, #e55a1b 100%)' }} />

          {/* Header */}
          <div className="mb-8 flex items-center gap-4 pb-6 border-b" style={{ borderColor: '#e0e3f0' }}>
            <div className="w-12 h-12 rounded-xl text-white flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #1e2d6b, #2d3f8f)' }}>
              <Store size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight font-display" style={{ color: '#1a1a2e' }}>Register Your Shop</h1>
              <p className="text-sm text-gray-500">Start your digital GST billing journey in 3 easy steps.</p>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-between mb-10 relative px-2">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] -z-10 rounded" style={{ background: '#e0e3f0' }} />
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] -z-10 rounded transition-all duration-500"
              style={{ width: `${(step - 1) * 50}%`, background: '#e55a1b' }}
            />
            {[1, 2, 3].map((num) => (
              <div
                key={num}
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300"
                style={
                  step >= num
                    ? { background: 'linear-gradient(135deg, #e55a1b, #c94d14)', color: 'white', boxShadow: '0 4px 12px rgba(229,90,27,0.35)' }
                    : { background: 'white', color: '#9ca3af', border: '2px solid #e0e3f0' }
                }
              >
                {step > num ? <Check size={18} /> : num}
              </div>
            ))}
          </div>

          {/* Step Contents */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="min-h-[300px]">
              <AnimatePresence mode="wait">

                {/* STEP 1 */}
                {step === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-5">
                    <h2 className="text-xl font-bold font-display mb-4" style={{ color: '#1a1a2e' }}>Owner Details</h2>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#1e2d6b' }}>Full Name</label>
                      <input type="text" className={inputClass} style={inputStyle} onFocus={handleFocus} onBlur={handleBlur}
                        placeholder="e.g. Ramesh Kumar" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#1e2d6b' }}>Mobile Number</label>
                        <input type="tel" className={inputClass} style={inputStyle} onFocus={handleFocus} onBlur={handleBlur}
                          placeholder="10-digit number" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} required />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#1e2d6b' }}>Email (Optional)</label>
                        <input type="email" className={inputClass} style={inputStyle} onFocus={handleFocus} onBlur={handleBlur}
                          placeholder="Email address" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#1e2d6b' }}>Create Password</label>
                      <input type="password" className={inputClass} style={inputStyle} onFocus={handleFocus} onBlur={handleBlur}
                        placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
                    </div>
                  </motion.div>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-5">
                    <h2 className="text-xl font-bold font-display mb-4" style={{ color: '#1a1a2e' }}>Shop Details</h2>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#1e2d6b' }}>Shop Name</label>
                      <input type="text" className={inputClass} style={inputStyle} onFocus={handleFocus} onBlur={handleBlur}
                        placeholder="e.g. Ramesh Kirana Store" value={formData.shopName} onChange={e => setFormData({...formData, shopName: e.target.value})} required />
                      <p className="mt-2 text-xs font-semibold text-gray-500">
                        GSTIN will be added by admin after verification. Portal tools stay locked until GSTIN is approved.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#1e2d6b' }}>Shop Type / Category</label>
                        <select className={inputClass} style={inputStyle} onFocus={handleFocus} onBlur={handleBlur}
                          value={formData.shopType} onChange={e => setFormData({...formData, shopType: e.target.value})} required>
                          <option value="general">General Store / Kirana</option>
                          <option value="fancy">Fancy Shop / Boutique</option>
                          <option value="readymade">Readymade / Garment Shop</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#1e2d6b' }}>GST Billing Scheme</label>
                        <select className={inputClass} style={inputStyle} onFocus={handleFocus} onBlur={handleBlur}
                          value={formData.dealerType} onChange={e => setFormData({...formData, dealerType: e.target.value})} required>
                          <option value="regular">Regular Dealer (CGST &amp; SGST)</option>
                          <option value="composite">Composite Dealer (Flat rate)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#1e2d6b' }}>Complete Shop Address</label>
                      <textarea
                        className={`${inputClass} min-h-[90px] resize-none`}
                        style={inputStyle}
                        onFocus={handleFocus} onBlur={handleBlur}
                        placeholder="Street name, Area name, City, State, Pincode"
                        value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required
                      />
                    </div>
                  </motion.div>
                )}

                {/* STEP 3 */}
                {step === 3 && (
                  <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-4">
                    <h2 className="text-xl font-bold font-display mb-2" style={{ color: '#1a1a2e' }}>Select Your Plan</h2>
                    <p className="text-sm text-gray-500 mb-6">Choose a plan that fits your shop's needs. Custom plans are activated after admin confirmation.</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                      {/* Basic */}
                      <label className="cursor-pointer">
                        <input type="radio" name="plan" className="peer sr-only" checked={formData.plan === 'basic'} onChange={() => setFormData({...formData, plan: 'basic'})} />
                        <div className="p-5 rounded-2xl border-2 transition-all duration-300 min-h-[170px] flex flex-col justify-between hover:shadow-md"
                          style={{ borderColor: formData.plan === 'basic' ? '#e55a1b' : '#e0e3f0', background: formData.plan === 'basic' ? '#fff3ee' : 'white' }}>
                          <div>
                            <h3 className="font-bold text-lg" style={{ color: '#1a1a2e' }}>Basic</h3>
                            <p className="text-[11px] text-gray-400 mt-1">Below ₹1 Cr Income</p>
                          </div>
                          <div>
                            <div className="mt-4 font-bold text-2xl" style={{ color: '#e55a1b' }}>
                              ₹1,000<span className="text-xs font-normal text-gray-400">/yr</span>
                            </div>
                            <div className="text-xs font-semibold mt-2 flex items-center gap-1.5 text-gray-500">
                              <Check size={14} style={{ color: '#1e2d6b' }} /> 3 Bills / month
                            </div>
                          </div>
                        </div>
                      </label>

                      {/* Medium */}
                      <label className="cursor-pointer relative">
                        <input type="radio" name="plan" className="peer sr-only" checked={formData.plan === 'medium'} onChange={() => setFormData({...formData, plan: 'medium'})} />
                        <div className="p-5 rounded-2xl border-2 transition-all duration-300 min-h-[170px] flex flex-col justify-between relative overflow-hidden hover:shadow-md"
                          style={{ borderColor: formData.plan === 'medium' ? '#e55a1b' : '#e0e3f0', background: formData.plan === 'medium' ? '#fff3ee' : 'white' }}>
                          <div className="absolute top-0 right-0 text-white text-[9px] font-extrabold px-2.5 py-0.5 rounded-bl-lg tracking-wider"
                            style={{ background: '#e55a1b' }}>POPULAR</div>
                          <div>
                            <h3 className="font-bold text-lg" style={{ color: '#1a1a2e' }}>Medium</h3>
                            <p className="text-[11px] text-gray-400 mt-1">Above ₹1 Cr Income</p>
                          </div>
                          <div>
                            <div className="mt-4 font-bold text-2xl" style={{ color: '#e55a1b' }}>
                              ₹2,500<span className="text-xs font-normal text-gray-400">/yr</span>
                            </div>
                            <div className="text-xs font-semibold mt-2 flex items-center gap-1.5 text-gray-500">
                              <Check size={14} style={{ color: '#1e2d6b' }} /> 5 Bills / month
                            </div>
                          </div>
                        </div>
                      </label>

                      {/* Custom */}
                      <label className="cursor-pointer">
                        <input type="radio" name="plan" className="peer sr-only" checked={formData.plan === 'custom'} onChange={() => setFormData({...formData, plan: 'custom'})} />
                        <div className="p-5 rounded-2xl border-2 transition-all duration-300 min-h-[170px] flex flex-col justify-between hover:shadow-md"
                          style={{ borderColor: formData.plan === 'custom' ? '#1e2d6b' : '#e0e3f0', background: formData.plan === 'custom' ? '#eef0fb' : 'white' }}>
                          <div>
                            <h3 className="font-bold text-lg" style={{ color: '#1a1a2e' }}>Custom</h3>
                            <p className="text-[11px] text-gray-400 mt-1">Above ₹3 Cr Income</p>
                          </div>
                          <div>
                            <div className="mt-4 font-bold text-xl" style={{ color: '#1e2d6b' }}>Let's Talk</div>
                            <div className="text-xs font-semibold mt-2 flex items-center gap-1.5 text-gray-500">
                              <Check size={14} style={{ color: '#1e2d6b' }} /> Call {CUSTOM_PLAN_PHONE}
                            </div>
                          </div>
                        </div>
                      </label>

                    </div>

                    <label className="mt-6 flex items-start gap-3 rounded-2xl border p-4 cursor-pointer" style={{ borderColor: formData.acceptedTerms ? '#1e2d6b' : '#e0e3f0', background: formData.acceptedTerms ? '#eef0fb' : 'white' }}>
                      <input
                        type="checkbox"
                        checked={formData.acceptedTerms}
                        onChange={e => setFormData({ ...formData, acceptedTerms: e.target.checked })}
                        className="mt-1 w-5 h-5 accent-[#1e2d6b]"
                        required
                      />
                      <span className="text-sm font-semibold text-gray-600 leading-relaxed">
                        I agree to the Terms and Conditions. I understand that admin approval is required for GSTIN/custom plan activation, and payments may require verification before account access is restored.
                      </span>
                    </label>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Navigation Footer */}
            <div className="flex justify-between mt-10 pt-6 border-t" style={{ borderColor: '#e0e3f0' }}>
              {step > 1 ? (
                <button type="button" onClick={handlePrev}
                  className="font-semibold rounded-xl px-5 py-3 transition-all duration-300 flex items-center gap-2 cursor-pointer border"
                  style={{ background: 'white', borderColor: '#d1d5e8', color: '#1e2d6b' }}>
                  <ArrowLeft size={18} /> Back
                </button>
              ) : (
                <Link to="/login" className="font-bold hover:underline flex items-center px-2 transition-all" style={{ color: '#e55a1b' }}>
                  Secure Login
                </Link>
              )}

              {step < 3 ? (
                <button type="button" onClick={handleNext}
                  className="text-white font-bold rounded-xl px-6 py-3 transition-all duration-300 flex items-center gap-2 cursor-pointer min-w-[140px] justify-center"
                  style={{ background: 'linear-gradient(135deg, #e55a1b, #c94d14)', boxShadow: '0 4px 16px rgba(229,90,27,0.35)' }}>
                  Next Step <ArrowRight size={18} />
                </button>
              ) : (
                <button type="submit" disabled={isLoading || !formData.acceptedTerms}
                  className="text-white font-bold rounded-xl px-6 py-3 transition-all duration-300 flex items-center gap-2 cursor-pointer min-w-[140px] justify-center disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #1e2d6b, #2d3f8f)', boxShadow: '0 4px 16px rgba(30,45,107,0.35)' }}>
                  {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Register Shop'}
                </button>
              )}
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
