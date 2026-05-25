import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Barcode,
  Boxes,
  Check,
  IndianRupee,
  Loader2,
  Minus,
  PackagePlus,
  Plus,
  Printer,
  Download,
  ReceiptText,
  Search,
  ShoppingCart,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { UiCard } from '../components/UiCard';
import { inventoryService, posService } from '../services/api';

type InventoryItem = {
  id: number;
  item_id: number;
  name: string;
  category?: string;
  hsn_code?: string;
  unit_of_measure?: string;
  barcode?: string;
  gst_percent?: string;
  buying_price: string;
  selling_price: string;
  stock_qty: string;
  net_worth: string;
};

type CartItem = InventoryItem & { quantity: number };

const money = (value: number | string | undefined) =>
  `Rs ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const ItemsPage = () => {
  const [activeTab, setActiveTab] = useState<'stock' | 'pos'>('stock');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState({ total_invested: '0', converted_to_cash: '0', in_stock_value: '0' });
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [globalQuery, setGlobalQuery] = useState('');
  const [globalResults, setGlobalResults] = useState<any[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const [newName, setNewName] = useState('');
  const [stockForm, setStockForm] = useState({ buying_price: '0', selling_price: '0', stock_qty: '1' });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [lastBill, setLastBill] = useState<any>(null);
  const [isBilling, setIsBilling] = useState(false);
  const [isDownloadingPosBills, setIsDownloadingPosBills] = useState(false);

  const loadInventory = async () => {
    setIsLoading(true);
    try {
      const [stock, dashboardStats] = await Promise.all([
        inventoryService.list(),
        inventoryService.getStats(),
      ]);
      setItems(stock || []);
      setStats(dashboardStats || stats);
    } catch (error) {
      toast.error('Failed to load inventory workspace.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const filteredItems = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return items;
    return items.filter((item) =>
      [item.name, item.barcode, item.hsn_code, item.category]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(text))
    );
  }, [items, query]);

  const totals = useMemo(() => {
    return cart.reduce(
      (sum, item) => {
        const gross = Number(item.selling_price) * item.quantity;
        const gst = Number(item.gst_percent || 0);
        const taxable = gross / (1 + gst / 100);
        const tax = gross - taxable;
        return {
          subtotal: sum.subtotal + taxable,
          cgst: sum.cgst + tax / 2,
          sgst: sum.sgst + tax / 2,
          total: sum.total + gross,
        };
      },
      { subtotal: 0, cgst: 0, sgst: 0, total: 0 }
    );
  }, [cart]);

  const resetStockForm = () => setStockForm({ buying_price: '0', selling_price: '0', stock_qty: '1' });

  const handleGlobalSearch = async () => {
    if (!globalQuery.trim()) {
      setGlobalResults([]);
      return;
    }
    setIsSearchingGlobal(true);
    try {
      setGlobalResults(await inventoryService.searchGlobal(globalQuery.trim()));
    } catch (error) {
      toast.error('Global catalog search failed.');
    } finally {
      setIsSearchingGlobal(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (activeTab === 'stock') {
        handleGlobalSearch();
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [globalQuery, activeTab]);

  const addInventory = async (
    payload: { item_id?: number; item_name?: string },
    overrides?: { buying_price?: number; selling_price?: number; stock_qty?: number }
  ) => {
    const buying = overrides?.buying_price ?? Number(stockForm.buying_price);
    const selling = overrides?.selling_price ?? Number(stockForm.selling_price);
    const qty = overrides?.stock_qty ?? Number(stockForm.stock_qty);
    if (buying < 0 || selling <= 0 || qty < 0) {
      toast.error('Enter valid buying price, selling price, and stock quantity.');
      return;
    }

    try {
      await inventoryService.create({
        ...payload,
        buying_price: buying,
        selling_price: selling,
        stock_qty: qty,
      });
      toast.success('Stock item saved.');
      setNewName('');
      setGlobalQuery('');
      setGlobalResults([]);
      resetStockForm();
      await loadInventory();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Could not save stock item.');
    }
  };

  const addGlobalInventoryItem = (item: any) => {
    const mrp = Number(item.mrp || item.selling_price || 0);
    const selling = Number(stockForm.selling_price) > 0 ? Number(stockForm.selling_price) : Math.max(mrp, 1);
    const buying = Number(stockForm.buying_price) > 0 ? Number(stockForm.buying_price) : Number((selling * 0.8).toFixed(2));
    const qty = Number(stockForm.stock_qty) > 0 ? Number(stockForm.stock_qty) : 1;
    addInventory({ item_id: item.id }, { buying_price: buying, selling_price: selling, stock_qty: qty });
  };

  const updateStock = async (item: InventoryItem, key: 'buying_price' | 'selling_price' | 'stock_qty', value: string) => {
    const next = { [key]: Number(value || 0) };
    setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, [key]: value } : entry)));
    try {
      await inventoryService.update(item.id, next);
      await loadInventory();
    } catch (error) {
      toast.error('Stock update failed.');
      await loadInventory();
    }
  };

  const deleteStock = async (id: number) => {
    await inventoryService.delete(id);
    setItems((current) => current.filter((item) => item.id !== id));
    await loadInventory();
  };

  const addToCart = (item: InventoryItem) => {
    if (Number(item.stock_qty) <= 0) return toast.error('This item is out of stock.');
    setCart((current) => {
      const existing = current.find((entry) => entry.id === item.id);
      if (existing) {
        return current.map((entry) => entry.id === item.id ? { ...entry, quantity: Math.min(entry.quantity + 1, Number(item.stock_qty)) } : entry);
      }
      return [...current, { ...item, quantity: 1 }];
    });
  };

  const setCartQty = (id: number, quantity: number) => {
    setCart((current) =>
      current
        .map((entry) => entry.id === id ? { ...entry, quantity: Math.max(1, Math.min(quantity, Number(entry.stock_qty))) } : entry)
        .filter((entry) => entry.quantity > 0)
    );
  };

  const generateBill = async () => {
    if (cart.length === 0) return toast.error('Add at least one item to the cart.');
    setIsBilling(true);
    try {
      const bill = await posService.generateBill({
        customer_name: customerName || 'Walk-in Customer',
        cart: cart.map((item) => ({
          inventory_item_id: item.id,
          quantity: item.quantity,
          selling_price: Number(item.selling_price),
        })),
      });
      setLastBill(bill);
      setCart([]);
      toast.success('POS invoice generated.');
      await loadInventory();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Billing failed.');
    } finally {
      setIsBilling(false);
    }
  };

  const downloadInventoryBills = async () => {
    setIsDownloadingPosBills(true);
    try {
      const blob = await posService.downloadBillsPDF();
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'inventory_pos_bills.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Inventory bills PDF downloaded.');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to download inventory bills.');
    } finally {
      setIsDownloadingPosBills(false);
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
    <div className="p-8 pb-24 max-w-7xl mx-auto">
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-vyapaar-text tracking-tight">Inventory and POS</h1>
          <p className="text-slate-500 font-semibold mt-1">Control stock, add master items, and bill checkout carts from one counter.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={downloadInventoryBills} disabled={isDownloadingPosBills} className="btn-secondary px-4 py-2 text-sm font-black">
            {isDownloadingPosBills ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
            Download Inventory Bills
          </button>
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm w-fit">
            <button onClick={() => setActiveTab('stock')} className={`px-4 py-2 rounded-lg text-sm font-black ${activeTab === 'stock' ? 'bg-vyapaar-blue text-white' : 'text-slate-500'}`}>
              Stock Control
            </button>
            <button onClick={() => setActiveTab('pos')} className={`px-4 py-2 rounded-lg text-sm font-black ${activeTab === 'pos' ? 'bg-vyapaar-blue text-white' : 'text-slate-500'}`}>
              POS Checkout
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {[
          ['Total Invested', stats.total_invested, IndianRupee],
          ['Converted to Cash', stats.converted_to_cash, ReceiptText],
          ['In Stock Value', stats.in_stock_value, Boxes],
        ].map(([label, value, Icon]) => (
          <UiCard key={String(label)} className="p-5 bg-white border border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-slate-400">{String(label)}</div>
                <div className="text-2xl font-black text-vyapaar-text mt-2">{money(String(value))}</div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-vyapaar-blue flex items-center justify-center">
                <Icon size={22} />
              </div>
            </div>
          </UiCard>
        ))}
      </div>

      {activeTab === 'stock' ? (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_390px] gap-6">
          <UiCard className="p-6 bg-white border border-slate-100">
            <div className="relative mb-5">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input className="input-field pl-11" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search stock by name, barcode, HSN, or category" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-slate-400">
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3">Item</th>
                    <th className="text-right py-3">Buy</th>
                    <th className="text-right py-3">Sell</th>
                    <th className="text-right py-3">Qty</th>
                    <th className="text-right py-3">Worth</th>
                    <th className="text-center py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredItems.map((item) => (
                    <tr key={item.id}>
                      <td className="py-4 pr-3">
                        <div className="font-black text-slate-800">{item.name}</div>
                        <div className="text-xs text-slate-400 font-semibold mt-1">{item.category || 'Uncategorised'} | HSN {item.hsn_code || '-'}</div>
                      </td>
                      {(['buying_price', 'selling_price', 'stock_qty'] as const).map((key) => (
                        <td key={key} className="py-4 px-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            defaultValue={item[key]}
                            onBlur={(e) => updateStock(item, key, e.target.value)}
                            className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-right font-mono font-bold"
                          />
                        </td>
                      ))}
                      <td className="py-4 px-2 text-right font-mono font-black">{money(item.net_worth)}</td>
                      <td className="py-4 text-center">
                        <button onClick={() => deleteStock(item.id)} className="p-2 rounded-lg text-rose-500 hover:bg-rose-50" title="Remove from stock">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </UiCard>

          <UiCard className="p-6 bg-white border border-slate-100">
            <h2 className="font-black text-lg text-vyapaar-text flex items-center gap-2 mb-5">
              <PackagePlus className="text-vyapaar-blue" size={20} />
              Add Stock
            </h2>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <input className="input-field py-2" type="number" step="0.01" placeholder="Buy" value={stockForm.buying_price} onChange={(e) => setStockForm({ ...stockForm, buying_price: e.target.value })} />
              <input className="input-field py-2" type="number" step="0.01" placeholder="Sell" value={stockForm.selling_price} onChange={(e) => setStockForm({ ...stockForm, selling_price: e.target.value })} />
              <input className="input-field py-2" type="number" step="0.01" placeholder="Qty" value={stockForm.stock_qty} onChange={(e) => setStockForm({ ...stockForm, stock_qty: e.target.value })} />
            </div>
            <div className="flex gap-2 mb-4">
              <input className="input-field py-2" value={globalQuery} onChange={(e) => setGlobalQuery(e.target.value)} placeholder="Live search global master item" />
              <button onClick={handleGlobalSearch} className="btn-secondary px-4 py-2" disabled={isSearchingGlobal}>
                {isSearchingGlobal ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto mb-5">
              {globalResults.map((item) => (
                <button key={item.id} onClick={() => addGlobalInventoryItem(item)} className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 text-left hover:border-vyapaar-blue">
                  <div className="font-black text-slate-800">{item.name}</div>
                  <div className="text-xs text-slate-400 font-semibold">{item.category} | {item.barcode} | MRP {money(item.mrp)}</div>
                </button>
              ))}
            </div>
            <div className="border-t border-slate-100 pt-5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400">Create and add new item</label>
              <div className="flex gap-2 mt-2">
                <input className="input-field py-2" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Sona Masoori Rice 10kg" />
                <button onClick={() => newName.trim() && addInventory({ item_name: newName.trim() })} className="btn-primary px-4 py-2" title="Create with Sarvam AI">
                  <Sparkles size={16} />
                </button>
              </div>
            </div>
          </UiCard>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
          <UiCard className="p-6 bg-white border border-slate-100">
            <div className="relative mb-5">
              <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input className="input-field pl-11" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Live search item name or barcode last 4 digits" />
            </div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              {query.trim() ? `${filteredItems.length} live matches` : 'Start typing to narrow items by name or barcode'}
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {filteredItems.map((item) => (
                <button key={item.id} onClick={() => addToCart(item)} className="rounded-xl border border-slate-100 bg-white p-4 text-left hover:border-vyapaar-blue hover:bg-blue-50/30">
                  <div className="flex justify-between gap-3">
                    <div>
                      <div className="font-black text-slate-800">{item.name}</div>
                      <div className="text-xs text-slate-400 font-semibold mt-1">Stock {item.stock_qty} {item.unit_of_measure || 'pcs'}</div>
                    </div>
                    <div className="font-mono font-black text-vyapaar-blue">{money(item.selling_price)}</div>
                  </div>
                </button>
              ))}
            </div>
          </UiCard>

          <UiCard className="p-6 bg-white border border-slate-100">
            <h2 className="font-black text-lg flex items-center gap-2 mb-4">
              <ShoppingCart className="text-vyapaar-blue" size={20} />
              Checkout Cart
            </h2>
            <input className="input-field py-2 mb-4" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" />
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex justify-between gap-3">
                    <div className="font-black text-sm text-slate-800">{item.name}</div>
                    <button onClick={() => setCart((current) => current.filter((entry) => entry.id !== item.id))} className="text-rose-500">
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 rounded-lg bg-white border" onClick={() => setCartQty(item.id, item.quantity - 1)}><Minus size={14} /></button>
                      <input className="w-14 rounded-lg border border-slate-200 bg-white py-1 text-center font-mono font-black" value={item.quantity} onChange={(e) => setCartQty(item.id, Number(e.target.value || 1))} />
                      <button className="p-1.5 rounded-lg bg-white border" onClick={() => setCartQty(item.id, item.quantity + 1)}><Plus size={14} /></button>
                    </div>
                    <div className="font-mono font-black">{money(Number(item.selling_price) * item.quantity)}</div>
                  </div>
                </div>
              ))}
              {cart.length === 0 && <div className="py-12 text-center text-slate-400 font-bold">Cart is empty.</div>}
            </div>
            <div className="border-t border-slate-100 pt-4 mt-4 space-y-2 text-sm font-bold">
              <div className="flex justify-between text-slate-500"><span>Taxable</span><span>{money(totals.subtotal)}</span></div>
              <div className="flex justify-between text-slate-500"><span>CGST</span><span>{money(totals.cgst)}</span></div>
              <div className="flex justify-between text-slate-500"><span>SGST</span><span>{money(totals.sgst)}</span></div>
              <div className="flex justify-between text-xl font-black text-vyapaar-text pt-2"><span>Total</span><span>{money(totals.total)}</span></div>
            </div>
            <button onClick={generateBill} disabled={isBilling || cart.length === 0} className="btn-primary w-full mt-5">
              {isBilling ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
              Complete Billing
            </button>
          </UiCard>
        </div>
      )}

      <AnimatePresence>
        {lastBill && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setLastBill(null)} />
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.98 }} className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden">
              <div id="pos-print" className="p-6 text-slate-900">
                <div className="text-center border-b border-slate-200 pb-4 mb-4">
                  <div className="font-black text-xl">VyapaarBills POS</div>
                  <div className="text-xs font-bold text-slate-400 mt-1">{lastBill.bill_no} | {lastBill.bill_date}</div>
                </div>
                <div className="text-sm font-bold mb-4">Customer: {lastBill.customer_name}</div>
                <div className="space-y-2 text-sm">
                  {lastBill.lines?.map((line: any) => (
                    <div key={line.id} className="flex justify-between gap-4">
                      <span>{line.item_name} x {line.quantity}</span>
                      <span className="font-mono font-bold">{money(line.total_amount)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-200 mt-4 pt-4 space-y-1 text-sm font-bold">
                  <div className="flex justify-between"><span>Taxable</span><span>{money(lastBill.taxable_value)}</span></div>
                  <div className="flex justify-between"><span>CGST</span><span>{money(lastBill.cgst_amount)}</span></div>
                  <div className="flex justify-between"><span>SGST</span><span>{money(lastBill.sgst_amount)}</span></div>
                  <div className="flex justify-between text-xl font-black pt-2"><span>Total</span><span>{money(lastBill.total_amount)}</span></div>
                </div>
              </div>
              <div className="p-4 bg-slate-50 flex gap-3">
                <button onClick={() => setLastBill(null)} className="btn-secondary flex-1 py-2">Close</button>
                <button onClick={() => window.print()} className="btn-primary flex-1 py-2">
                  <Printer size={16} />
                  Print Invoice
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
