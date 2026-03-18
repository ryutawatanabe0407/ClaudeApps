// ゲーム設定
const CONFIG = {
    GAME_TIME: 60, // 60秒
    MAX_AMMO: 30,
    RELOAD_TIME: 2000, // 2秒
    TARGET_SIZE: 80,
    TARGET_SPAWN_INTERVAL: 1500, // 1.5秒
    TARGET_LIFETIME: 2500, // ターゲットが表示される時間（2.5秒）
    COMBO_TIMEOUT: 1000, // コンボ継続時間（1秒）
    HIT_SCORE: 100,
    COMBO_MULTIPLIER: 1.5
};

// 敵の種類定義
const ENEMY_TYPES = {
    DYCKIA_GREEN: {
        name: 'dyckia_green',
        image: 'assets/dyckia.svg',
        size: 80,
        score: 100,
        lifetime: 2500,
        weight: 15  // 出現確率の重み
    },
    DYCKIA_RED: {
        name: 'dyckia_red',
        image: 'assets/dyckia2.svg',
        size: 80,
        score: 100,
        lifetime: 2500,
        weight: 15
    },
    DYCKIA_BLUE: {
        name: 'dyckia_blue',
        image: 'assets/dyckia3.svg',
        size: 80,
        score: 100,
        lifetime: 2500,
        weight: 15
    },
    DYCKIA_YELLOW: {
        name: 'dyckia_yellow',
        image: 'assets/dyckia4.svg',
        size: 80,
        score: 100,
        lifetime: 2500,
        weight: 15
    },
    DYCKIA_PURPLE: {
        name: 'dyckia_purple',
        image: 'assets/dyckia5.svg',
        size: 80,
        score: 100,
        lifetime: 2500,
        weight: 15
    },
    SUNFLOWER: {
        name: 'sunflower',
        image: 'assets/sunflower.svg',
        size: 100,  // 大きめ
        score: 200,  // 高得点
        lifetime: 3000,  // 長めに表示
        weight: 10
    },
    CACTUS: {
        name: 'cactus',
        image: 'assets/cactus.svg',
        size: 70,  // 小さめ
        score: 150,
        lifetime: 2000,  // 素早く消える
        weight: 15
    },
    SUCCULENT: {
        name: 'succulent',
        image: 'assets/succulent.svg',
        size: 85,
        score: 120,
        lifetime: 2500,
        weight: 15
    }
};

// ゲーム状態
const GAME_STATE = {
    START: 'start',
    PLAYING: 'playing',
    GAME_OVER: 'gameOver'
};

// ディッキアFPSゲームクラス
class DyckiaFPS {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.state = GAME_STATE.START;
        this.score = 0;
        this.timeLeft = CONFIG.GAME_TIME;
        this.ammo = CONFIG.MAX_AMMO;
        this.maxAmmo = CONFIG.MAX_AMMO;
        this.isReloading = false;
        this.highScore = parseInt(localStorage.getItem('dyckiaFPSHighScore')) || 0;

        this.hitCount = 0;
        this.shotsFired = 0;
        this.currentCombo = 0;
        this.maxCombo = 0;
        this.lastHitTime = 0;

        this.targets = [];
        this.particles = [];

        // 敵画像の読み込み
        this.enemyImages = {};
        Object.keys(ENEMY_TYPES).forEach(key => {
            const enemyType = ENEMY_TYPES[key];
            const img = new Image();
            img.src = enemyType.image;
            img.onerror = () => {
                console.error(`Failed to load enemy image: ${enemyType.image}`);
            };
            this.enemyImages[enemyType.name] = img;
        });

        this.setupCanvas();
        this.setupEventListeners();
        this.updateHighScoreDisplay();

