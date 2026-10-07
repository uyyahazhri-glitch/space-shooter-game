// --- ELEMEN DOM & KONFIGURASI KANVAS ---
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

// --- PEMBOLEHUBAH PERMAINAN ---
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

// Senarai Peluru & Meteor
let bullets = [];
let meteors = [];

// --- PENGENDALIAN INPUT ---
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
    keys.left = true;
  }
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
    keys.right = true;
  }
  if (e.code === 'Space') {
    e.preventDefault(); // Elak scroll halaman
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

// Tembak menggunakan klik tetikus pada kanvas
canvas.addEventListener('mousedown', () => {
  if (isPlaying) shootBullet();
});

// Butang Mula & Semula
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// --- FUNGSI MEKANIK PERMAINAN ---
function shootBullet() {
  bullets.push({
    x: player.x + player.width / 2 - 3,
    y: player.y,
    width: 6,
    height: 12,
    speed: 9
  });
}

function spawnMeteor() {
  if (!isPlaying) return;
  const radius = Math.floor(Math.random() * 14) + 16; // Saiz 16px - 30px
  const x = Math.random() * (canvas.width - radius * 2) + radius;
  const speed = Math.random() * 2 + 2; // Kelajuan 2 - 4

  meteors.push({ x, y: -radius, radius, speed });
}

// Logik Pengesanan Perlanggaran Kotak-Bulatan
function checkCollision(meteor, rect) {
  const distX = Math.abs(meteor.x - rect.x - rect.width / 2);
  const distY = Math.abs(meteor.y - rect.y - rect.height / 2);

  if (distX > (rect.width / 2 + meteor.radius)) return false;
  if (distY > (rect.height / 2 + meteor.radius)) return false;

  if (distX <= (rect.width / 2)) return true;
  if (distY <= (rect.height / 2)) return true;

  const dx = distX - rect.width / 2;
  const dy = distY - rect.height / 2;
  return (dx * dx + dy * dy <= (meteor.radius * meteor.radius));
}

// Kemas kini paparan HUD
function updateHUD() {
  scoreDisplay.textContent = score;
  livesDisplay.textContent = '❤️'.repeat(Math.max(0, lives));
}

// --- KITARAN PERMAINAN (GAME LOOP) ---
function gameLoop() {
  if (!isPlaying) return;

  // 1. Bersihkan Kanvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 2. Pergerakan Pemain
  if (keys.left && player.x > 0) {
    player.x -= player.speed;
  }
  if (keys.right && player.x < canvas.width - player.width) {
    player.x += player.speed;
  }

  // Lukis Kapal Pemain (Bentuk Segitiga Kapal)
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.moveTo(player.x + player.width / 2, player.y);
  ctx.lineTo(player.x, player.y + player.height);
  ctx.lineTo(player.x + player.width, player.y + player.height);
  ctx.closePath();
  ctx.fill();

  // 3. Kemaskini & Lukis Peluru
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.y -= b.speed;

    // Lukis Peluru
    ctx.fillStyle = '#facc15';
    ctx.fillRect(b.x, b.y, b.width, b.height);

    // Buang jika keluar skrin atas
    if (b.y < -b.height) {
      bullets.splice(i, 1);
    }
  }

  // 4. Kemaskini & Lukis Meteor
  for (let mIdx = meteors.length - 1; mIdx >= 0; mIdx--) {
    const m = meteors[mIdx];
    m.y += m.speed;

    // Lukis Meteor
    ctx.fillStyle = '#f87171';
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
    ctx.fill();

    // Semak jika peluru kena meteor
    for (let bIdx = bullets.length - 1; bIdx >= 0; bIdx--) {
      const b = bullets[bIdx];
      if (checkCollision(m, b)) {
        bullets.splice(bIdx, 1);
        meteors.splice(mIdx, 1);
        score += 25;
        updateHUD();

        // Syarat Menang
        if (score >= TARGET_SCORE) {
          endGame(true);
          return;
        }
        break;
      }
    }

    // Semak jika meteor langgar kapal
    if (checkCollision(m, player)) {
      meteors.splice(mIdx, 1);
      lives--;
      updateHUD();
      if (lives <= 0) {
        endGame(false);
        return;
      }
      continue;
    }

    // Semak jika meteor terlepas melepasi bawah skrin
    if (m.y - m.radius > canvas.height) {
      meteors.splice(mIdx, 1);
      lives--;
      updateHUD();
      if (lives <= 0) {
        endGame(false);
        return;
      }
    }
  }

  animationId = requestAnimationFrame(gameLoop);
}

// --- MULA & TAMAT PERMAINAN ---
function startGame() {
  score = 0;
  lives = 3;
  bullets = [];
  meteors = [];
  player.x = canvas.width / 2 - player.width / 2;
  keys.left = false;
  keys.right = false;

  updateHUD();
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');

  isPlaying = true;
  clearInterval(spawnTimer);
  spawnTimer = setInterval(spawnMeteor, 1000); // 1 meteor setiap saat

  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(gameLoop);
}

function endGame(won) {
  isPlaying = false;
  clearInterval(spawnTimer);
  cancelAnimationFrame(animationId);

  if (won) {
    endTitle.textContent = '🎉 TAHNIAH! ANDA MENANG!';
    endTitle.style.color = '#4ade80';
    endMessage.textContent = `Anda berjaya mencapai sasaran ${score} mata!`;
  } else {
    endTitle.textContent = '💀 PERMAINAN TAMAT';
    endTitle.style.color = '#ef4444';
    endMessage.textContent = `Nyawa habis! Skor akhir anda: ${score}`;
  }

  gameOverScreen.classList.remove('hidden');
}


