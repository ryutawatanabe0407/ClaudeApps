const express = require('express');
const router = express.Router();
const db = require('./db');

// ──────────────────────────────────────────────
// Ikigai（生きがい）
// ──────────────────────────────────────────────

// GET: Ikigai取得（1レコード固定）
router.get('/ikigai', (req, res) => {
  let row = db.prepare('SELECT * FROM career_ikigai ORDER BY id LIMIT 1').get();
  if (!row) {
    db.prepare('INSERT INTO career_ikigai DEFAULT VALUES').run();
    row = db.prepare('SELECT * FROM career_ikigai ORDER BY id LIMIT 1').get();
  }
  res.json({
    ...row,
    love_items:        JSON.parse(row.love_items),
    good_at_items:     JSON.parse(row.good_at_items),
    world_needs_items: JSON.parse(row.world_needs_items),
    paid_for_items:    JSON.parse(row.paid_for_items),
  });
});

// PUT: Ikigai更新
router.put('/ikigai', (req, res) => {
  const { love_items, good_at_items, world_needs_items, paid_for_items } = req.body;
  let row = db.prepare('SELECT * FROM career_ikigai ORDER BY id LIMIT 1').get();
  if (!row) {
    db.prepare('INSERT INTO career_ikigai DEFAULT VALUES').run();
    row = db.prepare('SELECT * FROM career_ikigai ORDER BY id LIMIT 1').get();
  }
  db.prepare(`
    UPDATE career_ikigai SET
      love_items        = COALESCE(?, love_items),
      good_at_items     = COALESCE(?, good_at_items),
      world_needs_items = COALESCE(?, world_needs_items),
      paid_for_items    = COALESCE(?, paid_for_items),
      updated_at        = datetime('now')
    WHERE id = ?
  `).run(
    love_items        != null ? JSON.stringify(love_items)        : null,
    good_at_items     != null ? JSON.stringify(good_at_items)     : null,
    world_needs_items != null ? JSON.stringify(world_needs_items) : null,
    paid_for_items    != null ? JSON.stringify(paid_for_items)    : null,
    row.id
  );
  const updated = db.prepare('SELECT * FROM career_ikigai WHERE id = ?').get(row.id);
  res.json({
    ...updated,
    love_items:        JSON.parse(updated.love_items),
    good_at_items:     JSON.parse(updated.good_at_items),
    world_needs_items: JSON.parse(updated.world_needs_items),
    paid_for_items:    JSON.parse(updated.paid_for_items),
  });
});

// ──────────────────────────────────────────────
// T字型スキル
// ──────────────────────────────────────────────

router.get('/skills', (req, res) => {
  const rows = db.prepare('SELECT * FROM career_skills ORDER BY category DESC, order_index ASC, id ASC').all();
  res.json(rows);
});

router.post('/skills', (req, res) => {
  const { name, category = 'adjacent', proficiency = 1, years_exp = 0, memo = '', is_learning = 0 } = req.body;
  if (!name) return res.status(400).json({ error: 'name は必須です' });
  const max = db.prepare('SELECT MAX(order_index) as m FROM career_skills WHERE category = ?').get(category);
  const order_index = (max.m ?? -1) + 1;
  const result = db.prepare(
    'INSERT INTO career_skills (name, category, proficiency, years_exp, memo, is_learning, order_index) VALUES (?,?,?,?,?,?,?)'
  ).run(name, category, proficiency, years_exp, memo, is_learning ? 1 : 0, order_index);
  res.status(201).json(db.prepare('SELECT * FROM career_skills WHERE id = ?').get(result.lastInsertRowid));
});

router.patch('/skills/:id', (req, res) => {
  const { id } = req.params;
  const skill = db.prepare('SELECT * FROM career_skills WHERE id = ?').get(id);
  if (!skill) return res.status(404).json({ error: 'スキルが見つかりません' });
  const { name, category, proficiency, years_exp, memo, is_learning } = req.body;
  db.prepare(`
    UPDATE career_skills SET
      name        = COALESCE(?, name),
      category    = COALESCE(?, category),
      proficiency = COALESCE(?, proficiency),
      years_exp   = COALESCE(?, years_exp),
      memo        = COALESCE(?, memo),
      is_learning = COALESCE(?, is_learning)
    WHERE id = ?
  `).run(name, category, proficiency, years_exp, memo, is_learning != null ? (is_learning ? 1 : 0) : null, id);
  res.json(db.prepare('SELECT * FROM career_skills WHERE id = ?').get(id));
});

