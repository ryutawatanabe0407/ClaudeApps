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

module.exports = db;
