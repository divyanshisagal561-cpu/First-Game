/**
 * Turbo Racer - 2D Arcade Racing Game
 * Vanilla JavaScript Engine using HTML5 Canvas
 */

(function () {
  'use strict';

  // --- DOM Elements ---
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  
  const startScreen = document.getElementById('startScreen');
  const gameOverScreen = document.getElementById('gameOverScreen');
  const hud = document.getElementById('hud');
  
  const scoreDisplay = document.getElementById('scoreDisplay');
  const speedDisplay = document.getElementById('speedDisplay');
  const hudBestDisplay = document.getElementById('hudBestDisplay');
  const startHighScore = document.getElementById('startHighScore');
  const finalScoreDisplay = document.getElementById('finalScore');
  const bestScoreDisplay = document.getElementById('bestScore');
  const newHighBadge = document.getElementById('newHighBadge');
  
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');
  const soundToggle = document.getElementById('soundToggle');
  const soundIcon = document.getElementById('soundIcon');

  // --- Game Config & Constants ---
  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 650;
  
  const ROAD_LEFT = 55;
  const ROAD_RIGHT = 345;
  const ROAD_WIDTH = ROAD_RIGHT - ROAD_LEFT; // 290px
  
  const LANES = [103, 200, 297]; // Center X for 3 lanes
  
  const PLAYER_WIDTH = 44;
  const PLAYER_HEIGHT = 76;
  const PLAYER_START_X = 200 - PLAYER_WIDTH / 2;
  const PLAYER_START_Y = 530;

  // --- Sound Effects System (Web Audio API) ---
  let audioCtx = null;
  let isMuted = false;

  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
  }

  function playTone(freq, type, duration, startVol = 0.1, endVol = 0.001) {
    if (isMuted || !audioCtx) return;
    try {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(startVol, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(endVol, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Ignore audio errors if audio context is blocked
    }
  }

  function playCrashSound() {
    if (isMuted || !audioCtx) return;
    try {
      // Noise burst for explosion
      const bufferSize = audioCtx.sampleRate * 0.5;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      noise.connect(gain);
      gain.connect(audioCtx.destination);
      noise.start();

      // Low frequency rumble
      playTone(80, 'sawtooth', 0.6, 0.4, 0.01);
    } catch (e) {}
  }

  function playStartSound() {
    playTone(440, 'sine', 0.1, 0.15, 0.01);
    setTimeout(() => playTone(880, 'sine', 0.25, 0.2, 0.01), 100);
  }

  soundToggle.addEventListener('click', () => {
    isMuted = !isMuted;
    soundIcon.textContent = isMuted ? '🔇' : '🔊';
  });

  // --- High Score Persistence ---
  const STORAGE_KEY = 'turbo_racer_high_score';
  function getHighScore() {
    return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
  }
  function setHighScore(score) {
    localStorage.setItem(STORAGE_KEY, score.toString());
  }

  // --- Input Handling ---
  const keys = {
    left: false,
    right: false,
  };

  window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      keys.left = true;
      e.preventDefault();
    }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      keys.right = true;
      e.preventDefault();
    }
    if (e.code === 'Space') {
      e.preventDefault();
      if (gameState === 'START' || gameState === 'GAMEOVER') {
        startGame();
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      keys.left = false;
    }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      keys.right = false;
    }
  });

  // Touch / Mobile Steering Controls
  let touchStartX = null;
  canvas.addEventListener('touchstart', (e) => {
    initAudio();
    if (e.touches.length > 0) {
      touchStartX = e.touches[0].clientX;
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    if (touchStartX === null || gameState !== 'PLAYING') return;
    const touchX = e.touches[0].clientX;
    const diff = touchX - touchStartX;
    if (diff < -10) {
      keys.left = true;
      keys.right = false;
    } else if (diff > 10) {
      keys.right = true;
      keys.left = false;
    } else {
      keys.left = false;
      keys.right = false;
    }
  }, { passive: true });

  canvas.addEventListener('touchend', () => {
    touchStartX = null;
    keys.left = false;
    keys.right = false;
  });

  // --- Game State Variables ---
  let gameState = 'START'; // 'START', 'PLAYING', 'GAMEOVER'
  let score = 0;
  let highScore = getHighScore();
  let baseSpeed = 6;
  let currentSpeed = baseSpeed;
  let distanceScrolled = 0;
  let lastTime = 0;
  let enemySpawnTimer = 0;
  let enemySpawnInterval = 90; // frames

  // Entity Lists
  let player = null;
  let enemies = [];
  let particles = [];
  let sideTrees = [];

  // Vehicle Colors Palette
  const ENEMY_TYPES = [
    { type: 'sedan', color: '#38bdf8', height: 74, width: 44, speedMult: 0.85 },
    { type: 'sports', color: '#f43f5e', height: 72, width: 42, speedMult: 1.15 },
    { type: 'truck', color: '#eab308', height: 95, width: 46, speedMult: 0.7 },
    { type: 'police', color: '#a855f7', height: 76, width: 44, speedMult: 1.0, isPolice: true }
  ];

  // Initialize Side Props (Trees/Lamps)
  function initEnvironment() {
    sideTrees = [];
    for (let y = -50; y < CANVAS_HEIGHT + 50; y += 80) {
      sideTrees.push({ y, side: 'left', size: 14 + Math.random() * 6 });
      sideTrees.push({ y: y + 40, side: 'right', size: 14 + Math.random() * 6 });
    }
  }

  // --- Player Class ---
  class PlayerCar {
    constructor() {
      this.x = PLAYER_START_X;
      this.y = PLAYER_START_Y;
      this.width = PLAYER_WIDTH;
      this.height = PLAYER_HEIGHT;
      this.speedX = 6.5;
      this.tilt = 0; // Visual rotation when turning
    }

    update() {
      if (keys.left) {
        this.x -= this.speedX;
        this.tilt = Math.max(this.tilt - 0.03, -0.15);
      } else if (keys.right) {
        this.x += this.speedX;
        this.tilt = Math.min(this.tilt + 0.03, 0.15);
      } else {
        this.tilt *= 0.8; // Dampen tilt
      }

      // Constrain player within asphalt road boundary
      const minX = ROAD_LEFT + 4;
      const maxX = ROAD_RIGHT - this.width - 4;
      if (this.x < minX) this.x = minX;
      if (this.x > maxX) this.x = maxX;

      // Exhaust smoke particles
      if (Math.random() < 0.4) {
        particles.push(new Particle(
          this.x + this.width / 2 + (Math.random() * 8 - 4),
          this.y + this.height - 4,
          (Math.random() - 0.5) * 0.5,
          currentSpeed * 0.3 + Math.random() * 1.5,
          'rgba(255, 255, 255, 0.3)',
          Math.random() * 4 + 2,
          0.92
        ));
      }
    }

    draw() {
      ctx.save();
      ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
      ctx.rotate(this.tilt);

      const w = this.width;
      const h = this.height;
      const hw = w / 2;
      const hh = h / 2;

      // Car Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.roundRect(-hw - 3, -hh + 5, w + 6, h + 2, 8);
      ctx.fill();

      // Wheels
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-hw - 3, -hh + 10, 4, 16); // Front Left
      ctx.fillRect(hw - 1, -hh + 10, 4, 16);  // Front Right
      ctx.fillRect(-hw - 3, hh - 24, 4, 16);  // Rear Left
      ctx.fillRect(hw - 1, hh - 24, 4, 16);   // Rear Right

      // Car Main Body (Red Sports Metallic)
      const bodyGradient = ctx.createLinearGradient(-hw, 0, hw, 0);
      bodyGradient.addColorStop(0, '#dc2626');
      bodyGradient.addColorStop(0.5, '#ef4444');
      bodyGradient.addColorStop(1, '#b91c1c');

      ctx.fillStyle = bodyGradient;
      ctx.beginPath();
      ctx.roundRect(-hw, -hh, w, h, 10);
      ctx.fill();

      // Side Racing Stripes
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2, -hh + 4, 4, h - 8);

      // Windshield & Rear Window
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-hw + 6, -hh + 18, w - 12, 16, 4); // Front windshield
      ctx.fill();

      ctx.beginPath();
      ctx.roundRect(-hw + 8, hh - 26, w - 16, 10, 3);  // Rear window
      ctx.fill();

      // Roof
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.roundRect(-hw + 6, -hh + 34, w - 12, 20, 3);
      ctx.fill();

      // Headlights Beam Light Cones
      ctx.fillStyle = 'rgba(254, 240, 138, 0.25)';
      ctx.beginPath();
      ctx.moveTo(-hw + 4, -hh);
      ctx.lineTo(-hw - 15, -hh - 80);
      ctx.lineTo(-hw + 25, -hh - 80);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(hw - 4, -hh);
      ctx.lineTo(hw - 25, -hh - 80);
      ctx.lineTo(hw + 15, -hh - 80);
      ctx.closePath();
      ctx.fill();

      // Headlight Bulbs
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(-hw + 6, -hh + 4, 3, 0, Math.PI * 2);
      ctx.arc(hw - 6, -hh + 4, 3, 0, Math.PI * 2);
      ctx.fill();

      // Tail lights
      ctx.fillStyle = '#ff0000';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 8;
      ctx.fillRect(-hw + 4, hh - 3, 8, 3);
      ctx.fillRect(hw - 12, hh - 3, 8, 3);

      ctx.restore();
    }

    // Precise Collision Hitbox
    getBounds() {
      const paddingX = 5;
      const paddingY = 4;
      return {
        x: this.x + paddingX,
        y: this.y + paddingY,
        width: this.width - paddingX * 2,
        height: this.height - paddingY * 2
      };
    }
  }

  // --- Enemy Car Class ---
  class EnemyCar {
    constructor(laneIndex, typeObj) {
      this.width = typeObj.width;
      this.height = typeObj.height;
      this.x = LANES[laneIndex] - this.width / 2;
      this.y = -this.height - 20;
      this.type = typeObj.type;
      this.color = typeObj.color;
      this.isPolice = !!typeObj.isPolice;
      this.speed = currentSpeed * typeObj.speedMult;
      this.flashTimer = 0;
    }

    update() {
      // Enemy moves downwards relative to player
      this.y += currentSpeed - (currentSpeed - this.speed);
      this.flashTimer += 0.1;
    }

    draw() {
      ctx.save();
      const w = this.width;
      const h = this.height;
      const x = this.x;
      const y = this.y;

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.roundRect(x - 2, y + 4, w + 4, h + 2, 6);
      ctx.fill();

      // Wheels
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x - 2, y + 10, 3, 14);
      ctx.fillRect(x + w - 1, y + 10, 3, 14);
      ctx.fillRect(x - 2, y + h - 22, 3, 14);
      ctx.fillRect(x + w - 1, y + h - 22, 3, 14);

      // Car Body
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 8);
      ctx.fill();

      // Glass Windows
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(x + 5, y + 16, w - 10, 14, 3); // Front
      ctx.fill();

      ctx.beginPath();
      ctx.roundRect(x + 6, y + h - 24, w - 12, 10, 2); // Rear
      ctx.fill();

      // Police flashing lights if police car
      if (this.isPolice) {
        const isRed = Math.floor(this.flashTimer * 10) % 2 === 0;
        ctx.fillStyle = isRed ? '#ef4444' : '#38bdf8';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Headlights (Facing down towards player)
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(x + 4, y + h - 3, 6, 2);
      ctx.fillRect(x + w - 10, y + h - 3, 6, 2);

      // Tail Lights (Facing up)
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(x + 4, y + 1, 6, 2);
      ctx.fillRect(x + w - 10, y + 1, 6, 2);

      ctx.restore();
    }

    getBounds() {
      const paddingX = 4;
      const paddingY = 4;
      return {
        x: this.x + paddingX,
        y: this.y + paddingY,
        width: this.width - paddingX * 2,
        height: this.height - paddingY * 2
      };
    }
  }

  // --- Particle Effect Class ---
  class Particle {
    constructor(x, y, vx, vy, color, radius, decay = 0.95) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.color = color;
      this.radius = radius;
      this.alpha = 1;
      this.decay = decay;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.alpha *= this.decay;
      this.radius *= 0.96;
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = Math.max(this.alpha, 0);
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, Math.max(this.radius, 0.1), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Spawn Explosion Particles on Crash
  function createCrashExplosion(x, y) {
    const colors = ['#ef4444', '#f97316', '#facc15', '#ffffff', '#38bdf8'];
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 12 + 2;
      const color = colors[Math.floor(Math.random() * colors.length)];
      particles.push(new Particle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color,
        Math.random() * 6 + 3,
        0.94
      ));
    }
  }

  // AABB Collision Detection Test
  function checkCollision(rect1, rect2) {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  }

  // --- Environment & Road Rendering ---
  function drawEnvironment() {
    // 1. Side Grass Fields
    ctx.fillStyle = '#15803d'; // Rich Grass Green
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. Dark Asphalt Road
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, CANVAS_HEIGHT);

    // 3. Red & White Side Curbs / Rumble Strips
    const curbWidth = 8;
    const stripeLength = 30;
    const curbOffsetY = distanceScrolled % (stripeLength * 2);

    for (let y = -stripeLength * 2; y < CANVAS_HEIGHT + stripeLength; y += stripeLength) {
      const isRed = Math.floor((y + curbOffsetY) / stripeLength) % 2 === 0;
      ctx.fillStyle = isRed ? '#dc2626' : '#f8fafc';
      
      // Left Curb
      ctx.fillRect(ROAD_LEFT - curbWidth, y + (curbOffsetY % stripeLength), curbWidth, stripeLength);
      // Right Curb
      ctx.fillRect(ROAD_RIGHT, y + (curbOffsetY % stripeLength), curbWidth, stripeLength);
    }

    // 4. Animated White Dashed Lane Dividers
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    const dashLength = 35;
    const dashGap = 35;
    const laneOffsetY = (distanceScrolled * 1.2) % (dashLength + dashGap);

    const laneDividers = [ROAD_LEFT + ROAD_WIDTH / 3, ROAD_LEFT + (ROAD_WIDTH * 2) / 3];

    laneDividers.forEach((dividerX) => {
      for (let y = -dashLength - dashGap; y < CANVAS_HEIGHT + dashLength; y += dashLength + dashGap) {
        ctx.fillRect(dividerX - 2, y + laneOffsetY, 4, dashLength);
      }
    });

    // 5. Side Trees / Lamp Posts Scrolling
    sideTrees.forEach((tree) => {
      tree.y += currentSpeed * 0.8;
      if (tree.y > CANVAS_HEIGHT + 40) {
        tree.y = -40;
      }

      const treeX = tree.side === 'left' ? 22 : CANVAS_WIDTH - 22;

      // Tree Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.arc(treeX + 3, tree.y + 3, tree.size, 0, Math.PI * 2);
      ctx.fill();

      // Tree Foliage
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.arc(treeX, tree.y, tree.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(treeX - 2, tree.y - 2, tree.size * 0.6, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // --- Main Game Loop & Logic ---
  function updateGame() {
    if (gameState !== 'PLAYING') return;

    // Update Distance & Speed Progression
    distanceScrolled += currentSpeed;
    score = Math.floor(distanceScrolled / 10);
    
    // Smoothly scale speed and difficulty over score
    currentSpeed = baseSpeed + Math.min(score / 150, 10); // Max speed cap = 16
    enemySpawnInterval = Math.max(90 - Math.floor(score / 40), 32); // Min spawn frames = 32

    // Update HUD Text
    scoreDisplay.textContent = score;
    speedDisplay.textContent = `${Math.floor(currentSpeed * 12)} KM/H`;

    // Update Player
    player.update();

    // Spawn Enemy Vehicles
    enemySpawnTimer++;
    if (enemySpawnTimer >= enemySpawnInterval) {
      enemySpawnTimer = 0;
      
      // Select random available lane
      const laneIdx = Math.floor(Math.random() * LANES.length);
      const enemyType = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];

      // Check if top of chosen lane is clear to avoid instant overlap
      const laneClear = enemies.every(e => e.y > 100 || Math.abs(e.x - (LANES[laneIdx] - enemyType.width / 2)) > 10);

      if (laneClear) {
        enemies.push(new EnemyCar(laneIdx, enemyType));
      }
    }

    // Update Enemies & Check Collisions
    const playerBounds = player.getBounds();

    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      enemy.update();

      // Collision Check
      if (checkCollision(playerBounds, enemy.getBounds())) {
        triggerGameOver();
        return;
      }

      // Remove enemies off bottom screen
      if (enemy.y > CANVAS_HEIGHT + 120) {
        enemies.splice(i, 1);
      }
    }

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.update();
      if (p.alpha <= 0.05 || p.radius <= 0.2) {
        particles.splice(i, 1);
      }
    }
  }

  function renderGame() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 1. Draw Road & Environment
    drawEnvironment();

    // 2. Draw Particles Behind Cars
    particles.forEach(p => p.draw());

    // 3. Draw Enemy Cars
    enemies.forEach(e => e.draw());

    // 4. Draw Player Car
    if (player) {
      player.draw();
    }
  }

  function gameLoop(timestamp) {
    updateGame();
    renderGame();

    if (gameState === 'PLAYING') {
      requestAnimationFrame(gameLoop);
    }
  }

  // --- Start & Game Over Functions ---
  function startGame() {
    initAudio();
    playStartSound();

    gameState = 'PLAYING';
    score = 0;
    distanceScrolled = 0;
    currentSpeed = baseSpeed;
    enemySpawnTimer = 0;

    enemies = [];
    particles = [];

    player = new PlayerCar();
    initEnvironment();

    // UI Overlay Toggles
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    
    hudBestDisplay.textContent = getHighScore();

    requestAnimationFrame(gameLoop);
  }

  function triggerGameOver() {
    gameState = 'GAMEOVER';
    playCrashSound();

    if (player) {
      createCrashExplosion(player.x + player.width / 2, player.y + player.height / 2);
    }

    // Render remaining crash explosion frame
    renderGame();

    // High Score Check
    const currentHigh = getHighScore();
    let isNewHigh = false;

    if (score > currentHigh) {
      setHighScore(score);
      highScore = score;
      isNewHigh = true;
    }

    // Update Game Over Modal UI
    finalScoreDisplay.textContent = score;
    bestScoreDisplay.textContent = getHighScore();

    if (isNewHigh && score > 0) {
      newHighBadge.classList.remove('hidden');
    } else {
      newHighBadge.classList.add('hidden');
    }

    setTimeout(() => {
      hud.classList.add('hidden');
      gameOverScreen.classList.remove('hidden');
    }, 400);
  }

  // --- Initial Setup on Page Load ---
  function init() {
    // Canvas resolution setup
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    highScore = getHighScore();
    startHighScore.textContent = highScore;
    hudBestDisplay.textContent = highScore;

    initEnvironment();
    player = new PlayerCar();
    renderGame(); // Draw initial static frame for background preview
  }

  // Event Listeners for UI Buttons
  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', startGame);

  // Initialize
  init();
})();
