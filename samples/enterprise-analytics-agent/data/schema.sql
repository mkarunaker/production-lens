CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL,
  plan TEXT NOT NULL,
  lifetime_value INTEGER NOT NULL
);

CREATE TABLE quarterly_revenue (
  region TEXT NOT NULL,
  revenue INTEGER NOT NULL
);
