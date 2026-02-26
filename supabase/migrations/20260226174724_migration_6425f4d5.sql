ALTER TABLE groups 
ADD COLUMN IF NOT EXISTS target_years text, -- Virgülle ayrılmış yıllar: "2014,2015"
ADD COLUMN IF NOT EXISTS work_hour text;    -- Çalışma saati: "11:00"

-- Mevcut gruplar için varsayılan değerler
UPDATE groups SET work_hour = '09:00' WHERE work_hour IS NULL;