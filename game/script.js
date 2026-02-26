// ゲーム設定
const CONFIG = {
    BASKET_WIDTH: 80,
    BASKET_HEIGHT: 60,
    PLANT_SIZE: 50,
    BOMB_SIZE: 35,
    INITIAL_FALL_SPEED: 2,
    SPEED_INCREASE_RATE: 0.0005,
    SPAWN_RATE: 60,
    BOMB_RATE: 0.15,
    INITIAL_LIVES: 3,
    COMBO_BONUS: 5
};

// ディッキア画像のパス
const DYCKIA_IMAGE_PATH = 'assets/dyckia.svg';

// ゲーム状態
const GAME_STATE = {
    START: 'start',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameOver'
};

// ゲームクラス
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.state = GAME_STATE.START;
        this.score = 0;
        this.lives = CONFIG.INITIAL_LIVES;
        this.highScore = parseInt(localStorage.getItem('fruitCatchHighScore')) || 0;
        this.frameCount = 0;
        this.catchCount = 0;
        this.maxCombo = 0;
        this.currentCombo = 0;

        this.basket = {
            x: 0,
            y: 0,
            width: CONFIG.BASKET_WIDTH,
            height: CONFIG.BASKET_HEIGHT
        };

        this.fallingObjects = [];
        this.particles = [];

        this.touchX = null;
        this.mouseX = null;

        // ディッキア画像をロード
        this.dyckiaImage = new Image();
        this.dyckiaImage.src = DYCKIA_IMAGE_PATH;
        this.imageLoaded = false;
        this.dyckiaImage.onload = () => {
            this.imageLoaded = true;
        };
        this.dyckiaImage.onerror = () => {
            console.log('画像の読み込みに失敗しました。絵文字を使用します。');
            this.imageLoaded = false;
        };

        this.setupCanvas();
        this.setupEventListeners();
        this.showScreen('startScreen');
        this.updateHighScoreDisplay();
    }

    setupCanvas() {
        const resizeCanvas = () => {
            const rect = this.canvas.getBoundingClientRect();
            // iPhoneに最適化：固定の高さと幅の比率を使用
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
            this.basket.y = this.canvas.height - CONFIG.BASKET_HEIGHT - 10;
            this.basket.x = this.canvas.width / 2 - CONFIG.BASKET_WIDTH / 2;
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    setupEventListeners() {
        // スタートボタン
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startGame();
        });

        // ポーズボタン
        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.pauseGame();
        });

        // 再開ボタン
        document.getElementById('resumeBtn').addEventListener('click', () => {
            this.resumeGame();
        });

        // リスタートボタン
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.startGame();
        });

        // メニューボタン
        document.getElementById('menuBtn').addEventListener('click', () => {
            this.showScreen('startScreen');
        });

        document.getElementById('menuBtnPause').addEventListener('click', () => {
            this.state = GAME_STATE.START;
            this.showScreen('startScreen');
        });

        // タッチ操作
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.state === GAME_STATE.PLAYING) {
                this.touchX = e.touches[0].clientX;
            }
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.state === GAME_STATE.PLAYING && e.touches[0]) {
                this.touchX = e.touches[0].clientX;
                this.updateBasketPosition(this.touchX);
            }
        });

        this.canvas.addEventListener('touchend', () => {
            this.touchX = null;
        });

        // マウス操作
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.state === GAME_STATE.PLAYING) {
                const rect = this.canvas.getBoundingClientRect();
                this.mouseX = e.clientX - rect.left;
                this.updateBasketPosition(e.clientX);
            }
        });
    }

    updateBasketPosition(clientX) {
        const rect = this.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        this.basket.x = Math.max(0, Math.min(x - CONFIG.BASKET_WIDTH / 2,
                                             this.canvas.width - CONFIG.BASKET_WIDTH));
    }

    showScreen(screenId) {
        const screens = ['startScreen', 'gameScreen', 'gameOverScreen', 'pauseScreen'];
        screens.forEach(id => {
            document.getElementById(id).style.display = 'none';
        });
        document.getElementById(screenId).style.display = 'flex';
    }

    startGame() {
        this.state = GAME_STATE.PLAYING;
        this.score = 0;
        this.lives = CONFIG.INITIAL_LIVES;
        this.frameCount = 0;
        this.catchCount = 0;
        this.currentCombo = 0;
        this.fallingObjects = [];
        this.particles = [];

        this.basket.x = this.canvas.width / 2 - CONFIG.BASKET_WIDTH / 2;

        this.showScreen('gameScreen');
        this.updateUI();
        this.gameLoop();
    }

    pauseGame() {
        if (this.state === GAME_STATE.PLAYING) {
            this.state = GAME_STATE.PAUSED;
            this.showScreen('pauseScreen');
        }
    }

    resumeGame() {
        if (this.state === GAME_STATE.PAUSED) {
            this.state = GAME_STATE.PLAYING;
            document.getElementById('pauseScreen').style.display = 'none';
            this.gameLoop();
        }
    }

    gameOver() {
        this.state = GAME_STATE.GAME_OVER;

        // ハイスコア更新
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('fruitCatchHighScore', this.highScore);
            document.getElementById('newHighScoreArea').style.display = 'block';
        } else {
            document.getElementById('newHighScoreArea').style.display = 'none';
        }

        // 統計表示
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('catchCount').textContent = this.catchCount;
        document.getElementById('maxCombo').textContent = this.maxCombo;

        this.showScreen('gameOverScreen');
        this.updateHighScoreDisplay();
    }

    updateHighScoreDisplay() {
        document.getElementById('highScoreDisplay').textContent = this.highScore;
    }

    updateUI() {
        document.getElementById('scoreDisplay').textContent = this.score;
        document.getElementById('livesDisplay').textContent = this.lives;
    }

    spawnFallingObject() {
        const isBomb = Math.random() < CONFIG.BOMB_RATE;
        const size = isBomb ? CONFIG.BOMB_SIZE : CONFIG.PLANT_SIZE;

        const obj = {
            x: Math.random() * (this.canvas.width - size),
            y: -size,
            size: size,
            speed: CONFIG.INITIAL_FALL_SPEED + (this.frameCount * CONFIG.SPEED_INCREASE_RATE),
            type: isBomb ? 'bomb' : 'plant',
            useImage: !isBomb && this.imageLoaded
        };

        console.log('✨ Created object:', obj.type, 'at x:', obj.x, 'y:', obj.y, 'speed:', obj.speed);
        this.fallingObjects.push(obj);
    }

    createParticles(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 30,
                color: color
            });
        }
    }

    checkCollision(obj) {
        return obj.x < this.basket.x + this.basket.width &&
               obj.x + obj.size > this.basket.x &&
               obj.y < this.basket.y + this.basket.height &&
               obj.y + obj.size > this.basket.y;
    }

    update() {
        if (this.state !== GAME_STATE.PLAYING) return;

        this.frameCount++;

        // オブジェクト生成
        if (this.frameCount % CONFIG.SPAWN_RATE === 1) {
            console.log('🌵 Spawning object at frame:', this.frameCount);
            this.spawnFallingObject();
            console.log('📦 Total falling objects:', this.fallingObjects.length);
        }

        // オブジェクト更新
        for (let i = this.fallingObjects.length - 1; i >= 0; i--) {
            const obj = this.fallingObjects[i];
            obj.y += obj.speed;

            // 衝突判定
            if (this.checkCollision(obj)) {
                if (obj.type === 'plant') {
                    this.currentCombo++;
                    const comboBonus = this.currentCombo > 1 ?
                                      (this.currentCombo - 1) * CONFIG.COMBO_BONUS : 0;
                    this.score += 10 + comboBonus;
                    this.catchCount++;
                    this.maxCombo = Math.max(this.maxCombo, this.currentCombo);
                    this.createParticles(obj.x + obj.size / 2, obj.y + obj.size / 2,
                                       '#4CAF50', 15);
                } else {
                    this.lives--;
                    this.currentCombo = 0;
                    this.createParticles(obj.x + obj.size / 2, obj.y + obj.size / 2,
                                       '#f44336', 20);

                    if (this.lives <= 0) {
                        this.gameOver();
                        return;
                    }
                }
                this.fallingObjects.splice(i, 1);
                this.updateUI();
            }
            // 画面外に出たら削除
            else if (obj.y > this.canvas.height) {
                if (obj.type === 'plant') {
                    this.currentCombo = 0;
                }
                this.fallingObjects.splice(i, 1);
            }
        }

        // パーティクル更新
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw() {
        // 背景
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // グリッド背景
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < this.canvas.width; i += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(i, 0);
            this.ctx.lineTo(i, this.canvas.height);
            this.ctx.stroke();
        }
        for (let i = 0; i < this.canvas.height; i += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i);
            this.ctx.lineTo(this.canvas.width, i);
            this.ctx.stroke();
        }

        // バスケット
        this.ctx.fillStyle = '#FF6B6B';
        this.ctx.beginPath();
        this.ctx.moveTo(this.basket.x, this.basket.y + this.basket.height);
        this.ctx.lineTo(this.basket.x + 10, this.basket.y);
        this.ctx.lineTo(this.basket.x + this.basket.width - 10, this.basket.y);
        this.ctx.lineTo(this.basket.x + this.basket.width, this.basket.y + this.basket.height);
        this.ctx.closePath();
        this.ctx.fill();

        // バスケットの縁
        this.ctx.strokeStyle = '#D63447';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        // バスケットのアイコン
        this.ctx.font = '30px Arial';
        this.ctx.fillText('🧺', this.basket.x + this.basket.width / 2 - 15,
                         this.basket.y + this.basket.height - 10);

        // 落ちてくるオブジェクト
        if (this.fallingObjects.length > 0 && this.frameCount % 60 === 0) {
            console.log('🎨 Drawing', this.fallingObjects.length, 'objects');
        }
        this.fallingObjects.forEach(obj => {
            if (obj.useImage && this.imageLoaded) {
                // ディッキア画像を描画
                this.ctx.drawImage(this.dyckiaImage, obj.x, obj.y, obj.size, obj.size);
            } else {
                // 爆弾は絵文字で描画
                this.ctx.font = `${obj.size}px Arial`;
                this.ctx.fillText(obj.type === 'bomb' ? '💣' : '🌵', obj.x, obj.y + obj.size);
            }
        });

        // パーティクル
        this.particles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life / 30;
            this.ctx.fillRect(p.x, p.y, 4, 4);
        });
        this.ctx.globalAlpha = 1;

        // コンボ表示
        if (this.currentCombo > 1) {
            this.ctx.font = 'bold 24px Arial';
            this.ctx.fillStyle = '#FF6B6B';
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 3;
            const comboText = `${this.currentCombo} コンボ!`;
            const textWidth = this.ctx.measureText(comboText).width;
            this.ctx.strokeText(comboText, this.canvas.width / 2 - textWidth / 2, 50);
            this.ctx.fillText(comboText, this.canvas.width / 2 - textWidth / 2, 50);
        }
    }

    gameLoop() {
        if (this.state === GAME_STATE.PLAYING) {
            this.update();
            this.draw();
            requestAnimationFrame(() => this.gameLoop());
        }
    }
}

// ゲーム開始
window.addEventListener('load', () => {
    new Game();
});
