import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Store, 
  Flame, 
  Loader2, 
  Check,
  Plus, 
  Trash2, 
  Download, 
  ArrowLeft, 
  ChevronRight, 
  ShieldCheck, 
  Sparkles
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { UiCard } from '../components/UiCard';
import { billingService, categoryService, userItemService, userService } from '../services/api';

export const BillingPage = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [shopProfile, setShopProfile] = useState<any>(null);
  
  // Step 1: Configuration Form State
  const [configForm, setConfigForm] = useState({
    shop_name: 'Sri Lakshmi Stores',
    shop_type: 'general',
    address: 'Main Road, Bengaluru, Karnataka - 560001',
    gst_number: '29ABCDE1234F1Z5',
    month: new Date().toISOString().slice(0, 7),
    target_amount: '50000',
    bills_per_day: '6'
  });

  // Step 2: Item Checklist State
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [isItemsLoading, setIsItemsLoading] = useState<boolean>(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isSeedingCategories, setIsSeedingCategories] = useState(false);

  // Step 4: Invoice Result state
  const [generationResult, setGenerationResult] = useState<any>(null);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [pdfDownloading, setPdfDownloading] = useState<boolean>(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const dash = await userService.getDashboard();
        setShopProfile(dash.shop);
        if (dash.shop) {
          setConfigForm(prev => ({
            ...prev,
            shop_name: dash.shop.name || prev.shop_name,
            shop_type: dash.shop.shop_type || prev.shop_type,
            address: dash.shop.address || prev.address,
            gst_number: dash.shop.gst_number || prev.gst_number
          }));
        }
      } catch (error) {
        toast.error('Failed to load profile details.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const loadCategoriesForModal = async () => {
    const categoryData = await categoryService.list();
    const uniqueByName = (categories: string[]) => {
      const seen = new Map<string, string>();
      categories.forEach((category) => {
        const cleaned = category.trim().replace(/\s+/g, ' ');
        if (cleaned) seen.set(cleaned.toLowerCase(), cleaned);
      });
      return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
    };
    const uniqueAvailable = uniqueByName((categoryData.available || []) as string[]);
    const uniqueSelected = uniqueByName((categoryData.selected || []) as string[]);
    setAvailableCategories(uniqueAvailable);
    setSelectedCategories(uniqueSelected);
  };

  const toggleSelectedCategory = (category: string) => {
    setSelectedCategories((current) => {
      const exists = current.some((entry) => entry.toLowerCase() === category.toLowerCase());
      if (exists) {
        return current.filter((entry) => entry.toLowerCase() !== category.toLowerCase());
      }
      return [...current, category].sort((a, b) => a.localeCompare(b));
    });
  };

  const loadReviewItems = async () => {
    setIsItemsLoading(true);
    setCurrentStep(2);
    try {
      const response = await userItemService.list({ is_active: true });
      if (response && response.length > 0) {
        const filtered = response.filter((ui: any) => ui.item_id && ui.selling_price);
        setItemsList(filtered.map((ui: any) => ({
          id: ui.id,
          user_item_id: ui.id,
          name: ui.name,
          mrp: ui.mrp,
          selling_price: ui.selling_price,
          gst_percent: ui.gst_percent
        })));
      } else {
        await loadCategoriesForModal();
        setShowCategoryModal(true);
        setItemsList([]);
      }
    } catch (error) {
      toast.error('Failed to load item catalog.');
    } finally {
      setIsItemsLoading(false);
    }
  };

  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configForm.shop_name.trim()) return toast.error('Shop Name is required');
    if (!configForm.gst_number.trim()) return toast.error('GSTIN is required');
    if (!configForm.address.trim()) return toast.error('Address is required');
    const target = parseFloat(configForm.target_amount);
    const bpd = parseInt(configForm.bills_per_day);
    if (isNaN(target) || target <= 0) return toast.error('Target amount must be positive');
    if (isNaN(bpd) || bpd < 1 || bpd > 40) return toast.error('Bills per day must be between 1 and 40');
    await loadReviewItems();
  };

  const handleSeedCategories = async () => {
    if (selectedCategories.length === 0) return toast.error('Select at least one category.');
    setIsSeedingCategories(true);
    try {
      await categoryService.save(selectedCategories);
      setShowCategoryModal(false);
      toast.success('Products mapped into your billing checklist.');
      await loadReviewItems();
    } catch (error) {
      toast.error('Failed to seed selected categories.');
    } finally {
      setIsSeedingCategories(false);
    }
  };

  const handleOpenCategoryManager = async () => {
    try {
      await loadCategoriesForModal();
      setShowCategoryModal(true);
    } catch (error) {
      toast.error('Failed to load categories.');
    }
  };

  const handleUpdateItemField = (index: number, field: string, value: any) => {
    setItemsList(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      const updated = { ...item, [field]: value };
      
      // Auto-recalculate ready-made tax if applicable
      if (configForm.shop_type === 'readymade' && (field === 'mrp' || field === 'selling_price')) {
        const baseVal = parseFloat(updated.selling_price) || 0;
        updated.gst_percent = baseVal > 1000 ? 12 : 5;
      }
      return updated;
    }));
  };

  const handleAddItem = () => {
    const isReadymade = configForm.shop_type === 'readymade';
    setItemsList(prev => [...prev, {
      name: '',
      mrp: 100,
      selling_price: 100,
      gst_percent: isReadymade ? 5 : 0
    }]);
  };

  const handleRemoveItem = (index: number) => {
    const item = itemsList[index];
    if (item?.user_item_id) {
      userItemService.update(item.user_item_id, { is_active: false }).catch(() => toast.error('Could not deactivate item.'));
    }
    setItemsList(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleGenerate = async () => {
    const validItems = itemsList.filter(item => item.name.trim() && parseFloat(item.selling_price) > 0);
    if (validItems.length === 0) {
      return toast.error('You must include at least one valid item with name and positive price.');
    }

    setCurrentStep(3);
    try {
      const payload = {
        ...(shopProfile?.id ? { shop_id: shopProfile.id } : {}),
        shop_name: configForm.shop_name,
        shop_type: configForm.shop_type,
        address: configForm.address,
        gst_number: configForm.gst_number,
        month: `${configForm.month}-01`,
        target_amount: parseFloat(configForm.target_amount),
        bills_per_day: parseInt(configForm.bills_per_day),
        items: validItems.map(item => ({
          name: item.name,
          mrp: parseFloat(item.selling_price), // We bill at custom selling_price
          gst_percent: parseFloat(item.gst_percent)
        }))
      };

      const result = await billingService.generate(payload);
      setGenerationResult(result);
      if (result.bills && result.bills.length > 0) {
        setSelectedBill(result.bills[0]);
      }
      setCurrentStep(4);
      toast.success('Billing run generated successfully!');
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Billing generation failed. Limit might have been reached.';
      toast.error(errorMsg);
      setCurrentStep(2);
    }
  };

  const handleDownloadPdf = async () => {
    if (!generationResult) return;
    setPdfDownloading(true);
    try {
      const blob = await billingService.downloadPDF(generationResult.id);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `bills_${generationResult.month}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('PDF report downloaded.');
    } catch (error) {
      toast.error('Failed to download billing report PDF.');
    } finally {
      setPdfDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-vyapaar-blue w-12 h-12" />
          <p className="text-slate-600 font-semibold">Initializing Billing Protocols...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 pb-24 max-w-7xl mx-auto">
      
      {/* Dynamic Header & Steps Progress */}
      <header className="mb-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-black text-vyapaar-text mb-1 tracking-tight flex items-center gap-2">
              <FileText className="text-vyapaar-blue" size={32} /> Smart Billing Generator
            </h1>
            <p className="text-slate-500 font-medium">Configure entity details and generate optimized, legal GST compliant bills in seconds.</p>
          </div>
          {currentStep > 1 && currentStep < 4 && (
            <button 
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="btn-secondary px-4 py-2 text-sm flex items-center gap-2"
            >
              <ArrowLeft size={16} /> Back
            </button>
          )}
        </div>

        {/* Steps Progress Indicator */}
        <div className="relative w-full h-2 bg-slate-200 rounded-full overflow-hidden flex">
          <motion.div 
            className="h-full bg-gradient-to-r from-vyapaar-blue to-vyapaar-saffron"
            animate={{ width: `${(currentStep / 4) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <div className="grid grid-cols-4 text-center mt-3 text-xs font-bold uppercase tracking-wider text-slate-400">
          <span className={currentStep >= 1 ? 'text-vyapaar-blue' : ''}>1. Configuration</span>
          <span className={currentStep >= 2 ? 'text-vyapaar-blue' : ''}>2. Review Items</span>
          <span className={currentStep >= 3 ? 'text-vyapaar-blue' : ''}>3. Processing</span>
          <span className={currentStep >= 4 ? 'text-vyapaar-emerald' : ''}>4. Results</span>
        </div>
      </header>

      <AnimatePresence mode="wait">
        
        {/* STEP 1: CONFIGURATION FORM */}
        {currentStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
          >
            <UiCard className="p-8 max-w-3xl mx-auto bg-white border border-slate-100 shadow-xl rounded-2xl">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="p-2.5 bg-blue-50 text-vyapaar-blue rounded-xl shadow-sm">
                  <Store size={22} />
                </div>
                <div>
                  <h3 className="font-extrabold text-xl text-vyapaar-text">Store Configuration</h3>
                  <p className="text-slate-400 text-sm font-semibold">Enter your shop profile and optimization thresholds</p>
                </div>
              </div>

              <form onSubmit={handleConfigSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-1.5">Shop Type</label>
                    <select 
                      value={configForm.shop_type}
                      onChange={e => setConfigForm({...configForm, shop_type: e.target.value})}
                      className="input-field font-bold"
                    >
                      <option value="general">General Store</option>
                      <option value="fancy">Fancy Shop</option>
                      <option value="readymade">Readymade Shop</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-1.5">GSTIN Number</label>
                    <input 
                      type="text"
                      value={configForm.gst_number}
                      readOnly
                      className="input-field font-bold bg-slate-100 cursor-not-allowed"
                    />
                    <p className="mt-1.5 text-xs font-semibold text-slate-400">GSTIN is controlled by admin.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-1.5">Monthly Target (₹)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                      <input 
                        type="number"
                        value={configForm.target_amount}
                        onChange={e => setConfigForm({...configForm, target_amount: e.target.value})}
                        placeholder="e.g. 50000"
                        className="input-field pl-8 font-bold placeholder-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-1.5">Target Billing Month</label>
                    <input 
                      type="month"
                      value={configForm.month}
                      onChange={e => setConfigForm({...configForm, month: e.target.value})}
                      className="input-field font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-1.5">Bills Per Day</label>
                    <input 
                      type="number"
                      min="1"
                      max="40"
                      value={configForm.bills_per_day}
                      onChange={e => setConfigForm({...configForm, bills_per_day: e.target.value})}
                      className="input-field font-bold"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-600 mb-1.5">Shop Name</label>
                    <input 
                      type="text"
                      value={configForm.shop_name}
                      onChange={e => setConfigForm({...configForm, shop_name: e.target.value})}
                      placeholder="Enter legal entity name"
                      className="input-field font-bold"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-600 mb-1.5">Billing Address</label>
                    <textarea 
                      rows={3}
                      value={configForm.address}
                      onChange={e => setConfigForm({...configForm, address: e.target.value})}
                      placeholder="Full operating shop address..."
                      className="input-field font-semibold"
                    />
                  </div>

                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button type="submit" className="btn-primary px-8 font-bold flex items-center gap-2">
                    Continue to Items <ChevronRight size={18} />
                  </button>
                </div>
              </form>
            </UiCard>
          </motion.div>
        )}

        {/* STEP 2: REVIEW ITEMS CHECKLIST */}
        {currentStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
          >
            <UiCard className="p-8 border border-slate-100 bg-white shadow-xl rounded-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-slate-100 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 text-vyapaar-blue rounded-xl shadow-sm">
                    <Sparkles size={22} className="text-vyapaar-saffron" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xl text-vyapaar-text">Seed & Edit Products</h3>
                    <p className="text-slate-400 text-sm font-semibold">Review item pricing and GST levels. Quantity values will auto-adjust to meet target.</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleOpenCategoryManager}
                    className="btn-secondary px-4 py-2.5 text-sm font-bold flex items-center gap-1.5"
                  >
                    <Sparkles size={18} /> Add Category
                  </button>
                  <button 
                    onClick={handleAddItem}
                    className="btn-secondary px-4 py-2.5 text-sm font-bold flex items-center gap-1.5"
                  >
                    <Plus size={18} /> Add Custom
                  </button>
                  <button 
                    onClick={handleGenerate}
                    className="btn-primary px-5 py-2.5 text-sm font-extrabold flex items-center gap-1.5"
                  >
                    <Flame size={18} className="animate-pulse" /> Generate All Bills
                  </button>
                </div>
              </div>

              {isItemsLoading ? (
                <div className="py-24 text-center">
                  <Loader2 className="animate-spin text-vyapaar-blue w-12 h-12 mx-auto mb-3" />
                  <p className="text-slate-500 font-bold">Fetching product catalog...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider bg-slate-50/50">
                        <th className="py-4 px-4 rounded-l-xl">Product Name</th>
                        <th className="py-4 px-4 text-right">MRP (₹)</th>
                        <th className="py-4 px-4 text-right">Billing Rate (₹)</th>
                        <th className="py-4 px-4 text-center">GST Rate</th>
                        <th className="py-4 px-4 text-center rounded-r-xl">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-vyapaar-text font-semibold">
                      {itemsList.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50/30">
                          
                          {/* Name Input */}
                          <td className="py-3.5 px-4">
                            <input 
                              type="text" 
                              value={item.name}
                              onChange={e => handleUpdateItemField(index, 'name', e.target.value)}
                              placeholder="e.g. Packaged item name..."
                              className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 font-bold focus:outline-none focus:border-vyapaar-blue"
                            />
                          </td>

                          {/* MRP */}
                          <td className="py-3.5 px-4 text-right">
                            <input 
                              type="number" 
                              value={item.mrp}
                              onChange={e => handleUpdateItemField(index, 'mrp', e.target.value)}
                              className="w-24 text-right bg-slate-50 border border-slate-200 rounded px-3 py-1.5 font-mono"
                            />
                          </td>

                          {/* Billing Rate */}
                          <td className="py-3.5 px-4 text-right">
                            <input 
                              type="number" 
                              value={item.selling_price}
                              onChange={e => handleUpdateItemField(index, 'selling_price', e.target.value)}
                              className="w-24 text-right bg-slate-50 border border-slate-200 rounded px-3 py-1.5 font-mono font-extrabold text-vyapaar-blue"
                            />
                          </td>

                          {/* GST Select */}
                          <td className="py-3.5 px-4 text-center">
                            <select 
                              value={item.gst_percent}
                              disabled={configForm.shop_type === 'readymade'}
                              onChange={e => handleUpdateItemField(index, 'gst_percent', parseFloat(e.target.value))}
                              className="bg-slate-50 border border-slate-200 rounded px-2 py-1.5 font-bold focus:outline-none text-sm"
                            >
                              <option value={0}>0% GST</option>
                              <option value={5}>5% GST</option>
                              <option value={12}>12% GST</option>
                              <option value={18}>18% GST</option>
                              <option value={28}>28% GST</option>
                            </select>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-center">
                            <button 
                              onClick={() => handleRemoveItem(index)}
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-100 transition-colors"
                              title="Delete Item"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {itemsList.length === 0 && (
                    <div className="py-12 text-center text-slate-400 font-bold italic">
                      No items available. Click "+ Add Custom" to seed manually.
                    </div>
                  )}
                </div>
              )}
            </UiCard>
          </motion.div>
        )}

        {/* STEP 3: RUN PROCESS SCREEN */}
        {currentStep === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="relative mb-6">
              <div className="w-20 h-20 border-4 border-slate-100 border-t-vyapaar-blue rounded-full animate-spin"></div>
              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-vyapaar-saffron animate-pulse" size={24} />
            </div>
            
            <h3 className="font-extrabold text-2xl text-vyapaar-text mb-2">Executing Intelligence Billing Protocols</h3>
            
            <div className="w-full max-w-md bg-slate-100 rounded-full h-2 mb-4 mt-4 overflow-hidden relative">
              <motion.div 
                className="h-full bg-gradient-to-r from-vyapaar-blue via-vyapaar-saffron to-vyapaar-emerald"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 6, ease: "easeInOut" }}
              />
            </div>
            
            <div className="text-center font-bold text-slate-400 space-y-1 text-sm tracking-wide uppercase">
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>✓ Loading item metrics and user parameters</motion.p>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}>✓ Resolving billing boundaries (+/- 6 Months)</motion.p>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }}>✓ Splitting monthly target into randomized daily bills</motion.p>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.5 }}>✓ Synthesizing CGST, SGST, and legal invoice lines</motion.p>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 4.5 }}>✓ Formatting physical invoice layouts</motion.p>
            </div>
          </motion.div>
        )}

        {/* STEP 4: INTERACTIVE PREVIEW & PDF DOWNLOAD */}
        {currentStep === 4 && generationResult && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            {/* Run Overview Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <UiCard className="p-5 border border-slate-100 bg-white flex flex-col justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Bills Generated</span>
                <span className="text-3xl font-black text-vyapaar-text mt-1">{generationResult.bills?.length || 0} bills</span>
              </UiCard>

              <UiCard className="p-5 border border-slate-100 bg-white flex flex-col justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Capital Limit</span>
                <span className="text-3xl font-black text-vyapaar-text mt-1">₹{parseFloat(generationResult.target_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </UiCard>

              <UiCard className="p-5 border border-slate-100 bg-white flex flex-col justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Actual Value Generated</span>
                <span className="text-3xl font-black text-vyapaar-emerald mt-1">₹{parseFloat(generationResult.generated_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </UiCard>

              <UiCard className="p-5 border border-slate-100 bg-white flex flex-col justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Deficit Margin</span>
                <span className="text-3xl font-black text-slate-500 mt-1">₹{parseFloat(generationResult.remaining_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </UiCard>
            </div>

            {/* Actions Bar */}
            <div className="flex justify-between items-center p-4 bg-slate-900 text-white rounded-2xl shadow-md">
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShieldCheck className="text-vyapaar-emerald" size={20} />
                <span>GSTIN Invoices successfully cleared. Ready for reports archiving.</span>
              </div>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold transition-all"
                >
                  Configure New Run
                </button>
                <button 
                  onClick={handleDownloadPdf}
                  disabled={pdfDownloading}
                  className="px-5 py-2.5 bg-vyapaar-saffron hover:bg-vyapaar-saffronHover text-white rounded-xl text-sm font-extrabold flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50"
                >
                  {pdfDownloading ? (
                    <>
                      <Loader2 className="animate-spin" size={16} /> Generating Archive...
                    </>
                  ) : (
                    <>
                      <Download size={16} /> Download Full PDF Report
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Split View: Left list, Right preview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              
              {/* Bills List Selector */}
              <UiCard className="p-5 border border-slate-100 bg-white h-[650px] flex flex-col">
                <h3 className="font-extrabold text-lg text-vyapaar-text mb-4 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <FileText size={18} className="text-slate-500" /> Compiled Invoices
                </h3>

                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {generationResult.bills?.map((bill: any) => {
                    const isSelected = selectedBill?.id === bill.id;
                    return (
                      <button 
                        key={bill.id}
                        onClick={() => setSelectedBill(bill)}
                        className={`w-full text-left p-4 rounded-xl border transition-all flex justify-between items-center ${
                          isSelected 
                            ? 'border-vyapaar-blue bg-blue-50/50 shadow-sm' 
                            : 'border-slate-100 bg-slate-50/50 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                            <span className="font-mono text-vyapaar-blue">{bill.bill_no}</span>
                            <span className="text-xs text-slate-400 font-semibold">• {bill.bill_date}</span>
                          </div>
                          <div className="text-xs text-slate-500 font-semibold mt-1 truncate max-w-[150px]">{bill.customer_name}</div>
                        </div>
                        
                        <div className="text-right font-extrabold text-sm text-slate-800">
                          ₹{parseFloat(bill.total_amount).toFixed(2)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </UiCard>

              {/* Pixel-Perfect Invoice Preview */}
              <div className="lg:col-span-2">
                <UiCard className="p-12 bg-white border border-slate-200 shadow-2xl rounded-2xl text-slate-800 font-sans min-h-[650px] max-w-[800px] mx-auto">
                  {selectedBill ? (
                    <div id="printable-invoice">
                      {/* Shop details & invoice meta */}
                      <div className="flex justify-between items-start border-b-2 border-slate-100 pb-6 mb-8">
                        <div>
                          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{configForm.shop_name}</h2>
                          <p className="text-sm text-slate-400 mt-1 max-w-[280px] leading-relaxed font-semibold">{configForm.address}</p>
                          <div className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded inline-block mt-3 border border-slate-200">
                            GSTIN: <span className="font-mono">{configForm.gst_number}</span>
                          </div>
                        </div>
                        <div className="text-right font-semibold">
                          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Tax Invoice</div>
                          <div className="text-xl font-black text-slate-900 font-mono mt-1">{selectedBill.bill_no}</div>
                          
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mt-4 text-left">
                            <span className="text-slate-400 font-bold">DATE:</span>
                            <span className="font-bold text-slate-700 text-right">{selectedBill.bill_date}</span>
                            <span className="text-slate-400 font-bold">STATUS:</span>
                            <span className="font-bold text-vyapaar-emerald text-right">PAID</span>
                          </div>
                        </div>
                      </div>

                      {/* Bill To */}
                      <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Billed To</span>
                        <div className="font-extrabold text-base text-slate-800 mt-1">{selectedBill.customer_name}</div>
                      </div>

                      {/* Items table */}
                      <table className="w-full text-left border-collapse mb-8 text-xs font-bold">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 uppercase">
                            <th className="py-2.5 px-3">Description</th>
                            <th className="py-2.5 px-3 text-right">HSN</th>
                            <th className="py-2.5 px-3 text-right">Qty</th>
                            <th className="py-2.5 px-3 text-right">Rate</th>
                            <th className="py-2.5 px-3 text-right">GST %</th>
                            <th className="py-2.5 px-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {selectedBill.lines?.map((line: any) => (
                            <tr key={line.id}>
                              <td className="py-3 px-3 font-extrabold text-slate-950">{line.item_name}</td>
                              <td className="py-3 px-3 text-right font-mono">{line.hsn_code || '-'}</td>
                              <td className="py-3 px-3 text-right font-mono">{line.quantity}</td>
                              <td className="py-3 px-3 text-right font-mono">₹{parseFloat(line.unit_amount).toFixed(2)}</td>
                              <td className="py-3 px-3 text-right font-mono">{parseFloat(line.gst_percent).toFixed(0)}%</td>
                              <td className="py-3 px-3 text-right font-mono text-slate-900 font-extrabold">₹{parseFloat(line.total_amount).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Financial summary breakdown */}
                      <div className="flex flex-col items-end border-t border-slate-100 pt-6">
                        <div className="w-64 space-y-2 text-xs font-bold text-slate-500">
                          <div className="flex justify-between">
                            <span>Taxable Value:</span>
                            <span className="font-mono text-slate-800">₹{parseFloat(selectedBill.taxable_value).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total CGST:</span>
                            <span className="font-mono text-slate-800">₹{parseFloat(selectedBill.cgst_amount).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total SGST:</span>
                            <span className="font-mono text-slate-800">₹{parseFloat(selectedBill.sgst_amount).toFixed(2)}</span>
                          </div>
                          
                          <div className="flex justify-between text-base font-black text-slate-900 border-t border-slate-200 pt-3 mt-1">
                            <span>Grand Total:</span>
                            <span className="font-mono text-vyapaar-blue">₹{parseFloat(selectedBill.total_amount).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Notices footer */}
                      <footer className="mt-12 pt-6 border-t border-slate-100 text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        <p>This is a computer-generated tax invoice verified under GST compliance guidelines.</p>
                      </footer>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 font-bold italic">
                      Select an invoice from the compiled list to preview.
                    </div>
                  )}
                </UiCard>
              </div>

            </div>
          </motion.div>
        )}

      </AnimatePresence>

      <AnimatePresence>
        {showCategoryModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 18 }}
              className="relative w-full max-w-3xl rounded-2xl border border-white/70 bg-white/95 shadow-2xl p-6"
            >
              <div className="flex items-start justify-between gap-5 border-b border-slate-100 pb-5 mb-5">
                <div>
                  <h3 className="text-2xl font-black text-vyapaar-text">Choose billing categories</h3>
                  <p className="text-sm text-slate-500 font-semibold mt-1">
                    Select product groups to map global master items into your monthly billing checklist.
                  </p>
                </div>
                <div className="rounded-xl bg-blue-50 text-vyapaar-blue p-3">
                  <Sparkles size={24} />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1">
                {availableCategories.map((category) => {
                  const selected = selectedCategories.some((entry) => entry.toLowerCase() === category.toLowerCase());
                  return (
                    <button
                      key={category}
                      onClick={() => toggleSelectedCategory(category)}
                      className={`min-h-16 rounded-xl border p-3 text-left font-black text-sm transition-all ${
                        selected
                          ? 'border-vyapaar-blue bg-blue-50 text-vyapaar-blue'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5 mt-5">
                <button onClick={() => setShowCategoryModal(false)} className="btn-secondary py-2.5">
                  Cancel
                </button>
                <button onClick={handleSeedCategories} disabled={isSeedingCategories} className="btn-primary py-2.5">
                  {isSeedingCategories ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                  Seed Selected Items
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
