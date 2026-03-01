-- Create payment_history table for tracking all payment transactions
CREATE TABLE payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('Nakit', 'Kredi Kartı', 'Havale', 'Diğer')),
  installment_number INTEGER DEFAULT 1,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX idx_payment_history_student ON payment_history(student_id);
CREATE INDEX idx_payment_history_date ON payment_history(payment_date);

-- Add RLS policies
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view payment history"
  ON payment_history FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage payment history"
  ON payment_history FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Add comment
COMMENT ON TABLE payment_history IS 'Tracks all payment transactions for students including installments';