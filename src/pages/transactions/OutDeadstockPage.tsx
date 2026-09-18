import React, { useEffect, useState } from 'react';
import { useBackgroundRefresh } from '../../hooks/useBackgroundRefresh';
import { supabase, hasSupabaseConfig } from '../../lib/supabase';
import { Card, Button, Input, Modal, Select } from '../../components/ui';
import { Plus, Search, Loader2, Eye, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function OutDeadstockPage() {
  const [data, setData] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [pics, setPics] = useState<any[]>([]);
  const [availableBatches, setAvailableBatches] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [picFilter, setPicFilter] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const pageSize = 10;
  
  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [viewData, setViewData] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async (isBackground = false) => {
    if (!hasSupabaseConfig) {
      setData([]);
      setTotalRows(0);
      if (!isBackground) setLoading(false);
      return;
    }
    if (!isBackground) setLoading(true);
    let query = supabase.from('deadstock_out')
      .select('*, product:products(product_name, unit:units(name)), pic:pics(name), deadstock_in:deadstock_in(transaction_number)', { count: 'exact' })
      .order('created_at', { ascending: false });
      
    if (search) query = query.ilike('transaction_number', `%${search}%`);
    if (dateFilter) query = query.eq('transaction_date', dateFilter);
    if (productFilter) query = query.eq('product_id', productFilter);
    if (picFilter) query = query.eq('pic_id', picFilter);
    
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
    
    const { data, count, error } = await query;
    if (error) { console.error(error); toast.error('Terjadi kesalahan. Silakan coba kembali.'); }
    else {
      setData(data || []);
      if (count !== null) setTotalRows(count);
    }
    if (!isBackground) setLoading(false);
  };

  const fetchDependencies = async () => {
    if (!hasSupabaseConfig) return;
    const [pRes, inRes, outRes, picRes] = await Promise.all([
      supabase.from('products').select('*').eq('is_active', true),
      supabase.from('deadstock_in').select('product_id, quantity'),
      supabase.from('deadstock_out').select('product_id, quantity'),
      supabase.from('pics').select('*').eq('is_active', true),
    ]);
    
    const inData = inRes.data || [];
    const outData = outRes.data || [];
    const productsData = pRes.data || [];
    
    const availableProducts = productsData.filter(p => {
        const dsInTotal = inData.filter(s => s.product_id === p.id).reduce((sum, s) => sum + s.quantity, 0);
        const dsOutTotal = outData.filter(s => s.product_id === p.id).reduce((sum, s) => sum + s.quantity, 0);
        const dsStock = dsInTotal - dsOutTotal;
        
        return dsStock > 0;
    });
    
    setProducts(availableProducts);
    setPics(picRes.data || []);
  };

  useEffect(() => {
    fetchData();
  }, [search, dateFilter, productFilter, picFilter, page]);

  useBackgroundRefresh(fetchData);

  useEffect(() => {
    fetchDependencies();
  }, []);

  const fetchBatches = async (productId: string) => {
    if (!hasSupabaseConfig) return;
    try {
      const { data: inData, error: inError } = await supabase
        .from('deadstock_in')
        .select('*')
        .eq('product_id', productId)
        .order('transaction_date', { ascending: true });
        
      if (inError) throw inError;
      
      const { data: outData, error: outError } = await supabase
        .from('deadstock_out')
        .select('*')
        .eq('product_id', productId);
        
      if (outError) throw outError;
      
      const gudangBatches = (inData || []).map(batch => {
        const outQty = (outData || [])
          .filter(out => out.deadstock_in_id === batch.id)
          .reduce((sum, out) => sum + (out.quantity || 0), 0);
        return {
          ...batch,
          remaining_qty: batch.quantity - outQty
        };
      }).filter(batch => batch.remaining_qty > 0);
      
      setAvailableBatches(gudangBatches);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (formData.product_id) {
      fetchBatches(formData.product_id);
    } else {
      setAvailableBatches([]);
    }
  }, [formData.product_id]);

  const handleOpenForm = (item?: any) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        transaction_date: item.transaction_date,
        product_id: item.product_id,
        deadstock_in_id: item.deadstock_in_id,
        quantity: item.quantity,
        pic_id: item.pic_id,
        destination: item.destination,
        notes: item.notes,
        invoice_number: item.invoice_number,
        total_cost: item.total_cost || 0,
        unit_cost: item.unit_cost || 0
      });
    } else {
      setEditingId(null);
      setFormData({ transaction_date: format(new Date(), 'yyyy-MM-dd') });
    }
    setIsFormModalOpen(true);
  };

  const handleView = (item: any) => {
    setViewData(item);
    setIsViewModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!hasSupabaseConfig) return toast.error('Fitur hapus dinonaktifkan di Preview Mode');
    if (!confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) return;
    try {
      const { error } = await supabase.from('deadstock_out').delete().eq('id', id);
      if (error) throw error;
      toast.success('Transaksi berhasil dihapus');
      fetchData();
    } catch (error: any) {
      console.error(error); toast.error('Terjadi kesalahan. Silakan coba kembali.');
    }
  };

  const generateTransactionNumber = async (dateStr: string) => {
    const datePrefix = `OUT-DS-${format(new Date(dateStr), 'yyMMdd')}`;
    const { data, error } = await supabase
      .from('deadstock_out')
      .select('transaction_number')
      .ilike('transaction_number', `${datePrefix}%`)
      .order('transaction_number', { ascending: false })
      .limit(1);
      
    if (error) throw error;
    
    let nextNum = 1;
    if (data && data.length > 0) {
      const parts = (data as any[])[0].transaction_number.split('-');
      const lastNumStr = parts[parts.length - 1];
      nextNum = parseInt(lastNumStr, 10) + 1;
    }
    
    return `${datePrefix}-${nextNum.toString().padStart(4, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasSupabaseConfig) return toast.error('Fitur simpan dinonaktifkan di Preview Mode');

    if (!formData.product_id) return toast.error('Produk wajib dipilih');
    if (!formData.deadstock_in_id) return toast.error('Sumber Stock (Batch) wajib dipilih');
    if (!formData.pic_id) return toast.error('PIC wajib dipilih');
    if (!formData.transaction_date) return toast.error('Tanggal wajib diisi');
    if (!formData.quantity || formData.quantity <= 0) return toast.error('Quantity harus lebih besar dari 0');

    setSubmitting(true);
    
    try {
      const selectedBatch = availableBatches.find(b => b.id === formData.deadstock_in_id);
      
      let unitCost = formData.unit_cost || 0;
      let maxQty = formData.quantity;
      
      if (selectedBatch) {
        unitCost = selectedBatch.unit_cost;
        maxQty = selectedBatch.remaining_qty + (editingId ? formData.quantity : 0);
      }
      
      if (formData.quantity > maxQty) {
        toast.error(`Stock tidak mencukupi di Batch ini. Stock tersedia: ${maxQty}`);
        setSubmitting(false);
        return;
      }

      const totalCost = unitCost * formData.quantity;

      const payload = {
        transaction_date: formData.transaction_date,
        product_id: formData.product_id,
        deadstock_in_id: formData.deadstock_in_id,
        quantity: formData.quantity,
        pic_id: formData.pic_id,
        destination: formData.destination || null,
        invoice_number: formData.invoice_number || null,
        total_cost: totalCost,
        unit_cost: unitCost,
        notes: formData.notes
      };

      if (editingId) {
        const { error } = await (supabase.from('deadstock_out') as any).update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Transaksi berhasil diperbarui');
      } else {
        const trxNumber = await generateTransactionNumber(formData.transaction_date);
        const { error } = await (supabase.from('deadstock_out') as any).insert({
          ...payload,
          transaction_number: trxNumber
        });
        if (error) throw error;
        toast.success('Transaksi berhasil ditambahkan');
      }
      
      setIsFormModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error(error); toast.error('Terjadi kesalahan. Silakan coba kembali.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasSupabaseConfig) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Out Deadstock</h1>
          <p className="text-gray-500 text-sm mt-1">Pencatatan barang deadstock keluar dari gudang</p>
        </div>
        <Button onClick={() => handleOpenForm()}>
          <Plus className="w-4 h-4" /> Tambah Out Deadstock
        </Button>
      </div>

      <Card className="!p-0 border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari no transaksi..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-100 border-none rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <input
            type="date"
            className="w-full px-3 py-1.5 bg-slate-100 border-none rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
          />
          <select
            className="w-full px-3 py-1.5 bg-slate-100 border-none rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            value={productFilter}
            onChange={(e) => { setProductFilter(e.target.value); setPage(1); }}
          >
            <option value="">Semua Produk</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.product_name}</option>)}
          </select>
          <select
            className="w-full px-3 py-1.5 bg-slate-100 border-none rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            value={picFilter}
            onChange={(e) => { setPicFilter(e.target.value); setPage(1); }}
          >
            <option value="">Semua PIC</option>
            {pics.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold sticky top-0">
              <tr>
                <th className="px-4 py-2 text-xs border-b border-slate-100">No</th>
                <th className="px-4 py-2 text-xs border-b border-slate-100">No Transaksi</th>
                <th className="px-4 py-2 text-xs border-b border-slate-100">Tanggal</th>
                <th className="px-4 py-2 text-xs border-b border-slate-100">Produk</th>
                <th className="px-4 py-3 border-b border-slate-100 text-xs">SUMBER BATCH</th>
                <th className="px-4 py-2 text-xs border-b border-slate-100">Satuan</th>
                <th className="px-4 py-2 text-xs border-b border-slate-100 text-right">Quantity</th>
                <th className="px-4 py-2 text-xs border-b border-slate-100 text-right">Total Cost</th>
                <th className="px-4 py-2 text-xs border-b border-slate-100 text-right">Cost Satuan</th>
                <th className="px-4 py-2 text-xs border-b border-slate-100">Tujuan</th>
                <th className="px-4 py-2 text-xs border-b border-slate-100">PIC Sales</th>
                <th className="px-4 py-2 text-xs border-b border-slate-100">No Invoice</th>
                <th className="px-4 py-2 text-xs border-b border-slate-100 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="text-xs text-slate-600">
              {loading ? (
                <tr><td colSpan={13} className="px-4 py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Memuat...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={13} className="px-4 py-8 text-center text-gray-500">Tidak ada data</td></tr>
              ) : (
                data.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-100">
                    <td className="px-4 py-3">{(page - 1) * pageSize + index + 1}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-700">{item.transaction_number}</td>
                    <td className="px-4 py-3">{format(new Date(item.transaction_date), 'dd MMM yyyy')}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.product?.product_name || '-'}</td>
                    <td className="px-4 py-3 font-mono text-slate-500">{item.deadstock_in?.transaction_number || '-'}</td>
                    <td className="px-4 py-3">{item.product?.unit?.name || '-'}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-500">-{item.quantity}</td>
                    <td className="px-4 py-3 text-right">Rp {(item.total_cost || 0).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-right">Rp {(item.unit_cost || 0).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3">{item.destination || '-'}</td>
                    <td className="px-4 py-3">{item.pic?.name || '-'}</td>
                    <td className="px-4 py-3">{item.invoice_number || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleView(item)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="View Detail">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleOpenForm(item)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalRows > pageSize && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs">
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

      {/* Form Modal */}
      <Modal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} title={editingId ? "Edit Out Deadstock" : "Tambah Out Deadstock"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input type="date" label="Tanggal Transaksi" required value={formData.transaction_date || ''} onChange={e => setFormData({ ...formData, transaction_date: e.target.value })} />
          
          <Select label="Produk" required value={formData.product_id || ''} onChange={e => setFormData({ ...formData, product_id: e.target.value, deadstock_in_id: '' })}>
            <option value="">Pilih Produk</option>
            {products.map(c => <option key={c.id} value={c.id}>{c.product_name}</option>)}
          </Select>

          {formData.product_id && (
            <Select label="Sumber Batch Deadstock" required value={formData.deadstock_in_id || ''} onChange={e => setFormData({ ...formData, deadstock_in_id: e.target.value })}>
              <option value="">Pilih Batch Sumber</option>
              {availableBatches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.transaction_number} - {format(new Date(b.transaction_date), 'dd/MM/yy')} (Sisa: {b.remaining_qty})
                </option>
              ))}
            </Select>
          )}

          <Input type="number" label="Quantity" min="1" required value={formData.quantity || ''} onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })} />

          {formData.deadstock_in_id && formData.quantity > 0 && (
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-500">Cost Satuan</p>
                <p className="text-sm font-medium">Rp {(availableBatches.find(b => b.id === formData.deadstock_in_id)?.unit_cost || 0).toLocaleString('id-ID')}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Total Cost</p>
                <p className="text-sm font-bold text-indigo-600">Rp {((availableBatches.find(b => b.id === formData.deadstock_in_id)?.unit_cost || 0) * formData.quantity).toLocaleString('id-ID')}</p>
              </div>
            </div>
          )}

          <Input label="Tujuan Keluar" value={formData.destination || ''} onChange={e => setFormData({ ...formData, destination: e.target.value })} placeholder="Cth: Dibuang, Dijual Murah, dll" />

          <Select label="PIC Sales" required value={formData.pic_id || ''} onChange={e => setFormData({ ...formData, pic_id: e.target.value })}>
            <option value="">Pilih PIC</option>
            {pics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          
          <Input label="No Invoice" value={formData.invoice_number || ''} onChange={e => setFormData({ ...formData, invoice_number: e.target.value })} placeholder="Cth: INV/OUT/..." />

          <Select label="Ket. Sales" value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })}>
            <option value="">Pilih Keterangan</option>
            <option value="Ganti Model">Ganti Model</option>
            <option value="Cancel Klien">Cancel Klien</option>
            <option value="Overstock">Overstock</option>
            <option value="Defect">Defect</option>
            <option value="Miss Spek">Miss Spek</option>
          </Select>

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="ghost" onClick={() => setIsFormModalOpen(false)}>Batal</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Menyimpan...' : 'Simpan'}</Button>
          </div>
        </form>
      </Modal>

      {/* View Detail Modal */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Detail Transaksi Out Deadstock">
        {viewData && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-500">Nomor Transaksi</span>
              <span className="col-span-2 font-mono font-bold text-slate-800">{viewData.transaction_number}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-500">Tanggal</span>
              <span className="col-span-2 font-medium">{format(new Date(viewData.transaction_date), 'dd MMMM yyyy')}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-500">Produk</span>
              <span className="col-span-2 font-medium">{viewData.product?.product_name || '-'}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-500">Batch In</span>
              <span className="col-span-2 font-mono">{viewData.deadstock_in?.transaction_number || '-'}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-500">Quantity</span>
              <span className="col-span-2 font-bold text-red-600">-{viewData.quantity} {viewData.product?.unit?.name || ''}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-500">Total Cost</span>
              <span className="col-span-2 font-bold">Rp {(viewData.total_cost || 0).toLocaleString('id-ID')}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-500">Cost Satuan</span>
              <span className="col-span-2">Rp {(viewData.unit_cost || 0).toLocaleString('id-ID')}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-500">Tujuan Keluar</span>
              <span className="col-span-2">{viewData.destination || '-'}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-500">PIC Sales</span>
              <span className="col-span-2">{viewData.pic?.name || '-'}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-500">No Invoice</span>
              <span className="col-span-2">{viewData.invoice_number || '-'}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-500">Ket. Sales</span>
              <span className="col-span-2 whitespace-pre-wrap">{viewData.notes || '-'}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-slate-500">Dibuat Pada</span>
              <span className="col-span-2 text-slate-400">{format(new Date(viewData.created_at), 'dd MMM yyyy HH:mm:ss')}</span>
            </div>
            <div className="flex justify-end mt-6 pt-4 border-t border-slate-100">
              <Button onClick={() => setIsViewModalOpen(false)}>Tutup</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
