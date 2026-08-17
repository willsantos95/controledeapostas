CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('owner', 'admin', 'user');
CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'premium');
CREATE TYPE bet_type AS ENUM ('single', 'parlay', 'multiple', 'system', 'free');
CREATE TYPE bet_status AS ENUM ('pending', 'won', 'lost', 'void', 'canceled');
CREATE TYPE calculator_type AS ENUM ('surebet_2way', 'duplo_green_3way', 'free_bet_converter');

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  subscription_tier subscription_tier DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW(),

  max_bets_per_month INT DEFAULT 50,
  max_calculators_per_day INT DEFAULT 100,

  metadata JSONB DEFAULT '{}'
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,

  role user_role DEFAULT 'user',
  last_login TIMESTAMP
);

CREATE TABLE bets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  bet_id VARCHAR(100) NOT NULL,
  platform VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),

  stake DECIMAL(12,2) NOT NULL,
  initial_odds DECIMAL(8,4) NOT NULL,
  bet_type bet_type DEFAULT 'single',

  sport VARCHAR(100),
  event_description TEXT,
  bet_description TEXT,

  status bet_status DEFAULT 'pending',
  result_odd DECIMAL(8,4),
  win_amount DECIMAL(12,2),
  net_gain DECIMAL(12,2),
  result_date TIMESTAMP,

  screenshot_urls TEXT[],

  updated_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

CREATE TABLE calculator_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  calculator_type calculator_type NOT NULL,
  input_data JSONB NOT NULL,
  output_data JSONB NOT NULL,

  is_saved BOOLEAN DEFAULT false,
  bet_id UUID REFERENCES bets(id),

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_bets_user_id ON bets(user_id);
CREATE INDEX idx_bets_status ON bets(status);
CREATE INDEX idx_calculator_logs_user_id ON calculator_logs(user_id);
