// Super Kiro World - Main Game File
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayMessage = document.getElementById('overlayMessage');
const startBtn = document.getElementById('startBtn');

// Game constants
const GRAVITY = 0.5;
const JUMP_POWER = 12;
const MOVE_SPEED = 5;
const FRICTION = 0.8;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;

// Audio context for sound effects
let audioCtx = null;

function initAudio() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playSound(type) {
    if (!audioCtx) return;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    switch(type) {
        case 'jump':
            oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.1);
            break;
        case 'coin':
            oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.15);
            break;
        case 'death':
            oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.5);
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.5);
            break;
        case 'win':
            oscillator.frequency.setValueAtTime(523, audioCtx.currentTime);
            oscillator.frequency.setValueAtTime(659, audioCtx.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(784, audioCtx.currentTime + 0.2);
            oscillator.frequency.setValueAtTime(1047, audioCtx.currentTime + 0.3);
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.5);
            break;
        case 'stomp':
            oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.2);
            gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.2);
            break;
    }
}

// Game state
let gameState = 'menu'; // menu, playing, gameover, win, dying
let score = 0;
let lives = 10;
let camera = { x: 0, y: 0 };

// 死亡アニメーション用
let deathAnimation = {
    active: false,
    x: 0,
    y: 0,
    startY: 0,
    opacity: 1,
    timer: 0,
    haloAngle: 0
};

// Load Kiro sprite
const kiroSprite = new Image();
let spriteLoaded = false;
kiroSprite.onload = () => { spriteLoaded = true; };
kiroSprite.onerror = () => { spriteLoaded = false; };
kiroSprite.src = 'kiro-logo.png';


// Player object
const player = {
    x: 100,
    y: 300,
    width: 40,
    height: 40,
    vx: 0,
    vy: 0,
    onGround: false,
    facingRight: true,
    
    reset() {
        this.x = 100;
        this.y = 300;
        this.vx = 0;
        this.vy = 0;
        this.onGround = false;
    }
};

// Input handling
const keys = {
    left: false,
    right: false,
    up: false
};

document.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
    if ((e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') && player.onGround && gameState === 'playing') {
        player.vy = -JUMP_POWER;
        player.onGround = false;
        playSound('jump');
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') keys.up = false;
});

// Level data
const LEVEL_WIDTH = 3200;
const platforms = [
    // Ground platforms
    { x: 0, y: 450, width: 400, height: 50 },
    { x: 500, y: 450, width: 300, height: 50 },
    { x: 900, y: 450, width: 200, height: 50 },
    { x: 1200, y: 450, width: 400, height: 50 },
    { x: 1700, y: 450, width: 300, height: 50 },
    { x: 2100, y: 450, width: 200, height: 50 },
    { x: 2400, y: 450, width: 600, height: 50 },
    
    // Floating platforms
    { x: 200, y: 350, width: 100, height: 20 },
    { x: 400, y: 280, width: 100, height: 20 },
    { x: 650, y: 320, width: 120, height: 20 },
    { x: 850, y: 250, width: 100, height: 20 },
    { x: 1050, y: 350, width: 100, height: 20 },
    { x: 1300, y: 280, width: 150, height: 20 },
    { x: 1550, y: 350, width: 100, height: 20 },
    { x: 1750, y: 280, width: 100, height: 20 },
    { x: 1950, y: 200, width: 120, height: 20 },
    { x: 2200, y: 320, width: 100, height: 20 },
    { x: 2500, y: 250, width: 150, height: 20 },
    { x: 2750, y: 350, width: 100, height: 20 },
];

// Coins
let coins = [];
function initCoins() {
    coins = [
        { x: 220, y: 310, collected: false },
        { x: 420, y: 240, collected: false },
        { x: 550, y: 410, collected: false },
        { x: 670, y: 280, collected: false },
        { x: 870, y: 210, collected: false },
        { x: 950, y: 410, collected: false },
        { x: 1070, y: 310, collected: false },
        { x: 1350, y: 240, collected: false },
        { x: 1450, y: 410, collected: false },
        { x: 1570, y: 310, collected: false },
        { x: 1770, y: 240, collected: false },
        { x: 1850, y: 410, collected: false },
        { x: 1970, y: 160, collected: false },
        { x: 2150, y: 410, collected: false },
        { x: 2220, y: 280, collected: false },
        { x: 2550, y: 210, collected: false },
        { x: 2650, y: 410, collected: false },
        { x: 2770, y: 310, collected: false },
        { x: 2850, y: 410, collected: false },
    ];
}

