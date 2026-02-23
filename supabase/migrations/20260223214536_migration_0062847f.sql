-- Create payment_plans table
CREATE TABLE IF NOT EXISTS payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  duration_months INTEGER NOT NULL,
  installments INTEGER DEFAULT 1,
  installment_price DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create settings table for other fees
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies (public read, authenticated write for now)
CREATE POLICY "Anyone can view payment plans" ON payment_plans FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage payment plans" ON payment_plans FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage settings" ON settings FOR ALL USING (auth.uid() IS NOT NULL);

-- Insert default payment plans
INSERT INTO payment_plans (name, price, duration_months, installments, display_order) VALUES
  ('6 Aylık', 24000, 6, 1, 1),
  ('12 Aylık Peşin', 44000, 12, 1, 2),
  ('12 Aylık Taksitli', 23000, 12, 2, 3);

-- Update installment_price for 12 Aylık Taksitli
UPDATE payment_plans SET installment_price = 23000 WHERE name = '12 Aylık Taksitli';

-- Insert default settings
INSERT INTO settings (key, value, description) VALUES
  ('clothing_fee', '3000', 'Kıyafet bedeli (TL)'),
  ('late_payment_days', '45', 'Taksit ödemesi için geç ödeme gün sayısı'),
  ('medical_report_days', '10', 'Sağlık raporu için maksimum gün sayısı');