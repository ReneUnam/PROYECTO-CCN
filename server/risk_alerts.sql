-- Tabla para alertas de riesgo
CREATE TABLE IF NOT EXISTS risk_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  score integer NOT NULL,
  risk_type text NOT NULL,
  timestamp timestamptz NOT NULL
);
