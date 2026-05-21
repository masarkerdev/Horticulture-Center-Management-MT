-- =====================================================
-- Horticulture Management System — New Supabase Schema
-- নতুন Supabase-এর SQL Editor-এ এটা একবারে run করো
-- =====================================================

-- STEP 1: Sequences তৈরি করো
CREATE SEQUENCE IF NOT EXISTS audit_logs_id_seq;
CREATE SEQUENCE IF NOT EXISTS categories_id_seq;
CREATE SEQUENCE IF NOT EXISTS customers_id_seq;
CREATE SEQUENCE IF NOT EXISTS damages_id_seq;
CREATE SEQUENCE IF NOT EXISTS mother_plants_id_seq;
CREATE SEQUENCE IF NOT EXISTS other_income_id_seq;
CREATE SEQUENCE IF NOT EXISTS production_batches_id_seq;
CREATE SEQUENCE IF NOT EXISTS recycle_bin_id_seq;
CREATE SEQUENCE IF NOT EXISTS sales_id_seq;
CREATE SEQUENCE IF NOT EXISTS sales_items_id_seq;
CREATE SEQUENCE IF NOT EXISTS seedlings_id_seq;
CREATE SEQUENCE IF NOT EXISTS stock_transactions_id_seq;
CREATE SEQUENCE IF NOT EXISTS targets_id_seq;
CREATE SEQUENCE IF NOT EXISTS users_id_seq;

-- STEP 2: Tables তৈরি করো

