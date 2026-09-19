import React, { useEffect, useState, useMemo } from 'react';
import { useBackgroundRefresh } from '../hooks/useBackgroundRefresh';
import { supabase, hasSupabaseConfig } from '../lib/supabase';
import { Card, Button, Input, Modal, Select } from '../components/ui';
import { Search, Loader2, Eye, Box, AlertTriangle, PackageX, PackageCheck, List, ArrowDownRight, ArrowUpRight, DollarSign, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';

export default function InventoryPage({ type = 'stock' }: { type?: 'stock' | 'warehouse' | 'deadstock' | 'cloudpop' | 'marketing' }) {
  const [inventory, setInventory] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    setSearch('');
    setCategoryFilter('');
    setStatusFilter('');
  }, [type]);

  // Details Modal
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'movement'>('summary');
  const [movementLoading, setMovementLoading] = useState(false);
  const [movements, setMovements] = useState<any[]>([]);

  const fetchAll = async (queryFn: () => any) => {
    let allData: any[] = [];
    let page = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data, error } = await queryFn().range(page * pageSize, (page + 1) * pageSize - 1);
      if (error) {
        console.error(error);
        break;
      }
      if (data && data.length > 0) {
        allData = [...allData, ...data];
        if (data.length < pageSize) break;
      } else {
        break;
      }
      page++;
    }
    return allData;
  };

  const fetchInventory = async (isBackground = false) => {
    if (!hasSupabaseConfig) {
      import('../lib/mockData').then((mock) => {
        setInventory(mock.mockInventory);
        setCategories(mock.mockCategories);
        if (!isBackground) setLoading(false);
      });
      return;
    }
    
    if (!isBackground) setLoading(true);
    
    // Fetch all required data to calculate inventory
    const [products, stockIn, stockOut, categories] = await Promise.all([
      fetchAll(() => supabase.from('products').select('*, category:categories(id, name), unit:units(id, name)')),
      fetchAll(() => supabase.from(type === 'deadstock' ? 'deadstock_in' : 'stock_in').select(
        type === 'deadstock' ? 'id, product_id, quantity, total_cost, unit_cost, notes, photo_url' : 'id, product_id, quantity, total_cost, unit_cost, photo_url, reason:in_stock_reasons(name)'
      )),
      fetchAll(() => supabase.from(type === 'deadstock' ? 'deadstock_out' : 'stock_out').select(
        type === 'deadstock' ? 'id, product_id, quantity, deadstock_in_id, unit_cost' : 'id, product_id, quantity, vendor_id, source_out_stock_id, stock_in_id, unit_cost, stock_in:stock_in(reason:in_stock_reasons(name))'
      )),
      fetchAll(() => supabase.from('categories').select('*').eq('is_active', true))
    ]);
    setCategories(categories || []);

    // Calculate per product
    const calculated = products.map(product => {
      let filteredStockIn;
      let outFromGudang;
      let outToVendor = 0;
      let outFromVendor = 0;
      
      if (type === 'deadstock') {
        filteredStockIn = stockIn.filter(s => s.product_id === product.id);
        outFromGudang = stockOut.filter(s => s.product_id === product.id);
      } else {
        filteredStockIn = stockIn.filter(s => s.product_id === product.id && (s.reason?.name || '').toLowerCase() === type.toLowerCase());
        outFromGudang = stockOut.filter(s => s.product_id === product.id && !s.source_out_stock_id && (s.stock_in?.reason?.name || '').toLowerCase() === type.toLowerCase());
        outToVendor = stockOut.filter(s => s.product_id === product.id && s.vendor_id).reduce((sum, s) => sum + (s.quantity || 0), 0);
        outFromVendor = stockOut.filter(s => s.product_id === product.id && s.source_out_stock_id).reduce((sum, s) => sum + (s.quantity || 0), 0);
      }
      
      const totalIn = filteredStockIn.reduce((sum, s) => sum + (s.quantity || 0), 0);
      const totalOutGudang = outFromGudang.reduce((sum, s) => sum + (s.quantity || 0), 0);
      
      const gudangStock = totalIn - totalOutGudang;
      const totalVendor = outToVendor - outFromVendor;

      // Calculate Nilai Asset (per batch) and Notes Breakdown (for Deadstock)
      const notesBreakdown = {
        'Ganti Model': 0,
        'Cancel Klien': 0,
        'Overstock': 0,
        'Defect': 0,
        'Miss Spek': 0
      };

      let assetGudang = 0;
      filteredStockIn.forEach(batch => {
        let batchOuts;
        if (type === 'deadstock') {
          batchOuts = stockOut.filter(out => out.deadstock_in_id === batch.id);
        } else {
          batchOuts = stockOut.filter(out => out.stock_in_id === batch.id && !out.source_out_stock_id);
        }
        const totalOut = batchOuts.reduce((sum, out) => sum + (out.quantity || 0), 0);
        const remaining = batch.quantity - totalOut;
        if (remaining > 0) {
          const batchAssetValue = remaining * (batch.unit_cost || (batch.total_cost / batch.quantity) || 0);
          assetGudang += batchAssetValue;
          if (type === 'deadstock' && batch.notes) {
            if (notesBreakdown[batch.notes as keyof typeof notesBreakdown] !== undefined) {
              notesBreakdown[batch.notes as keyof typeof notesBreakdown] += batchAssetValue;
            }
          }
        }
      });

      let assetVendor = 0;
      if (type === 'stock') {
        const vendorBatches = stockOut.filter(s => s.product_id === product.id && s.vendor_id && !s.source_out_stock_id);
        vendorBatches.forEach(batch => {
          const batchOuts = stockOut.filter(out => out.source_out_stock_id === batch.id);
          const totalOut = batchOuts.reduce((sum, out) => sum + (out.quantity || 0), 0);
          const remaining = batch.quantity - totalOut;
          if (remaining > 0) {
            assetVendor += remaining * (batch.unit_cost || 0);
          }
        });
      }

      let status = 'AMAN';
      if (gudangStock <= 0) status = 'HABIS';
      else if (gudangStock <= product.minimum_stock) status = 'MENIPIS';

      const hasHistory = filteredStockIn.length > 0 || outFromGudang.length > 0 || (type === 'stock' && (outToVendor > 0 || outFromVendor > 0));

      const latestStockInWithPhoto = filteredStockIn.find(s => s.photo_url);
      const photo_url = product.photo_url || latestStockInWithPhoto?.photo_url || null;

      return {
        ...product,
        gudangStock,
        totalVendor: type === 'stock' ? totalVendor : 0,
        totalInventory: gudangStock + (type === 'stock' ? totalVendor : 0),
        assetValue: assetGudang + assetVendor,
        notesBreakdown,
        status,
        hasHistory,
        photo_url
      };
    }).filter(item => {
      if (type === 'deadstock' && item.gudangStock <= 0) return false;
      return item.hasHistory;
    });

    setInventory(calculated);
    if (!isBackground) setLoading(false);
  };

  useEffect(() => {
    fetchInventory();
  }, [type]);

  useBackgroundRefresh(fetchInventory);

  const fetchMovements = async (productId: string) => {
    setMovementLoading(true);
    if (!hasSupabaseConfig) {
      setTimeout(() => {
        setMovements([
          { id: 'm1', date: '2026-09-01T10:00:00Z', type: 'IN', reference: 'IN-20260901-0001', qty: 200, location: 'Gudang', pic: 'Andi Saputra' },
          { id: 'm2', date: '2026-09-02T14:00:00Z', type: 'OUT', reference: 'OUT-20260902-0001', qty: -50, location: 'Divisi HR', pic: 'Budi Santoso' },
        ]);
        setMovementLoading(false);
      }, 500);
      return;
    }
    try {
      const [inData, outData] = await Promise.all([
        fetchAll(() => supabase.from(type === 'deadstock' ? 'deadstock_in' : 'stock_in').select(
          type === 'deadstock' ? '*, pic:pics(name)' : '*, pic:pics(name), reason:in_stock_reasons(name)'
        ).eq('product_id', productId)),
        fetchAll(() => supabase.from(type === 'deadstock' ? 'deadstock_out' : 'stock_out').select(
          type === 'deadstock' ? '*, pic:pics(name), deadstock_in:deadstock_in(deadstock_status)' : '*, pic:pics(name), vendor:vendors(name), stock_in:stock_in(deadstock_status, reason:in_stock_reasons(name))'
        ).eq('product_id', productId))
      ]);

      const moves: any[] = [];
      
      (inData || []).forEach(item => {
        if (type !== 'deadstock' && (item.reason?.name || '').toLowerCase() !== type.toLowerCase()) return;
        moves.push({
          id: item.id,
          date: item.transaction_date || item.created_at,
          type: 'IN',
          reference: item.transaction_number,
          qty: item.quantity,
          location: 'Gudang',
          pic: item.pic?.name || '-',
          deadstockStatus: item.deadstock_status || '-',
          invoiceNumber: item.invoice_number || '-',
          ketSales: item.notes || '-'
        });
      });

      (outData || []).forEach(item => {
        if (type === 'deadstock') {
          moves.push({
            id: item.id,
            date: item.transaction_date || item.created_at,
            type: 'OUT',
            reference: item.transaction_number,
            qty: -item.quantity,
            location: item.destination || 'Gudang',
            pic: item.pic?.name || '-',
            deadstockStatus: item.deadstock_in?.deadstock_status || '-',
            invoiceNumber: item.invoice_number || '-',
            ketSales: item.notes || '-'
          });
        } else {
          if (!item.source_out_stock_id && (item.stock_in?.reason?.name || '').toLowerCase() !== type.toLowerCase()) return;
          
          if (item.vendor_id && !item.source_out_stock_id) {
            moves.push({
              id: item.id,
              date: item.transaction_date || item.created_at,
              type: 'TO VENDOR',
              reference: item.transaction_number,
              qty: -item.quantity,
              location: item.vendor?.name || 'Vendor',
              pic: item.pic?.name || '-',
              deadstockStatus: item.stock_in?.deadstock_status || '-'
            });
          } else if (item.source_out_stock_id) {
             moves.push({
              id: item.id,
              date: item.transaction_date || item.created_at,
              type: 'FROM VENDOR',
              reference: item.transaction_number,
              qty: -item.quantity,
              location: item.destination || 'External',
              pic: item.pic?.name || '-',
              deadstockStatus: item.stock_in?.deadstock_status || '-'
            });
          } else {
            moves.push({
              id: item.id,
              date: item.transaction_date || item.created_at,
              type: 'OUT',
              reference: item.transaction_number,
              qty: -item.quantity,
              location: item.destination || 'Gudang',
              pic: item.pic?.name || '-',
              deadstockStatus: item.stock_in?.deadstock_status || '-'
            });
          }
        }
      });

      // Sort by date descending
      moves.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setMovements(moves);
    } catch (error: any) {
      console.error(error);
    } finally {
      setMovementLoading(false);
    }
  };

  const handleOpenDetail = (product: any) => {
    setSelectedProduct(product);
    setActiveTab('summary');
    setIsDetailOpen(true);
    fetchMovements(product.id);
  };

  // Filter Data
  const filtered = useMemo(() => {
    return inventory.filter(item => {
      const matchSearch = 
        item.product_name?.toLowerCase().includes(search.toLowerCase()) || 
        item.product_code?.toLowerCase().includes(search.toLowerCase()) ||
        item.category?.name?.toLowerCase().includes(search.toLowerCase());
      
      const matchCat = categoryFilter ? item.category_id === categoryFilter : true;
      const matchStatus = statusFilter ? item.status === statusFilter : true;

      return matchSearch && matchCat && matchStatus;
    });
  }, [inventory, search, categoryFilter, statusFilter]);

  // Aggregate stats
  const stats = useMemo(() => {
    return {
      totalProducts: inventory.length,
      totalGudang: inventory.reduce((acc, curr) => acc + curr.gudangStock, 0),
      totalVendor: inventory.reduce((acc, curr) => acc + curr.totalVendor, 0),
      totalInventory: inventory.reduce((acc, curr) => acc + curr.totalInventory, 0),
      totalAssetValue: inventory.reduce((acc, curr) => acc + (curr.assetValue || 0), 0),
      habis: inventory.filter(i => i.status === 'HABIS').length,
      menipis: inventory.filter(i => i.status === 'MENIPIS').length,
      gantiModel: inventory.reduce((acc, curr) => acc + (curr.notesBreakdown?.['Ganti Model'] || 0), 0),
      cancelKlien: inventory.reduce((acc, curr) => acc + (curr.notesBreakdown?.['Cancel Klien'] || 0), 0),
      overstock: inventory.reduce((acc, curr) => acc + (curr.notesBreakdown?.['Overstock'] || 0), 0),
      defect: inventory.reduce((acc, curr) => acc + (curr.notesBreakdown?.['Defect'] || 0), 0),
      missSpek: inventory.reduce((acc, curr) => acc + (curr.notesBreakdown?.['Miss Spek'] || 0), 0),
    };
  }, [inventory]);

  const formatMoneyShort = (value: number) => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)} M`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)} Jt`;
    return value.toLocaleString('id-ID');
  };

  if (!hasSupabaseConfig) return null;

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 capitalize">Inventory {type}</h1>
        <p className="text-gray-500 text-sm mt-1">Pusat informasi dan tracking stock terkini untuk {type}</p>
      </div>

      {type === 'deadstock' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card className="p-4 bg-white border-slate-200">
            <div className="flex flex-col">
              <span className="text-slate-500 text-xs font-semibold uppercase">Total Produk</span>
              <span className="text-2xl font-bold text-slate-800 mt-1">{stats.totalProducts}</span>
            </div>
          </Card>
          <Card className="p-4 bg-teal-50 border-teal-100">
            <div className="flex flex-col">
              <span className="text-teal-600 text-xs font-semibold uppercase flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Nilai Asset
              </span>
              <span className="text-xl font-bold text-teal-900 mt-1" title={`Rp ${stats.totalAssetValue.toLocaleString('id-ID')}`}>
                {formatMoneyShort(stats.totalAssetValue)}
              </span>
            </div>
          </Card>
          <Card className="p-4 bg-blue-50 border-blue-100">
            <div className="flex flex-col">
              <span className="text-blue-600 text-xs font-semibold uppercase">Ganti Model</span>
              <span className="text-xl font-bold text-blue-900 mt-1" title={`Rp ${stats.gantiModel.toLocaleString('id-ID')}`}>{formatMoneyShort(stats.gantiModel)}</span>
            </div>
          </Card>
          <Card className="p-4 bg-indigo-50 border-indigo-100">
            <div className="flex flex-col">
              <span className="text-indigo-600 text-xs font-semibold uppercase">Overstock</span>
              <span className="text-xl font-bold text-indigo-900 mt-1" title={`Rp ${stats.overstock.toLocaleString('id-ID')}`}>{formatMoneyShort(stats.overstock)}</span>
            </div>
          </Card>
          <Card className="p-4 bg-amber-50 border-amber-100">
            <div className="flex flex-col">
              <span className="text-amber-600 text-xs font-semibold uppercase">Cancel Klien</span>
              <span className="text-xl font-bold text-amber-900 mt-1" title={`Rp ${stats.cancelKlien.toLocaleString('id-ID')}`}>{formatMoneyShort(stats.cancelKlien)}</span>
            </div>
          </Card>
          <Card className="p-4 bg-rose-50 border-rose-100">
            <div className="flex flex-col">
              <span className="text-rose-600 text-xs font-semibold uppercase">Defect</span>
              <span className="text-xl font-bold text-rose-900 mt-1" title={`Rp ${stats.defect.toLocaleString('id-ID')}`}>{formatMoneyShort(stats.defect)}</span>
            </div>
          </Card>
          <Card className="p-4 bg-purple-50 border-purple-100">
            <div className="flex flex-col">
              <span className="text-purple-600 text-xs font-semibold uppercase">Miss Spek</span>
              <span className="text-xl font-bold text-purple-900 mt-1" title={`Rp ${stats.missSpek.toLocaleString('id-ID')}`}>{formatMoneyShort(stats.missSpek)}</span>
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card className="p-4 bg-white border-slate-200">
            <div className="flex flex-col">
              <span className="text-slate-500 text-xs font-semibold uppercase">Total Produk</span>
              <span className="text-2xl font-bold text-slate-800 mt-1">{stats.totalProducts}</span>
            </div>
          </Card>
          <Card className="p-4 bg-blue-50 border-blue-100">
            <div className="flex flex-col">
              <span className="text-blue-600 text-xs font-semibold uppercase">Stock Gudang</span>
              <span className="text-2xl font-bold text-blue-900 mt-1">{stats.totalGudang}</span>
            </div>
          </Card>
          <Card className="p-4 bg-indigo-50 border-indigo-100">
            <div className="flex flex-col">
              <span className="text-indigo-600 text-xs font-semibold uppercase">Stock Vendor</span>
              <span className="text-2xl font-bold text-indigo-900 mt-1">{stats.totalVendor}</span>
            </div>
          </Card>
          <Card className="p-4 bg-emerald-50 border-emerald-100">
            <div className="flex flex-col">
              <span className="text-emerald-600 text-xs font-semibold uppercase">Total Inventory</span>
              <span className="text-2xl font-bold text-emerald-900 mt-1">{stats.totalInventory}</span>
            </div>
          </Card>
          <Card className="p-4 bg-teal-50 border-teal-100">
            <div className="flex flex-col">
              <span className="text-teal-600 text-xs font-semibold uppercase flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Nilai Asset
              </span>
              <span className="text-xl font-bold text-teal-900 mt-1" title={`Rp ${stats.totalAssetValue.toLocaleString('id-ID')}`}>
                {stats.totalAssetValue >= 1000000000 
                  ? `${(stats.totalAssetValue / 1000000000).toFixed(1)} M` 
                  : stats.totalAssetValue >= 1000000 
                  ? `${(stats.totalAssetValue / 1000000).toFixed(1)} Jt` 
                  : stats.totalAssetValue.toLocaleString('id-ID')}
              </span>
            </div>
          </Card>
          <Card className="p-4 bg-rose-50 border-rose-100">
            <div className="flex flex-col">
              <span className="text-rose-600 text-xs font-semibold uppercase">Produk Habis</span>
              <span className="text-2xl font-bold text-rose-900 mt-1">{stats.habis}</span>
            </div>
          </Card>
          <Card className="p-4 bg-amber-50 border-amber-100">
            <div className="flex flex-col">
              <span className="text-amber-600 text-xs font-semibold uppercase">Produk Menipis</span>
              <span className="text-2xl font-bold text-amber-900 mt-1">{stats.menipis}</span>
            </div>
          </Card>
        </div>
      )}

      <Card className="!p-0 border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kode, nama, kategori..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-100 border-none rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="w-full px-3 py-1.5 bg-slate-100 border-none rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">Semua Kategori</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            className="w-full px-3 py-1.5 bg-slate-100 border-none rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Semua Status</option>
            <option value="AMAN">AMAN</option>
            <option value="MENIPIS">MENIPIS</option>
            <option value="HABIS">HABIS</option>
          </select>
        </div>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6">
          {loading ? (
            <div className="col-span-full py-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Memuat...</div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full py-8 text-center text-slate-500">Tidak ada data</div>
          ) : (
            filtered.map((item) => (
              <div key={item.id} onClick={() => handleOpenDetail(item)} className={`bg-white rounded-xl border ${item.status === 'HABIS' ? 'border-rose-200' : item.status === 'MENIPIS' ? 'border-amber-200' : 'border-slate-200'} shadow-sm hover:shadow-md transition-shadow overflow-hidden group flex flex-col cursor-pointer`}>
                <div className="relative aspect-square bg-slate-100 overflow-hidden">
                  {item.photo_url ? (
                    <img src={item.photo_url} alt={item.product_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-300">
                      <ImageIcon className="w-12 h-12" />
                    </div>
                  )}
                  
                  <div className="absolute top-2 right-2 flex flex-col gap-1.5">
                    <div className="bg-white/95 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-bold text-slate-700 shadow-sm border border-slate-200 flex items-center gap-1.5">
                      <Box className="w-3 h-3 text-blue-500" /> Gudang: {item.gudangStock}
                    </div>
                    {type === 'stock' && (
                      <div className="bg-white/95 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-bold text-slate-700 shadow-sm border border-slate-200 flex items-center gap-1.5">
                        <PackageCheck className="w-3 h-3 text-indigo-500" /> Vendor: {item.totalVendor}
                      </div>
                    )}
                  </div>

                  <div className="absolute bottom-2 left-2">
                    {item.status === 'HABIS' ? (
                      <span className="px-2 py-1 bg-rose-500/90 backdrop-blur-sm text-white rounded text-[10px] font-bold shadow-sm">HABIS</span>
                    ) : item.status === 'MENIPIS' ? (
                      <span className="px-2 py-1 bg-amber-500/90 backdrop-blur-sm text-white rounded text-[10px] font-bold shadow-sm">MENIPIS</span>
                    ) : (
                      <span className="px-2 py-1 bg-emerald-500/90 backdrop-blur-sm text-white rounded text-[10px] font-bold shadow-sm">AMAN</span>
                    )}
                  </div>
                </div>

                <div className="p-3 flex-1 flex flex-col justify-between bg-white">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 line-clamp-2 mb-1" title={item.product_name}>{item.product_name}</h3>
                    <p className="text-[10px] text-slate-500 font-mono">{item.product_code} • {item.category?.name}</p>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 font-medium">Nilai Asset</span>
                    <span className="text-sm font-bold text-teal-600">Rp {(item.assetValue || 0).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Product Detail Modal */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="Detail Kartu Stock">
        {selectedProduct && (
          <div className="space-y-6">
            <div className="flex border-b border-slate-200">
              <button 
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'summary' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                onClick={() => setActiveTab('summary')}
              >
                Informasi Stock
              </button>
              <button 
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'movement' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                onClick={() => setActiveTab('movement')}
              >
                Stock Movement
              </button>
            </div>

            {activeTab === 'summary' && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 mb-6">
                  {selectedProduct.photo_url ? (
                    <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-slate-50">
                      <img src={selectedProduct.photo_url} alt={selectedProduct.product_name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                      <Box className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{selectedProduct.product_name}</h2>
                    <p className="text-slate-500 text-sm font-mono">{selectedProduct.product_code} • {selectedProduct.category?.name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 text-xs font-medium uppercase">Stock Gudang</span>
                    <div className="text-2xl font-bold text-slate-800 mt-1">{selectedProduct.gudangStock} <span className="text-sm font-normal text-slate-500">{selectedProduct.unit?.name}</span></div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 text-xs font-medium uppercase">Stock Vendor</span>
                    <div className="text-2xl font-bold text-slate-800 mt-1">{selectedProduct.totalVendor} <span className="text-sm font-normal text-slate-500">{selectedProduct.unit?.name}</span></div>
                  </div>
                  <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 col-span-2">
                    <span className="text-indigo-600 text-xs font-medium uppercase">Total Inventory</span>
                    <div className="text-3xl font-bold text-indigo-900 mt-1">{selectedProduct.totalInventory} <span className="text-sm font-normal text-indigo-600/70">{selectedProduct.unit?.name}</span></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-500">Minimum Stock</span>
                    <span className="font-bold text-slate-700">{selectedProduct.minimum_stock}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-500">Status</span>
                    {selectedProduct.status === 'HABIS' ? (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-[10px] font-bold flex items-center gap-1"><PackageX className="w-3 h-3"/> HABIS</span>
                    ) : selectedProduct.status === 'MENIPIS' ? (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> MENIPIS</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold flex items-center gap-1"><PackageCheck className="w-3 h-3"/> AMAN</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'movement' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm">Riwayat Transaksi</h3>
                </div>
                
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="overflow-y-auto max-h-[400px]">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold sticky top-0">
                        <tr>
                          <th className="px-4 py-2 border-b border-slate-200">Tanggal</th>
                          <th className="px-4 py-2 border-b border-slate-200">Type</th>
                          <th className="px-4 py-2 border-b border-slate-200">Ref</th>
                          <th className="px-4 py-2 border-b border-slate-200 text-right">Qty</th>
                          <th className="px-4 py-2 border-b border-slate-200">Lokasi</th>
                          <th className="px-4 py-2 border-b border-slate-200">{type === 'deadstock' ? 'PIC Sales' : 'PIC'}</th>
                          {type === 'deadstock' && <th className="px-4 py-2 border-b border-slate-200">No Invoice</th>}
                          {type === 'deadstock' && <th className="px-4 py-2 border-b border-slate-200">Status Deadstock</th>}
                          {type === 'deadstock' && <th className="px-4 py-2 border-b border-slate-200">Ket. Sales</th>}
                        </tr>
                      </thead>
                      <tbody className="text-xs text-slate-600">
                        {movementLoading ? (
                          <tr><td colSpan={6} className="px-4 py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />Memuat...</td></tr>
                        ) : movements.length === 0 ? (
                          <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Tidak ada riwayat pergerakan stock</td></tr>
                        ) : (
                          movements.map((m, i) => (
                            <tr key={m.id + i} className="hover:bg-slate-50 border-b border-slate-100">
                              <td className="px-4 py-3">{format(new Date(m.date), 'dd/MM/yyyy')}</td>
                              <td className="px-4 py-3">
                                {m.type === 'IN' && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1 w-max"><ArrowDownRight className="w-3 h-3"/> IN</span>}
                                {m.type === 'OUT' && <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded flex items-center gap-1 w-max"><ArrowUpRight className="w-3 h-3"/> OUT</span>}
                                {m.type === 'VENDOR IN' && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded flex items-center gap-1 w-max"><ArrowDownRight className="w-3 h-3"/> VENDOR</span>}
                              </td>
                              <td className="px-4 py-3 font-mono">{m.reference}</td>
                              <td className={`px-4 py-3 text-right font-bold ${m.qty > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {m.qty > 0 ? '+' : ''}{m.qty}
                              </td>
                              <td className="px-4 py-3 truncate max-w-[120px]">{m.location}</td>
                              <td className="px-4 py-3">{m.pic}</td>
                              {type === 'deadstock' && <td className="px-4 py-3">{m.invoiceNumber || '-'}</td>}
                              {type === 'deadstock' && <td className="px-4 py-3">{m.deadstockStatus || '-'}</td>}
                              {type === 'deadstock' && <td className="px-4 py-3">{m.ketSales || '-'}</td>}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-end pt-4">
              <Button onClick={() => setIsDetailOpen(false)}>Tutup</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
