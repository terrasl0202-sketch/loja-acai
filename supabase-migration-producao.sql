-- ============================================
-- MIGRATION COMPLETA PARA PRODUCAO
-- Projeto: xvzkczibscngsrrxzxko
-- Data: 2024
-- ============================================

-- 1. TABELA: store_settings
-- ============================================
CREATE TABLE IF NOT EXISTS public.store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name TEXT DEFAULT 'Minha Loja',
  subtitle TEXT DEFAULT 'Delivery',
  slogan TEXT DEFAULT '',
  whatsapp TEXT DEFAULT '',
  instagram TEXT DEFAULT '',
  address TEXT DEFAULT '',
  open_time TEXT DEFAULT '08:00',
  close_time TEXT DEFAULT '22:00',
  store_open BOOLEAN DEFAULT true,
  manual_control BOOLEAN DEFAULT false,
  closed_message TEXT DEFAULT 'Estamos fechados no momento. Volte em breve!',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para store_settings
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Permitir SELECT para todos (leitura publica)
DROP POLICY IF EXISTS "Allow public read store_settings" ON public.store_settings;
CREATE POLICY "Allow public read store_settings" ON public.store_settings
  FOR SELECT USING (true);

-- Policy: Permitir INSERT/UPDATE/DELETE com service_role
DROP POLICY IF EXISTS "Allow service role full access store_settings" ON public.store_settings;
CREATE POLICY "Allow service role full access store_settings" ON public.store_settings
  FOR ALL USING (true) WITH CHECK (true);

-- 2. TABELA: products
-- ============================================
CREATE TABLE IF NOT EXISTS public.products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  image TEXT DEFAULT '',
  available BOOLEAN DEFAULT true,
  category TEXT DEFAULT 'acai',
  sizes JSONB DEFAULT '[]'::jsonb,
  toppings JSONB DEFAULT '[]'::jsonb,
  extras JSONB DEFAULT '[]'::jsonb,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Policy: Permitir SELECT para todos
DROP POLICY IF EXISTS "Allow public read products" ON public.products;
CREATE POLICY "Allow public read products" ON public.products
  FOR SELECT USING (true);

-- Policy: Permitir tudo com service_role
DROP POLICY IF EXISTS "Allow service role full access products" ON public.products;
CREATE POLICY "Allow service role full access products" ON public.products
  FOR ALL USING (true) WITH CHECK (true);

-- 3. TABELA: neighborhoods
-- ============================================
CREATE TABLE IF NOT EXISTS public.neighborhoods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  fee NUMERIC(10,2) DEFAULT 0,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para neighborhoods
ALTER TABLE public.neighborhoods ENABLE ROW LEVEL SECURITY;

-- Policy: Permitir SELECT para todos
DROP POLICY IF EXISTS "Allow public read neighborhoods" ON public.neighborhoods;
CREATE POLICY "Allow public read neighborhoods" ON public.neighborhoods
  FOR SELECT USING (true);

-- Policy: Permitir tudo com service_role
DROP POLICY IF EXISTS "Allow service role full access neighborhoods" ON public.neighborhoods;
CREATE POLICY "Allow service role full access neighborhoods" ON public.neighborhoods
  FOR ALL USING (true) WITH CHECK (true);

-- 4. TABELA: orders
-- ============================================
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT DEFAULT '',
  neighborhood TEXT DEFAULT '',
  delivery_fee NUMERIC(10,2) DEFAULT 0,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  payment_method TEXT DEFAULT 'pix',
  payment_status TEXT DEFAULT 'pending',
  order_status TEXT DEFAULT 'pending',
  notes TEXT DEFAULT '',
  pix_code TEXT DEFAULT '',
  pix_qrcode TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

-- RLS para orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Policy: Permitir SELECT para todos (cliente pode ver seu pedido)
DROP POLICY IF EXISTS "Allow public read orders" ON public.orders;
CREATE POLICY "Allow public read orders" ON public.orders
  FOR SELECT USING (true);

-- Policy: Permitir INSERT para todos (cliente pode criar pedido)
DROP POLICY IF EXISTS "Allow public insert orders" ON public.orders;
CREATE POLICY "Allow public insert orders" ON public.orders
  FOR INSERT WITH CHECK (true);

-- Policy: Permitir UPDATE/DELETE com service_role
DROP POLICY IF EXISTS "Allow service role full access orders" ON public.orders;
CREATE POLICY "Allow service role full access orders" ON public.orders
  FOR ALL USING (true) WITH CHECK (true);

-- 5. TABELA: admin_settings
-- ============================================
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para admin_settings
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Apenas service_role pode acessar
DROP POLICY IF EXISTS "Allow service role full access admin_settings" ON public.admin_settings;
CREATE POLICY "Allow service role full access admin_settings" ON public.admin_settings
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- DADOS INICIAIS (somente se tabelas vazias)
-- ============================================

-- Inserir store_settings inicial se nao existir
INSERT INTO public.store_settings (store_name, subtitle, slogan, store_open)
SELECT 'Acai da Terra', 'Delivery de Acai', 'O melhor acai da cidade', true
WHERE NOT EXISTS (SELECT 1 FROM public.store_settings LIMIT 1);

-- Inserir produto inicial se nao existir
INSERT INTO public.products (name, description, price, category, available, sort_order)
SELECT 'Acai 500ml', 'Acai cremoso tradicional', 15.00, 'acai', true, 1
WHERE NOT EXISTS (SELECT 1 FROM public.products LIMIT 1);

-- Inserir bairro inicial se nao existir
INSERT INTO public.neighborhoods (name, fee, active, sort_order)
SELECT 'Centro', 5.00, true, 1
WHERE NOT EXISTS (SELECT 1 FROM public.neighborhoods LIMIT 1);

-- ============================================
-- VERIFICACAO FINAL
-- ============================================
-- Execute estas queries para verificar:
-- SELECT count(*) FROM public.store_settings;
-- SELECT count(*) FROM public.products;
-- SELECT count(*) FROM public.neighborhoods;
-- SELECT count(*) FROM public.orders;

-- FIM DA MIGRATION
