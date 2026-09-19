export const mockCategories = [
  { id: 'c1', name: 'Alat Tulis Kantor', is_active: true },
  { id: 'c2', name: 'Elektronik', is_active: true },
  { id: 'c3', name: 'Perabotan', is_active: true },
];

export const mockUnits = [
  { id: 'u1', name: 'Pcs', is_active: true },
  { id: 'u2', name: 'Box', is_active: true },
  { id: 'u3', name: 'Lusin', is_active: true },
];

export const mockVendors = [
  { id: 'v1', name: 'PT Global Makmur', phone: '08123456789', address: 'Jakarta', is_active: true },
  { id: 'v2', name: 'CV Indo Tech', phone: '08987654321', address: 'Bandung', is_active: true },
];

export const mockPics = [
  { id: 'p1', name: 'Andi Saputra', department: 'Gudang', position: 'Staff', is_active: true },
  { id: 'p2', name: 'Budi Santoso', department: 'Logistik', position: 'Supervisor', is_active: true },
];

export const mockReasons = [
  { id: 'r1', name: 'Stock', is_active: true },
  { id: 'r2', name: 'Warehouse', is_active: true },
  { id: 'r3', name: 'Deadstock', is_active: true },
];

export const mockProducts = [
  { id: 'prod1', product_code: 'ATK-001', product_name: 'Kertas HVS A4 80gr', category_id: 'c1', unit_id: 'u2', minimum_stock: 50, is_active: true, category: { name: 'Alat Tulis Kantor' }, unit: { name: 'Box' }, created_at: new Date().toISOString() },
  { id: 'prod2', product_code: 'ELK-001', product_name: 'Mouse Wireless Logitech', category_id: 'c2', unit_id: 'u1', minimum_stock: 10, is_active: true, category: { name: 'Elektronik' }, unit: { name: 'Pcs' }, created_at: new Date().toISOString() },
  { id: 'prod3', product_code: 'PRB-001', product_name: 'Kursi Ergonomis', category_id: 'c3', unit_id: 'u1', minimum_stock: 5, is_active: true, category: { name: 'Perabotan' }, unit: { name: 'Pcs' }, created_at: new Date().toISOString() },
];

export const mockInStock = [
  { id: 'in1', transaction_number: 'IN-260901-0001', transaction_date: '2026-09-01', product_id: 'prod1', quantity: 200, vendor_id: 'v1', reason_id: 'r1', pic_id: 'p1', total_cost: 10000000, unit_cost: 50000, notes: 'Restock awal bulan', created_at: '2026-09-01T10:00:00Z', product: { product_name: 'Kertas HVS A4 80gr', unit: { name: 'Box' } }, vendor: { name: 'PT Global Makmur' }, reason: { name: 'Stock' }, pic: { name: 'Andi Saputra' } },
  { id: 'in2', transaction_number: 'IN-260902-0002', transaction_date: '2026-09-02', product_id: 'prod2', quantity: 50, vendor_id: 'v2', reason_id: 'r1', pic_id: 'p1', total_cost: 5000000, unit_cost: 100000, notes: 'Pembelian inventaris IT', created_at: '2026-09-02T11:00:00Z', product: { product_name: 'Mouse Wireless Logitech', unit: { name: 'Pcs' } }, vendor: { name: 'CV Indo Tech' }, reason: { name: 'Stock' }, pic: { name: 'Andi Saputra' } },
];

