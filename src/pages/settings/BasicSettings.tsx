import React from 'react';
import MasterDataPage, { ColumnDef } from './MasterDataPage';

export const CategoriesPage = () => (
  <MasterDataPage 
    title="Kategori" 
    tableName="categories" 
    columns={[{ key: 'name', label: 'Nama Kategori', type: 'text', required: true }]} 
    relations={[
      { table: 'products', column: 'category_id' }
    ]}
  />
);

export const UnitsPage = () => (
  <MasterDataPage 
    title="Satuan" 
    tableName="units" 
    columns={[{ key: 'name', label: 'Nama Satuan', type: 'text', required: true }]} 
    relations={[
      { table: 'products', column: 'unit_id' },
      { table: 'vendor_stock', column: 'unit_id' }
    ]}
  />
);

export const PicsPage = () => (
  <MasterDataPage 
    title="PIC" 
    tableName="pics" 
    columns={[
      { key: 'name', label: 'Nama PIC', type: 'text', required: true },
      { key: 'department', label: 'Departemen', type: 'text' },
      { key: 'position', label: 'Jabatan', type: 'text' },
    ]} 
    relations={[
      { table: 'stock_in', column: 'pic_id' },
      { table: 'stock_out', column: 'pic_id' }
    ]}
  />
);

export const VendorsPage = () => (
  <MasterDataPage 
    title="Vendor" 
    tableName="vendors" 
    columns={[
      { key: 'name', label: 'Nama Vendor', type: 'text', required: true },
      { key: 'contact_person', label: 'Kontak Person', type: 'text' },
      { key: 'phone', label: 'No. HP', type: 'text' },
      { key: 'address', label: 'Alamat', type: 'textarea' },
    ]} 
    relations={[
      { table: 'vendor_stock', column: 'vendor_id' }
    ]}
  />
);

export const InStockReasonsPage = () => (
  <MasterDataPage 
    title="Keperluan In Stock" 
    tableName="in_stock_reasons" 
    columns={[{ key: 'name', label: 'Keperluan', type: 'text', required: true }]} 
    relations={[
      { table: 'stock_in', column: 'reason_id' }
    ]}
  />
);

export const OutStockReasonsPage = () => (
  <MasterDataPage 
    title="Keperluan Out Stock" 
    tableName="out_stock_reasons" 
    columns={[{ key: 'name', label: 'Keperluan', type: 'text', required: true }]} 
    relations={[
      { table: 'stock_out', column: 'reason_id' }
    ]}
  />
);