CREATE TABLE IF NOT EXISTS categories (
  id          integer      NOT NULL DEFAULT nextval('categories_id_seq'),
  name_bn     varchar(100) NOT NULL,
  name_en     varchar(100) NOT NULL,
  description text,
  created_at  timestamp    DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS users (
  id                      integer      NOT NULL DEFAULT nextval('users_id_seq'),
  name                    varchar(100) NOT NULL,
  email                   varchar(150) NOT NULL UNIQUE,
  password                varchar(255) NOT NULL,
  role                    varchar(30)  NOT NULL DEFAULT 'viewer',
  is_active               boolean      DEFAULT true,
  created_at              timestamp    DEFAULT now(),
  updated_at              timestamp    DEFAULT now(),
  pending_password        text,
  password_request_status text,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS seedlings (
  id               integer      NOT NULL DEFAULT nextval('seedlings_id_seq'),
  seedling_code    varchar(20)  NOT NULL,
  name_bn          varchar(150) NOT NULL,
  name_en          varchar(150),
  variety          varchar(150),
  category_id      integer      REFERENCES categories(id),
  production_type  varchar(30)  NOT NULL,
  unit_price       numeric      NOT NULL DEFAULT 0,
  production_cost  numeric      DEFAULT 0,
  current_stock    integer      DEFAULT 0,
  min_stock_alert  integer      DEFAULT 20,
  description      text,
  image_url        varchar(255),
  is_active        boolean      DEFAULT true,
  created_by       integer      REFERENCES users(id),
  created_at       timestamp    DEFAULT now(),
  updated_at       timestamp    DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS mother_plants (
  id            integer     NOT NULL DEFAULT nextval('mother_plants_id_seq'),
  mp_code       varchar(20) NOT NULL,
  variety       varchar(150) NOT NULL,
  seedling_id   integer     REFERENCES seedlings(id),
  age_years     integer,
  location      varchar(100),
  health_status varchar(20) DEFAULT 'good',
  notes         text,
  is_active     boolean     DEFAULT true,
  created_by    integer     REFERENCES users(id),
  created_at    timestamp   DEFAULT now(),
  updated_at    timestamp   DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS production_batches (
  id                 integer     NOT NULL DEFAULT nextval('production_batches_id_seq'),
  batch_code         varchar(30) NOT NULL,
  seedling_id        integer     NOT NULL REFERENCES seedlings(id),
  production_type    varchar(30) NOT NULL,
  seed_source        varchar(150),
  seed_quantity      integer,
  sowing_date        date,
  germination_date   date,
  germination_percent numeric,
  mother_plant_id    integer     REFERENCES mother_plants(id),
  rootstock          varchar(150),
  scion_variety      varchar(150),
  propagation_date   date,
  produced_quantity  integer     NOT NULL DEFAULT 0,
  success_quantity   integer     DEFAULT 0,
  failed_quantity    integer     DEFAULT 0,
  success_percent    numeric,
  available_quantity integer     DEFAULT 0,
  remarks            text,
  status             varchar(20) DEFAULT 'active',
  created_by         integer     REFERENCES users(id),
  created_at         timestamp   DEFAULT now(),
  updated_at         timestamp   DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS stock_transactions (
  id             integer    NOT NULL DEFAULT nextval('stock_transactions_id_seq'),
  seedling_id    integer    NOT NULL REFERENCES seedlings(id),
  batch_id       integer    REFERENCES production_batches(id),
  txn_type       varchar(20) NOT NULL,
  quantity       integer    NOT NULL,
  direction      char(1)    NOT NULL,
  balance_after  integer    NOT NULL,
  reference_id   integer,
  reference_type varchar(30),
  notes          text,
  created_by     integer    REFERENCES users(id),
  created_at     timestamp  DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS customers (
  id         integer      NOT NULL DEFAULT nextval('customers_id_seq'),
  name       varchar(150) NOT NULL,
  phone      varchar(20),
  address    text,
  email      varchar(150),
  notes      text,
  created_at timestamp    DEFAULT now(),
  updated_at timestamp    DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS sales (
  id               integer     NOT NULL DEFAULT nextval('sales_id_seq'),
  invoice_no       varchar(30) NOT NULL,
  customer_id      integer     REFERENCES customers(id),
  customer_name    varchar(150),
  customer_phone   varchar(20),
  customer_address text,
  sale_date        date        DEFAULT CURRENT_DATE,
  subtotal         numeric     NOT NULL DEFAULT 0,
  discount         numeric     DEFAULT 0,
  total_amount     numeric     NOT NULL DEFAULT 0,
  payment_method   varchar(20) DEFAULT 'cash',
  payment_status   varchar(20) DEFAULT 'paid',
  notes            text,
  created_by       integer     REFERENCES users(id),
  created_at       timestamp   DEFAULT now(),
  updated_at       timestamp   DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS sales_items (
  id          integer NOT NULL DEFAULT nextval('sales_items_id_seq'),
  sale_id     integer NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  seedling_id integer NOT NULL REFERENCES seedlings(id),
  batch_id    integer REFERENCES production_batches(id),
  quantity    integer NOT NULL,
  unit_price  numeric NOT NULL,
  total_price numeric NOT NULL,
  created_at  timestamp DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS damages (
  id          integer     NOT NULL DEFAULT nextval('damages_id_seq'),
  seedling_id integer     NOT NULL REFERENCES seedlings(id),
  batch_id    integer     REFERENCES production_batches(id),
  damage_date date        DEFAULT CURRENT_DATE,
  quantity    integer     NOT NULL,
  reason      varchar(30) NOT NULL,
  remarks     text,
  reported_by integer     REFERENCES users(id),
  created_at  timestamp   DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id         integer     NOT NULL DEFAULT nextval('audit_logs_id_seq'),
  user_id    integer     REFERENCES users(id),
  action     varchar(50) NOT NULL,
  table_name varchar(50),
  record_id  integer,
  old_data   jsonb,
  new_data   jsonb,
  ip_address varchar(45),
  created_at timestamp   DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS targets (
  id              integer NOT NULL DEFAULT nextval('targets_id_seq'),
  target_type     text    NOT NULL,
  target_month    integer NOT NULL,
  target_year     integer NOT NULL,
  target_quantity integer DEFAULT 0,
  target_amount   numeric DEFAULT 0,
  notes           text,
  created_by      integer REFERENCES users(id),
  created_at      timestamp DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS other_income (
  id          integer   NOT NULL DEFAULT nextval('other_income_id_seq'),
  income_type text      NOT NULL,
  category    text,
  amount      numeric   NOT NULL DEFAULT 0,
  income_date date      NOT NULL,
  description text,
  created_by  integer   REFERENCES users(id),
  created_at  timestamp DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS recycle_bin (
  id          integer   NOT NULL DEFAULT nextval('recycle_bin_id_seq'),
  table_name  text      NOT NULL,
  record_id   integer   NOT NULL,
  record_data jsonb     NOT NULL,
  module      text      NOT NULL,
  item_name   text,
  deleted_by  integer   REFERENCES users(id),
  deleted_at  timestamp DEFAULT now(),
  PRIMARY KEY (id)
);

-- STEP 3: Stock Summary VIEW (এটা table না, view)
CREATE OR REPLACE VIEW stock_summary AS
SELECT
  s.id,
  s.name_bn,
  s.variety,
  s.seedling_code,
  s.unit_price,
  s.current_stock,
  c.name_bn AS category_bn,
  COALESCE(SUM(CASE WHEN st.direction = '+' THEN st.quantity ELSE 0 END), 0) AS total_in,
  COALESCE(SUM(CASE WHEN st.txn_type = 'sale' THEN st.quantity ELSE 0 END), 0) AS total_sale,
  COALESCE(SUM(CASE WHEN st.txn_type = 'damage' THEN st.quantity ELSE 0 END), 0) AS total_damage,
  COALESCE(SUM(CASE WHEN st.direction = '-' THEN st.quantity ELSE 0 END), 0) AS total_out,
  (s.current_stock) AS current_stock_calc
FROM seedlings s
LEFT JOIN categories c ON s.category_id = c.id
LEFT JOIN stock_transactions st ON s.id = st.seedling_id
GROUP BY s.id, s.name_bn, s.variety, s.seedling_code, s.unit_price, s.current_stock, c.name_bn;

-- =====================================================
-- সফলভাবে run হলে "Success" দেখাবে
-- =====================================================


-- ===== AUTO-GENERATE TRIGGERS =====

-- Batch code auto-generate
CREATE OR REPLACE FUNCTION generate_batch_code()
RETURNS TRIGGER AS $$
DECLARE
  year_str TEXT;
  seq_num  INT;
  new_code TEXT;
BEGIN
  year_str := TO_CHAR(NOW(), 'YYYY');
  SELECT COUNT(*) + 1 INTO seq_num 
  FROM production_batches 
  WHERE batch_code LIKE 'B-' || year_str || '-%';
  new_code := 'B-' || year_str || '-' || LPAD(seq_num::TEXT, 3, '0');
  NEW.batch_code := new_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_batch_code ON production_batches;
CREATE TRIGGER set_batch_code
BEFORE INSERT ON production_batches
FOR EACH ROW
WHEN (NEW.batch_code IS NULL OR NEW.batch_code = '')
EXECUTE FUNCTION generate_batch_code();

-- Invoice number auto-generate
CREATE OR REPLACE FUNCTION generate_invoice_no()
RETURNS TRIGGER AS $$
DECLARE
  seq_num INT;
  new_inv TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO seq_num FROM sales;
  new_inv := 'INV-' || LPAD(seq_num::TEXT, 4, '0');
  NEW.invoice_no := new_inv;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_invoice_no ON sales;
CREATE TRIGGER set_invoice_no
BEFORE INSERT ON sales
FOR EACH ROW
WHEN (NEW.invoice_no IS NULL OR NEW.invoice_no = '')
EXECUTE FUNCTION generate_invoice_no();
