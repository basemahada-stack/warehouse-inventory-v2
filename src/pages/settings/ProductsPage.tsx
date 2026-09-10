import React, { useEffect, useState } from 'react';
import { supabase, hasSupabaseConfig } from '../../lib/supabase';
import { Card, Button, Input, Modal, Select } from '../../components/ui';
import { Plus, Edit2, Trash2, Search, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProductsPage() {
  const [data, setData] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [page, setPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const pageSize = 10;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    if (!hasSupabaseConfig) {
      import('../../lib/mockData').then((mock) => {
        setData(mock.mockProducts);
        setTotalRows(mock.mockProducts.length);
        setLoading(false);
      });
      return;
    }
    
    setLoading(true);
    let query = supabase.from('products').select(`*, category:categories(name), unit:units(name)`, { count: 'exact' }).order('created_at', { ascending: false });
    
    if (search) {
      query = query.or(`product_name.ilike.%${search}%,product_code.ilike.%${search}%`);
    }
    if (categoryFilter) {
      query = query.eq('category_id', categoryFilter);
    }
    if (statusFilter !== '') {
      query = query.eq('is_active', statusFilter === 'true');
    }
    
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
    
    const { data, count, error } = await query;
    if (error) { console.error(error); toast.error('Terjadi kesalahan. Silakan coba kembali.'); }
    else {
      setData(data || []);
      if (count !== null) setTotalRows(count);
    }
    setLoading(false);
  };

  const fetchDependencies = async () => {
    if (!hasSupabaseConfig) return;
    const [catRes, unitRes] = await Promise.all([
      supabase.from('categories').select('*').eq('is_active', true),
      supabase.from('units').select('*').eq('is_active', true),
    ]);
    setCategories(catRes.data || []);
    setUnits(unitRes.data || []);
  };

  useEffect(() => {
    fetchData();
  }, [search, categoryFilter, statusFilter, page]);

  useEffect(() => {
    fetchDependencies();
  }, []);

  const generateProductCode = async () => {
    if (!hasSupabaseConfig) return 'MH-001';
    
    const { data, error } = await supabase
      .from('products')
      .select('product_code')
      .ilike('product_code', 'MH-%')
      .order('product_code', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return 'MH-001';
    }

    const lastCode = (data as any[])[0].product_code;
    const match = lastCode.match(/MH-(\d+)/);
    if (match && match[1]) {
      const nextNum = parseInt(match[1], 10) + 1;
      return `MH-${nextNum.toString().padStart(3, '0')}`;
    }
    
    return 'MH-001';
  };

  const handleOpenModal = async (item?: any) => {
    if (item) {
      setEditingId(item.id);
      setFormData(item);
    } else {
      setEditingId(null);
      const newCode = await generateProductCode();
      setFormData({ product_code: newCode, is_active: true, minimum_stock: 0 });
    }
    setIsModalOpen(true);
  };

  const checkProductCodeUnique = async (code: string, id: string | null) => {
    let query = supabase.from('products').select('id').eq('product_code', code);
    if (id) {
      query = query.neq('id', id);
    }
    const { data } = await query;
    return data && data.length > 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSupabaseConfig) return toast.error('Preview Mode: Simpan data dinonaktifkan');
    setSubmitting(true);
    
    try {
      const isDuplicate = await checkProductCodeUnique(formData.product_code, editingId);
      if (isDuplicate) {
        toast.error('Product Code sudah digunakan.');
        setSubmitting(false);
        return;
      }

      if (editingId) {
        const { error } = await (supabase.from('products') as any).update({
          product_code: formData.product_code,
          product_name: formData.product_name,
          category_id: formData.category_id,
          unit_id: formData.unit_id,
          minimum_stock: formData.minimum_stock,
          is_active: formData.is_active
        }).eq('id', editingId);
        if (error) throw error;
        toast.success('Produk berhasil diupdate');
      } else {
        const { error } = await (supabase.from('products') as any).insert({
          product_code: formData.product_code,
          product_name: formData.product_name,
          category_id: formData.category_id,
          unit_id: formData.unit_id,
          minimum_stock: formData.minimum_stock,
        });
        if (error) throw error;
        toast.success('Produk berhasil ditambahkan');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error(error); toast.error('Terjadi kesalahan. Silakan coba kembali.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!hasSupabaseConfig) return toast.error('Preview Mode: Hapus data dinonaktifkan');
    if (!confirm('Apakah anda yakin ingin menghapus produk ini?')) return;
    try {
      const relations = [
        { table: 'stock_in', column: 'product_id' },
        { table: 'stock_out', column: 'product_id' },
        { table: 'vendor_stock', column: 'product_id' }
      ];
      
      for (const rel of relations) {
        const { count, error } = await supabase.from(rel.table).select('*', { count: 'exact', head: true }).eq(rel.column, id);
        if (error) throw error;
        if (count && count > 0) {
          toast.error('Data tidak dapat dihapus karena masih digunakan dalam transaksi.');
          return;
        }
      }

      const { error } = await (supabase.from('products') as any).update({ is_active: false }).eq('id', id);
      if (error) throw error;
      toast.success('Produk berhasil dinonaktifkan');
      fetchData();
    } catch (error: any) {
      console.error(error); toast.error('Terjadi kesalahan. Silakan coba kembali.');
    }
  };

  if (!hasSupabaseConfig) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produk</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola master data produk</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4" /> Tambah Produk
        </Button>
      </div>

      <Card className="!p-0 border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h3 className="font-bold text-slate-800 hidden sm:block">Daftar Produk</h3>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <select
              className="w-full sm:w-auto px-3 py-1.5 bg-slate-100 border-none rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            >
              <option value="">Semua Kategori</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <select
              className="w-full sm:w-auto px-3 py-1.5 bg-slate-100 border-none rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">Semua Status</option>
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </select>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari produk..."
                className="w-full pl-9 pr-4 py-1.5 bg-slate-100 border-none rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold sticky top-0">
              <tr>
                <th className="px-4 py-2 text-xs border-b border-slate-100">Kode</th>
                <th className="px-4 py-2 text-xs border-b border-slate-100">Nama Produk</th>
                <th className="px-4 py-2 text-xs border-b border-slate-100">Kategori</th>
                <th className="px-4 py-2 text-xs border-b border-slate-100">Satuan</th>
                <th className="px-4 py-2 text-xs border-b border-slate-100 text-right">Min. Stock</th>
                <th className="px-4 py-2 text-xs border-b border-slate-100 text-center">Status</th>
                <th className="px-4 py-2 text-xs border-b border-slate-100 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-xs text-slate-600">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Memuat...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Tidak ada data</td></tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-100">
                    <td className="px-4 py-3 font-mono">{item.product_code}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.product_name}</td>
                    <td className="px-4 py-3 italic">{item.category?.name || '-'}</td>
                    <td className="px-4 py-3">{item.unit?.name || '-'}</td>
                    <td className="px-4 py-3 text-right font-bold">{item.minimum_stock}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${item.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {item.is_active ? 'AKTIF' : 'NONAKTIF'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleOpenModal(item)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"><Edit2 className="w-4 h-4" /></button>
                        {item.is_active && <button onClick={() => handleDelete(item.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>}
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
              Menampilkan {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, totalRows)} dari {totalRows} produk
            </span>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Sebelumnya
              </Button>
              <Button 
                variant="ghost" 
                disabled={page * pageSize >= totalRows}
                onClick={() => setPage(p => p + 1)}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Produk' : 'Tambah Produk'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Kode Produk" required value={formData.product_code || ''} onChange={e => setFormData({ ...formData, product_code: e.target.value })} />
          <Input label="Nama Produk" required value={formData.product_name || ''} onChange={e => setFormData({ ...formData, product_name: e.target.value })} />
          
          <Select label="Kategori" required value={formData.category_id || ''} onChange={e => setFormData({ ...formData, category_id: e.target.value })}>
            <option value="">Pilih Kategori</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>

          <Select label="Satuan" required value={formData.unit_id || ''} onChange={e => setFormData({ ...formData, unit_id: e.target.value })}>
            <option value="">Pilih Satuan</option>
            {units.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>

          <Input type="number" label="Minimum Stock" required value={formData.minimum_stock ?? ''} onChange={e => setFormData({ ...formData, minimum_stock: e.target.value === '' ? '' : parseInt(e.target.value) })} />

          {editingId && (
            <Select label="Status" value={formData.is_active ? 'true' : 'false'} onChange={e => setFormData({ ...formData, is_active: e.target.value === 'true' })}>
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </Select>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Menyimpan...' : 'Simpan'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
