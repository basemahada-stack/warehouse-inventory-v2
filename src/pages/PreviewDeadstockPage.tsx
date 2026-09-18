import React, { useEffect, useState, useMemo } from 'react';
import { supabase, hasSupabaseConfig } from '../lib/supabase';
import { Card, Input, Select } from '../components/ui';
import { Search, Loader2, Image as ImageIcon, Box, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PreviewDeadstockPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [productFilter, setProductFilter] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchData = async () => {
    if (!hasSupabaseConfig) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      // 1. Fetch deadstock_in with photo
      const { data: inData, error: inError } = await supabase
        .from('deadstock_in')
        .select('*, product:products(product_name)')
        .order('created_at', { ascending: false });

      if (inError) throw inError;

      // 2. Fetch deadstock_out to calculate remaining stock for these batches
      const batchIds = (inData || []).map(d => d.id);
      
      let outData: any[] = [];
      if (batchIds.length > 0) {
        const { data: outRes, error: outError } = await supabase
          .from('deadstock_out')
          .select('deadstock_in_id, quantity')
          .in('deadstock_in_id', batchIds);
          
        if (outError) throw outError;
        outData = outRes || [];
      }

      // 3. Process data
      const processedData = (inData || [])
        .map(batch => {
          const outQty = outData
            .filter(out => out.deadstock_in_id === batch.id)
            .reduce((sum, out) => sum + (out.quantity || 0), 0);
          
          return {
            ...batch,
            remaining_qty: batch.quantity - outQty
          };
        })
        .filter(batch => batch.remaining_qty > 0);

      setData(processedData);

      // Extract unique products for the filter
      const uniqueProducts = new Map();
      processedData.forEach(item => {
        if (item.product && !uniqueProducts.has(item.product_id)) {
          uniqueProducts.set(item.product_id, { id: item.product_id, name: item.product.product_name });
        }
      });
      setProducts(Array.from(uniqueProducts.values()));

    } catch (error: any) {
      console.error(error);
      toast.error('Gagal mengambil data preview deadstock.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchSearch = search ? 
        (item.product?.product_name || '').toLowerCase().includes(search.toLowerCase()) || 
        (item.transaction_number || '').toLowerCase().includes(search.toLowerCase()) 
        : true;
      const matchProduct = productFilter ? item.product_id === productFilter : true;
      
      return matchSearch && matchProduct;
    });
  }, [data, search, productFilter]);

  if (!hasSupabaseConfig) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-indigo-600" />
            Preview Deadstock
          </h1>
          <p className="text-gray-500 text-sm mt-1">Galeri foto dan informasi sisa stok barang deadstock</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari produk atau batch..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="w-full sm:w-48 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
        >
          <option value="">Semua Produk</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
          <p>Memuat galeri foto...</p>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-white border border-slate-200 rounded-xl shadow-sm">
          <ImageIcon className="w-12 h-12 mb-4 text-slate-300" />
          <p>Tidak ada foto deadstock yang ditemukan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6">
          {filteredData.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group flex flex-col">
              <div className="relative aspect-square bg-slate-100 overflow-hidden">
                {item.photo_url ? (
                  <img 
                    src={item.photo_url} 
                    alt={item.product?.product_name || 'Deadstock'} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                    onClick={() => setSelectedImage(item.photo_url)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 font-bold text-4xl">
                    NA
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-slate-700 shadow-sm flex items-center gap-1 border border-slate-200">
                  <Box className="w-3 h-3 text-indigo-500" /> {item.remaining_qty}
                </div>
              </div>
              <div className="p-3 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 line-clamp-2 mb-1" title={item.product?.product_name}>
                    {item.product?.product_name || 'Unknown Product'}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono mb-1">{item.transaction_number}</p>
                  {item.deadstock_status && (
                    <span className="inline-block text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded mb-2">
                      {item.deadstock_status}
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-2">
                    <div className="text-xs text-slate-500 whitespace-nowrap">Harga Satuan</div>
                    <div className="text-sm font-bold text-indigo-600 whitespace-nowrap ml-2">
                      Rp {(item.unit_cost || 0).toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-8"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-5xl w-full h-full flex items-center justify-center">
            <button 
              className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-md transition-colors z-10"
              onClick={() => setSelectedImage(null)}
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={selectedImage} 
              alt="Preview" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
