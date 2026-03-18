const express = require('express');
const router = express.Router();
const db = require('./db');

// クールダウン設定（ミリ秒）
const WATER_COOLDOWN_MS = 8 * 60 * 60 * 1000;      // 8時間
const FERTILIZE_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24時間

// 進化条件（累計）
const EVOLUTION_THRESHOLDS = {
  0: { water: 0, nutrition: 0 },
  1: { water: 50, nutrition: 30 },
  2: { water: 150, nutrition: 100 },
  3: { water: 300, nutrition: 200 },
  4: { water: 500, nutrition: 350 }
};

// 現在のキャラクター取得（1体のみ）
router.get('/character', (req, res) => {
  const character = db.prepare('SELECT * FROM dyckia_characters ORDER BY id DESC LIMIT 1').get();
  res.json(character || null);
});

// 新規育成開始
router.post('/character', (req, res) => {
  const { species = 'dyckia_green', nickname = 'ディッキアちゃん' } = req.body;
  const planted_at = new Date().toISOString();

  const result = db.prepare(`
    INSERT INTO dyckia_characters (species, nickname, planted_at, water_level, nutrition_level, growth_stage)
    VALUES (?, ?, ?, 50, 50, 0)
  `).run(species, nickname, planted_at);

  const character = db.prepare('SELECT * FROM dyckia_characters WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(character);
});

// 水やり
router.patch('/character/:id/water', (req, res) => {
  const { id } = req.params;
  const character = db.prepare('SELECT * FROM dyckia_characters WHERE id = ?').get(id);

  if (!character) {
    return res.status(404).json({ error: 'キャラクターが見つかりません' });
  }

  // クールダウンチェック
  if (character.last_watered) {
    const lastWatered = new Date(character.last_watered).getTime();
    const now = Date.now();
    if (now - lastWatered < WATER_COOLDOWN_MS) {
      const cooldownUntil = new Date(lastWatered + WATER_COOLDOWN_MS).toISOString();
      return res.status(429).json({
        error: 'クールダウン中です',
        cooldownUntil
      });
    }
  }

  // 水やり実行
  const newWaterLevel = Math.min(100, character.water_level + 30);
  const newWaterCount = character.total_water_count + 1;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE dyckia_characters
    SET water_level = ?, last_watered = ?, total_water_count = ?
    WHERE id = ?
  `).run(newWaterLevel, now, newWaterCount, id);

  // ログ記録
  db.prepare(`
    INSERT INTO dyckia_logs (character_id, action_type) VALUES (?, 'water')
  `).run(id);

  // 進化チェック
  const updated = db.prepare('SELECT * FROM dyckia_characters WHERE id = ?').get(id);
  const newStage = checkEvolution(updated);

  if (newStage > character.growth_stage) {
    db.prepare('UPDATE dyckia_characters SET growth_stage = ? WHERE id = ?').run(newStage, id);
    db.prepare(`
      INSERT INTO dyckia_logs (character_id, action_type, before_stage, after_stage)
      VALUES (?, 'evolve', ?, ?)
    `).run(id, character.growth_stage, newStage);
  }

  const final = db.prepare('SELECT * FROM dyckia_characters WHERE id = ?').get(id);
  const cooldownUntil = new Date(Date.now() + WATER_COOLDOWN_MS).toISOString();

  res.json({
    success: true,
    character: final,
    cooldownUntil,
    evolved: newStage > character.growth_stage
  });
});

// 肥料やり
router.patch('/character/:id/fertilize', (req, res) => {
  const { id } = req.params;
  const character = db.prepare('SELECT * FROM dyckia_characters WHERE id = ?').get(id);

  if (!character) {
    return res.status(404).json({ error: 'キャラクターが見つかりません' });
  }

  // クールダウンチェック
  if (character.last_fertilized) {
    const lastFertilized = new Date(character.last_fertilized).getTime();
    const now = Date.now();
    if (now - lastFertilized < FERTILIZE_COOLDOWN_MS) {
      const cooldownUntil = new Date(lastFertilized + FERTILIZE_COOLDOWN_MS).toISOString();
      return res.status(429).json({
        error: 'クールダウン中です',
        cooldownUntil
      });
    }
  }

  // 肥料やり実行
  const newNutritionLevel = Math.min(100, character.nutrition_level + 25);
  const newFertilizeCount = character.total_fertilize_count + 1;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE dyckia_characters
    SET nutrition_level = ?, last_fertilized = ?, total_fertilize_count = ?
    WHERE id = ?
  `).run(newNutritionLevel, now, newFertilizeCount, id);

  // ログ記録
  db.prepare(`
    INSERT INTO dyckia_logs (character_id, action_type) VALUES (?, 'fertilize')
  `).run(id);

  // 進化チェック
  const updated = db.prepare('SELECT * FROM dyckia_characters WHERE id = ?').get(id);
  const newStage = checkEvolution(updated);

  if (newStage > character.growth_stage) {
    db.prepare('UPDATE dyckia_characters SET growth_stage = ? WHERE id = ?').run(newStage, id);
    db.prepare(`
      INSERT INTO dyckia_logs (character_id, action_type, before_stage, after_stage)
      VALUES (?, 'evolve', ?, ?)
    `).run(id, character.growth_stage, newStage);
  }

  const final = db.prepare('SELECT * FROM dyckia_characters WHERE id = ?').get(id);
  const cooldownUntil = new Date(Date.now() + FERTILIZE_COOLDOWN_MS).toISOString();

  res.json({
    success: true,
    character: final,
    cooldownUntil,
    evolved: newStage > character.growth_stage
  });
});

// 育成ログ取得
router.get('/logs/:id', (req, res) => {
  const { id } = req.params;
  const logs = db.prepare(`
    SELECT * FROM dyckia_logs
    WHERE character_id = ?
    ORDER BY timestamp DESC
    LIMIT 50
  `).all(id);
  res.json(logs);
});

// キャラクター削除（リセット）
router.delete('/character/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM dyckia_logs WHERE character_id = ?').run(id);
  db.prepare('DELETE FROM dyckia_characters WHERE id = ?').run(id);
  res.json({ success: true });
});

// 進化判定ヘルパー
function checkEvolution(character) {
  let newStage = character.growth_stage;

  for (let stage = 4; stage >= 0; stage--) {
    const threshold = EVOLUTION_THRESHOLDS[stage];
    if (character.total_water_count >= threshold.water &&
        character.total_fertilize_count >= threshold.nutrition) {
      newStage = stage;
      break;
    }
  }

  return newStage;
}

module.exports = router;
