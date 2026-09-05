import React, { useEffect, useState, useMemo } from 'react';
import { supabase, hasSupabaseConfig } from '../../lib/supabase';
import { Card, Select } from '../../components/ui';
import { Search, Loader2, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function VendorStockPage() {
  const [data, setData] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [filterVendor, setFilterVendor] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  
  const fetchData = async () => {
    if (!hasSupabaseConfig) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    // Fetch all stock_out and filter client-side to ensure we get both parent and child transactions
    const query = supabase.from('stock_out')
      .select('*, product:products(product_name, unit:units(name)), vendor:vendors(name)')
      .order('created_at', { ascending: false });
      
    const { data: rawData, error } = await query;
    
    if (error) { 
      console.error(error); 
      toast.error('Terjadi kesalahan. Silakan coba kembali.'); 
      setLoading(false);
      return;
    }

    // Process data to calculate remaining stock for each vendor batch
    const allStock = rawData || [];
    
    // Parent transactions: those that sent goods to vendor (has vendor_id, no source_out_stock_id)
    const vendorBatches = allStock.filter(s => s.vendor_id && !s.source_out_stock_id);
    
    // Child transactions: those that took goods FROM vendor (has source_out_stock_id)
    const vendorUsages = allStock.filter(s => s.source_out_stock_id);
    
    const processedData = vendorBatches.map(batch => {
      const usedQty = vendorUsages
        .filter(u => u.source_out_stock_id === batch.id)
        .reduce((sum, u) => sum + (u.quantity || 0), 0);
        
      const remainingQty = batch.quantity - usedQty;
      
      return {
        ...batch,
        remaining_quantity: remainingQty,
        status: remainingQty > 0 ? 'Tersedia' : 'Habis'
      };
    });
    
    setData(processedData);
    setLoading(false);
  };

  const fetchDependencies = async () => {
    if (!hasSupabaseConfig) return;
    const [pRes, vRes] = await Promise.all([
      supabase.from('products').select('*').eq('is_active', true),
      supabase.from('vendors').select('*').eq('is_active', true),
    ]);
    setProducts(pRes.data || []);
    setVendors(vRes.data || []);
  };

  useEffect(() => {
    fetchData();
  }, []); // Re-fetch only on mount, client-side filter is better for this processed data

  useEffect(() => {
    fetchDependencies();
  }, []);

  // Client-side filtering
  const filteredData = useMemo(() => {
    let result = data;
    if (search) {
      result = result.filter(item => 
        item.transaction_number?.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (filterVendor) {
      result = result.filter(item => item.vendor_id === filterVendor);
    }
    if (filterProduct) {
      result = result.filter(item => item.product_id === filterProduct);
    }
    return result;
  }, [data, search, filterVendor, filterProduct]);

  if (!hasSupabaseConfig) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Stock</h1>
          <p className="text-gray-500 text-sm mt-1">Pemantauan sisa stok barang yang berada di vendor</p>
        </div>
      </div>

      <Card className="!p-0 border-slate-200 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50/50">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari no transaksi..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <Select 
            value={filterVendor} 
            onChange={(e) => setFilterVendor(e.target.value)}
            className="w-full bg-white"
          >
            <option value="">Semua Vendor</option>
            {vendors.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </Select>

          <Select 
            value={filterProduct} 
            onChange={(e) => setFilterProduct(e.target.value)}
            className="w-full bg-white"
          >
            <option value="">Semua Produk</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.product_code} - {p.product_name}</option>
            ))}
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-white text-[11px] uppercase text-slate-500 font-bold sticky top-0 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">No Vendor Stock</th>
                <th className="px-5 py-3">No Transaksi</th>
                <th className="px-5 py-3">Tanggal</th>
                <th className="px-5 py-3">Vendor</th>
                <th className="px-5 py-3">Produk</th>
                <th className="px-5 py-3 text-right">Dikirim</th>
                <th className="px-5 py-3 text-right">Sisa Stok</th>
                <th className="px-5 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500 bg-white">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-500" />
                    Memuat data...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500 bg-white flex flex-col items-center justify-center">
                    <Package className="w-12 h-12 text-slate-300 mb-3" />
                    <p className="text-base font-medium text-slate-600">Tidak ada data ditemukan</p>
                    <p className="text-xs text-slate-400 mt-1">Coba ubah filter pencarian Anda</p>
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors bg-white">
                    <td className="px-5 py-3 font-mono font-bold text-indigo-700 bg-indigo-50/30">
                      VS-{item.transaction_number.replace('OUT-', '')}
                    </td>
                    <td className="px-5 py-3 font-mono font-medium text-slate-700">
                      {item.transaction_number}
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {item.transaction_date ? format(new Date(item.transaction_date), 'dd MMM yyyy') : '-'}
                    </td>
                    <td className="px-5 py-3 font-medium text-indigo-700">
                      {item.vendor?.name || '-'}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {item.product?.product_name || '-'}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-500">
                      {item.quantity} {item.product?.unit?.name}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-slate-900">
                      {item.remaining_quantity} {item.product?.unit?.name}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {item.status === 'Tersedia' ? (
                        <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-800">
                          Tersedia
                        </span>
                      ) : (
                        <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-500">
                          Habis
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
