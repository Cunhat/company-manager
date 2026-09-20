CREATE TABLE journey (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text REFERENCES "user"(id) ON DELETE CASCADE,
  date timestamp NOT NULL, distance integer NOT NULL);
CREATE TABLE per_diem (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text REFERENCES "user"(id) ON DELETE CASCADE,
  date date NOT NULL, daily_rate_cents integer NOT NULL, percentage integer NOT NULL);

ALTER TABLE "transaction" ADD COLUMN updated_at timestamp NOT NULL DEFAULT now();
