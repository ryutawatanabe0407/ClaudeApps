// 要素の取得
const gradientPreview = document.getElementById('gradientPreview');
const color1Input = document.getElementById('color1');
const color2Input = document.getElementById('color2');
const color1Text = document.getElementById('color1Text');
const color2Text = document.getElementById('color2Text');
const angleInput = document.getElementById('angle');
const angleValue = document.getElementById('angleValue');
const cssCode = document.getElementById('cssCode');
const copyBtn = document.getElementById('copyBtn');
const copyStatus = document.getElementById('copyStatus');
const directionBtns = document.querySelectorAll('.direction-btn');
const presetBtns = document.querySelectorAll('.preset-btn');

// 現在の設定
let currentDirection = 'to right';
let currentAngle = 90;
let useAngle = false;

// グラデーションを更新
function updateGradient() {
    const color1 = color1Input.value;
    const color2 = color2Input.value;

    let gradient;
    if (useAngle) {
        gradient = `linear-gradient(${currentAngle}deg, ${color1}, ${color2})`;
    } else {
        gradient = `linear-gradient(${currentDirection}, ${color1}, ${color2})`;
    }

    gradientPreview.style.background = gradient;
    cssCode.textContent = `background: ${gradient};`;

    // テキスト入力を更新
    color1Text.value = color1;
    color2Text.value = color2;
}

// カラーピッカーのイベントリスナー
color1Input.addEventListener('input', updateGradient);
color2Input.addEventListener('input', updateGradient);

// テキスト入力のイベントリスナー
color1Text.addEventListener('input', (e) => {
    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
        color1Input.value = e.target.value;
        updateGradient();
    }
});

color2Text.addEventListener('input', (e) => {
    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
        color2Input.value = e.target.value;
        updateGradient();
    }
});

// 角度スライダーのイベントリスナー
angleInput.addEventListener('input', (e) => {
    currentAngle = e.target.value;
    angleValue.textContent = currentAngle;
    useAngle = true;

    // 方向ボタンの選択を解除
    directionBtns.forEach(btn => btn.classList.remove('active'));

    updateGradient();
});

// 方向ボタンのイベントリスナー
directionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        directionBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        currentDirection = btn.dataset.direction;
        useAngle = false;

        updateGradient();
    });
});

// コピーボタンのイベントリスナー
copyBtn.addEventListener('click', copyToClipboard);

// CSSコードをクリックしてコピー
cssCode.addEventListener('click', copyToClipboard);

function copyToClipboard() {
    const textToCopy = cssCode.textContent;

    navigator.clipboard.writeText(textToCopy).then(() => {
        copyStatus.textContent = '✓ コピーしました！';

        setTimeout(() => {
            copyStatus.textContent = '';
        }, 2000);
    }).catch(err => {
        console.error('コピーに失敗しました:', err);
        copyStatus.textContent = '✗ コピーに失敗しました';
    });
}

// プリセットボタンのイベントリスナー
presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        color1Input.value = btn.dataset.color1;
        color2Input.value = btn.dataset.color2;
        updateGradient();

        // アニメーション効果
        gradientPreview.style.transform = 'scale(0.98)';
        setTimeout(() => {
            gradientPreview.style.transform = 'scale(1)';
        }, 100);
    });
});

// ランダムグラデーション生成（Rキーで実行）
document.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') {
        const randomColor1 = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
        const randomColor2 = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');

        color1Input.value = randomColor1;
        color2Input.value = randomColor2;
        updateGradient();

        // アニメーション効果
        gradientPreview.style.transform = 'rotate(0.5deg)';
        setTimeout(() => {
            gradientPreview.style.transform = 'rotate(0deg)';
        }, 100);
    }
});

// 初期化
updateGradient();

// ページロード時のウェルカムアニメーション
window.addEventListener('load', () => {
    console.log('🎨 グラデーションジェネレーターへようこそ！');
    console.log('💡 ヒント: "R"キーを押すとランダムなグラデーションが生成されます');
});
