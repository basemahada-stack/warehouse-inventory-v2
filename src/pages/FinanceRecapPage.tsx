import React, { useEffect, useState } from 'react';
import { supabase, hasSupabaseConfig } from '../lib/supabase';
import { Card, Input, Select, Button } from '../components/ui';
import { Search, Loader2, Calculator, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function FinanceRecapPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '' | 'checked' | 'unchecked'
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const pageSize = 15;

  const fetchData = async () => {
    if (!hasSupabaseConfig) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let query = supabase.from('stock_out')
      .select('*, product:products(product_name), reason:out_stock_reasons!inner(name), pic:pics(name), vendor:vendors(name), stock_in:stock_in(transaction_number)', { count: 'exact' })
      .ilike('reason.name', '%konsumen%')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });
      
    if (search) query = query.ilike('transaction_number', `%${search}%`);
    if (dateFilter) query = query.eq('transaction_date', dateFilter);
    if (statusFilter === 'checked') query = query.eq('is_checked_finance', true);
    if (statusFilter === 'unchecked') query = query.is('is_checked_finance', false); // Can be false or null
    
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
    
    const { data: resultData, count, error } = await query;
    if (error) { 
      console.error(error); 
      toast.error('Terjadi kesalahan. Silakan coba kembali.'); 
    } else {
      let finalData = resultData || [];
      const parentIds = finalData.filter(d => d.source_out_stock_id).map(d => d.source_out_stock_id);
      if (parentIds.length > 0) {
        const { data: parents } = await supabase.from('stock_out').select('id, transaction_number').in('id', parentIds);
        if (parents) {
          finalData = finalData.map(d => {
            if (d.source_out_stock_id) {
              const p = parents.find(p => p.id === d.source_out_stock_id);
              if (p) {
                return { ...d, manual_parent_stock: p };
              }
            }
            return d;
          });
        }
      }
      setData(finalData);
      if (count !== null) setTotalRows(count);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [search, dateFilter, statusFilter, page]);

  const handleToggleCheck = async (id: string, currentValue: boolean) => {
    if (!hasSupabaseConfig) return toast.error('Fitur dinonaktifkan di Preview Mode');
    
    try {
      const newValue = !currentValue;
      // Optimistic update
      setData(prev => prev.map(item => item.id === id ? { ...item, is_checked_finance: newValue } : item));
      
      const { error } = await supabase
        .from('stock_out')
        .update({ is_checked_finance: newValue })
        .eq('id', id);
        
      if (error) throw error;
      toast.success(`Status pemerikasaan diperbarui`);
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal memperbarui status');
      // Revert optimistic update on error
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-indigo-600" />
            Rekap Finance
          </h1>
          <p className="text-slate-500 mt-1">Pemantauan dan pemeriksaan pengeluaran (Out Stock)</p>
        </div>
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Cari no transaksi..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 bg-white"
            />
          </div>
          <Input 
            type="date"
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
            className="sm:w-48 bg-white"
          />
          <Select 
            value={statusFilter} 
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="sm:w-48 bg-white"
          >
            <option value="">Semua Status</option>
            <option value="checked">Sudah Diperiksa</option>
            <option value="unchecked">Belum Diperiksa</option>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white text-[11px] uppercase text-slate-500 font-bold sticky top-0 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-center">Periksa</th>
                <th className="px-4 py-3">Sumber Stock</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Produk</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3 text-right">Cost Satuan</th>
                <th className="px-4 py-3 text-right">Total Cost</th>
                <th className="px-4 py-3">Tujuan</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3">PIC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-500 bg-white">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Memuat data...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-500 bg-white">
                    Tidak ada data ditemukan
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 bg-white transition-colors">
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleCheck(item.id, item.is_checked_finance)}
                        className={`w-6 h-6 rounded flex items-center justify-center transition-colors border ${
                          item.is_checked_finance 
                            ? 'bg-indigo-500 border-indigo-500 text-white shadow-sm' 
                            : 'bg-white border-slate-300 text-transparent hover:border-indigo-400'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-slate-700">
                      {item.stock_in?.transaction_number || 
                       (item.manual_parent_stock?.transaction_number 
                        ? `VS-${item.manual_parent_stock.transaction_number.replace('OUT-', '')}` 
                        : '-')}
                    </td>
                    <td className="px-4 py-3">{format(new Date(item.transaction_date), 'dd MMM yyyy')}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.product?.product_name || '-'}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-500">-{item.quantity}</td>
                    <td className="px-4 py-3 text-right">Rp {(item.unit_cost || 0).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">Rp {(item.total_cost || 0).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3">{item.reason?.name || '-'}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate" title={item.notes || ''}>{item.notes || '-'}</td>
                    <td className="px-4 py-3">{item.pic?.name || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalRows > pageSize && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs bg-white">
            <span className="text-slate-500">
              Menampilkan {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, totalRows)} dari {totalRows} data
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Sebelumnya</Button>
              <Button variant="ghost" disabled={page * pageSize >= totalRows} onClick={() => setPage(p => p + 1)}>Selanjutnya</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
