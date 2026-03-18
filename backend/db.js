const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'tasks.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    progress INTEGER DEFAULT 0,
    color TEXT DEFAULT '#2563EB',
    status TEXT DEFAULT 'todo',
    order_index INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// ディッキア育成ゲーム用テーブル
db.exec(`
  CREATE TABLE IF NOT EXISTS dyckia_characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    species TEXT NOT NULL,
    nickname TEXT,
    planted_at TEXT NOT NULL,
    water_level INTEGER DEFAULT 50,
    nutrition_level INTEGER DEFAULT 50,
    growth_stage INTEGER DEFAULT 0,
    last_watered TEXT,
    last_fertilized TEXT,
    total_water_count INTEGER DEFAULT 0,
    total_fertilize_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS dyckia_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    action_type TEXT NOT NULL,
    before_stage INTEGER,
    after_stage INTEGER,
    timestamp TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (character_id) REFERENCES dyckia_characters(id)
  )
`);

module.exports = db;
