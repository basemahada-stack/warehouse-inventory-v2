import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Package, Tags, Scale, Users, Building2, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { cn } from '../lib/utils';

const settingsTabs = [
  { path: '/settings/products', label: 'Produk', icon: Package },
  { path: '/settings/categories', label: 'Kategori', icon: Tags },
  { path: '/settings/units', label: 'Satuan', icon: Scale },
  { path: '/settings/pics', label: 'PIC (Kanban)', icon: Users },
  { path: '/settings/vendors', label: 'Vendor', icon: Building2 },
  { path: '/settings/in-reasons', label: 'Keperluan In', icon: ArrowDownToLine },
  { path: '/settings/out-reasons', label: 'Keperluan Out', icon: ArrowUpFromLine },
];

export default function SettingsLayout() {
  const location = useLocation();

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-slate-200 bg-white px-2 pt-2 rounded-t-xl sticky top-0 z-10">
        <div className="flex overflow-x-auto hide-scrollbar">
          {settingsTabs.map((tab) => {
            const isActive = location.pathname.startsWith(tab.path);
            
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap",
                  isActive 
                    ? "border-emerald-500 text-emerald-600" 
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                )}
              >
                <tab.icon className={cn("w-4 h-4", isActive ? "text-emerald-500" : "text-slate-400")} />
                {tab.label}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}
