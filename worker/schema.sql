-- Stock watchlist
CREATE TABLE IF NOT EXISTS stock_watchlist (
  symbol TEXT PRIMARY KEY,
  target_price TEXT DEFAULT '',
  note TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Quick links
CREATE TABLE IF NOT EXISTS work_links (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT DEFAULT '',
  desc TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
