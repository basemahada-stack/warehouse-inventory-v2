import { Link, useLocation, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Warehouse, 
  Settings,
  Menu,
  X,
  Boxes,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Calculator
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { Toaster } from 'react-hot-toast';
import { hasSupabaseConfig } from '../lib/supabase';

const sidebarMenus = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/in-stock', icon: ArrowDownToLine, label: 'In Stock' },
  { path: '/out-stock', icon: ArrowUpFromLine, label: 'Out Stock' },
  { 
    path: '/inventory', 
    icon: Package, 
    label: 'Inventory',
    subMenus: [
      { path: '/inventory/stock', label: 'Stock' },
      { path: '/inventory/warehouse', label: 'Warehouse' },
      { path: '/inventory/cloudpop', label: 'Cloudpop' },
      { path: '/inventory/marketing', label: 'Marketing' }
    ]
  },
  { 
    path: '/deadstock', 
    icon: AlertTriangle, 
    label: 'Deadstock',
    subMenus: [
      { path: '/deadstock/in', label: 'In Deadstock' },
      { path: '/deadstock/out', label: 'Out Deadstock' },
      { path: '/deadstock/inventory', label: 'Inventory Deadstock' },
      { path: '/deadstock/preview', label: 'Preview Deadstock' }
    ]
  },
  { path: '/vendor-stock', icon: Warehouse, label: 'Vendor Stock' },
  { path: '/finance-recap', icon: Calculator, label: 'Rekap Finance' },
  { path: '/settings', icon: Settings, label: 'Pengaturan' },
];



const LiveClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatter = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <div className="text-xs font-medium text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 hidden md:block">
      {formatter.format(time).replace(/\./g, ':')}
    </div>
  );
};

export default function Layout() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const [expandedMenu, setExpandedMenu] = useState<string | null>(
    location.pathname.startsWith('/inventory') ? '/inventory' : 
    location.pathname.startsWith('/deadstock') ? '/deadstock' : null
  );

  const toggleSubmenu = (path: string) => {
    setExpandedMenu(expandedMenu === path ? null : path);
  };

  const SidebarContent = () => (
    <div className="h-full flex flex-col bg-[#0f172a] text-slate-400">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center text-white font-bold">
          W
        </div>
        <div className="flex flex-col">
          <span className="text-indigo-200 font-bold tracking-[0.2em] text-[9px] leading-none mb-1 uppercase">MANAGEMENT</span>
          <span className="text-white font-bold text-[15px] leading-none tracking-tight">Inventory Mahada</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {sidebarMenus.map((menu) => {
          const isActive = menu.path === '/' 
            ? location.pathname === '/' 
            : location.pathname.startsWith(menu.path);
            
          const isExpanded = expandedMenu === menu.path;
            
          if (menu.subMenus) {
            return (
              <div key={menu.path} className="flex flex-col space-y-1">
                <button
                  onClick={() => toggleSubmenu(menu.path)}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors w-full",
                    isActive ? "bg-indigo-600 text-white" : "hover:bg-slate-800 hover:text-white text-slate-400"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <menu.icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{menu.label}</span>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {isExpanded && (
                  <div className="flex flex-col space-y-1 pl-10 pr-2 pt-1">
                    {menu.subMenus.map((sub) => {
                      const isSubActive = location.pathname === sub.path;
                      return (
                        <Link
                          key={sub.path}
                          to={sub.path}
                          onClick={() => setIsMobileOpen(false)}
                          className={cn(
                            "px-3 py-1.5 rounded-md text-sm transition-colors block",
                            isSubActive ? "text-white bg-slate-800 font-medium" : "text-slate-400 hover:text-white hover:bg-slate-800"
                          )}
                        >
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={menu.path}
              to={menu.path}
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors",
                isActive ? "bg-indigo-600 text-white" : "hover:bg-slate-800 hover:text-white"
              )}
            >
              <menu.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{menu.label}</span>
            </Link>
          );
        })}

      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-xs">
            AD
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-white">Admin Utama</span>
            <span className="text-[10px]">Warehouse Mgr</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans flex overflow-hidden">
      <Toaster position="top-right" />
      
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-56 flex-col fixed inset-y-0 left-0 bg-[#0f172a] z-10">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsMobileOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 bg-[#0f172a] w-56 z-50 transform transition-transform duration-300 lg:hidden",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:pl-56 flex flex-col min-h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 lg:px-8 justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              className="p-2 lg:hidden rounded-md hover:bg-slate-100"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex items-center gap-2 text-slate-500 text-sm hidden sm:flex">
              <span className="text-slate-400 capitalize">{location.pathname.split('/')[1] || 'Dashboard'}</span>
              <span>/</span>
              <span className="text-slate-900 font-medium capitalize">
                {location.pathname.replace('/', '').replace('-', ' ').replace('settings/', '') || 'Ringkasan Utama'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <LiveClock />
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <Boxes className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-4 lg:p-8 w-full max-w-[95rem] mx-auto overflow-y-auto">
          {!hasSupabaseConfig ? (
            <div className="flex items-center justify-center h-full min-h-[60vh]">
              <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center max-w-md w-full">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-slate-900 mb-2">Konfigurasi Supabase Diperlukan</h2>
                <p className="text-slate-500 text-sm">
                  Saat ini aplikasi belum terhubung ke database. Silakan lengkapi konfigurasi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` pada Environment Variables Anda.
                </p>
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </main>
    </div>
  );
}
