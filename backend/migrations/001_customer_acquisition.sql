ALTER TABLE customers ADD COLUMN city TEXT;
ALTER TABLE customers ADD COLUMN state TEXT;
ALTER TABLE customers ADD COLUMN acquisition_date TEXT;
ALTER TABLE customers ADD COLUMN updated_at DATETIME;

ALTER TABLE orders ADD COLUMN customer_id TEXT;
ALTER TABLE orders ADD COLUMN order_date TEXT;
ALTER TABLE orders ADD COLUMN updated_at DATETIME;

CREATE TABLE IF NOT EXISTS customer_acquisition (
  customer_id TEXT PRIMARY KEY,
  customer_name TEXT,
  acquisition_date TEXT,
  first_order_date TEXT,
  first_order_value REAL,
  acquisition_source TEXT,
  location TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