// Goal flag
const flag = {
    x: 2950,
    y: 350,
    width: 40,
    height: 100
};

// 悪の大魔王ゴースト (Evil Ghost King)
let ghosts = [];
function initGhosts() {
    ghosts = [
        { x: 600, y: 400, width: 50, height: 50, vx: -1.5, alive: true, patrolLeft: 500, patrolRight: 750 },
        { x: 1000, y: 400, width: 50, height: 50, vx: 1.5, alive: true, patrolLeft: 900, patrolRight: 1100 },
        { x: 1400, y: 400, width: 50, height: 50, vx: -2, alive: true, patrolLeft: 1200, patrolRight: 1550 },
        { x: 1800, y: 400, width: 50, height: 50, vx: 1.5, alive: true, patrolLeft: 1700, patrolRight: 1950 },
        { x: 2500, y: 400, width: 50, height: 50, vx: -2, alive: true, patrolLeft: 2400, patrolRight: 2700 },
        // ボス - 1.5倍大きくて怖い！
        { x: 2800, y: 360, width: 80, height: 80, vx: -1.2, alive: true, patrolLeft: 2650, patrolRight: 2920, isBoss: true },
    ];
}

function updateGhosts() {
    for (const ghost of ghosts) {
        if (!ghost.alive) continue;
        
        // パトロール移動
        ghost.x += ghost.vx;
        
        // 方向転換
        if (ghost.x <= ghost.patrolLeft || ghost.x + ghost.width >= ghost.patrolRight) {
            ghost.vx *= -1;
        }
    }
}

function checkGhostCollisions() {
    for (const ghost of ghosts) {
        if (!ghost.alive) continue;
        
        const ghostRect = { x: ghost.x, y: ghost.y, width: ghost.width, height: ghost.height };
        
        if (rectCollision(player, ghostRect)) {
            // プレイヤーが上から落ちてきた場合（頭を踏む）
            const playerBottom = player.y + player.height;
            const ghostTop = ghost.y;
            const playerFalling = player.vy > 0;
            
            if (playerFalling && playerBottom <= ghostTop + 20) {
                // ゴーストを倒す！
                ghost.alive = false;
                player.vy = -8; // バウンス
                score += ghost.isBoss ? 500 : 200;
                playSound('stomp');
                updateUI();
            } else {
                // プレイヤーがダメージを受ける - 死亡アニメーション開始
                deathAnimation.active = true;
                deathAnimation.x = player.x;
                deathAnimation.y = player.y;
                deathAnimation.startY = player.y;
                deathAnimation.opacity = 1;
                deathAnimation.timer = 0;
                deathAnimation.haloAngle = 0;
                gameState = 'dying';
                playSound('death');
            }
        }
    }
}


