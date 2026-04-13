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

// ──────────────────────────────────────────────
// キャリアトラッカー用テーブル
// ──────────────────────────────────────────────

// Ikigai（生きがい）4項目ストア
db.exec(`
  CREATE TABLE IF NOT EXISTS career_ikigai (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    love_items        TEXT DEFAULT '[]',
    good_at_items     TEXT DEFAULT '[]',
    world_needs_items TEXT DEFAULT '[]',
    paid_for_items    TEXT DEFAULT '[]',
    updated_at TEXT DEFAULT (datetime('now'))
  )
`);

// T字型スキル
db.exec(`
  CREATE TABLE IF NOT EXISTS career_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    category    TEXT NOT NULL DEFAULT 'adjacent',
    proficiency INTEGER DEFAULT 1,
    years_exp   REAL DEFAULT 0,
    memo        TEXT DEFAULT '',
    is_learning INTEGER DEFAULT 0,
    order_index INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now'))
  )
`);

// 目標（OKRライト）
db.exec(`
  CREATE TABLE IF NOT EXISTS career_goals (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    goal_type   TEXT DEFAULT 'objective',
    parent_id   INTEGER,
    cycle       TEXT DEFAULT '',
    status      TEXT DEFAULT 'active',
    current_val REAL DEFAULT 0,
    target_val  REAL DEFAULT 100,
    unit        TEXT DEFAULT '%',
    due_date    TEXT DEFAULT '',
    order_index INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now'))
  )
`);

// 学習ログ（70-20-10）
db.exec(`
  CREATE TABLE IF NOT EXISTS career_learning (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    learn_type  TEXT NOT NULL DEFAULT 'experience',
    duration_h  REAL DEFAULT 0,
    learn_date  TEXT NOT NULL,
    skills_tag  TEXT DEFAULT '[]',
    notes       TEXT DEFAULT '',
    created_at  TEXT DEFAULT (datetime('now'))
  )
`);

// フォーカスアイテム（Will/Skill）
db.exec(`
  CREATE TABLE IF NOT EXISTS career_focus (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    will_level  INTEGER DEFAULT 3,
    skill_level INTEGER DEFAULT 3,
    action      TEXT DEFAULT 'consider',
    notes       TEXT DEFAULT '',
    created_at  TEXT DEFAULT (datetime('now'))
  )
`);

// 経歴タイムライン
db.exec(`
  CREATE TABLE IF NOT EXISTS career_experiences (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    org         TEXT DEFAULT '',
    role        TEXT DEFAULT '',
    start_date  TEXT NOT NULL,
    end_date    TEXT DEFAULT '',
    description TEXT DEFAULT '',
    skills_tag  TEXT DEFAULT '[]',
    created_at  TEXT DEFAULT (datetime('now'))
  )
`);

module.exports = db;
