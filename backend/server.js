const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// 全タスク取得
app.get('/api/tasks', (req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks ORDER BY order_index ASC, id ASC').all();
  res.json(tasks);
});

// タスク作成
app.post('/api/tasks', (req, res) => {
  const { name, start_date, end_date, progress = 0, color = '#2563EB', status = 'todo' } = req.body;
  if (!name || !start_date || !end_date) {
    return res.status(400).json({ error: 'name, start_date, end_date は必須です' });
  }
  const maxOrder = db.prepare('SELECT MAX(order_index) as m FROM tasks').get();
  const order_index = (maxOrder.m ?? -1) + 1;
  const result = db.prepare(
    'INSERT INTO tasks (name, start_date, end_date, progress, color, status, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(name, start_date, end_date, progress, color, status, order_index);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(task);
});

// 並び替え（/:id より前に定義する必要あり）
app.patch('/api/tasks/reorder', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids は配列が必要です' });
  const update = db.prepare('UPDATE tasks SET order_index = ? WHERE id = ?');
  const transaction = db.transaction((ids) => {
    ids.forEach((id, index) => update.run(index, id));
  });
  transaction(ids);
  res.json({ success: true });
});

// タスク更新
app.patch('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!task) return res.status(404).json({ error: 'タスクが見つかりません' });

  const { name, start_date, end_date, progress, color, status } = req.body;
  db.prepare(`
    UPDATE tasks SET
      name = COALESCE(?, name),
      start_date = COALESCE(?, start_date),
      end_date = COALESCE(?, end_date),
      progress = COALESCE(?, progress),
      color = COALESCE(?, color),
      status = COALESCE(?, status)
    WHERE id = ?
  `).run(name, start_date, end_date, progress, color, status, id);

  res.json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(id));
});

// タスク削除
app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!task) return res.status(404).json({ error: 'タスクが見つかりません' });
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  res.json({ success: true });
});

// 全削除
app.delete('/api/tasks', (req, res) => {
  db.prepare('DELETE FROM tasks').run();
  res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Gantt Backend running at http://0.0.0.0:${PORT}`);
});
