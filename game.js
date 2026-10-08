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
let score = 0;
let lives = 3;
let isPlaying = false;
let animationId = null;
let lastSpawnTime = 0;

// Kuasa Tambahan (Power-ups status)
let hasShield = false;
let doubleShotTimer = 0; // Tempoh masa peluru kembar

// Arah pergerakan daripada toggle joystick
let joystickMove = { x: 0, y: 0 };

const player = {
  x: canvas.width / 2 - 20,
  y: canvas.height - 60,
  width: 40,
  height: 40,
  speed: 7
};

let bullets = [];
let meteors = [];
let bombs = [];
let powerups = [];
let particles = [];
let stars = [];

function initStars() {
  stars = [];
  for (let i = 0; i < 50; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 1.5 + 0.5,
      speed: Math.random() * 2 + 0.5
    });
  }
}

function createExplosion(x, y, color = '#f97316', count = 12) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 4 + 1;
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: Math.random() * 3 + 2,
      alpha: 1,
      color: color
    });
  }
}

// ==========================================
// 3. SISTEM KESAN BUNYI (WEB AUDIO API)
// ==========================================
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

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

// Bunyi Kuasa Tambahan (Power-Up Jingle)
function playPowerUpSound() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(330, audioCtx.currentTime);
  osc.frequency.setValueAtTime(440, audioCtx.currentTime + 0.08);
  osc.frequency.setValueAtTime(660, audioCtx.currentTime + 0.16);

  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
}

// ==========================================
// 4. PENGENDALIAN INPUT (LAPTOP & DIRECT TOUCH PHONE)
// ==========================================

// --- KAWALAN LAPTOP (MOUSE IKUT & KLIK) ---
canvas.addEventListener('mousemove', (e) => {
  if (!isPlaying) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  player.x = ((e.clientX - rect.left) * scaleX) - (player.width / 2);
  player.y = ((e.clientY - rect.top) * scaleY) - (player.height / 2);

  if (player.x < 0) player.x = 0;
  if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;
  if (player.y < 0) player.y = 0;
  if (player.y > canvas.height - player.height) player.y = canvas.height - player.height;
});

canvas.addEventListener('mousedown', () => {
  if (isPlaying) shootBullet();
});

// --- KAWALAN SENTUHAN TERUS TELEFON (DI MANA-MANA ATAS KANVAS) ---
let touchShootInterval = null;

function updatePlayerTouchPos(touch) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  // Kapal berada tepat di mana-mana tempat jari menyentuh skrin
  player.x = ((touch.clientX - rect.left) * scaleX) - (player.width / 2);
  player.y = ((touch.clientY - rect.top) * scaleY) - (player.height / 2);

  // Hadkan dalam skrin permainan
  if (player.x < 0) player.x = 0;
  if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;
  if (player.y < 0) player.y = 0;
  if (player.y > canvas.height - player.height) player.y = canvas.height - player.height;
}

// Bila mula sentuh mana-mana tempat di skrin telefon
canvas.addEventListener('touchstart', (e) => {
  if (!isPlaying) return;
  e.preventDefault();
  updatePlayerTouchPos(e.touches[0]);
  shootBullet();

  // Tembak secara automatik selagi jari melekat di skrin
  clearInterval(touchShootInterval);
  touchShootInterval = setInterval(() => {
    if (isPlaying) shootBullet();
  }, 180);
}, { passive: false });

// Bila seret jari ke mana-mana arah (atas, bawah, kiri, kanan) di skrin
canvas.addEventListener('touchmove', (e) => {
  if (!isPlaying) return;
  e.preventDefault();
  updatePlayerTouchPos(e.touches[0]);
}, { passive: false });

// Bila angkat jari daripada skrin
const stopTouch = () => {
  clearInterval(touchShootInterval);
};
canvas.addEventListener('touchend', stopTouch);
canvas.addEventListener('touchcancel', stopTouch);

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// ==========================================
// 5. MEKANIK & LOGIK PERMAINAN
// ==========================================
function shootBullet() {
  playLaserSound();

  if (doubleShotTimer > 0) {
    // Peluru Berkembar (Dua tembakan dari sayap)
    bullets.push({ x: player.x + 4, y: player.y, width: 6, height: 12, speed: 10 });
    bullets.push({ x: player.x + player.width - 10, y: player.y, width: 6, height: 12, speed: 10 });
  } else {
    // Tembakan Tunggal Biasa
    bullets.push({
      x: player.x + player.width / 2 - 3,
      y: player.y,
      width: 6,
      height: 12,
      speed: 9
    });
  }
}

