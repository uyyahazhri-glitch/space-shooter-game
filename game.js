// ==========================================
// 1. ELEMEN DOM & KONFIGURASI KANVAS
// ==========================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreDisplay = document.getElementById('scoreDisplay');
const livesDisplay = document.getElementById('livesDisplay');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const endTitle = document.getElementById('endTitle');
const endMessage = document.getElementById('endMessage');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

// ==========================================
// 2. DEKLARASI PEMBOLEHUBAH PERMAINAN
// ==========================================
const TARGET_SCORE = 500;
let score = 0;
let lives = 3;
let isPlaying = false;
let animationId = null;
let spawnTimer = null;

// Keadaan Butang Kawalan
const keys = {
  left: false,
  right: false
};

// Objek Kapal Pemain
const player = {
  x: canvas.width / 2 - 20,
  y: canvas.height - 60,
  width: 40,
  height: 40,
  speed: 7
};

// Senarai Entiti Permainan
let bullets = [];
let meteors = [];
let bombs = []; // Senarai Bom Baharu

// ==========================================
// 3. SISTEM KESAN BUNYI (WEB AUDIO API)
// ==========================================
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

// 1. Bunyi Tembakan Laser ("Pew!")
function playLaserSound() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'square';
  osc.frequency.setValueAtTime(880, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.12);

  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.12);
}

// 2. Bunyi Meteor Hancur Biasa ("Boom!")
function playExplosionSound() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(180, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.25);

  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.25);
}

// 3. Bunyi Kena Hentaman Biasa
function playHitSound() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, audioCtx.currentTime);
  osc.frequency.linearRampToValueAtTime(60, audioCtx.currentTime + 0.3);

  gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
}

// 4. BUNYI BOM MELETUP DAHSYAT (Nuke/Game Over Sound)
function playNukeSound() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(120, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(15, audioCtx.currentTime + 0.8);

  gain.gain.setValueAtTime(0.6, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.8);
}

// ==========================================
// 4. PENGENDALIAN INPUT
// ==========================================
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
    keys.left = true;
  }
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
    keys.right = true;
  }
  if (e.code === 'Space') {
    e.preventDefault();
    if (isPlaying) shootBullet();
  }
});

window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
    keys.left = false;
  }
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
    keys.right = false;
  }
});