router.delete('/skills/:id', (req, res) => {
  const skill = db.prepare('SELECT * FROM career_skills WHERE id = ?').get(req.params.id);
  if (!skill) return res.status(404).json({ error: 'スキルが見つかりません' });
  db.prepare('DELETE FROM career_skills WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ──────────────────────────────────────────────
// 目標・OKR
// ──────────────────────────────────────────────

router.get('/goals', (req, res) => {
  const rows = db.prepare('SELECT * FROM career_goals ORDER BY order_index ASC, id ASC').all();
  res.json(rows);
});

router.post('/goals', (req, res) => {
  const { title, goal_type = 'objective', parent_id = null, cycle = '', status = 'active',
          current_val = 0, target_val = 100, unit = '%', due_date = '' } = req.body;
  if (!title) return res.status(400).json({ error: 'title は必須です' });
  const max = db.prepare('SELECT MAX(order_index) as m FROM career_goals').get();
  const order_index = (max.m ?? -1) + 1;
  const result = db.prepare(
    'INSERT INTO career_goals (title, goal_type, parent_id, cycle, status, current_val, target_val, unit, due_date, order_index) VALUES (?,?,?,?,?,?,?,?,?,?)'
  ).run(title, goal_type, parent_id, cycle, status, current_val, target_val, unit, due_date, order_index);
  res.status(201).json(db.prepare('SELECT * FROM career_goals WHERE id = ?').get(result.lastInsertRowid));
});

router.patch('/goals/:id', (req, res) => {
  const { id } = req.params;
  const goal = db.prepare('SELECT * FROM career_goals WHERE id = ?').get(id);
  if (!goal) return res.status(404).json({ error: '目標が見つかりません' });
  const { title, goal_type, parent_id, cycle, status, current_val, target_val, unit, due_date } = req.body;
  db.prepare(`
    UPDATE career_goals SET
      title       = COALESCE(?, title),
      goal_type   = COALESCE(?, goal_type),
      parent_id   = COALESCE(?, parent_id),
      cycle       = COALESCE(?, cycle),
      status      = COALESCE(?, status),
      current_val = COALESCE(?, current_val),
      target_val  = COALESCE(?, target_val),
      unit        = COALESCE(?, unit),
      due_date    = COALESCE(?, due_date)
    WHERE id = ?
  `).run(title, goal_type, parent_id, cycle, status, current_val, target_val, unit, due_date, id);
  res.json(db.prepare('SELECT * FROM career_goals WHERE id = ?').get(id));
});

router.delete('/goals/:id', (req, res) => {
  const goal = db.prepare('SELECT * FROM career_goals WHERE id = ?').get(req.params.id);
  if (!goal) return res.status(404).json({ error: '目標が見つかりません' });
  db.prepare('DELETE FROM career_goals WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ──────────────────────────────────────────────
// 学習ログ（70-20-10）
// ──────────────────────────────────────────────

router.get('/learning', (req, res) => {
  const rows = db.prepare('SELECT * FROM career_learning ORDER BY learn_date DESC, id DESC').all();
  res.json(rows.map(r => ({ ...r, skills_tag: JSON.parse(r.skills_tag) })));
});

router.post('/learning', (req, res) => {
  const { title, learn_type = 'experience', duration_h = 0, learn_date, skills_tag = [], notes = '' } = req.body;
  if (!title || !learn_date) return res.status(400).json({ error: 'title と learn_date は必須です' });
  const result = db.prepare(
    'INSERT INTO career_learning (title, learn_type, duration_h, learn_date, skills_tag, notes) VALUES (?,?,?,?,?,?)'
  ).run(title, learn_type, duration_h, learn_date, JSON.stringify(skills_tag), notes);
  const row = db.prepare('SELECT * FROM career_learning WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...row, skills_tag: JSON.parse(row.skills_tag) });
});

router.delete('/learning/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM career_learning WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '学習ログが見つかりません' });
  db.prepare('DELETE FROM career_learning WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ──────────────────────────────────────────────
// フォーカスアイテム（Will/Skill）
// ──────────────────────────────────────────────

router.get('/focus', (req, res) => {
  const rows = db.prepare('SELECT * FROM career_focus ORDER BY id ASC').all();
  res.json(rows);
});

router.post('/focus', (req, res) => {
  const { title, will_level = 3, skill_level = 3, action = 'consider', notes = '' } = req.body;
  if (!title) return res.status(400).json({ error: 'title は必須です' });
  const result = db.prepare(
    'INSERT INTO career_focus (title, will_level, skill_level, action, notes) VALUES (?,?,?,?,?)'
  ).run(title, will_level, skill_level, action, notes);
  res.status(201).json(db.prepare('SELECT * FROM career_focus WHERE id = ?').get(result.lastInsertRowid));
});

router.patch('/focus/:id', (req, res) => {
  const { id } = req.params;
  const item = db.prepare('SELECT * FROM career_focus WHERE id = ?').get(id);
  if (!item) return res.status(404).json({ error: 'アイテムが見つかりません' });
  const { title, will_level, skill_level, action, notes } = req.body;
  db.prepare(`
    UPDATE career_focus SET
      title       = COALESCE(?, title),
      will_level  = COALESCE(?, will_level),
      skill_level = COALESCE(?, skill_level),
      action      = COALESCE(?, action),
      notes       = COALESCE(?, notes)
    WHERE id = ?
  `).run(title, will_level, skill_level, action, notes, id);
  res.json(db.prepare('SELECT * FROM career_focus WHERE id = ?').get(id));
});

router.delete('/focus/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM career_focus WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'アイテムが見つかりません' });
  db.prepare('DELETE FROM career_focus WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ──────────────────────────────────────────────
// 経歴タイムライン
// ──────────────────────────────────────────────

router.get('/experiences', (req, res) => {
  const rows = db.prepare('SELECT * FROM career_experiences ORDER BY start_date DESC, id DESC').all();
  res.json(rows.map(r => ({ ...r, skills_tag: JSON.parse(r.skills_tag) })));
});

router.post('/experiences', (req, res) => {
  const { title, org = '', role = '', start_date, end_date = '', description = '', skills_tag = [] } = req.body;
  if (!title || !start_date) return res.status(400).json({ error: 'title と start_date は必須です' });
  const result = db.prepare(
    'INSERT INTO career_experiences (title, org, role, start_date, end_date, description, skills_tag) VALUES (?,?,?,?,?,?,?)'
  ).run(title, org, role, start_date, end_date, description, JSON.stringify(skills_tag));
  const row = db.prepare('SELECT * FROM career_experiences WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...row, skills_tag: JSON.parse(row.skills_tag) });
});

router.patch('/experiences/:id', (req, res) => {
  const { id } = req.params;
  const exp = db.prepare('SELECT * FROM career_experiences WHERE id = ?').get(id);
  if (!exp) return res.status(404).json({ error: '経歴が見つかりません' });
  const { title, org, role, start_date, end_date, description, skills_tag } = req.body;
  db.prepare(`
    UPDATE career_experiences SET
      title       = COALESCE(?, title),
      org         = COALESCE(?, org),
      role        = COALESCE(?, role),
      start_date  = COALESCE(?, start_date),
      end_date    = COALESCE(?, end_date),
      description = COALESCE(?, description),
      skills_tag  = COALESCE(?, skills_tag)
    WHERE id = ?
  `).run(title, org, role, start_date, end_date, description,
    skills_tag != null ? JSON.stringify(skills_tag) : null, id);
  const row = db.prepare('SELECT * FROM career_experiences WHERE id = ?').get(id);
  res.json({ ...row, skills_tag: JSON.parse(row.skills_tag) });
});

router.delete('/experiences/:id', (req, res) => {
  const exp = db.prepare('SELECT * FROM career_experiences WHERE id = ?').get(req.params.id);
  if (!exp) return res.status(404).json({ error: '経歴が見つかりません' });
  db.prepare('DELETE FROM career_experiences WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