        this.lastSpawnTime = 0;
        this.gameTimer = null;
    }

    setupCanvas() {
        const resizeCanvas = () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    setupEventListeners() {
        // スタートボタン
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startGame();
        });

        // リスタートボタン
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.startGame();
        });

        // メニューボタン
        document.getElementById('menuBtn').addEventListener('click', () => {
            this.showStartScreen();
        });

        // 射撃（クリック）
        this.canvas.addEventListener('click', (e) => {
            if (this.state === GAME_STATE.PLAYING && !this.isReloading) {
                this.shoot(e.clientX, e.clientY);
            }
        });

        // キーボード操作
        document.addEventListener('keydown', (e) => {
            // リロード（Rキー）
            if (e.key === 'r' || e.key === 'R') {
                if (this.state === GAME_STATE.PLAYING && !this.isReloading && this.ammo < this.maxAmmo) {
                    this.reload();
                }
            }

            // スペースキーでマウス位置に射撃（PC向け）
            if (e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                if (this.state === GAME_STATE.PLAYING && !this.isReloading) {
                    // マウス位置で射撃、未設定なら画面中央
                    const x = this.mouseX !== undefined ? this.mouseX : this.canvas.width / 2;
                    const y = this.mouseY !== undefined ? this.mouseY : this.canvas.height / 2;
                    this.shoot(x, y);
                }
            }

            // ESCキーでメニューに戻る
            if (e.key === 'Escape') {
                if (this.state === GAME_STATE.PLAYING) {
                    this.gameOver();
                } else if (this.state === GAME_STATE.GAME_OVER) {
                    this.showStartScreen();
                }
            }
        });

        // マウス移動でクロスヘアを更新（PC向け）
        document.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
            this.updateCrosshair(e.clientX, e.clientY);
        });

        // クロスヘアの初期化
        this.crosshair = document.querySelector('.crosshair');
    }

    startGame() {
        this.state = GAME_STATE.PLAYING;
        this.score = 0;
        this.timeLeft = CONFIG.GAME_TIME;
        this.ammo = CONFIG.MAX_AMMO;
        this.isReloading = false;
        this.hitCount = 0;
        this.shotsFired = 0;
        this.currentCombo = 0;
        this.maxCombo = 0;
        this.lastHitTime = 0;
        this.targets = [];
        this.particles = [];
        this.lastSpawnTime = Date.now();

        document.getElementById('startScreen').style.display = 'none';
        document.getElementById('gameOverScreen').style.display = 'none';
        const gameScreen = document.getElementById('gameScreen');
        gameScreen.style.display = 'block';
        gameScreen.classList.add('playing');

        this.updateUI();

        // タイマー開始
        this.gameTimer = setInterval(() => {
            this.timeLeft--;
            if (this.timeLeft <= 0) {
                this.gameOver();
            }
            this.updateUI();
        }, 1000);

        // ゲームループ開始
        this.gameLoop();
    }

    gameLoop() {
        if (this.state !== GAME_STATE.PLAYING) {
            return;
        }

        const now = Date.now();

        // ターゲット（ディッキア）のスポーン
        if (now - this.lastSpawnTime > CONFIG.TARGET_SPAWN_INTERVAL) {
            this.spawnTarget();
            this.lastSpawnTime = now;
        }

        // コンボタイムアウト
        if (now - this.lastHitTime > CONFIG.COMBO_TIMEOUT && this.currentCombo > 0) {
            this.currentCombo = 0;
            document.getElementById('comboDisplay').style.display = 'none';
        }

        // 描画
        this.draw();

        // 次のフレーム
        requestAnimationFrame(() => this.gameLoop());
    }

    spawnTarget() {
        // 重み付きランダムで敵タイプを選択
        const enemyType = this.getRandomEnemyType();
        const margin = enemyType.size;

        const target = {
            x: margin + Math.random() * (this.canvas.width - margin * 2),
            y: margin + Math.random() * (this.canvas.height - margin * 2),
            size: enemyType.size,
            spawnTime: Date.now(),
            scale: 0, // アニメーション用
            enemyType: enemyType
        };
        this.targets.push(target);
    }

    getRandomEnemyType() {
        // 全ての重みの合計を計算
        const totalWeight = Object.values(ENEMY_TYPES).reduce((sum, type) => sum + type.weight, 0);
        let random = Math.random() * totalWeight;

        // 重み付きランダム選択
        for (const key in ENEMY_TYPES) {
            const enemyType = ENEMY_TYPES[key];
            random -= enemyType.weight;
            if (random <= 0) {
                return enemyType;
            }
        }

        // フォールバック
        return ENEMY_TYPES.DYCKIA_GREEN;
    }

    shoot(x, y) {
        if (this.ammo <= 0) {
            // 弾切れ時、自動リロード開始
            if (!this.isReloading) {
                this.reload();
            }
            return;
        }

        this.ammo--;
        this.shotsFired++;
        this.updateUI();

        // ヒット判定
        let hit = false;
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const target = this.targets[i];
            const distance = Math.sqrt(
                Math.pow(x - target.x, 2) +
                Math.pow(y - target.y, 2)
            );

            if (distance < target.size / 2) {
                // ヒット！
                hit = true;
                this.onHit(target);
                this.targets.splice(i, 1);
                break;
            }
        }

        if (!hit) {
            // ミス
            this.currentCombo = 0;
            document.getElementById('comboDisplay').style.display = 'none';
        }
    }

    onHit(target) {
        this.hitCount++;
        this.currentCombo++;
        this.lastHitTime = Date.now();

        if (this.currentCombo > this.maxCombo) {
            this.maxCombo = this.currentCombo;
        }

        // スコア計算（敵タイプに応じた基礎得点）
        let points = target.enemyType.score;
        if (this.currentCombo > 1) {
            points = Math.floor(points * (1 + (this.currentCombo - 1) * CONFIG.COMBO_MULTIPLIER));
        }
        this.score += points;

        // UI更新
        this.updateUI();

        // コンボ表示
        if (this.currentCombo > 1) {
            document.getElementById('comboDisplay').style.display = 'flex';
            document.getElementById('comboValue').textContent = this.currentCombo;
        }

        // ヒットマーカー表示
        this.showHitMarker();

        // パーティクル生成
        this.createParticles(target.x, target.y);
    }

    showHitMarker() {
        const hitMarker = document.getElementById('hitMarker');
        hitMarker.style.display = 'block';
        setTimeout(() => {
            hitMarker.style.display = 'none';
        }, 200);
    }

    createParticles(x, y) {
        const particleCount = 20;
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 2 + Math.random() * 3;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: 0.02,
                size: 3 + Math.random() * 3,
                color: `hsl(${120 + Math.random() * 60}, 100%, 50%)`
            });
        }
    }

    reload() {
        this.isReloading = true;
        document.getElementById('reloadDisplay').style.display = 'block';

        setTimeout(() => {
            this.ammo = this.maxAmmo;
            this.isReloading = false;
            document.getElementById('reloadDisplay').style.display = 'none';
            this.updateUI();
        }, CONFIG.RELOAD_TIME);
    }

    draw() {
        // 背景（グラデーション）
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#0a3d0a');
        gradient.addColorStop(1, '#001a00');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // グリッド（FPS風）
        this.drawGrid();

        // ターゲット（敵）を描画
        const now = Date.now();
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const target = this.targets[i];
            const elapsed = now - target.spawnTime;

            // アニメーション（出現）
            if (target.scale < 1) {
                target.scale = Math.min(1, elapsed / 200);
            }

            // タイムアウトチェック（敵タイプのライフタイムを使用）
            if (elapsed > target.enemyType.lifetime) {
                this.targets.splice(i, 1);
                continue;
            }

            // 点滅エフェクト（タイムアウト前）
            const timeLeft = target.enemyType.lifetime - elapsed;
            if (timeLeft < 500) {
                if (Math.floor(elapsed / 100) % 2 === 0) {
                    continue; // 点滅
                }
            }

            this.drawTarget(target);
        }

        // パーティクルを描画
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1;
    }

    drawGrid() {
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.1)';
        this.ctx.lineWidth = 1;

        const gridSize = 50;

        // 縦線
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        // 横線
        for (let y = 0; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    drawTarget(target) {
        this.ctx.save();
        this.ctx.translate(target.x, target.y);
        this.ctx.scale(target.scale, target.scale);

        // 影
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 10, target.size * 0.4, target.size * 0.15, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // 敵画像
        const enemyImage = this.enemyImages[target.enemyType.name];
        if (enemyImage && enemyImage.complete) {
            this.ctx.drawImage(
                enemyImage,
                -target.size / 2,
                -target.size / 2,
                target.size,
                target.size
            );
        } else {
            // フォールバック（円）
            this.ctx.fillStyle = '#4CAF50';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, target.size / 2, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '30px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('🌵', 0, 0);
        }

        // ターゲット枠（敵タイプに応じて色を変える）
        let targetColor = '#ff0000';  // 通常は赤
        if (target.enemyType.score >= 200) {
            targetColor = '#ffd700';  // 高得点は金色
        } else if (target.enemyType.score >= 150) {
            targetColor = '#ff8c00';  // 中得点はオレンジ
        }

        this.ctx.strokeStyle = targetColor;
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.arc(0, 0, target.size / 2 + 5, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        this.ctx.restore();
    }

    updateUI() {
        document.getElementById('scoreDisplay').textContent = this.score;
        document.getElementById('timeDisplay').textContent = this.timeLeft;
        document.getElementById('ammoDisplay').textContent = `${this.ammo}/${this.maxAmmo}`;
    }

    updateHighScoreDisplay() {
        document.getElementById('highScoreDisplay').textContent = this.highScore;
    }

    gameOver() {
        this.state = GAME_STATE.GAME_OVER;
        clearInterval(this.gameTimer);
        document.getElementById('gameScreen').classList.remove('playing');

        // ハイスコア更新
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('dyckiaFPSHighScore', this.highScore);
            document.getElementById('newHighScoreArea').style.display = 'block';
        } else {
            document.getElementById('newHighScoreArea').style.display = 'none';
        }

        // 命中率計算
        const accuracy = this.shotsFired > 0
            ? Math.round((this.hitCount / this.shotsFired) * 100)
            : 0;

        // 統計表示
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('hitCount').textContent = this.hitCount;
        document.getElementById('maxCombo').textContent = this.maxCombo;
        document.getElementById('accuracy').textContent = `${accuracy}%`;

        // 画面切り替え
        document.getElementById('gameScreen').style.display = 'none';
        document.getElementById('gameOverScreen').style.display = 'flex';
    }

    showStartScreen() {
        this.state = GAME_STATE.START;
        document.getElementById('gameOverScreen').style.display = 'none';
        const gameScreen = document.getElementById('gameScreen');
        gameScreen.style.display = 'none';
        gameScreen.classList.remove('playing');
        document.getElementById('startScreen').style.display = 'flex';
        this.updateHighScoreDisplay();
    }

    updateCrosshair(x, y) {
        if (this.crosshair) {
            // 左上を基準にして直接位置を設定
            this.crosshair.style.left = `${x}px`;
            this.crosshair.style.top = `${y}px`;
        }
    }
}

// ゲーム初期化
window.addEventListener('DOMContentLoaded', () => {
    const game = new DyckiaFPS();
});