canvas.addEventListener('mousedown', () => {
  if (isPlaying) shootBullet();
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// ==========================================
// KAWALAN SENTUHAN & TETIKUS YANG DIUBAH SUAI
// ==========================================

// 1. Tembak menggunakan klik tetikus (Laptop sahaja)
canvas.addEventListener('mousedown', (e) => {
  if (isPlaying) shootBullet();
});

// 2. KAWALAN TELEFON TERUS PADA SKRIN KANVAS (Touch & Slide)
// Pemain hanya perlu sentuh atau seret jari ke kiri/kanan di atas skrin
canvas.addEventListener('touchstart', (e) => {
  if (!isPlaying) return;
  e.preventDefault();
  shootBullet(); // Sentuh sekali = tembak

  // Dapatkan posisi sentuhan pertama untuk alihkan kapal terus ke jari pemain
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const touchX = touch.clientX - rect.left;
  const scaleX = canvas.width / rect.width;
  
  player.x = (touchX * scaleX) - (player.width / 2);
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  if (!isPlaying) return;
  e.preventDefault();
  
  // Apabila pemain seret jari ke kiri/kanan, kapal ikut kedudukan jari
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const touchX = touch.clientX - rect.left;
  const scaleX = canvas.width / rect.width;
  
  player.x = (touchX * scaleX) - (player.width / 2);

  // Pastikan kapal tidak terkeluar dari skrin
  if (player.x < 0) player.x = 0;
  if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;
}, { passive: false });

// 3. BUTANG KIRI & KANAN (Sebagai sokongan tambahan)
const btnLeft = document.getElementById('btnLeft');
const btnRight = document.getElementById('btnRight');

if (btnLeft && btnRight) {
  // Guna Touchstart & Touchend tanpa e.preventDefault() yang menyekat
  btnLeft.ontouchstart = (e) => { e.stopPropagation(); keys.left = true; };
  btnLeft.ontouchend = (e) => { e.stopPropagation(); keys.left = false; };
  btnLeft.onmousedown = () => { keys.left = true; };
  btnLeft.onmouseup = () => { keys.left = false; };

  btnRight.ontouchstart = (e) => { e.stopPropagation(); keys.right = true; };
  btnRight.ontouchend = (e) => { e.stopPropagation(); keys.right = false; };
  btnRight.onmousedown = () => { keys.right = true; };
  btnRight.onmouseup = () => { keys.right = false; };
}

// ==========================================
// 5. MEKANIK & LOGIK PERMAINAN
// ==========================================
function shootBullet() {
  playLaserSound();
  bullets.push({
    x: player.x + player.width / 2 - 3,
    y: player.y,
    width: 6,
    height: 12,
    speed: 9
  });
}

function spawnObstacle() {
  if (!isPlaying) return;

  // 25% peluang keluar Bom, 75% peluang keluar Meteor
  const isBomb = Math.random() < 0.25;

  if (isBomb) {
    const radius = 18;
    const x = Math.random() * (canvas.width - radius * 2) + radius;
    const speed = Math.random() * 1.5 + 2; // Kelajuan bom
    bombs.push({ x, y: -radius, radius, speed });
  } else {
    const radius = Math.floor(Math.random() * 14) + 16;
    const x = Math.random() * (canvas.width - radius * 2) + radius;
    const speed = Math.random() * 2 + 2;
    meteors.push({ x, y: -radius, radius, speed });
  }
}

function checkCollision(circle, rect) {
  const distX = Math.abs(circle.x - rect.x - rect.width / 2);
  const distY = Math.abs(circle.y - rect.y - rect.height / 2);

  if (distX > (rect.width / 2 + circle.radius)) return false;
  if (distY > (rect.height / 2 + circle.radius)) return false;

  if (distX <= (rect.width / 2)) return true;
  if (distY <= (rect.height / 2)) return true;

  const dx = distX - rect.width / 2;
  const dy = distY - rect.height / 2;
  return (dx * dx + dy * dy <= (circle.radius * circle.radius));
}

function updateHUD() {
  scoreDisplay.textContent = score;
  livesDisplay.textContent = '❤️'.repeat(Math.max(0, lives));
}

// ==========================================
// 6. KITARAN PERMAINAN (GAME LOOP)
// ==========================================
function gameLoop() {
  if (!isPlaying) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Pergerakan kapal
  if (keys.left && player.x > 0) player.x -= player.speed;
  if (keys.right && player.x < canvas.width - player.width) player.x += player.speed;

  // Lukis kapal
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.moveTo(player.x + player.width / 2, player.y);
  ctx.lineTo(player.x, player.y + player.height);
  ctx.lineTo(player.x + player.width, player.y + player.height);
  ctx.closePath();
  ctx.fill();

  // Kemaskini & lukis peluru
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.y -= b.speed;

    ctx.fillStyle = '#facc15';
    ctx.fillRect(b.x, b.y, b.width, b.height);

    if (b.y < -b.height) bullets.splice(i, 1);
  }

  // --- KEMASKINI & LUKIS METEOR ---
  for (let mIdx = meteors.length - 1; mIdx >= 0; mIdx--) {
    const m = meteors[mIdx];
    m.y += m.speed;

    // Lukis meteor (merah)
    ctx.fillStyle = '#f87171';
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
    ctx.fill();

    // Semak peluru tembak meteor
    for (let bIdx = bullets.length - 1; bIdx >= 0; bIdx--) {
      const b = bullets[bIdx];
      if (checkCollision(m, b)) {
        bullets.splice(bIdx, 1);
        meteors.splice(mIdx, 1);
        score += 25;
        playExplosionSound();
        updateHUD();

        if (score >= TARGET_SCORE) {
          endGame(true);
          return;
        }
        break;
      }
    }

    // Meteor langgar kapal
    if (checkCollision(m, player)) {
      meteors.splice(mIdx, 1);
      lives--;
      playHitSound();
      updateHUD();
      if (lives <= 0) {
        endGame(false);
        return;
      }
      continue;
    }

    // Meteor terlepas bawah
    if (m.y - m.radius > canvas.height) {
      meteors.splice(mIdx, 1);
      lives--;
      playHitSound();
      updateHUD();
      if (lives <= 0) {
        endGame(false);
        return;
      }
    }
  }

  // --- KEMASKINI & LUKIS BOM (BAHARU) ---
  for (let bIndex = bombs.length - 1; bIndex >= 0; bIndex--) {
    const bomb = bombs[bIndex];
    bomb.y += bomb.speed;

    // Lukis Bom (Bulatan Hitam/Jingga Berbahaya dengan Tanda Silang)
    ctx.fillStyle = '#ea580c'; // Warna oren api
    ctx.beginPath();
    ctx.arc(bomb.x, bomb.y, bomb.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(bomb.x, bomb.y, bomb.radius - 5, 0, Math.PI * 2);
    ctx.fill();

    // Tanda amaran 'X' pada bom
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💣', bomb.x, bomb.y);

    // 1. JIKA TEMBAK BOM -> NYAWA HABIS TERUS!
    for (let bltIdx = bullets.length - 1; bltIdx >= 0; bltIdx--) {
      const b = bullets[bltIdx];
      if (checkCollision(bomb, b)) {
        bullets.splice(bltIdx, 1);
        bombs.splice(bIndex, 1);
        lives = 0; // Nyawa terus habis
        updateHUD();
        playNukeSound(); // Bunyi bom meletup dahsyat
        endGame(false, '💥 YOU HAVE BEEN BOMB! GAME OVER!');
        return;
      }
    }

    // 2. Jika Bom Langgar Kapal -> Nyawa juga habis terus
    if (checkCollision(bomb, player)) {
      bombs.splice(bIndex, 1);
      lives = 0;
      updateHUD();
      playNukeSound();
      endGame(false, '💥 Ship struck by a bomb!');
      return;
    }

    // 3. Jika Bom Terlepas ke Bawah -> Selamat! Tidak tolak nyawa
    if (bomb.y - bomb.radius > canvas.height) {
      bombs.splice(bIndex, 1);
    }
  }

  animationId = requestAnimationFrame(gameLoop);
}

// ==========================================
// 7. MULA & TAMAT PERMAINAN
// ==========================================
function startGame() {
  initAudio();
  score = 0;
  lives = 3;
  bullets = [];
  meteors = [];
  bombs = []; // Kosongkan senarai bom
  player.x = canvas.width / 2 - player.width / 2;
  keys.left = false;
  keys.right = false;

  updateHUD();
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');

  isPlaying = true;
  clearInterval(spawnTimer);
  spawnTimer = setInterval(spawnObstacle, 1000); // Jana meteor atau bom setiap saat

  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(gameLoop);
}

function endGame(won, customMessage = null) {
  isPlaying = false;
  clearInterval(spawnTimer);
  cancelAnimationFrame(animationId);

  if (won) {
    endTitle.textContent = '🎉 CONGRATS! YOU WIN!';
    endTitle.style.color = '#4ade80';
    endMessage.textContent = `You successfully achieve ${score} points!`;
  } else {
    endTitle.textContent = '💀 GAME OVER';
    endTitle.style.color = '#ef4444';
    endMessage.textContent = customMessage ? customMessage : `Ran out of lives! Last Score: ${score}`;
  }

  gameOverScreen.classList.remove('hidden');
}