export const mockOutStock = [
  { id: 'out1', transaction_number: 'OUT-260903-0001', transaction_date: '2026-09-03', product_id: 'prod1', stock_in_id: 'in1', quantity: 50, destination: 'Divisi HR', reason_id: 'r1', pic_id: 'p2', total_cost: 2500000, unit_cost: 50000, notes: 'Permintaan ATK bulanan', created_at: '2026-09-03T14:00:00Z', product: { product_name: 'Kertas HVS A4 80gr', unit: { name: 'Box' } }, stock_in: { transaction_number: 'IN-260901-0001', reason: { name: 'Stock' } }, reason: { name: 'Permintaan' }, pic: { name: 'Budi Santoso' } },
  { id: 'out2', transaction_number: 'OUT-260904-0002', transaction_date: '2026-09-04', product_id: 'prod3', stock_in_id: 'in2', quantity: 5, destination: 'Ruang Meeting 1', reason_id: 'r1', pic_id: 'p2', total_cost: 1000000, unit_cost: 200000, notes: 'Fasilitas baru', created_at: '2026-09-04T15:00:00Z', product: { product_name: 'Kursi Ergonomis', unit: { name: 'Pcs' } }, stock_in: { transaction_number: 'IN-260902-0002', reason: { name: 'Stock' } }, reason: { name: 'Permintaan' }, pic: { name: 'Budi Santoso' } },
];

export const mockVendorStock = [
  { id: 'vs1', reference_number: 'VS-0001', stock_date: '2026-09-01', product_id: 'prod1', vendor_id: 'v1', quantity: 500, status: 'Tersimpan', notes: 'Titipan pabrik', created_at: '2026-09-01T09:00:00Z', product: { product_name: 'Kertas HVS A4 80gr', unit: { name: 'Box' } }, vendor: { name: 'PT Global Makmur' } },
];

export const mockInventory = [
  { id: 'prod1', product_code: 'ATK-001', product_name: 'Kertas HVS A4 80gr', category: { name: 'Alat Tulis Kantor' }, unit: { name: 'Box' }, gudangStock: 150, totalVendor: 500, totalInventory: 650, minimum_stock: 50, status: 'AMAN' },
  { id: 'prod2', product_code: 'ELK-001', product_name: 'Mouse Wireless Logitech', category: { name: 'Elektronik' }, unit: { name: 'Pcs' }, gudangStock: 50, totalVendor: 0, totalInventory: 50, minimum_stock: 10, status: 'AMAN' },
  { id: 'prod3', product_code: 'PRB-001', product_name: 'Kursi Ergonomis', category: { name: 'Perabotan' }, unit: { name: 'Pcs' }, gudangStock: -5, totalVendor: 0, totalInventory: -5, minimum_stock: 5, status: 'HABIS' },
];

export const mockDashboardStats = {
  totalProducts: 124,
  lowStock: 5,
  outOfStock: 2,
  totalIn: 4500,
  totalOut: 1200,
};

export const mockOpnameSchedules = [
  { id: 'os1', product_id: 'prod1', frequency: 'Harian', schedule_time: 'Setiap Hari, 16:00', created_at: new Date().toISOString(), product: { product_name: 'Kertas HVS A4 80gr', product_code: 'ATK-001' } },
  { id: 'os2', product_id: 'prod2', frequency: 'Bulanan', schedule_time: 'Tanggal 1', created_at: new Date().toISOString(), product: { product_name: 'Mouse Wireless Logitech', product_code: 'ELK-001' } },
];

export const mockOpnameProgress = [
  { id: 'op1', schedule_id: 'os1', product_id: 'prod1', pic_id: 'p1', realization_date: new Date().toISOString(), status: '✅ Selesai', notes: 'Sesuai dengan fisik', created_at: new Date().toISOString(), product: { product_name: 'Kertas HVS A4 80gr', product_code: 'ATK-001' }, schedule: { frequency: 'Harian', schedule_time: 'Setiap Hari, 16:00' }, pic: { name: 'Andi Saputra' } },
  { id: 'op2', schedule_id: 'os2', product_id: 'prod2', pic_id: null, realization_date: null, status: '⏳ Belum', notes: '', created_at: new Date().toISOString(), product: { product_name: 'Mouse Wireless Logitech', product_code: 'ELK-001' }, schedule: { frequency: 'Bulanan', schedule_time: 'Tanggal 1' }, pic: null },
];
