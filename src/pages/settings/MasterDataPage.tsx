import React, { useEffect, useState } from 'react';
import { supabase, hasSupabaseConfig } from '../../lib/supabase';
import { Card, Button, Input, Modal, Select } from '../../components/ui';
import { Plus, Edit2, Trash2, Search, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export type ColumnDef = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean';
  required?: boolean;
};

interface MasterDataPageProps {
  title: string;
  tableName: string;
  columns: ColumnDef[];
  relations?: { table: string; column: string }[];
}

export default function MasterDataPage({ title, tableName, columns, relations }: MasterDataPageProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    if (!hasSupabaseConfig) {
      import('../../lib/mockData').then((mock: any) => {
        const mockMap: any = {
          'categories': mock.mockCategories,
          'units': mock.mockUnits,
          'vendors': mock.mockVendors,
          'pics': mock.mockPics,
          'in_stock_reasons': mock.mockReasons,
          'out_stock_reasons': mock.mockReasons
        };
        setData(mockMap[tableName] || []);
        setLoading(false);
      });
      return;
    }
    setLoading(true);
    let query = supabase.from(tableName).select('*').order('created_at', { ascending: false });
    
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }
    
    const { data, error } = await query;
    if (error) { console.error(error); toast.error('Terjadi kesalahan. Silakan coba kembali.'); }
    else setData(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [tableName, search]);

  const handleOpenModal = (item?: any) => {
    if (item) {
      setEditingId(item.id);
      setFormData(item);
    } else {
      setEditingId(null);
      const initial: Record<string, any> = { is_active: true };
      columns.forEach(c => initial[c.key] = c.type === 'boolean' ? true : '');
      setFormData(initial);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSupabaseConfig) return toast.error('Preview Mode: Fitur dinonaktifkan');
    setSubmitting(true);
    
    try {
      if (editingId) {
        const { error } = await (supabase.from(tableName) as any).update(formData).eq('id', editingId);
        if (error) throw error;
        toast.success('Data berhasil diupdate');
      } else {
        const { error } = await (supabase.from(tableName) as any).insert(formData);
        if (error) throw error;
        toast.success('Data berhasil ditambahkan');
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
    if (!hasSupabaseConfig) return toast.error('Preview Mode: Fitur dinonaktifkan');
    if (!confirm('Apakah anda yakin ingin menghapus data ini?')) return;
    try {
      if (relations && relations.length > 0) {
        for (const rel of relations) {
          const { count, error } = await supabase.from(rel.table).select('*', { count: 'exact', head: true }).eq(rel.column, id);
          if (error) throw error;
          if (count && count > 0) {
            toast.error('Data tidak dapat dihapus karena masih digunakan dalam transaksi.');
            return;
          }
        }
      }

      const { error } = await (supabase.from(tableName) as any).update({ is_active: false }).eq('id', id);
      if (error) throw error;
      toast.success('Data berhasil dinonaktifkan');
      fetchData();
    } catch (error: any) {
      console.error(error); toast.error('Terjadi kesalahan. Silakan coba kembali.');
    }
  };

  if (!hasSupabaseConfig) {
    return (
      <Card className="p-8 text-center text-red-500">
        <h2 className="text-xl font-bold mb-2">Supabase Belum Dikonfigurasi</h2>
        <p>Silakan tambahkan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di environment variables.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola data {title.toLowerCase()}</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4" />
          Tambah {title}
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-100 border-none rounded-full text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold sticky top-0">
              <tr>
                {columns.map(c => (
                  <th key={c.key} className="px-4 py-2 text-xs border-b border-slate-100">{c.label}</th>
                ))}
                <th className="px-4 py-2 text-xs border-b border-slate-100">Status</th>
                <th className="px-4 py-2 text-xs border-b border-slate-100 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-xs text-slate-600">
              {loading ? (
                <tr>
                  <td colSpan={columns.length + 2} className="px-4 py-8 text-center text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Memuat data...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} className="px-4 py-8 text-center text-gray-500">
                    Tidak ada data ditemukan
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-100">
                    {columns.map(c => (
                      <td key={c.key} className="px-4 py-3 text-slate-900">
                        {item[c.key]}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${item.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {item.is_active ? 'AKTIF' : 'NONAKTIF'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleOpenModal(item)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {item.is_active && (
                          <button onClick={() => handleDelete(item.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? `Edit ${title}` : `Tambah ${title}`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {columns.map(c => (
            <div key={c.key}>
              {c.type === 'text' && (
                <Input
                  label={c.label}
                  value={formData[c.key] || ''}
                  onChange={e => setFormData({ ...formData, [c.key]: e.target.value })}
                  required={c.required}
                />
              )}
              {c.type === 'number' && (
                <Input
                  type="number"
                  label={c.label}
                  value={formData[c.key] || ''}
                  onChange={e => setFormData({ ...formData, [c.key]: e.target.value })}
                  required={c.required}
                />
              )}
              {c.type === 'textarea' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{c.label}</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    rows={3}
                    value={formData[c.key] || ''}
                    onChange={e => setFormData({ ...formData, [c.key]: e.target.value })}
                    required={c.required}
                  />
                </div>
              )}
            </div>
          ))}
          {editingId && (
            <Select
              label="Status"
              value={formData.is_active ? 'true' : 'false'}
              onChange={e => setFormData({ ...formData, is_active: e.target.value === 'true' })}
            >
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </Select>
          )}
          
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
