CREATE TABLE "user" (id text PRIMARY KEY);
CREATE TABLE financial_account (id uuid PRIMARY KEY DEFAULT uuidv7(), user_id text REFERENCES "user" ON DELETE CASCADE);
CREATE TABLE invoice (id uuid PRIMARY KEY DEFAULT uuidv7(), user_id text REFERENCES "user" ON DELETE CASCADE,
  account_id uuid REFERENCES financial_account ON DELETE SET NULL, name text, description text, value numeric,
  status text DEFAULT 'pending', created_at timestamp, updated_at timestamp DEFAULT now());
CREATE TABLE expense (id uuid PRIMARY KEY DEFAULT uuidv7(), user_id text REFERENCES "user" ON DELETE CASCADE,
  account_id uuid REFERENCES financial_account ON DELETE SET NULL, title text, value numeric, iva boolean,
  created_at timestamp, updated_at timestamp DEFAULT now());
CREATE TABLE "transaction" (id uuid PRIMARY KEY DEFAULT uuidv7(), user_id text REFERENCES "user" ON DELETE CASCADE,
  account_id uuid REFERENCES financial_account ON DELETE CASCADE, value numeric, type text, description text, created_at timestamp);
