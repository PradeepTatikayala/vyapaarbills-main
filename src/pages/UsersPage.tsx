import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Database,
  Edit3,
  IndianRupee,
  Loader2,
  Lock,
  ShieldCheck,
  Unlock,
  Users,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { UiCard } from '../components/UiCard';
import { adminService, userService } from '../services/api';

const money = (value: number | string | undefined) =>
  `Rs ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const UsersPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({ plan: 'basic', is_active: true, custom_plan_price: '', custom_monthly_runs: '', gst_number: '' });
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const dashboard = await userService.getDashboard();
      const canAdmin = Boolean(dashboard?.is_admin || dashboard?.profile?.is_admin);
      setIsAdmin(canAdmin);

      if (!canAdmin) {
        toast.error('Admin access required.');
        return;
      }

      const [stats, users] = await Promise.all([adminService.getStats(), adminService.listUsers()]);
      setAdminStats(stats);
      setAdminUsers(users || []);
    } catch {
      toast.error('Failed to load admin panel.');
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const totals = useMemo(() => {
    const customPending = adminUsers.filter((user) => user.plan === 'custom' && (!Number(user.custom_plan_price || 0) || !Number(user.custom_monthly_runs || 0))).length;
    const restricted = adminUsers.filter((user) => !user.is_active).length;
    return { customPending, restricted };
  }, [adminUsers]);

  const openEdit = (user: any) => {
    setEditingUser(user);
    setEditForm({
      plan: user.plan || 'basic',
      is_active: user.is_active ?? true,
      custom_plan_price: user.custom_plan_price || '',
      custom_monthly_runs: user.custom_monthly_runs || '',
      gst_number: user.gst_number || '',
    });
  };

  const updateUser = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingUser) return;
    setIsUpdatingUser(true);
    try {
      await adminService.updateUser(editingUser.id, {
        ...editForm,
        custom_plan_price: editForm.custom_plan_price === '' ? null : editForm.custom_plan_price,
        custom_monthly_runs: editForm.custom_monthly_runs === '' ? null : editForm.custom_monthly_runs,
      });
      toast.success('User updated successfully.');
      setEditingUser(null);
      await fetchAdminData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update user.');
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const toggleRestriction = async (user: any) => {
    try {
      await adminService.toggleRestriction(user.id);
      toast.success(user.is_active ? 'Account restricted.' : 'Account activated.');
      await fetchAdminData();
    } catch {
      toast.error('Failed to toggle account status.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-vyapaar-blue" size={44} />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-8">
        <UiCard className="p-8 bg-white border border-rose-100">
          <AlertTriangle className="text-rose-500 mb-3" size={32} />
          <h1 className="text-2xl font-black text-vyapaar-text">Admin access required</h1>
          <p className="text-slate-500 font-semibold mt-2">Login with the admin account to manage customers.</p>
        </UiCard>
      </div>
    );
  }

  return (
    <div className="p-8 pb-24 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 border-b border-slate-100 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 bg-vyapaar-blue text-white text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full mb-3">
            <ShieldCheck size={14} /> Admin
          </div>
          <h1 className="text-3xl font-black text-vyapaar-text flex items-center gap-2">
            <Database className="text-vyapaar-saffron" size={32} />
            Admin Control Panel
          </h1>
          <p className="text-slate-500 font-semibold mt-1">Manage customer roles, plans, custom amounts, monthly runs, and restrictions.</p>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <UiCard className="p-5 bg-white border border-slate-100"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total users</span><span className="text-2xl font-black mt-1 block">{adminStats?.total_users || 0}</span></UiCard>
        <UiCard className="p-5 bg-white border border-slate-100"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Active</span><span className="text-2xl font-black text-vyapaar-emerald mt-1 block">{adminStats?.active_users || 0}</span></UiCard>
        <UiCard className="p-5 bg-white border border-slate-100"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Restricted</span><span className="text-2xl font-black text-rose-500 mt-1 block">{totals.restricted}</span></UiCard>
        <UiCard className="p-5 bg-white border border-slate-100"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Custom pending</span><span className="text-2xl font-black text-vyapaar-saffron mt-1 block">{totals.customPending}</span></UiCard>
        <UiCard className="p-5 bg-white border border-slate-100"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Collected</span><span className="text-2xl font-black text-vyapaar-emerald mt-1 block">{money(adminStats?.total_amount_collected)}</span></UiCard>
        <UiCard className="p-5 bg-white border border-slate-100"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Pending dues</span><span className="text-2xl font-black text-red-500 mt-1 block">{money(adminStats?.total_pending_amount)}</span></UiCard>
      </div>

      <UiCard className="p-6 bg-white border border-slate-100 rounded-2xl">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h2 className="font-extrabold text-lg text-vyapaar-text flex items-center gap-2">
            <Users className="text-slate-500" size={20} />
            Users Data
          </h2>
          <span className="text-xs font-black uppercase tracking-widest text-slate-400">{adminUsers.length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider bg-slate-50/70">
                <th className="py-4 px-4 rounded-l-xl">User</th>
                <th className="py-4 px-4 text-center">Role</th>
                <th className="py-4 px-4 text-center">Plan</th>
                <th className="py-4 px-4">GSTIN</th>
                <th className="py-4 px-4 text-right">Plan Amount</th>
                <th className="py-4 px-4 text-center">Runs</th>
                <th className="py-4 px-4 text-right">Pending</th>
                <th className="py-4 px-4 text-center">Status</th>
                <th className="py-4 px-4 text-center rounded-r-xl">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-vyapaar-text font-semibold text-sm">
              {adminUsers.map((user) => {
                const isAdminUser = user.role === 'admin' || user.is_admin;
                const isCustomIncomplete = !isAdminUser && user.plan === 'custom' && (!Number(user.custom_plan_price || 0) || !Number(user.custom_monthly_runs || 0));
                return (
                  <tr key={user.id} className="hover:bg-slate-50/60">
                    <td className="py-4 px-4">
                      <div className="font-black text-slate-800">{user.email}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{user.phone_number || 'No phone'}</div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`capitalize px-2.5 py-1 rounded font-black text-xs ${user.role === 'admin' ? 'bg-vyapaar-blue text-white' : 'bg-slate-100 text-slate-600'}`}>{user.role || 'customer'}</span>
                    </td>
                    <td className="py-4 px-4 text-center">{isAdminUser ? <span className="text-xs font-black text-slate-400">N/A</span> : <span className="capitalize px-2.5 py-1 bg-blue-50 text-vyapaar-blue rounded font-bold text-xs">{user.plan}</span>}</td>
                    <td className="py-4 px-4">
                      {isAdminUser ? (
                        <span className="text-xs font-black text-slate-400">N/A</span>
                      ) : user.gst_number && !['PENDING_GST', 'UNREGISTERED'].includes(String(user.gst_number).toUpperCase()) ? (
                        <span className="font-mono text-xs text-slate-700">{user.gst_number}</span>
                      ) : (
                        <span className="text-xs font-black text-vyapaar-saffron">PENDING</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-black">{isAdminUser ? 'N/A' : isCustomIncomplete ? 'Need admin' : money(user.total_amount_due)}</td>
                    <td className="py-4 px-4 text-center font-mono font-black">{isAdminUser ? 'N/A' : user.allowed_runs || 0}</td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-rose-500">{isAdminUser ? 'N/A' : money(user.pending_amount)}</td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-black ${user.is_active ? 'bg-emerald-50 text-vyapaar-emerald' : 'bg-rose-50 text-rose-500'}`}>{user.is_active ? 'ACTIVE' : 'RESTRICTED'}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        {!isAdminUser && <button onClick={() => toggleRestriction(user)} className={`px-3 py-1.5 rounded-lg text-xs font-black inline-flex items-center gap-1.5 ${user.is_active ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-vyapaar-emerald hover:bg-emerald-100'}`}>
                          {user.is_active ? <Lock size={13} /> : <Unlock size={13} />}
                          {user.is_active ? 'Restrict' : 'Activate'}
                        </button>}
                        <button onClick={() => openEdit(user)} className="px-3 py-1.5 rounded-lg text-xs font-black text-vyapaar-blue bg-blue-50 hover:bg-blue-100 inline-flex items-center gap-1.5">
                          <Edit3 size={13} /> Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </UiCard>

      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isUpdatingUser && setEditingUser(null)} />
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 z-10">
            <div className="bg-vyapaar-blue text-white p-5">
              <h3 className="font-extrabold text-lg">Control User Account</h3>
              <p className="text-xs text-blue-200 mt-0.5">{editingUser.email}</p>
            </div>
            <form onSubmit={updateUser} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Role</label>
                <div className="input-field bg-slate-50 capitalize font-black">{editingUser.role || 'customer'}</div>
              </div>

              {editingUser.role === 'admin' || editingUser.is_admin ? (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-vyapaar-blue">
                  Admin accounts do not use plans, billing amounts, runs, or account restriction controls.
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">GST Number</label>
                    <input
                      type="text"
                      value={editForm.gst_number}
                      onChange={(event) => setEditForm({ ...editForm, gst_number: event.target.value.toUpperCase() })}
                      className="input-field font-mono"
                      placeholder="Enter GSTIN to unlock portal"
                    />
                    <p className="mt-1.5 text-xs font-semibold text-slate-400">Only admin can add or change the customer's GSTIN.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Subscription Plan</label>
                    <select value={editForm.plan} onChange={(event) => setEditForm({ ...editForm, plan: event.target.value })} className="input-field">
                      <option value="basic">Basic</option>
                      <option value="medium">Medium</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Custom amount</label>
                      <div className="relative">
                        <IndianRupee size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editForm.custom_plan_price}
                          onChange={(event) => setEditForm({ ...editForm, custom_plan_price: event.target.value })}
                          className="input-field pl-9"
                          placeholder="Only for custom"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Monthly runs</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={editForm.custom_monthly_runs}
                        onChange={(event) => setEditForm({ ...editForm, custom_monthly_runs: event.target.value })}
                        className="input-field"
                        placeholder="Allowed runs"
                      />
                    </div>
                  </div>

                  <label className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50 cursor-pointer">
                    <span>
                      <span className="block text-xs font-black text-slate-500 uppercase tracking-wider">Account active status</span>
                      <span className="text-xs text-slate-400 font-medium">User can access billing and inventory when active</span>
                    </span>
                    <input type="checkbox" checked={editForm.is_active} onChange={(event) => setEditForm({ ...editForm, is_active: event.target.checked })} className="w-5 h-5 accent-vyapaar-blue" />
                  </label>
                </>
              )}

              <div className="flex gap-3 pt-3">
                <button type="button" disabled={isUpdatingUser} onClick={() => setEditingUser(null)} className="btn-secondary w-1/3 py-2.5 text-sm">Cancel</button>
                <button type="submit" disabled={isUpdatingUser} className="btn-primary w-2/3 py-2.5 text-sm font-extrabold">{isUpdatingUser ? <Loader2 className="animate-spin" size={16} /> : 'Save Changes'}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
