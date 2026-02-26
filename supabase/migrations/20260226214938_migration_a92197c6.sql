-- Add test_protocol_id to performance_tests table
ALTER TABLE performance_tests 
ADD COLUMN IF NOT EXISTS test_protocol_id UUID REFERENCES test_protocols(id);

-- Make test_type nullable since we're moving to protocol_id
ALTER TABLE performance_tests 
ALTER COLUMN test_type DROP NOT NULL;