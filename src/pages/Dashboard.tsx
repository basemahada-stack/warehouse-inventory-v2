import React, { useEffect, useState, useMemo } from 'react';
import { supabase, hasSupabaseConfig } from '../lib/supabase';
import { Card, Button, Input, Select } from '../components/ui';
import { 
  Loader2, Package, RefreshCw, AlertCircle, 
  ArrowDownCircle, ArrowUpCircle, Box, AlertTriangle, Layers, Activity 
} from 'lucide-react';
import { format, subDays, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#6366f1', '#ec4899'];
const PIE_COLORS = { 'AMAN': '#10b981', 'MENIPIS': '#f59e0b', 'HABIS': '#ef4444' };

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('30d');
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Data states
  const [inventory, setInventory] = useState<any[]>([]);
  const [stockIn, setStockIn] = useState<any[]>([]);
  const [stockOut, setStockOut] = useState<any[]>([]);
  const fetchData = async () => {
    if (!hasSupabaseConfig) return setLoading(false);
    
    setLoading(true);
    try {
      const [pRes, inRes, outRes, dsInRes, dsOutRes] = await Promise.all([
        supabase.from('products').select('id, product_name, product_code, minimum_stock, unit:units(name), is_active').eq('is_active', true),
        supabase.from('stock_in').select('id, transaction_number, transaction_date, quantity, product_id, created_at, reason:in_stock_reasons(name), product:products(product_name)'),
        supabase.from('stock_out').select('id, transaction_number, transaction_date, quantity, product_id, created_at, vendor_id, source_out_stock_id, product:products(product_name), vendor:vendors(name)'),
        supabase.from('deadstock_in').select('id, transaction_number, transaction_date, quantity, product_id, created_at, product:products(product_name)'),
        supabase.from('deadstock_out').select('id, transaction_number, transaction_date, quantity, product_id, created_at, destination, product:products(product_name)')
      ]);

      const productsData = pRes.data || [];
      const inData = inRes.data || [];
      const outData = outRes.data || [];
      const dsInData = (dsInRes?.data || []).map(d => ({ ...d, isDeadstock: true }));
      const dsOutData = (dsOutRes?.data || []).map(d => ({ ...d, isDeadstock: true }));

      if (pRes.error) toast.error('Products Error: ' + pRes.error.message);
      if (inRes.error) toast.error('InStock Error: ' + inRes.error.message);
      if (outRes.error) toast.error('OutStock Error: ' + outRes.error.message);

      // Calculate exact inventory
      const calculatedInventory = productsData.map(p => {
        const totalIn = inData.filter(s => s.product_id === p.id).reduce((sum, s) => sum + s.quantity, 0);
        const outFromGudang = outData.filter(s => s.product_id === p.id && !s.source_out_stock_id).reduce((sum, s) => sum + s.quantity, 0);
        const outToVendor = outData.filter(s => s.product_id === p.id && s.vendor_id).reduce((sum, s) => sum + s.quantity, 0);
        const outFromVendor = outData.filter(s => s.product_id === p.id && s.source_out_stock_id).reduce((sum, s) => sum + s.quantity, 0);
        
        const dsInTotal = dsInData.filter(s => s.product_id === p.id).reduce((sum, s) => sum + s.quantity, 0);
        const dsOutTotal = dsOutData.filter(s => s.product_id === p.id).reduce((sum, s) => sum + s.quantity, 0);
        const dsStock = dsInTotal - dsOutTotal;

        const gudangStock = totalIn - outFromGudang;
        const vStock = outToVendor - outFromVendor;
        const totalInventory = gudangStock + vStock;
        
        const hasRegularHistory = totalIn > 0 || outFromGudang > 0 || outToVendor > 0 || outFromVendor > 0;
        
        let status = 'AMAN';
        if (gudangStock <= 0) status = 'HABIS';
        else if (gudangStock <= (p.minimum_stock || 0)) status = 'MENIPIS';

        return {
          ...p,
          gudangStock,
          totalVendor: vStock,
          totalInventory,
          dsStock,
          status,
          hasHistory: hasRegularHistory || dsInTotal > 0 || dsOutTotal > 0,
          hasRegularHistory
        };
      }).filter(item => item.hasHistory);

      setInventory(calculatedInventory);
      setStockIn([...inData, ...dsInData]);
      setStockOut([...outData, ...dsOutData]);
    } catch (err: any) {
      toast.error('Gagal mengambil data dashboard');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute stats
  const stats = useMemo(() => {
    return {
      totalGudang: inventory.reduce((sum, i) => sum + i.gudangStock, 0),
      totalVendor: inventory.reduce((sum, i) => sum + i.totalVendor, 0),
      totalInventory: inventory.reduce((sum, i) => sum + i.totalInventory, 0),
      totalDeadstock: inventory.reduce((sum, i) => sum + (i.dsStock || 0), 0),
      totalProducts: inventory.length,
      lowStock: inventory.filter(i => i.status === 'MENIPIS' && i.hasRegularHistory).length,
      outOfStock: inventory.filter(i => i.status === 'HABIS' && i.hasRegularHistory).length,
    };
  }, [inventory]);

  // Handle date filters logic
  const dateRange = useMemo(() => {
    const end = endOfDay(dateFilter === 'custom' && dateTo ? new Date(dateTo) : new Date());
    let start = startOfDay(new Date());
    
    if (dateFilter === 'today') start = startOfDay(new Date());
    else if (dateFilter === '7d') start = subDays(end, 7);
    else if (dateFilter === '30d') start = subDays(end, 30);
    else if (dateFilter === 'month') start = new Date(end.getFullYear(), end.getMonth(), 1);
    else if (dateFilter === 'custom' && dateFrom) start = startOfDay(new Date(dateFrom));
    
    return { start, end };
  }, [dateFilter, dateFrom, dateTo]);

  // Derived filtered data
  const filteredIn = useMemo(() => stockIn.filter(s => isWithinInterval(parseISO(s.transaction_date), dateRange)), [stockIn, dateRange]);
  const filteredOut = useMemo(() => stockOut.filter(s => isWithinInterval(parseISO(s.transaction_date), dateRange)), [stockOut, dateRange]);

  // 1. Chart: In vs Out by Date
  const inOutChartData = useMemo(() => {
    const datesMap: Record<string, { date: string; In: number; Out: number }> = {};
    
    filteredIn.forEach(s => {
      const d = format(parseISO(s.transaction_date), 'dd MMM');
      if (!datesMap[d]) datesMap[d] = { date: d, In: 0, Out: 0 };
      datesMap[d].In += s.quantity;
    });
    
    filteredOut.forEach(s => {
      const d = format(parseISO(s.transaction_date), 'dd MMM');
      if (!datesMap[d]) datesMap[d] = { date: d, In: 0, Out: 0 };
      datesMap[d].Out += s.quantity;
    });
    
    return Object.values(datesMap).sort((a, b) => new Date(a.date + ' ' + new Date().getFullYear()).getTime() - new Date(b.date + ' ' + new Date().getFullYear()).getTime());
  }, [filteredIn, filteredOut]);

  // 2. Chart: Top 10 Out Stock
  const top10OutData = useMemo(() => {
    const prodMap: Record<string, number> = {};
    filteredOut.forEach(s => {
      const name = s.product?.product_name || 'Unknown';
      prodMap[name] = (prodMap[name] || 0) + s.quantity;
    });
    return Object.entries(prodMap)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  }, [filteredOut]);

  // 3. Chart: Stock Vendor (Top Vendors by stored quantity)
  const vendorChartData = useMemo(() => {
    const vMap: Record<string, number> = {};
    stockOut.filter(s => s.vendor_id).forEach(s => {
      const name = s.vendor?.name || 'Unknown';
      vMap[name] = (vMap[name] || 0) + s.quantity;
    });
    stockOut.filter(s => s.source_out_stock_id).forEach(s => {
      const original = stockOut.find(o => o.id === s.source_out_stock_id);
      const name = original?.vendor?.name || 'Unknown';
      vMap[name] = (vMap[name] || 0) - s.quantity;
    });
    return Object.entries(vMap)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5); // top 5 vendor
  }, [stockOut]);

  // 4. Chart: Stock Status Pie
  const statusPieData = useMemo(() => {
    return [
      { name: 'AMAN', value: inventory.filter(i => i.status === 'AMAN' && i.hasRegularHistory).length },
      { name: 'MENIPIS', value: stats.lowStock },
      { name: 'HABIS', value: stats.outOfStock },
    ].filter(d => d.value > 0);
  }, [inventory, stats]);

  // Recent Activity (10 items)
  const recentActivity = useMemo(() => {
    const all = [
      ...stockIn.map(s => {
        return {
          id: s.id, type: s.isDeadstock ? 'DS IN' : 'IN', 
          date: s.created_at, ref: s.transaction_number, product: s.product?.product_name, qty: s.quantity,
          badgeColor: s.isDeadstock ? 'bg-slate-100 text-slate-800' : 'bg-blue-100 text-blue-800'
        };
      }),
      ...stockOut.map(s => {
        if (s.isDeadstock) {
          return {
            id: s.id, type: 'DS OUT', 
            date: s.created_at, ref: s.transaction_number, product: s.product?.product_name, qty: s.quantity,
            badgeColor: 'bg-rose-100 text-rose-800'
          };
        }
        if (s.vendor_id && !s.source_out_stock_id) {
          return {
            id: s.id, type: 'TO VENDOR', 
            date: s.created_at, ref: s.transaction_number, product: s.product?.product_name, qty: s.quantity,
            badgeColor: 'bg-teal-100 text-teal-800'
          };
        }
        if (s.source_out_stock_id) {
          return {
            id: s.id, type: 'FROM VENDOR', 
            date: s.created_at, ref: s.transaction_number, product: s.product?.product_name, qty: s.quantity,
            badgeColor: 'bg-purple-100 text-purple-800'
          };
        }
        return {
          id: s.id, type: 'OUT', 
          date: s.created_at, ref: s.transaction_number, product: s.product?.product_name, qty: s.quantity,
          badgeColor: 'bg-orange-100 text-orange-800'
        };
      })
    ];
    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
  }, [stockIn, stockOut]);

  const lowStockProducts = useMemo(() => {
    return inventory.filter(i => (i.status === 'HABIS' || i.status === 'MENIPIS') && i.hasRegularHistory)
      .sort((a, b) => a.gudangStock - b.gudangStock);
  }, [inventory]);

  if (!hasSupabaseConfig) return null; // Let layout handle the preview banner

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Ringkasan inventory dan pergerakan stok dari Supabase</p>
        </div>
        <Button onClick={fetchData} variant="secondary" className="bg-white border-slate-200">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <KPICard title="Total Stock Gudang" value={stats.totalGudang} icon={<Package className="w-6 h-6" />} color="blue" />
        <KPICard title="Total Stock Vendor" value={stats.totalVendor} icon={<Box className="w-6 h-6" />} color="purple" />
        <KPICard title="Total Inventory" value={stats.totalInventory} icon={<Layers className="w-6 h-6" />} color="indigo" />
        <KPICard title="Total Deadstock" value={stats.totalDeadstock} icon={<Package className="w-6 h-6" />} color="teal" />
        <KPICard title="Total Produk Aktif" value={stats.totalProducts} icon={<Activity className="w-6 h-6" />} color="teal" />
        <KPICard title="Stock Menipis" value={stats.lowStock} icon={<AlertCircle className="w-6 h-6" />} color="amber" />
        <KPICard title="Stock Habis" value={stats.outOfStock} icon={<AlertTriangle className="w-6 h-6" />} color="red" />
      </div>
      
      {/* Filters for Charts */}
      <div className="flex flex-wrap gap-3 items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <span className="text-sm font-medium text-slate-700 ml-2">Filter Grafik:</span>
        <Select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-40 text-sm">
          <option value="today">Hari Ini</option>
          <option value="7d">7 Hari Terakhir</option>
          <option value="30d">30 Hari Terakhir</option>
          <option value="month">Bulan Ini</option>
          <option value="custom">Custom Date</option>
        </Select>
        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36 text-sm h-9" />
            <span className="text-slate-400">-</span>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36 text-sm h-9" />
          </div>
        )}
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-2 !p-0 border-slate-200 shadow-sm overflow-hidden flex flex-col h-96">
          <div className="p-4 border-b border-red-100 bg-red-50/30 shrink-0">
            <h3 className="text-base font-bold text-red-900 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 text-red-600" /> Peringatan Stok
            </h3>
          </div>
          <div className="p-0 overflow-y-auto flex-1">
             <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold sticky top-0">
                  <tr>
                    <th className="px-4 py-3 border-b border-slate-100">Produk</th>
                    <th className="px-4 py-3 border-b border-slate-100 text-right">Stok</th>
                    <th className="px-4 py-3 border-b border-slate-100 text-right">Min</th>
                    <th className="px-4 py-3 border-b border-slate-100">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {lowStockProducts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                        Semua stok produk dalam kondisi aman.
                      </td>
                    </tr>
                  ) : (
                    lowStockProducts.map(p => (
                      <tr 
                        key={p.id} 
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => navigate('/inventory')}
                      >
                        <td className="px-4 py-3 font-medium text-slate-900">{p.product_code}<br/><span className="text-slate-500 font-normal text-xs">{p.product_name}</span></td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">{p.gudangStock}</td>
                        <td className="px-4 py-3 text-right text-slate-500">{p.minimum_stock}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'HABIS' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
             </table>
          </div>
        </Card>

        <Card className="!p-5 border-slate-200 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4">Status Stock</h3>
          <div className="h-72">
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={(PIE_COLORS as any)[entry.name] || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">Belum ada produk</div>
            )}
          </div>
        </Card>
      </div>

      {/* Secondary Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="!p-5 border-slate-200 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4">Top 10 Produk Keluar (Out Stock)</h3>
          <div className="h-64">
             {top10OutData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top10OutData} layout="vertical" margin={{ top: 0, right: 10, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569' }} width={120} />
                  <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="quantity" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={16} name="Qty Keluar" />
                </BarChart>
              </ResponsiveContainer>
             ) : (
               <div className="h-full flex items-center justify-center text-slate-400 text-sm">Tidak ada data barang keluar</div>
             )}
          </div>
        </Card>

        <Card className="!p-5 border-slate-200 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4">Sebaran Vendor Stock</h3>
          <div className="h-64">
             {vendorChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vendorChartData} layout="vertical" margin={{ top: 0, right: 10, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569' }} width={120} />
                  <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="quantity" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={16} name="Qty di Vendor" />
                </BarChart>
              </ResponsiveContainer>
             ) : (
               <div className="h-full flex items-center justify-center text-slate-400 text-sm">Tidak ada stok di vendor</div>
             )}
          </div>
        </Card>
      </div>

      {/* Activity & Low Stock Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="!p-5 border-slate-200 shadow-sm flex flex-col h-96">
          <h3 className="text-base font-bold text-slate-900 mb-4 shrink-0">In Stock vs Out Stock</h3>
          <div className="flex-1 min-h-0">
            {inOutChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inOutChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="In" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="Out" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">Tidak ada data di periode ini</div>
            )}
          </div>
        </Card>

        <Card className="!p-0 border-slate-200 shadow-sm overflow-hidden flex flex-col h-96">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-base font-bold text-slate-900">Aktivitas Terakhir</h3>
          </div>
          <div className="p-0 overflow-y-auto flex-1">
            <div className="divide-y divide-slate-100">
              {recentActivity.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">Belum ada aktivitas transaksi</div>
              ) : (
                recentActivity.map((act) => (
                  <div key={act.id} className="p-4 hover:bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        act.type === 'IN' ? 'bg-blue-100 text-blue-600' :
                        act.type === 'OUT' ? 'bg-orange-100 text-orange-600' :
                        act.type === 'TRANSFER' ? 'bg-purple-100 text-purple-600' :
                        'bg-teal-100 text-teal-600'
                      }`}>
                        {act.type === 'IN' ? <ArrowDownCircle className="w-4 h-4" /> :
                         act.type === 'OUT' ? <ArrowUpCircle className="w-4 h-4" /> :
                         <RefreshCw className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900 line-clamp-1">{act.product}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{act.ref} • {format(new Date(act.date), 'dd MMM yyyy, HH:mm')}</div>
                      </div>
                    </div>
                    <div className="text-right pl-3">
                      <div className="text-sm font-bold text-slate-900">
                        {act.type === 'OUT' ? '-' : '+'}{act.qty}
                      </div>
                      <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${act.badgeColor}`}>
                        {act.type}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon, color }: { title: string, value: string | number, icon: React.ReactNode, color: 'blue' | 'purple' | 'indigo' | 'teal' | 'amber' | 'red' }) {
  const colorStyles = {
    blue: 'bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200 text-blue-900',
    purple: 'bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200 text-purple-900',
    indigo: 'bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-200 text-indigo-900',
    teal: 'bg-gradient-to-br from-teal-50 to-teal-100/50 border-teal-200 text-teal-900',
    amber: 'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200 text-amber-900',
    red: 'bg-gradient-to-br from-red-50 to-red-100/50 border-red-200 text-red-900',
  };

  const iconBgStyles = {
    blue: 'bg-blue-200/50 text-blue-700',
    purple: 'bg-purple-200/50 text-purple-700',
    indigo: 'bg-indigo-200/50 text-indigo-700',
    teal: 'bg-teal-200/50 text-teal-700',
    amber: 'bg-amber-200/50 text-amber-700',
    red: 'bg-red-200/50 text-red-700',
  };

  return (
    <div className={`p-3.5 rounded-2xl border shadow-sm flex flex-col justify-between h-full ${colorStyles[color]} relative overflow-hidden group hover:shadow-md transition-shadow duration-300`}>
      <div className="absolute -right-2 -top-2 opacity-10 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
        <div className="w-16 h-16">{icon}</div>
      </div>
      <div className="flex justify-between items-start mb-2.5 relative z-10">
        <h4 className="text-[10px] font-bold uppercase tracking-wider opacity-80 leading-snug pr-4">{title}</h4>
        <div className={`p-1.5 rounded-xl ${iconBgStyles[color]} shrink-0 shadow-sm`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-black relative z-10 tracking-tight">
        {value}
      </div>
    </div>
  );
}
