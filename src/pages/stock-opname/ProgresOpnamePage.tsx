import React, { useState, useEffect } from 'react';
import { Card, Button, Select } from '../../components/ui';
import { Save, CheckCircle2, Box, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase, hasSupabaseConfig } from '../../lib/supabase';
import { mockOpnameProgress, mockOpnameSchedules, mockPics, mockProducts } from '../../lib/mockData';
import { useBackgroundRefresh } from '../../hooks/useBackgroundRefresh';
import { format } from 'date-fns';

export default function ProgresOpnamePage() {
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState<any[]>([]);
  const [pics, setPics] = useState<any[]>([]);
  
  // Track edits before saving
  const [edits, setEdits] = useState<Record<string, any>>({});

  useBackgroundRefresh(fetchData);

  async function fetchData() {
    setLoading(true);
    try {
      if (!hasSupabaseConfig) {
        setPics(mockPics);
        
        // Mock logic: combine products with schedules and progress
        const formatted = mockProducts.map(p => {
          const schedule = mockOpnameSchedules.find(s => s.product_id === p.id);
          const progress = mockOpnameProgress.find(pr => pr.product_id === p.id);
          
          return {
            id: progress?.id || `new-prog-${p.id}`,
            product_id: p.id,
            schedule_id: schedule?.id || null,
            product_name: p.product_name,
            product_code: p.product_code,
            frequency: schedule?.frequency || '-',
            schedule_time: schedule?.schedule_time || '-',
            pic_id: progress?.pic_id || '',
            realization_date: progress?.realization_date ? new Date(progress.realization_date).toISOString().split('T')[0] : '',
            status: progress?.status || '⏳ Belum',
            notes: progress?.notes || '',
            isNew: !progress
          };
        });
        setProgressData(formatted);
      } else {
        const { data: picsData } = await supabase.from('pics').select('id, name').eq('is_active', true);
        if (picsData) setPics(picsData);

        const { data: products } = await supabase.from('products').select('id, product_code, product_name').eq('is_active', true);
        const { data: schedules } = await supabase.from('opname_schedules').select('*');
        const { data: progress } = await supabase.from('opname_progress').select('*');
        
        if (products) {
          const formatted = products.map(p => {
            const sch = schedules?.find(s => s.product_id === p.id);
            const pr = progress?.find(pr => pr.product_id === p.id);
            return {
              id: pr?.id || `new-prog-${p.id}`,
              product_id: p.id,
              schedule_id: sch?.id || null,
              product_name: p.product_name,
              product_code: p.product_code,
              frequency: sch?.frequency || '-',
              schedule_time: sch?.schedule_time || '-',
              pic_id: pr?.pic_id || '',
              realization_date: pr?.realization_date ? new Date(pr.realization_date).toISOString().split('T')[0] : '',
              status: pr?.status || '⏳ Belum',
              notes: pr?.notes || '',
              isNew: !pr
            };
          });
          setProgressData(formatted);
        }
      }
    } catch (error: any) {
      toast.error('Gagal memuat data progress');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const handleEditChange = (id: string, field: string, value: any) => {
    setEdits(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value
      }
    }));
  };

  const getFieldValue = (item: any, field: string) => {
    if (edits[item.id] && edits[item.id][field] !== undefined) {
      return edits[item.id][field];
    }
    return item[field];
  };

  const handleSave = async (item: any) => {
    const currentEdits = edits[item.id];
    if (!currentEdits) return toast.error('Tidak ada perubahan');

    try {
      const payload = {
        product_id: item.product_id,
        schedule_id: item.schedule_id,
        pic_id: getFieldValue(item, 'pic_id') || null,
        realization_date: getFieldValue(item, 'realization_date') || null,
        status: getFieldValue(item, 'status'),
        notes: getFieldValue(item, 'notes')
      };

      if (!hasSupabaseConfig) {
        toast.success('Progress berhasil disimpan (Mock)');
        // Just clear the edit state to reflect "saved" locally (in a real app we'd update the main state too)
        const index = progressData.findIndex(p => p.id === item.id);
        if (index !== -1) {
          const newData = [...progressData];
          newData[index] = { ...newData[index], ...currentEdits, isNew: false };
          setProgressData(newData);
        }
      } else {
        if (item.isNew) {
          await supabase.from('opname_progress').insert([payload]);
        } else {
          await supabase.from('opname_progress').update(payload).eq('id', item.id);
        }
        toast.success('Progress berhasil disimpan');
        fetchData();
      }
      
      // Clear edits for this item
      const newEdits = {...edits};
      delete newEdits[item.id];
      setEdits(newEdits);
    } catch (error: any) {
      toast.error('Gagal menyimpan progress');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Progres Stock Opname</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor realisasi pengecekan fisik stock dan statusnya</p>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold">
              <tr>
                <th className="px-4 py-4 border-b border-slate-200">Produk</th>
                <th className="px-4 py-4 border-b border-slate-200">Jadwal SO</th>
                <th className="px-4 py-4 border-b border-slate-200">PIC Checker</th>
                <th className="px-4 py-4 border-b border-slate-200">Tgl Realisasi</th>
                <th className="px-4 py-4 border-b border-slate-200">Status</th>
                <th className="px-4 py-4 border-b border-slate-200 w-24 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-600">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Memuat...</td>
                </tr>
              ) : progressData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Tidak ada data</td>
                </tr>
              ) : (
                progressData.map((item) => {
                  const hasEdits = !!edits[item.id];
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 border-b border-slate-100 last:border-0">
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{item.product_name}</span>
                          <span className="text-[10px] text-slate-500 font-mono mt-0.5">{item.product_code}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-700">{item.frequency}</span>
                          <span className="text-xs text-slate-500">{item.schedule_time}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <select
                          className="w-full px-2 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 text-xs outline-none bg-white min-w-[120px]"
                          value={getFieldValue(item, 'pic_id')}
                          onChange={(e) => handleEditChange(item.id, 'pic_id', e.target.value)}
                        >
                          <option value="">-- Pilih PIC --</option>
                          {pics.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="date"
                          className="px-2 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 text-xs outline-none"
                          value={getFieldValue(item, 'realization_date')}
                          onChange={(e) => handleEditChange(item.id, 'realization_date', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <select
                          className="w-full px-2 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 text-xs outline-none bg-white font-medium"
                          value={getFieldValue(item, 'status')}
                          onChange={(e) => handleEditChange(item.id, 'status', e.target.value)}
                        >
                          <option value="⏳ Belum">⏳ Belum</option>
                          <option value="🔄 Proses">🔄 Proses</option>
                          <option value="✅ Selesai">✅ Selesai</option>
                          <option value="⚠️ Ada Selisih">⚠️ Ada Selisih</option>
                          <option value="🔴 Belum Ditindaklanjuti">🔴 Belum Ditindaklanjuti</option>
                        </select>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <Button 
                          variant={hasEdits ? 'primary' : 'secondary'} 
                          onClick={() => handleSave(item)} 
                          className="px-2 py-1 w-full flex justify-center"
                          disabled={!hasEdits}
                        >
                          <Save className="w-3.5 h-3.5" /> {hasEdits ? 'Simpan' : 'Tersimpan'}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