// Collision detection
function rectCollision(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

function checkPlatformCollisions() {
    player.onGround = false;
    
    for (const platform of platforms) {
        if (rectCollision(player, platform)) {
            // Calculate overlap on each side
            const overlapLeft = (player.x + player.width) - platform.x;
            const overlapRight = (platform.x + platform.width) - player.x;
            const overlapTop = (player.y + player.height) - platform.y;
            const overlapBottom = (platform.y + platform.height) - player.y;
            
            // Find minimum overlap
            const minOverlapX = Math.min(overlapLeft, overlapRight);
            const minOverlapY = Math.min(overlapTop, overlapBottom);
            
            if (minOverlapY < minOverlapX) {
                // Vertical collision
                if (overlapTop < overlapBottom && player.vy >= 0) {
                    // Landing on top
                    player.y = platform.y - player.height;
                    player.vy = 0;
                    player.onGround = true;
                } else if (player.vy < 0) {
                    // Hitting from below
                    player.y = platform.y + platform.height;
                    player.vy = 0;
                }
            } else {
                // Horizontal collision
                if (overlapLeft < overlapRight) {
                    player.x = platform.x - player.width;
                } else {
                    player.x = platform.x + platform.width;
                }
                player.vx = 0;
            }
        }
    }
}

function checkCoinCollisions() {
    const coinSize = 20;
    for (const coin of coins) {
        if (!coin.collected) {
            const coinRect = { x: coin.x, y: coin.y, width: coinSize, height: coinSize };
            if (rectCollision(player, coinRect)) {
                coin.collected = true;
                score += 100;
                playSound('coin');
                updateUI();
            }
        }
    }
}

function checkFlagCollision() {
    if (rectCollision(player, flag)) {
        gameState = 'win';
        playSound('win');
        showOverlay('You Win!', `Final Score: ${score}`, 'Play Again');
    }
}

function checkDeath() {
    if (player.y > CANVAS_HEIGHT + 50 && !deathAnimation.active) {
        startDeathAnimation();
    }
}

function startDeathAnimation() {
    deathAnimation.active = true;
    deathAnimation.x = player.x;
    deathAnimation.y = CANVAS_HEIGHT - 50;
    deathAnimation.startY = CANVAS_HEIGHT - 50;
    deathAnimation.opacity = 1;
    deathAnimation.timer = 0;
    deathAnimation.haloAngle = 0;
    gameState = 'dying';
    playSound('death');
}

function updateDeathAnimation() {
    if (!deathAnimation.active) return;
    
    deathAnimation.timer++;
    deathAnimation.haloAngle += 0.1;
    
    // 天に昇る
    deathAnimation.y -= 2;
    
    // フェードアウト
    if (deathAnimation.timer > 60) {
        deathAnimation.opacity -= 0.02;
    }
    
    // アニメーション終了
    if (deathAnimation.opacity <= 0 || deathAnimation.timer > 120) {
        deathAnimation.active = false;
        lives--;
        updateUI();
        
        if (lives <= 0) {
            gameState = 'gameover';
            showOverlay('Game Over', `Final Score: ${score}`, 'Try Again');
        } else {
            gameState = 'playing';
            player.reset();
            camera.x = 0;
            initGhosts();
        }
    }
}

function drawDeathAnimation() {
    if (!deathAnimation.active) return;
    
    const screenX = deathAnimation.x - camera.x;
    const screenY = deathAnimation.y;
    
    ctx.save();
    ctx.globalAlpha = deathAnimation.opacity;
    
    // 光のエフェクト（後光）
    const glowGradient = ctx.createRadialGradient(
        screenX + player.width/2, screenY + player.height/2, 0,
        screenX + player.width/2, screenY + player.height/2, 60
    );
    glowGradient.addColorStop(0, 'rgba(255, 255, 200, 0.5)');
    glowGradient.addColorStop(0.5, 'rgba(255, 255, 150, 0.2)');
    glowGradient.addColorStop(1, 'rgba(255, 255, 100, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(screenX + player.width/2, screenY + player.height/2, 60, 0, Math.PI * 2);
    ctx.fill();
    
    // キャラクター（半透明）
    if (spriteLoaded) {
        ctx.drawImage(kiroSprite, screenX, screenY, player.width, player.height);
    } else {
        ctx.fillStyle = '#790ECB';
        ctx.beginPath();
        ctx.arc(screenX + 20, screenY + 10, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(screenX + 5, screenY + 10, 30, 25);
    }
    
    // 天使の輪（頭の上で回転）
    const haloX = screenX + player.width/2;
    const haloY = screenY - 10;
    const haloTilt = Math.sin(deathAnimation.haloAngle) * 0.3;
    
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 15;
    
    // 楕円形の輪（3D風に傾く）
    ctx.beginPath();
    ctx.ellipse(haloX, haloY, 18, 6 + haloTilt * 10, haloTilt, 0, Math.PI * 2);
    ctx.stroke();
    
    // 輪の輝き
    ctx.strokeStyle = '#FFFACD';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(haloX, haloY, 18, 6 + haloTilt * 10, haloTilt, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.shadowBlur = 0;
    
    // 上昇する光の粒子
    for (let i = 0; i < 5; i++) {
        const particleX = screenX + player.width/2 + Math.sin(Date.now()/200 + i * 1.5) * 20;
        const particleY = screenY + player.height + (deathAnimation.timer * 0.5 + i * 15) % 50;
        const particleSize = 3 - (i * 0.4);
        
        ctx.fillStyle = `rgba(255, 255, 200, ${0.8 - i * 0.15})`;
        ctx.beginPath();
        ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.restore();
}

// Update UI
function updateUI() {
    scoreEl.textContent = `Score: ${score}`;
    livesEl.textContent = `Lives: ${lives}`;
}

// Overlay management
function showOverlay(title, message, buttonText) {
    overlayTitle.textContent = title;
    overlayMessage.textContent = message;
    startBtn.textContent = buttonText;
    overlay.style.display = 'flex';
}

function hideOverlay() {
    overlay.style.display = 'none';
}

// Game update
function update() {
    // 死亡アニメーション中は更新
    if (gameState === 'dying') {
        updateDeathAnimation();
        return;
    }
    
    if (gameState !== 'playing') return;
    
    // Horizontal movement with friction
    if (keys.left) {
        player.vx = -MOVE_SPEED;
        player.facingRight = false;
    } else if (keys.right) {
        player.vx = MOVE_SPEED;
        player.facingRight = true;
    } else {
        player.vx *= FRICTION;
        if (Math.abs(player.vx) < 0.1) player.vx = 0;
    }
    
    // Apply gravity
    player.vy += GRAVITY;
    
    // Update position
    player.x += player.vx;
    player.y += player.vy;
    
    // Keep player in bounds (left side only)
    if (player.x < 0) player.x = 0;
    if (player.x > LEVEL_WIDTH - player.width) player.x = LEVEL_WIDTH - player.width;
    
    // Collision detection
    checkPlatformCollisions();
    checkCoinCollisions();
    checkGhostCollisions();
    checkFlagCollision();
    checkDeath();
    
    // Update ghosts
    updateGhosts();
    
    // Camera follow (smooth)
    const targetCameraX = player.x - CANVAS_WIDTH / 3;
    camera.x += (targetCameraX - camera.x) * 0.1;
    camera.x = Math.max(0, Math.min(camera.x, LEVEL_WIDTH - CANVAS_WIDTH));
}


// Drawing functions
function drawBackground() {
    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Clouds (parallax)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    const cloudOffset = camera.x * 0.3;
    for (let i = 0; i < 8; i++) {
        const cloudX = (i * 400 - cloudOffset) % (LEVEL_WIDTH + 200) - 100;
        const cloudY = 50 + (i % 3) * 40;
        drawCloud(cloudX, cloudY);
    }
    
    // Distant hills (parallax)
    ctx.fillStyle = '#90EE90';
    const hillOffset = camera.x * 0.5;
    for (let i = 0; i < 10; i++) {
        const hillX = (i * 350 - hillOffset) % (LEVEL_WIDTH + 300) - 150;
        ctx.beginPath();
        ctx.arc(hillX, CANVAS_HEIGHT - 30, 120, Math.PI, 0);
        ctx.fill();
    }
}

function drawCloud(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.arc(x + 25, y - 10, 30, 0, Math.PI * 2);
    ctx.arc(x + 50, y, 25, 0, Math.PI * 2);
    ctx.fill();
}

function drawPlatforms() {
    for (const platform of platforms) {
        const screenX = platform.x - camera.x;
        
        // Skip if off screen
        if (screenX + platform.width < 0 || screenX > CANVAS_WIDTH) continue;
        
        // Platform top (grass)
        ctx.fillStyle = '#228B22';
        ctx.fillRect(screenX, platform.y, platform.width, 10);
        
        // Platform body (dirt)
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(screenX, platform.y + 10, platform.width, platform.height - 10);
        
        // Add some texture
        ctx.fillStyle = '#654321';
        for (let i = 0; i < platform.width; i += 20) {
            ctx.fillRect(screenX + i + 5, platform.y + 15, 8, 8);
        }
    }
}

function drawCoins() {
    const coinSize = 20;
    for (const coin of coins) {
        if (coin.collected) continue;
        
        const screenX = coin.x - camera.x;
        if (screenX + coinSize < 0 || screenX > CANVAS_WIDTH) continue;
        
        // Coin animation (bobbing)
        const bobOffset = Math.sin(Date.now() / 200 + coin.x) * 3;
        
        // Gold coin
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(screenX + coinSize/2, coin.y + coinSize/2 + bobOffset, coinSize/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Shine
        ctx.fillStyle = '#FFF8DC';
        ctx.beginPath();
        ctx.arc(screenX + coinSize/2 - 3, coin.y + coinSize/2 - 3 + bobOffset, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawFlag() {
    const screenX = flag.x - camera.x;
    if (screenX + flag.width < 0 || screenX > CANVAS_WIDTH) return;
    
    // Pole
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(screenX + 15, flag.y, 10, flag.height);
    
    // Flag (waving animation)
    const wave = Math.sin(Date.now() / 200) * 5;
    ctx.fillStyle = '#790ECB';
    ctx.beginPath();
    ctx.moveTo(screenX + 25, flag.y);
    ctx.lineTo(screenX + 25 + 40 + wave, flag.y + 20);
    ctx.lineTo(screenX + 25, flag.y + 40);
    ctx.closePath();
    ctx.fill();
    
    // Star on flag
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(screenX + 40 + wave/2, flag.y + 20, 8, 0, Math.PI * 2);
    ctx.fill();
}

function drawPlayer() {
    const screenX = player.x - camera.x;
    
    if (spriteLoaded) {
        // Draw Kiro sprite
        ctx.save();
        if (!player.facingRight) {
            ctx.translate(screenX + player.width, player.y);
            ctx.scale(-1, 1);
            ctx.drawImage(kiroSprite, 0, 0, player.width, player.height);
        } else {
            ctx.drawImage(kiroSprite, screenX, player.y, player.width, player.height);
        }
        ctx.restore();
    } else {
        // Fallback: Draw a cute character
        // Body
        ctx.fillStyle = '#790ECB';
        ctx.fillRect(screenX + 5, player.y + 10, 30, 25);
        
        // Head
        ctx.fillStyle = '#790ECB';
        ctx.beginPath();
        ctx.arc(screenX + 20, player.y + 10, 15, 0, Math.PI * 2);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = 'white';
        const eyeOffset = player.facingRight ? 5 : -5;
        ctx.beginPath();
        ctx.arc(screenX + 15 + eyeOffset, player.y + 8, 5, 0, Math.PI * 2);
        ctx.arc(screenX + 25 + eyeOffset, player.y + 8, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupils
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(screenX + 16 + eyeOffset, player.y + 8, 2, 0, Math.PI * 2);
        ctx.arc(screenX + 26 + eyeOffset, player.y + 8, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Feet
        ctx.fillStyle = '#5a0a9e';
        ctx.fillRect(screenX + 5, player.y + 35, 10, 5);
        ctx.fillRect(screenX + 25, player.y + 35, 10, 5);
    }
}

function draw() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    drawBackground();
    drawPlatforms();
    drawCoins();
    drawGhosts();
    drawFlag();
    
    // 死亡アニメーション中は天使Kiroを描画
    if (gameState === 'dying') {
        drawDeathAnimation();
    } else {
        drawPlayer();
    }
}

function drawGhosts() {
    for (const ghost of ghosts) {
        if (!ghost.alive) continue;
        
        const screenX = ghost.x - camera.x;
        if (screenX + ghost.width < 0 || screenX > CANVAS_WIDTH) continue;
        
        const floatOffset = Math.sin(Date.now() / 300 + ghost.x) * (ghost.isBoss ? 8 : 5);
        const pulseScale = ghost.isBoss ? 1 + Math.sin(Date.now() / 150) * 0.05 : 1;
        
        // ゴーストの影（ボスは大きい影）
        ctx.fillStyle = ghost.isBoss ? 'rgba(80, 0, 80, 0.4)' : 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(screenX + ghost.width/2, ghost.y + ghost.height + 5, ghost.width/2.5 * pulseScale, ghost.isBoss ? 12 : 8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // ボスの不気味なオーラ
        if (ghost.isBoss) {
            const auraGradient = ctx.createRadialGradient(
                screenX + ghost.width/2, ghost.y + ghost.height/2 + floatOffset, 0,
                screenX + ghost.width/2, ghost.y + ghost.height/2 + floatOffset, ghost.width
            );
            auraGradient.addColorStop(0, 'rgba(100, 0, 150, 0.3)');
            auraGradient.addColorStop(0.5, 'rgba(50, 0, 80, 0.2)');
            auraGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = auraGradient;
            ctx.beginPath();
            ctx.arc(screenX + ghost.width/2, ghost.y + ghost.height/2 + floatOffset, ghost.width * pulseScale, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // ゴースト本体
        ctx.fillStyle = ghost.isBoss ? '#2a0050' : '#6a0dad';
        ctx.beginPath();
        ctx.arc(screenX + ghost.width/2, ghost.y + ghost.height/3 + floatOffset, ghost.width/2 * pulseScale, Math.PI, 0);
        ctx.lineTo(screenX + ghost.width * pulseScale, ghost.y + ghost.height + floatOffset);
        
        // 波打つ下部（ボスはもっと激しく）
        const waveCount = ghost.isBoss ? 6 : 4;
        const waveIntensity = ghost.isBoss ? 12 : 8;
        for (let i = 0; i < waveCount; i++) {
            const waveX = screenX + ghost.width * pulseScale - (i + 1) * (ghost.width * pulseScale / waveCount);
            const wavePhase = Math.sin(Date.now() / 100 + i) * waveIntensity;
            const waveY = ghost.y + ghost.height + floatOffset + (i % 2 === 0 ? -waveIntensity + wavePhase : wavePhase);
            ctx.lineTo(waveX, waveY);
        }
        ctx.closePath();
        ctx.fill();
        
        // ボスの怖い模様
        if (ghost.isBoss) {
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(screenX + ghost.width/2, ghost.y + ghost.height/2 + floatOffset, 15, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(screenX + ghost.width/2, ghost.y + ghost.height/2 + floatOffset, 25, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // 怖い目（ボスは光る赤い目）
        const eyeY = ghost.y + ghost.height/3 + floatOffset;
        if (ghost.isBoss) {
            // 目の光彩エフェクト
            const eyeGlow = ctx.createRadialGradient(
                screenX + ghost.width/3, eyeY, 0,
                screenX + ghost.width/3, eyeY, 15
            );
            eyeGlow.addColorStop(0, '#ff0000');
            eyeGlow.addColorStop(0.5, '#ff0000');
            eyeGlow.addColorStop(1, 'rgba(255, 0, 0, 0)');
            ctx.fillStyle = eyeGlow;
            ctx.beginPath();
            ctx.arc(screenX + ghost.width/3, eyeY, 15, 0, Math.PI * 2);
            ctx.arc(screenX + ghost.width*2/3, eyeY, 15, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.fillStyle = ghost.isBoss ? '#ff0000' : '#ff0000';
        ctx.beginPath();
        ctx.arc(screenX + ghost.width/3, eyeY, ghost.isBoss ? 10 : 6, 0, Math.PI * 2);
        ctx.arc(screenX + ghost.width*2/3, eyeY, ghost.isBoss ? 10 : 6, 0, Math.PI * 2);
        ctx.fill();
        
        // 瞳（ボスは縦長の怖い瞳）
        ctx.fillStyle = '#000';
        if (ghost.isBoss) {
            ctx.beginPath();
            ctx.ellipse(screenX + ghost.width/3, eyeY, 3, 7, 0, 0, Math.PI * 2);
            ctx.ellipse(screenX + ghost.width*2/3, eyeY, 3, 7, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.arc(screenX + ghost.width/3, eyeY, 3, 0, Math.PI * 2);
            ctx.arc(screenX + ghost.width*2/3, eyeY, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // ボスの怖い口
        if (ghost.isBoss) {
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            const mouthY = eyeY + 20;
            ctx.moveTo(screenX + ghost.width/4, mouthY);
            // ギザギザの口
            for (let i = 0; i < 5; i++) {
                const toothX = screenX + ghost.width/4 + (i + 1) * (ghost.width/2 / 5);
                const toothY = mouthY + (i % 2 === 0 ? 8 : -5);
                ctx.lineTo(toothX, toothY);
            }
            ctx.stroke();
            
            // 牙
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(screenX + ghost.width/3, mouthY - 3);
            ctx.lineTo(screenX + ghost.width/3 - 5, mouthY + 10);
            ctx.lineTo(screenX + ghost.width/3 + 5, mouthY + 10);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(screenX + ghost.width*2/3, mouthY - 3);
            ctx.lineTo(screenX + ghost.width*2/3 - 5, mouthY + 10);
            ctx.lineTo(screenX + ghost.width*2/3 + 5, mouthY + 10);
            ctx.closePath();
            ctx.fill();
        }
        
        // ボスには邪悪な王冠
        if (ghost.isBoss) {
            // 王冠の輝き
            ctx.fillStyle = '#FFD700';
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(screenX + 10, ghost.y - 5 + floatOffset);
            ctx.lineTo(screenX + 18, ghost.y - 25 + floatOffset);
            ctx.lineTo(screenX + 28, ghost.y - 12 + floatOffset);
            ctx.lineTo(screenX + 40, ghost.y - 35 + floatOffset);
            ctx.lineTo(screenX + 52, ghost.y - 12 + floatOffset);
            ctx.lineTo(screenX + 62, ghost.y - 25 + floatOffset);
            ctx.lineTo(screenX + 70, ghost.y - 5 + floatOffset);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            
            // 王冠の宝石
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(screenX + 40, ghost.y - 20 + floatOffset, 6, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Game loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Game initialization
function startGame() {
    if (!audioCtx) initAudio();
    
    gameState = 'playing';
    score = 0;
    lives = 10;
    camera.x = 0;
    player.reset();
    initCoins();
    initGhosts();
    updateUI();
    hideOverlay();
}

// Event listeners
startBtn.addEventListener('click', startGame);

// Show initial menu
showOverlay('Super Kiro World', 'Use Arrow Keys or WASD to move, Space to jump!', 'Start Game');

// Start game loop
gameLoop();
