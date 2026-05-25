import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Mail, Send, Store } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_c1c10c5';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_ulziyqu';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '84sEoMHhfCVHKizVD';
const SUPPORT_EMAIL = 'vyapaarbills@gmail.com';

export const SupportPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    shop_name: '',
    shop_type: 'general',
    description: '',
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!EMAILJS_SERVICE_ID || !EMAILJS_PUBLIC_KEY) {
      toast.error('EmailJS is not configured. Please add Service ID and Public Key.');
      return;
    }

    setIsSubmitting(true);
    try {
      const submittedAt = new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: EMAILJS_SERVICE_ID,
          template_id: EMAILJS_TEMPLATE_ID,
          user_id: EMAILJS_PUBLIC_KEY,
          template_params: {
            title: `Support Ticket - ${formData.shop_name}`,
            name: formData.customer_name,
            time: submittedAt,
            message: [
              `Shop Name: ${formData.shop_name}`,
              `Shop Type: ${formData.shop_type}`,
              '',
              'Description:',
              formData.description,
              '',
              `Send support response to: ${SUPPORT_EMAIL}`,
            ].join('\n'),
            to_email: SUPPORT_EMAIL,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'EmailJS request failed');
      }

      toast.success('Support ticket submitted successfully.');
      setFormData({
        customer_name: '',
        shop_name: '',
        shop_type: 'general',
        description: '',
      });
      navigate(isAuthenticated ? '/' : '/login', { replace: true });
    } catch (error: any) {
      const message = String(error?.message || '');
      if (message.includes('Gmail_API') || message.toLowerCase().includes('scope')) {
        toast.error('EmailJS Gmail service needs to be reconnected with send-mail permission.');
      } else {
        toast.error(message || 'Failed to submit support ticket.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-vyapaar-blue to-vyapaar-saffron" />
        <div className="p-6 sm:p-10">
          <div className="flex items-start justify-between gap-4 mb-8 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-vyapaar-blue text-white flex items-center justify-center shadow-sm">
                <Mail size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-vyapaar-text">Help & Support</h1>
                <p className="text-sm text-slate-500 font-semibold">Submit a support ticket to vyapaarbills@gmail.com.</p>
              </div>
            </div>
            <Link to={isAuthenticated ? '/' : '/login'} className="text-sm font-bold text-vyapaar-blue hover:underline flex items-center gap-1">
              <ArrowLeft size={16} /> Back
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Customer Name</label>
              <input
                className="input-field"
                value={formData.customer_name}
                onChange={(event) => setFormData({ ...formData, customer_name: event.target.value })}
                placeholder="Enter customer name"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Shop Name</label>
                <input
                  className="input-field"
                  value={formData.shop_name}
                  onChange={(event) => setFormData({ ...formData, shop_name: event.target.value })}
                  placeholder="Enter shop name"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Shop Type</label>
                <select
                  className="input-field"
                  value={formData.shop_type}
                  onChange={(event) => setFormData({ ...formData, shop_type: event.target.value })}
                  required
                >
                  <option value="general">General Store / Kirana</option>
                  <option value="fancy">Fancy Shop / Boutique</option>
                  <option value="readymade">Readymade / Garment Shop</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Description</label>
              <textarea
                className="input-field min-h-[150px] resize-none"
                value={formData.description}
                onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                placeholder="Describe the issue or request"
                required
              />
            </div>

            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 flex items-start gap-3">
              <Store size={20} className="text-vyapaar-blue shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                Support phone: <a className="font-black text-vyapaar-blue hover:underline" href="tel:9133410628">9133410628</a>.
                Your submitted ticket will be sent to <span className="font-black">vyapaarbills@gmail.com</span>.
              </p>
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3.5 font-black">
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              Submit Support Ticket
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