// Penjanaan Objek Mengikut Kenaikan Kelajuan Setiap 500 Mata
function spawnEntities(currentTime) {
  // Kira tahap kelajuan berdasarkan setiap 500 mata (0 mata = Aras 0, 500 mata = Aras 1, 1000 mata = Aras 2...)
  const speedLevel = Math.floor(score / 500);

  // Semakin tinggi kelajuan, semakin kerap meteor muncul (minimum 350ms)
  const spawnInterval = Math.max(350, 1000 - (speedLevel * 100));

  if (currentTime - lastSpawnTime > spawnInterval) {
    lastSpawnTime = currentTime;

    // Tambah kelajuan jatuhan objek (setiap 500 mata, tambah +1.2 kelajuan)
    const extraSpeed = speedLevel * 1.2;
    const roll = Math.random();

    if (roll < 0.12) {
      // 12% Peluang muncul Power-Up
      const types = ['heal', 'shield', 'double'];
      const chosenType = types[Math.floor(Math.random() * types.length)];
      powerups.push({
        x: Math.random() * (canvas.width - 30) + 15,
        y: -20,
        radius: 14,
        speed: 2 + (speedLevel * 0.3),
        type: chosenType
      });
    } else if (roll < 0.35) {
      // 23% Peluang muncul Bom
      const radius = 18;
      bombs.push({
        x: Math.random() * (canvas.width - radius * 2) + radius,
        y: -radius,
        radius: radius,
        speed: Math.random() * 1.5 + 2 + extraSpeed
      });
    } else {
      // 65% Peluang muncul Meteor
      const radius = Math.floor(Math.random() * 14) + 16;
      meteors.push({
        x: Math.random() * (canvas.width - radius * 2) + radius,
        y: -radius,
        radius: radius,
        speed: Math.random() * 2 + 2 + extraSpeed
      });
    }
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
  const scoreElement = document.getElementById('scoreDisplay');
  const livesElement = document.getElementById('livesDisplay');

  if (scoreElement) {
    scoreElement.textContent = score;
  }
  
  if (livesElement) {
    livesElement.textContent = '❤️'.repeat(Math.max(0, lives));
  }
}

// ==========================================
// 6. KITARAN PERMAINAN (GAME LOOP)
// ==========================================
function gameLoop(timestamp) {
  if (!isPlaying) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Kurangkan pemasa Double Shot
  if (doubleShotTimer > 0) {
    doubleShotTimer -= 1 / 60;
  }

  // Jana Halangan / Power-Up secara dinamik
  spawnEntities(timestamp);

  // 1. Lukis Bintang Latar Belakang
  ctx.fillStyle = '#ffffff';
  for (let s of stars) {
    s.y += s.speed;
    if (s.y > canvas.height) {
      s.y = 0;
      s.x = Math.random() * canvas.width;
    }
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Pergerakan Kapal Melalui Toggle Telefon (360 Darjah)
  if (joystickMove.x !== 0 || joystickMove.y !== 0) {
    player.x += joystickMove.x * player.speed;
    player.y += joystickMove.y * player.speed;

    // Halang kapal terkeluar dari skrin
    if (player.x < 0) player.x = 0;
    if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;
    if (player.y < 0) player.y = 0;
    if (player.y > canvas.height - player.height) player.y = canvas.height - player.height;
  }

  // Lukis Kapal Pemain
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.moveTo(player.x + player.width / 2, player.y);
  ctx.lineTo(player.x, player.y + player.height);
  ctx.lineTo(player.x + player.width, player.y + player.height);
  ctx.closePath();
  ctx.fill();

  // Lukis Perisai Kebal (Jika Aktif)
  if (hasShield) {
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#60a5fa';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width * 0.75, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 3. Peluru
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.y -= b.speed;

    ctx.fillStyle = (doubleShotTimer > 0) ? '#a855f7' : '#facc15'; // Peluru ungu jika double-shot aktif
    ctx.fillRect(b.x, b.y, b.width, b.height);

    if (b.y < -b.height) bullets.splice(i, 1);
  }

  // 4. Partikel Letupan
  for (let pIdx = particles.length - 1; pIdx >= 0; pIdx--) {
    const p = particles[pIdx];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= 0.025;

    if (p.alpha <= 0) {
      particles.splice(pIdx, 1);
      continue;
    }

    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 5. Kuasa Tambahan (Power-Ups)
  for (let pwrIdx = powerups.length - 1; pwrIdx >= 0; pwrIdx--) {
    const pwr = powerups[pwrIdx];
    pwr.y += pwr.speed;

    // Lukis Ikon Power-Up
    ctx.beginPath();
    ctx.arc(pwr.x, pwr.y, pwr.radius, 0, Math.PI * 2);
    ctx.fillStyle = pwr.type === 'heal' ? '#22c55e' : (pwr.type === 'shield' ? '#0284c7' : '#9333ea');
    ctx.fill();

    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const icon = pwr.type === 'heal' ? '❤️' : (pwr.type === 'shield' ? '🛡️' : '⚡');
    ctx.fillText(icon, pwr.x, pwr.y);

    // Semak Sentuhan dengan Kapal
    if (checkCollision(pwr, player)) {
      playPowerUpSound();
      if (pwr.type === 'heal' && lives < 5) lives++;
      if (pwr.type === 'shield') hasShield = true;
      if (pwr.type === 'double') doubleShotTimer = 5; // Aktif 5 saat

      updateHUD();
      powerups.splice(pwrIdx, 1);
      continue;
    }

    if (pwr.y - pwr.radius > canvas.height) powerups.splice(pwrIdx, 1);
  }

  // 6. Meteor
  for (let mIdx = meteors.length - 1; mIdx >= 0; mIdx--) {
    const m = meteors[mIdx];
    m.y += m.speed;

    ctx.fillStyle = '#f87171';
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
    ctx.fill();

    // Ditembak peluru
    for (let bIdx = bullets.length - 1; bIdx >= 0; bIdx--) {
      const b = bullets[bIdx];
      if (checkCollision(m, b)) {
        createExplosion(m.x, m.y, '#fb923c', 12);
        bullets.splice(bIdx, 1);
        meteors.splice(mIdx, 1);
        score += 25;
        playExplosionSound();
        updateHUD();
        break;
      }
    }

    // Melanggar kapal
    if (checkCollision(m, player)) {
      createExplosion(m.x, m.y, '#ef4444', 16);
      meteors.splice(mIdx, 1);

      if (hasShield) {
        hasShield = false; // Perisai serap serangan
        playExplosionSound();
      } else {
        lives--;
        playHitSound();
        updateHUD();
        if (lives <= 0) {
          endGame('💀 GAME OVER');
          return;
        }
      }
      continue;
    }

    // Terlepas ke bawah skrin
    if (m.y - m.radius > canvas.height) {
      meteors.splice(mIdx, 1);
      lives--;
      playHitSound();
      updateHUD();
      if (lives <= 0) {
        endGame('💀 GAME OVER');
        return;
      }
    }
  }

  // 7. Bom
  for (let bIndex = bombs.length - 1; bIndex >= 0; bIndex--) {
    const bomb = bombs[bIndex];
    bomb.y += bomb.speed;

    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.arc(bomb.x, bomb.y, bomb.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(bomb.x, bomb.y, bomb.radius - 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💣', bomb.x, bomb.y);

    // Tertembak bom -> Nyawa habis terus walaupun ada perisai!
    for (let bltIdx = bullets.length - 1; bltIdx >= 0; bltIdx--) {
      const b = bullets[bltIdx];
      if (checkCollision(bomb, b)) {
        createExplosion(bomb.x, bomb.y, '#ef4444', 30);
        bullets.splice(bltIdx, 1);
        bombs.splice(bIndex, 1);
        lives = 0;
        updateHUD();
        playNukeSound();
        endGame('💥 YOU SHOT THE BOMB! GAME OVER!');
        return;
      }
    }

    // Bom langgar kapal
    if (checkCollision(bomb, player)) {
      createExplosion(bomb.x, bomb.y, '#ef4444', 30);
      bombs.splice(bIndex, 1);
      lives = 0;
      updateHUD();
      playNukeSound();
      endGame('💥 SHIP HAVE BEEN STRUCK BY THE BOM!');
      return;
    }

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
  initStars();
  score = 0;
  lives = 3;
  hasShield = false;
  doubleShotTimer = 0;
  bullets = [];
  meteors = [];
  bombs = [];
  powerups = [];
  particles = [];
  player.x = canvas.width / 2 - player.width / 2;
  joystickMove = { x: 0, y: 0 };
  player.y = canvas.height - 60;
  
  updateHUD();
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');

  isPlaying = true;
  lastSpawnTime = performance.now();

  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(gameLoop);
}

function endGame(titleText) {
  isPlaying = false;
  cancelAnimationFrame(animationId);

  endTitle.textContent = titleText;
  endTitle.style.color = '#ef4444';
  endMessage.textContent = `Last Score: ${score}`;

  gameOverScreen.classList.remove('hidden');
}

// ---> LETAK DI SINI (BARIS PALING AKHIR DALAM FAIL) <---
updateHUD();