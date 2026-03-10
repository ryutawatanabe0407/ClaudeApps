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

// ディッキア画像のパス（複数種類）
const DYCKIA_IMAGE_PATHS = [
    'assets/dyckia.svg',   // 緑
    'assets/dyckia2.svg',  // 赤
    'assets/dyckia3.svg',  // 青
    'assets/dyckia4.svg',  // 黄
    'assets/dyckia5.svg'   // 紫
];

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

        // ディッキア画像の読み込み（複数種類）
        this.dyckiaImages = [];
        DYCKIA_IMAGE_PATHS.forEach((path, index) => {
            const img = new Image();
            img.src = path;
            img.onerror = () => {
                console.error(`Failed to load dyckia image: ${path}`);
            };
            this.dyckiaImages.push(img);
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

            // スペースキーで画面中央に射撃（PC向け）
            if (e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                if (this.state === GAME_STATE.PLAYING && !this.isReloading) {
                    this.shoot(this.canvas.width / 2, this.canvas.height / 2);
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
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.state === GAME_STATE.PLAYING) {
                // クロスヘアの位置を更新（必要に応じて）
                this.mouseX = e.clientX;
                this.mouseY = e.clientY;
            }
        });
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
        document.getElementById('gameScreen').style.display = 'block';

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
        const margin = CONFIG.TARGET_SIZE;
        const target = {
            x: margin + Math.random() * (this.canvas.width - margin * 2),
            y: margin + Math.random() * (this.canvas.height - margin * 2),
            size: CONFIG.TARGET_SIZE,
            spawnTime: Date.now(),
            scale: 0, // アニメーション用
            imageIndex: Math.floor(Math.random() * this.dyckiaImages.length) // ランダムな画像を選択
        };
        this.targets.push(target);
    }

    shoot(x, y) {
        if (this.ammo <= 0) {
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

        // スコア計算
        let points = CONFIG.HIT_SCORE;
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

        // ターゲット（ディッキア）を描画
        const now = Date.now();
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const target = this.targets[i];
            const elapsed = now - target.spawnTime;

            // アニメーション（出現）
            if (target.scale < 1) {
                target.scale = Math.min(1, elapsed / 200);
            }

            // タイムアウトチェック
            if (elapsed > CONFIG.TARGET_LIFETIME) {
                this.targets.splice(i, 1);
                continue;
            }

            // 点滅エフェクト（タイムアウト前）
            const timeLeft = CONFIG.TARGET_LIFETIME - elapsed;
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

        // ディッキア画像（ランダムな種類）
        const dyckiaImage = this.dyckiaImages[target.imageIndex];
        if (dyckiaImage && dyckiaImage.complete) {
            this.ctx.drawImage(
                dyckiaImage,
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

        // ターゲット枠（赤）
        this.ctx.strokeStyle = '#ff0000';
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
        document.getElementById('gameScreen').style.display = 'none';
        document.getElementById('startScreen').style.display = 'flex';
        this.updateHighScoreDisplay();
    }
}

// ゲーム初期化
window.addEventListener('DOMContentLoaded', () => {
    const game = new DyckiaFPS();
});
