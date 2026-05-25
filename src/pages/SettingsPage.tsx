import { type FormEvent, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Loader2,
  Mail,
  Moon,
  Phone,
  Save,
  Settings,
  ShieldAlert,
  Store,
  Sun,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { UiCard } from '../components/UiCard';
import { shopService, userService } from '../services/api';

type OutletContext = {
  dashboard?: any;
  refreshDashboard?: () => Promise<void>;
};

const applyTheme = (theme: 'light' | 'dark') => {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  localStorage.setItem('vyapaar-theme', theme);
};

export const SettingsPage = () => {
  const outlet = useOutletContext<OutletContext>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return localStorage.getItem('vyapaar-theme') === 'dark' ? 'dark' : 'light';
  });
  const [shopId, setShopId] = useState<number | null>(null);
  const [shopForm, setShopForm] = useState({
    name: '',
    shop_type: 'general',
    dealer_type: 'regular',
    address: '',
    gst_number: '',
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const loadShop = async () => {
      try {
        const data = outlet.dashboard || await userService.getDashboard();
        const shop = data?.shop;
        if (shop) {
          setShopId(shop.id);
          setShopForm({
            name: shop.name || '',
            shop_type: shop.shop_type || 'general',
            dealer_type: shop.dealer_type || 'regular',
            address: shop.address || '',
            gst_number: shop.gst_number || '',
          });
        }
      } catch {
        toast.error('Failed to load shop settings.');
      } finally {
        setIsLoading(false);
      }
    };

    loadShop();
  }, [outlet.dashboard]);

  const handleSaveSettings = async (event: FormEvent) => {
    event.preventDefault();
    if (!shopId) {
      toast.error('Shop record not found.');
      return;
    }

    setIsSaving(true);
    try {
      await shopService.update(shopId, {
        name: shopForm.name,
        shop_type: shopForm.shop_type,
        dealer_type: shopForm.dealer_type,
        address: shopForm.address,
      });
      await outlet.refreshDashboard?.();
      toast.success('Settings updated successfully.');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-vyapaar-blue" size={44} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSaveSettings} className="p-8 pb-24 max-w-5xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-3xl font-black text-vyapaar-text mb-2 flex items-center gap-2">
            <Settings className="text-vyapaar-blue" size={32} /> Settings
          </h1>
          <p className="text-slate-500 font-medium">Update shop details, theme, and support contact information.</p>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="btn-primary px-5 py-2.5 text-sm font-extrabold"
        >
          {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <UiCard className="p-6 bg-white border border-slate-100 rounded-2xl space-y-6">
          <h3 className="font-extrabold text-lg text-vyapaar-text flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sun size={18} className="text-vyapaar-blue" /> Appearance
          </h3>

          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-black flex items-center justify-center gap-1.5 transition-all ${
                theme === 'light' ? 'bg-white text-vyapaar-blue shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sun size={16} /> Light
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-black flex items-center justify-center gap-1.5 transition-all ${
                theme === 'dark' ? 'bg-white text-vyapaar-blue shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Moon size={16} /> Dark
            </button>
          </div>
        </UiCard>

        <UiCard className="p-6 bg-white border border-slate-100 rounded-2xl space-y-6">
          <h3 className="font-extrabold text-lg text-vyapaar-text flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldAlert size={18} className="text-vyapaar-saffron" /> GST Approval
          </h3>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">GST Number</label>
            <input
              value={shopForm.gst_number && shopForm.gst_number !== 'PENDING_GST' ? shopForm.gst_number : 'Pending admin approval'}
              readOnly
              className="input-field bg-slate-100 font-mono cursor-not-allowed"
            />
            <p className="mt-2 text-xs font-semibold text-slate-500">
              Customers cannot edit GSTIN. Admin must add it from the admin panel before portal tools are unlocked.
            </p>
          </div>
        </UiCard>

        <UiCard className="p-6 bg-white border border-slate-100 rounded-2xl space-y-6 md:col-span-2">
          <h3 className="font-extrabold text-lg text-vyapaar-text flex items-center gap-2 border-b border-slate-100 pb-3">
            <Store size={18} className="text-vyapaar-blue" /> Shop Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Shop Name</label>
              <input
                value={shopForm.name}
                onChange={(event) => setShopForm({ ...shopForm, name: event.target.value })}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Shop Type</label>
              <select
                value={shopForm.shop_type}
                onChange={(event) => setShopForm({ ...shopForm, shop_type: event.target.value })}
                className="input-field"
              >
                <option value="general">General Store / Kirana</option>
                <option value="fancy">Fancy Shop / Boutique</option>
                <option value="readymade">Readymade / Garment Shop</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Dealer Type</label>
              <select
                value={shopForm.dealer_type}
                onChange={(event) => setShopForm({ ...shopForm, dealer_type: event.target.value })}
                className="input-field"
              >
                <option value="regular">Regular Dealer</option>
                <option value="composite">Composite Dealer</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Shop Address</label>
              <textarea
                value={shopForm.address}
                onChange={(event) => setShopForm({ ...shopForm, address: event.target.value })}
                className="input-field min-h-[110px] resize-none"
                required
              />
            </div>
          </div>
        </UiCard>

        <UiCard className="p-6 bg-white border border-slate-100 rounded-2xl space-y-6 md:col-span-2">
          <h3 className="font-extrabold text-lg text-vyapaar-text flex items-center gap-2 border-b border-slate-100 pb-3">
            <Phone size={18} className="text-vyapaar-blue" /> Support Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a href="tel:9133410628" className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 hover:border-vyapaar-blue hover:bg-blue-50 transition-colors">
              <span className="w-10 h-10 rounded-full bg-vyapaar-blue text-white flex items-center justify-center shrink-0">
                <Phone size={18} />
              </span>
              <span>
                <span className="block text-xs font-black text-slate-400 uppercase tracking-wider">Phone Support</span>
                <span className="block font-black text-vyapaar-text">9133410628</span>
              </span>
            </a>

            <a href="mailto:vyapaarbills@gmail.com" className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 hover:border-vyapaar-blue hover:bg-blue-50 transition-colors">
              <span className="w-10 h-10 rounded-full bg-vyapaar-saffron text-white flex items-center justify-center shrink-0">
                <Mail size={18} />
              </span>
              <span>
                <span className="block text-xs font-black text-slate-400 uppercase tracking-wider">Email Support</span>
                <span className="block font-black text-vyapaar-text">vyapaarbills@gmail.com</span>
              </span>
            </a>
          </div>
        </UiCard>
      </div>
    </form>
  );
};
