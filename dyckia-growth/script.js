// ===== Configuration =====
const CONFIG = {
  WATER_COOLDOWN_MS: 8 * 60 * 60 * 1000,
  FERTILIZE_COOLDOWN_MS: 24 * 60 * 60 * 1000,
  DECAY_INTERVAL_MS: 60 * 60 * 1000,
  WATER_DECAY_RATE: 5,
  NUTRITION_DECAY_RATE: 3,
  WATER_RESTORE: 30,
  FERTILIZE_RESTORE: 25,
  DYCKIA_SIZE_BY_STAGE: [50, 70, 100, 130, 150],
  PARTICLE_COUNT_WATER: 15,
  PARTICLE_COUNT_FERTILIZE: 20,
  STAGE_NAMES: ['種子', '芽', '若葉', '成体', '開花']
};

// ===== Game Class =====
class DyckiaGrowth {
  constructor() {
    this.character = null;
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.decayTimer = null;
    this.dyckiaImage = null;

    this.setupCanvas();
    this.setupEventListeners();
    this.loadDyckiaImage();
    window.addEventListener('resize', () => this.setupCanvas());
  }

  setupCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  loadDyckiaImage() {
    this.dyckiaImage = new Image();
    this.dyckiaImage.src = '../game/assets/dyckia.svg';
  }

  setupEventListeners() {
    document.getElementById('startBtn').addEventListener('click', () => this.startNewGrowth());
    document.getElementById('continueBtn').addEventListener('click', () => this.continueGrowth());
    document.getElementById('waterBtn').addEventListener('click', () => this.water());
    document.getElementById('fertilizeBtn').addEventListener('click', () => this.fertilize());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
    document.getElementById('statsBtn').addEventListener('click', () => this.showStats());
    document.getElementById('backBtn').addEventListener('click', () => this.hideStats());
  }

  async init() {
    try {
      const character = await api.get('/character');

      if (character) {
        document.getElementById('continueBtn').style.display = 'flex';
      }
    } catch (error) {
      console.error('初期化エラー:', error);
    }
  }

  async startNewGrowth() {
    try {
      this.character = await api.post('/character', {
        species: 'dyckia_green',
        nickname: 'ディッキアちゃん'
      });
      this.showGameScreen();
    } catch (error) {
      this.showToast('エラー: ' + error.message);
    }
  }

  async continueGrowth() {
    try {
      this.character = await api.get('/character');
      if (this.character) {
        this.showGameScreen();
      }
    } catch (error) {
      this.showToast('エラー: ' + error.message);
    }
  }

  showGameScreen() {
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'flex';
    document.getElementById('statsScreen').style.display = 'none';

    this.updateUI();
    this.startDecayTimer();
    this.gameLoop();
  }

  showStats() {
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('statsScreen').style.display = 'flex';
    this.loadStats();
  }

