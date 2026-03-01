-- Update payment_method enum to include online payment options
ALTER TABLE payment_history DROP CONSTRAINT IF EXISTS payment_history_payment_method_check;

ALTER TABLE payment_history 
ADD CONSTRAINT payment_history_payment_method_check 
CHECK (payment_method IN ('Nakit', 'Kredi Kartı', 'Havale/EFT', 'Online Ödeme', 'Diğer'));

-- Create iyzico_settings table
CREATE TABLE IF NOT EXISTS iyzico_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key text NULL,
  secret_key text NULL,
  base_url text NULL DEFAULT 'https://sandbox-api.iyzipay.com',
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create online_payments table
CREATE TABLE IF NOT EXISTS online_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_history_id uuid NOT NULL REFERENCES payment_history(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  iyzico_payment_id text NULL,
  conversation_id text NOT NULL,
  payment_link text NOT NULL,
  amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  callback_url text NULL,
  expires_at timestamptz NOT NULL,
  completed_at timestamptz NULL,
  error_message text NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT online_payments_status_check CHECK (status IN ('pending', 'success', 'failed', 'expired'))
);

-- Enable RLS
ALTER TABLE iyzico_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE online_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for iyzico_settings
CREATE POLICY "Admins can manage iyzico settings"
  ON iyzico_settings FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can view iyzico settings"
  ON iyzico_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for online_payments
CREATE POLICY "Users can create online payments"
  ON online_payments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view online payments"
  ON online_payments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update online payments"
  ON online_payments FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_online_payments_student ON online_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_online_payments_status ON online_payments(status);
CREATE INDEX IF NOT EXISTS idx_online_payments_expires ON online_payments(expires_at);
CREATE INDEX IF NOT EXISTS idx_online_payments_conversation ON online_payments(conversation_id);