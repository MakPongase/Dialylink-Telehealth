ALTER TABLE dialysis_sessions
  ADD COLUMN IF NOT EXISTS dialysis_type VARCHAR(20)
    DEFAULT 'hemodialysis'
    CHECK (dialysis_type IN ('hemodialysis', 'peritoneal')),
  ADD COLUMN IF NOT EXISTS blood_flow_rate INTEGER,
  ADD COLUMN IF NOT EXISTS access_site VARCHAR(50),
  ADD COLUMN IF NOT EXISTS ultrafiltration_volume INTEGER,
  ADD COLUMN IF NOT EXISTS num_exchanges INTEGER,
  ADD COLUMN IF NOT EXISTS dwell_time_hours NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS fill_volume_ml INTEGER,
  ADD COLUMN IF NOT EXISTS drain_volume_ml INTEGER,
  ADD COLUMN IF NOT EXISTS dialysate_glucose_percent NUMERIC(3,1),
  ADD COLUMN IF NOT EXISTS effluent_appearance VARCHAR(20)
    CHECK (effluent_appearance IN ('clear','slightly_cloudy','cloudy','bloody'));