  hideStats() {
    document.getElementById('statsScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'flex';
  }

  async loadStats() {
    if (!this.character) return;

    const plantedDate = new Date(this.character.planted_at);
    const days = Math.floor((Date.now() - plantedDate.getTime()) / (1000 * 60 * 60 * 24));

    document.getElementById('statDays').textContent = `${days}日`;
    document.getElementById('statWater').textContent = `${this.character.total_water_count}回`;
    document.getElementById('statFertilize').textContent = `${this.character.total_fertilize_count}回`;
    document.getElementById('statStage').textContent = CONFIG.STAGE_NAMES[this.character.growth_stage];

    try {
      const logs = await api.get(`/logs/${this.character.id}`);
      const logList = document.getElementById('logList');

      if (logs.length === 0) {
        logList.innerHTML = '<p class="log-empty">まだログがありません</p>';
      } else {
        logList.innerHTML = logs.map(log => {
          const date = new Date(log.timestamp).toLocaleString('ja-JP');
          let text = '';
          if (log.action_type === 'water') text = '💧 水やり';
          else if (log.action_type === 'fertilize') text = '🌾 肥料やり';
          else if (log.action_type === 'evolve') {
            text = `🌟 進化: ${CONFIG.STAGE_NAMES[log.before_stage]} → ${CONFIG.STAGE_NAMES[log.after_stage]}`;
          }
          return `<div class="log-item"><span>${text}</span><span>${date}</span></div>`;
        }).join('');
      }
    } catch (error) {
      console.error('ログ読み込みエラー:', error);
    }
  }

  async water() {
    try {
      const response = await api.patch(`/character/${this.character.id}/water`);
      this.character = response.character;
      this.updateUI();
      this.createParticles(this.canvas.width / 2, this.canvas.height / 2, 'water');

      if (response.evolved) {
        this.showToast(`🌟 ${CONFIG.STAGE_NAMES[this.character.growth_stage]}に進化！`);
      } else {
        this.showToast('💧 水やり完了！');
      }
    } catch (error) {
      if (error.error) {
        this.showToast(error.error);
      }
    }
  }

  async fertilize() {
    try {
      const response = await api.patch(`/character/${this.character.id}/fertilize`);
      this.character = response.character;
      this.updateUI();
      this.createParticles(this.canvas.width / 2, this.canvas.height / 2, 'fertilize');

      if (response.evolved) {
        this.showToast(`🌟 ${CONFIG.STAGE_NAMES[this.character.growth_stage]}に進化！`);
      } else {
        this.showToast('🌾 肥料やり完了！');
      }
    } catch (error) {
      if (error.error) {
        this.showToast(error.error);
      }
    }
  }

  async reset() {
    if (!confirm('本当にリセットしますか？育成データが削除されます。')) return;

    try {
      await api.delete(`/character/${this.character.id}`);
      this.character = null;
      this.stopDecayTimer();
      document.getElementById('gameScreen').style.display = 'none';
      document.getElementById('startScreen').style.display = 'flex';
      this.showToast('リセット完了');
    } catch (error) {
      this.showToast('エラー: ' + error.message);
    }
  }

  updateUI() {
    if (!this.character) return;

    document.getElementById('characterName').textContent = this.character.nickname;
    document.getElementById('waterValue').textContent = this.character.water_level;
    document.getElementById('waterGauge').style.width = `${this.character.water_level}%`;
    document.getElementById('nutritionValue').textContent = this.character.nutrition_level;
    document.getElementById('nutritionGauge').style.width = `${this.character.nutrition_level}%`;
    document.getElementById('stageDisplay').textContent =
      `${CONFIG.STAGE_NAMES[this.character.growth_stage]} (${this.character.growth_stage}/4)`;

    // クールダウン表示
    this.updateCooldowns();
  }

  updateCooldowns() {
    const waterBtn = document.getElementById('waterBtn');
    const fertilizeBtn = document.getElementById('fertilizeBtn');
    const waterCooldown = document.getElementById('waterCooldown');
    const fertilizeCooldown = document.getElementById('fertilizeCooldown');

    // 水やりクールダウン
    if (this.character.last_watered) {
      const lastWatered = new Date(this.character.last_watered).getTime();
      const cooldownEnd = lastWatered + CONFIG.WATER_COOLDOWN_MS;
      const remaining = cooldownEnd - Date.now();

      if (remaining > 0) {
        waterBtn.disabled = true;
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        waterCooldown.textContent = `(${hours}h ${minutes}m)`;
      } else {
        waterBtn.disabled = false;
        waterCooldown.textContent = '';
      }
    } else {
      waterBtn.disabled = false;
      waterCooldown.textContent = '';
    }

    // 肥料クールダウン
    if (this.character.last_fertilized) {
      const lastFertilized = new Date(this.character.last_fertilized).getTime();
      const cooldownEnd = lastFertilized + CONFIG.FERTILIZE_COOLDOWN_MS;
      const remaining = cooldownEnd - Date.now();

      if (remaining > 0) {
        fertilizeBtn.disabled = true;
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        fertilizeCooldown.textContent = `(${hours}h)`;
      } else {
        fertilizeBtn.disabled = false;
        fertilizeCooldown.textContent = '';
      }
    } else {
      fertilizeBtn.disabled = false;
      fertilizeCooldown.textContent = '';
    }
  }

  startDecayTimer() {
    // デバッグ用: 10秒ごとに減衰（本番は1時間）
    const debugMode = false;
    const interval = debugMode ? 10 * 1000 : CONFIG.DECAY_INTERVAL_MS;

    this.decayTimer = setInterval(() => {
      if (this.character) {
        // 自動減衰はAPIではなくフロントエンドで表示
        // 実際の値はバックエンドで管理すべきですが、簡略化のため省略
      }
    }, interval);
  }

  stopDecayTimer() {
    if (this.decayTimer) {
      clearInterval(this.decayTimer);
      this.decayTimer = null;
    }
  }

  createParticles(x, y, type) {
    const count = type === 'water' ? CONFIG.PARTICLE_COUNT_WATER : CONFIG.PARTICLE_COUNT_FERTILIZE;
    const colorRange = type === 'water' ? [200, 240] : [40, 60]; // HSL Hue

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 2 + Math.random() * 3;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        color: `hsl(${colorRange[0] + Math.random() * (colorRange[1] - colorRange[0])}, 100%, 50%)`
      });
    }
  }

  draw() {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    // 背景グラデーション
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1a4d1a');
    gradient.addColorStop(1, '#0d260d');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // ディッキア描画
    if (this.character && this.dyckiaImage.complete) {
      const size = CONFIG.DYCKIA_SIZE_BY_STAGE[this.character.growth_stage];
      const x = width / 2 - size / 2;
      const y = height / 2 - size / 2 - 100;

      ctx.save();
      ctx.drawImage(this.dyckiaImage, x, y, size, size);
      ctx.restore();
    }

    // パーティクル描画
    this.particles.forEach((p, index) => {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // パーティクル更新
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;

      if (p.life <= 0) {
        this.particles.splice(index, 1);
      }
    });
  }

  gameLoop() {
    this.draw();
    requestAnimationFrame(() => this.gameLoop());
  }

  showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 2000);
  }
}

// ===== Initialize =====
const game = new DyckiaGrowth();
game.init();
