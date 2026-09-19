import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../../components/ui';
import { CalendarDays, Save, Edit2, CheckCircle2, Box } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase, hasSupabaseConfig } from '../../lib/supabase';
import { mockOpnameSchedules, mockProducts } from '../../lib/mockData';
import { useBackgroundRefresh } from '../../hooks/useBackgroundRefresh';

export default function JadwalOpnamePage() {
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ frequency: '', schedule_time: '' });

  useBackgroundRefresh(fetchData);

  async function fetchData() {
    setLoading(true);
    try {
      if (!hasSupabaseConfig) {
        // Mock data logic
        const formatted = mockProducts.map(p => {
          const schedule = mockOpnameSchedules.find(s => s.product_id === p.id);
          return {
            id: schedule?.id || `new-${p.id}`,
            product_id: p.id,
            product_name: p.product_name,
            product_code: p.product_code,
            category_name: p.category?.name || '',
            frequency: schedule?.frequency || '',
            schedule_time: schedule?.schedule_time || '',
            isNew: !schedule
          };
        });
        setSchedules(formatted);
      } else {
        // Supabase logic (requires tables to be created first)
        const { data: products } = await supabase.from('products').select('id, product_code, product_name, categories(name)').eq('is_active', true);
        const { data: schs } = await supabase.from('opname_schedules').select('*');
        
        if (products) {
          const formatted = products.map(p => {
            const schedule = schs?.find(s => s.product_id === p.id);
            return {
              id: schedule?.id || `new-${p.id}`,
              product_id: p.id,
              product_name: p.product_name,
              product_code: p.product_code,
              category_name: p.categories?.name || '',
              frequency: schedule?.frequency || '',
              schedule_time: schedule?.schedule_time || '',
              isNew: !schedule
            };
          });
          setSchedules(formatted);
        }
      }
    } catch (error: any) {
      toast.error('Gagal memuat data jadwal');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setEditForm({ frequency: item.frequency, schedule_time: item.schedule_time });
  };

  const handleSave = async (item: any) => {
    try {
      if (!hasSupabaseConfig) {
        // Just update local state for mock
        const index = schedules.findIndex(s => s.id === item.id);
        if (index !== -1) {
          const newSchedules = [...schedules];
          newSchedules[index] = { ...item, ...editForm, isNew: false };
          setSchedules(newSchedules);
          toast.success('Jadwal berhasil disimpan (Mock)');
        }
      } else {
        const payload = {
          product_id: item.product_id,
          frequency: editForm.frequency,
          schedule_time: editForm.schedule_time
        };
        
        if (item.isNew) {
          await supabase.from('opname_schedules').insert([payload]);
        } else {
          await supabase.from('opname_schedules').update(payload).eq('id', item.id);
        }
        toast.success('Jadwal berhasil disimpan');
        fetchData();
      }
      setEditingId(null);
    } catch (error: any) {
      toast.error('Gagal menyimpan jadwal');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Jadwal Stock Opname</h1>
          <p className="text-sm text-slate-500 mt-1">Atur frekuensi dan jadwal pengecekan fisik stock untuk tiap produk</p>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold">
              <tr>
                <th className="px-6 py-4 border-b border-slate-200">Produk</th>
                <th className="px-6 py-4 border-b border-slate-200">Frekuensi</th>
                <th className="px-6 py-4 border-b border-slate-200">Jadwal (Hari / Tanggal)</th>
                <th className="px-6 py-4 border-b border-slate-200 w-32 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-600">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">Memuat...</td>
                </tr>
              ) : schedules.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">Tidak ada produk aktif</td>
                </tr>
              ) : (
                schedules.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 border-b border-slate-100 last:border-0">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <Box className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{item.product_name}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{item.product_code} • {item.category_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {editingId === item.id ? (
                        <input 
                          type="text" 
                          list="freq-options"
                          className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 text-sm outline-none"
                          placeholder="Contoh: Bulanan"
                          value={editForm.frequency}
                          onChange={(e) => setEditForm({...editForm, frequency: e.target.value})}
                        />
                      ) : (
                        item.frequency ? <span className="font-medium text-slate-700">{item.frequency}</span> : <span className="text-slate-400 italic text-xs">Belum diatur</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === item.id ? (
                        <input 
                          type="text" 
                          className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 text-sm outline-none"
                          placeholder="Contoh: Tanggal 1 / Tiap Senin"
                          value={editForm.schedule_time}
                          onChange={(e) => setEditForm({...editForm, schedule_time: e.target.value})}
                        />
                      ) : (
                        item.schedule_time ? (
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <CalendarDays className="w-4 h-4 text-slate-400" />
                            {item.schedule_time}
                          </div>
                        ) : <span className="text-slate-400 italic text-xs">Belum diatur</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {editingId === item.id ? (
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="primary" onClick={() => handleSave(item)} className="px-2 py-1"><CheckCircle2 className="w-4 h-4" /> Simpan</Button>
                          <Button variant="ghost" onClick={() => setEditingId(null)} className="px-2 py-1">Batal</Button>
                        </div>
                      ) : (
                        <Button variant="secondary" onClick={() => handleEdit(item)} className="px-3">
                          <Edit2 className="w-3.5 h-3.5" /> Atur Jadwal
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
      <datalist id="freq-options">
        <option value="Harian" />
        <option value="Mingguan" />
        <option value="Bulanan" />
        <option value="Tahunan" />
      </datalist>
    </div>
  );
}
