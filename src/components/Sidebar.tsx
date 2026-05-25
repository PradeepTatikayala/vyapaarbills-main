import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  FileText, 
  IndianRupee, 
  PieChart, 
  Settings,
  ChevronRight,
  Package,
  LogOut,
  Mail
} from 'lucide-react';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', lockedWhenPending: false },
  { path: '/items', icon: Package, label: 'Inventory', lockedWhenPending: true },
  { path: '/plans', icon: CreditCard, label: 'Plans', lockedWhenPending: true },
  { path: '/billing', icon: FileText, label: 'Billing', lockedWhenPending: true },
  { path: '/payments', icon: IndianRupee, label: 'Payments', lockedWhenPending: true },
  { path: '/reports', icon: PieChart, label: 'Reports', lockedWhenPending: true },
  { path: '/support', icon: Mail, label: 'Support', lockedWhenPending: false },
  { path: '/settings', icon: Settings, label: 'Settings', lockedWhenPending: true },
];

export const Sidebar = ({ isAdmin = false, isAccountPending = false, onExpandedChange }: { isAdmin?: boolean; isAccountPending?: boolean; onExpandedChange?: (expanded: boolean) => void }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();
  const visibleItems = isAdmin
    ? [...navItems.slice(0, 2), { path: '/users', icon: Users, label: 'Users', lockedWhenPending: false }, ...navItems.slice(2)]
    : navItems;

  const handleLogout = async () => {
    try {
      await authService.logout();
    } finally {
      logout();
      navigate('/login', { replace: true });
    }
  };

  const setExpanded = (expanded: boolean) => {
    setIsExpanded(expanded);
    onExpandedChange?.(expanded);
  };

  const renderNavItem = (item: typeof visibleItems[number], compact = false) => {
    const isLocked = isAccountPending && item.lockedWhenPending;

    if (isLocked) {
      return (
        <button
          key={item.path}
          type="button"
          disabled
          className={compact
            ? "flex min-w-[68px] flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[10px] font-bold text-blue-300/50"
            : "w-full flex items-center px-3 py-3 rounded-lg transition-all duration-300 relative group overflow-hidden text-blue-300/50 cursor-not-allowed"}
          title="Admin approval is required before this section can be used"
        >
          <item.icon className="opacity-60" size={compact ? 20 : 22} />
          {compact ? <span>{item.label}</span> : (
            <AnimatePresence>
              {isExpanded && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="ml-4 whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
          )}
        </button>
      );
    }

    return (
      <NavLink
        key={item.path}
        to={item.path}
        className={({ isActive }) => compact
          ? `flex min-w-[68px] flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[10px] font-bold transition-colors ${isActive ? 'bg-white text-vyapaar-blue' : 'text-blue-100'}`
          : `
            flex items-center px-3 py-3 rounded-lg transition-all duration-300 relative group overflow-hidden
            ${isActive ? 'bg-vyapaar-blueDark text-white font-medium' : 'text-blue-200 hover:bg-vyapaar-blueLight/10 hover:text-white'}
          `}
      >
        {({ isActive }) => (
          <>
            {!compact && isActive && (
              <motion.div 
                layoutId="activeIndicator"
                className="absolute left-0 top-0 bottom-0 w-1 bg-vyapaar-saffron rounded-r-full" 
              />
            )}
            <item.icon className={isActive ? 'text-vyapaar-saffron' : 'opacity-80'} size={compact ? 20 : 22} />
            {compact ? <span>{item.label}</span> : (
              <AnimatePresence>
                {isExpanded && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="ml-4 whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            )}
          </>
        )}
      </NavLink>
    );
  };

  return (
    <>
    <motion.aside
      initial={{ width: 80 }}
      animate={{ width: isExpanded ? 260 : 80 }}
      onHoverStart={() => setExpanded(true)}
      onHoverEnd={() => setExpanded(false)}
      className="fixed left-0 top-0 z-50 hidden h-screen flex-col border-r border-vyapaar-blueDark bg-vyapaar-blue pt-6 pb-4 shadow-xl transition-all duration-300 md:flex"
    >
      <div className="flex items-center px-5 mb-10 h-12 overflow-hidden whitespace-nowrap">
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
          <span className="text-vyapaar-blue font-bold text-xl leading-none">V</span>
        </div>
        <AnimatePresence>
          {isExpanded && (
            <motion.span 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="ml-4 font-bold text-xl tracking-wide text-white"
            >
              VyapaarBills
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex-1 px-3 space-y-1.5">
        {visibleItems.map((item) => renderNavItem(item))}
      </nav>

      <div className="px-3 pt-3 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-3 py-3 rounded-lg transition-all duration-300 text-blue-200 hover:bg-white/10 hover:text-white overflow-hidden"
          title="Logout"
        >
          <LogOut size={22} className="opacity-80" />
          <AnimatePresence>
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="ml-4 whitespace-nowrap font-medium"
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
      
      {!isExpanded && (
        <div className="px-6 flex justify-center pb-4 text-blue-300">
          <ChevronRight size={20} />
        </div>
      )}
    </motion.aside>

    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-blue-900 bg-vyapaar-blue px-2 py-2 shadow-2xl md:hidden">
      <div className="flex gap-1 overflow-x-auto pb-[env(safe-area-inset-bottom)]">
        {visibleItems.map((item) => renderNavItem(item, true))}
        <button
          onClick={handleLogout}
          className="flex min-w-[68px] flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[10px] font-bold text-blue-100"
          title="Logout"
        >
          <LogOut size={20} className="opacity-80" />
          <span>Logout</span>
        </button>
      </div>
    </nav>
    </>
  );
};
