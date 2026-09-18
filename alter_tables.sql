-- 1. Add cost columns to stock_in
ALTER TABLE stock_in ADD COLUMN IF NOT EXISTS total_cost NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE stock_in ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(15, 2) DEFAULT 0;

-- 2. Add batch tracking and cost columns to stock_out
ALTER TABLE stock_out ADD COLUMN IF NOT EXISTS stock_in_id UUID REFERENCES stock_in(id) ON DELETE RESTRICT;
ALTER TABLE stock_out ADD COLUMN IF NOT EXISTS total_cost NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE stock_out ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE stock_out ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id) ON DELETE RESTRICT;
ALTER TABLE stock_out ADD COLUMN IF NOT EXISTS source_out_stock_id UUID REFERENCES stock_out(id) ON DELETE RESTRICT;

-- 3. Drop old vendor_stock table
DROP TABLE IF EXISTS vendor_stock CASCADE;

-- 4. Add finance check column to stock_out
ALTER TABLE stock_out ADD COLUMN IF NOT EXISTS is_checked_finance BOOLEAN DEFAULT FALSE;

-- 5. Add finance check column to deadstock_out
ALTER TABLE deadstock_out ADD COLUMN IF NOT EXISTS is_checked_finance BOOLEAN DEFAULT FALSE;
