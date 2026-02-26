-- Create test_protocols table for managing different performance test types
CREATE TABLE IF NOT EXISTS test_protocols (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('Hız', 'Dayanıklılık', 'Kuvvet', 'Koordinasyon', 'Esneklik', 'Teknik')),
  unit TEXT NOT NULL CHECK (unit IN ('saniye', 'metre', 'tekrar', 'cm', 'kg')),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE test_protocols ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view test protocols" ON test_protocols FOR SELECT USING (true);
CREATE POLICY "Anyone can insert test protocols" ON test_protocols FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update test protocols" ON test_protocols FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete test protocols" ON test_protocols FOR DELETE USING (true);

-- Add test_protocol_id to performance_tests table
ALTER TABLE performance_tests ADD COLUMN IF NOT EXISTS test_protocol_id UUID REFERENCES test_protocols(id) ON DELETE SET NULL;

-- Insert default test protocols
INSERT INTO test_protocols (name, category, unit, description) VALUES
('Illinois Çabukluk Testi', 'Hız', 'saniye', 'Çeviklik ve yön değiştirme hızını ölçer. 10 metre boyunca zigzag koşu.'),
('Yo-Yo Intermittent Recovery Test', 'Dayanıklılık', 'metre', 'Aralıklı dayanıklılık testi. Artan hızda mekik koşusu.'),
('20m Sprint', 'Hız', 'saniye', 'Düz hat hız testi. 20 metre maksimum hızda koşu.'),
('Dikey Sıçrama', 'Kuvvet', 'cm', 'Alt ekstremite patlayıcı kuvvet testi. Maksimum dikey sıçrama yüksekliği.'),
('Shuttle Run 20m', 'Dayanıklılık', 'tekrar', '20 metre mekik koşusu. Ses sinyallerine göre gidip gelme.'),
('30m Sprint', 'Hız', 'saniye', 'Düz hat hız testi. 30 metre maksimum hızda koşu.'),
('Cooper Testi', 'Dayanıklılık', 'metre', '12 dakikada maksimum koşu mesafesi.'),
('Plank', 'Kuvvet', 'saniye', 'Core dayanıklılık testi. Plank pozisyonunda maksimum süre.'),
('Otur-Uzan Testi', 'Esneklik', 'cm', 'Hamstring esnekliği. Oturarak maksimum uzanma mesafesi.')
ON CONFLICT (name) DO NOTHING;