/**
 * SweetBlitz - Game Logic & Effects Engine
 */

// --- 1. OYUN SABİTLERİ VE DEĞİŞKENLERİ ---
const GRID_SIZE = 8;
const CANDY_TYPES = 6;
const BASE_MOVES = 30;

// Renk kodları (Parçacık efektleri için SVG şeker renkleriyle uyumlu)
const CANDY_COLORS = [
  '#ff1a4a', // Kırmızı
  '#ff9800', // Turuncu
  '#fbc02d', // Sarı
  '#689f38', // Yeşil
  '#0288d1', // Mavi
  '#7b1fa2'  // Mor
];

const CANDY_IDS = [
  'candy-red',
  'candy-orange',
  'candy-yellow',
  'candy-green',
  'candy-blue',
  'candy-purple'
];

let board = [];
let score = 0;
let scoreAtLevelStart = 0; // Seviye başındaki skoru korumak için
let level = 1;
let movesLeft = BASE_MOVES;
let highScore = 0;
let comboCount = 0;
let isAnimating = false;
let candyIdCounter = 0;
let currentGoals = []; // Aktif seviye hedefleri: [{ type, required, collected }]
let activeCandyTypesCount = 6;
let lives = 5;
let lastLifeTime = Date.now();

// Joker Güçlendiriciler State
let jokers = { hammer: 3, spray: 2, moves: 2, bomb: 2, fish: 2 };
let jokersAtLevelStart = { hammer: 3, spray: 2, moves: 2, bomb: 2, fish: 2 };
let activeJoker = null; // 'hammer' | 'spray' | 'bomb' | 'fish' | null
let turnPlayedThisStep = false;
let hintTimeout = null;
let activeHintCandies = [];
let googleLoggedIn = false;
let googleUserName = '';
let googleUserEmail = '';
let googleUserBgClass = '';
let googleUserLetter = '';
let googleUserPicUrl = '';

// Jöle Engeli, Duvar/Blok Engeli ve Deneme Sayacı State
let jellyBoard = new Array(GRID_SIZE * GRID_SIZE).fill(0);
let jellyElements = new Array(GRID_SIZE * GRID_SIZE).fill(null);
let blockerBoard = new Array(GRID_SIZE * GRID_SIZE).fill(0);
let blockerElements = new Array(GRID_SIZE * GRID_SIZE).fill(null);
let gummyBoard = new Array(GRID_SIZE * GRID_SIZE).fill(0);
let gummyElements = new Array(GRID_SIZE * GRID_SIZE).fill(null);
let frostingBoard = new Array(GRID_SIZE * GRID_SIZE).fill(0);
let frostingElements = new Array(GRID_SIZE * GRID_SIZE).fill(null);
let activeGummyBears = [];
let gummyBearCellMap = {};
let chocolateBoard = new Array(GRID_SIZE * GRID_SIZE).fill(0);
let chocolateElements = new Array(GRID_SIZE * GRID_SIZE).fill(null);
let chocolateClearedThisTurn = false;
let currentLevelAttempts = 1;

// Sürükleme (Swipe) Takip Değişkenleri
let selectedCandy = null;
let dragStartX = 0;
let dragStartY = 0;
let activeDragListeners = false;
let lastSwappedIndices = []; // [idx1, idx2] özel şekerlerin konumunu belirlemek için

// DOM Elemanları
let boardContainer;
let effectsCanvas;
let ctx;
let startScreen;
let gameScreen;
let gameOverScreen;
let scoreVal;
let levelVal;
let movesVal;
let muteMusicBtn, muteSFXBtn;
let restartBtn;
let startBtn;
let nextLevelBtn;
let retryLevelBtn;

// --- HARİTA SİSTEMİ VE GEÇİŞ DEĞİŞKENLERİ ---
let mapScreen;
let mapViewport;
let mapScrollContainer;
let mapPathLine;
let mapNodesContainer;
let playerAvatarToken;
let levelModal;
let closeModalBtn;
let playLevelBtn;
let modalLevelTitle;
let modalLevelStars;
let modalGoalsList;
let modalHighScoreVal;
let screenTransition;

let maxUnlockedLevel = 1;
let levelStars = {};
let selectedMapLevel = 1;
let goldBars = 7648;

let inboxMessages = [];
const DEFAULT_INBOX_MESSAGES = [
  {
    id: 'msg_welcome',
    title: 'Hoş Geldin Hediyesi! 🎁',
    desc: 'SweetBlitz\'e hoş geldin! Sana başlangıç hediyesi olarak 500 Altın gönderildi!',
    reward: { type: 'gold', amount: 500 },
    claimed: false,
    date: Date.now() - 3600000 * 2
  },
  {
    id: 'msg_lives',
    title: 'Haftalık Can Takviyesi ❤️',
    desc: 'Haritada daha hızlı ilerlemen için 3 adet Can hediye edildi!',
    reward: { type: 'lives', amount: 3 },
    claimed: false,
    date: Date.now() - 3600000 * 5
  },
  {
    id: 'msg_hammer',
    title: 'Şeker Patlatma Uzmanı 🔨',
    desc: 'Zorlu engelleri kolayca aşabilmen için envanterine 1 Çekiç eklendi!',
    reward: { type: 'joker', jokerType: 'hammer', amount: 1 },
    claimed: false,
    date: Date.now() - 3600000 * 12
  },
  {
    id: 'msg_update',
    title: 'Büyük Güncelleme! 📢',
    desc: 'SweetBlitz v2.5 sürümüne güncellendi! Yeni Candy Crush şeker teması, 5000 seviyeli dev harita ve optimize edilmiş balık efektleri devrede. Keyifli oyunlar!',
    reward: null,
    claimed: false,
    date: Date.now() - 3600000 * 24
  }
];

// --- 2. SES SENTEZLEYİCİ ENGINE (Web Audio API) ---
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.mutedSFX = localStorage.getItem('candy_muted_sfx') === 'true';
    this.mutedMusic = localStorage.getItem('candy_muted_music') === 'true';
    this.musicPlaying = false;
    this.musicTimer = null;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  updateMuteButtonsUI() {
    const mSpan = document.getElementById('music-icon-span');
    const mapMSpan = document.getElementById('map-music-icon-span');
    const sSpan = document.getElementById('sfx-icon-span');
    const mapSSpan = document.getElementById('map-sfx-icon-span');
    
    if (mSpan) mSpan.innerText = this.mutedMusic ? '🔇' : '🎵';
    if (mapMSpan) mapMSpan.innerText = this.mutedMusic ? '🔇' : '🎵';
    if (sSpan) sSpan.innerText = this.mutedSFX ? '🔇' : '🔊';
    if (mapSSpan) mapSSpan.innerText = this.mutedSFX ? '🔇' : '🔊';
  }

  toggleMuteMusic() {
    this.mutedMusic = !this.mutedMusic;
    localStorage.setItem('candy_muted_music', this.mutedMusic);
    this.updateMuteButtonsUI();
    if (this.mutedMusic) {
      this.stopMusic();
    } else {
      this.init();
      this.startMusic();
    }
    return this.mutedMusic;
  }

  toggleMuteSFX() {
    this.mutedSFX = !this.mutedSFX;
    localStorage.setItem('candy_muted_sfx', this.mutedSFX);
    this.updateMuteButtonsUI();
    if (!this.mutedSFX) {
      this.init();
      this.playPop(0);
    }
    return this.mutedSFX;
  }

  startMusic() {
    if (this.mutedMusic) return;
    this.init();
    if (this.musicPlaying) return;
    this.musicPlaying = true;
    
    // A sweet, modern F-major arpeggiated ambient match-3 loop
    const melody = [
      { f: 349.23, d: 0.35 }, // F4
      { f: 440.00, d: 0.35 }, // A4
      { f: 523.25, d: 0.35 }, // C5
      { f: 659.25, d: 0.70 }, // E5
      { f: 523.25, d: 0.35 }, // C5
      { f: 587.33, d: 0.70 }, // D5
      { f: 440.00, d: 1.10 }, // A4
      
      { f: 392.00, d: 0.35 }, // G4
      { f: 493.88, d: 0.35 }, // B4
      { f: 587.33, d: 0.35 }, // D5
      { f: 698.46, d: 0.70 }, // F5
      { f: 587.33, d: 0.35 }, // D5
      { f: 659.25, d: 0.70 }, // E5
      { f: 493.88, d: 1.10 }, // B4
      
      { f: 329.63, d: 0.35 }, // E4
      { f: 392.00, d: 0.35 }, // G4
      { f: 493.88, d: 0.35 }, // B4
      { f: 587.33, d: 0.70 }, // D5
      { f: 523.25, d: 0.35 }, // C5
      { f: 440.00, d: 0.70 }, // A4
      { f: 349.23, d: 1.10 }  // F4
    ];
    
    let noteIdx = 0;
    const playNextNote = () => {
      if (!this.musicPlaying || this.mutedMusic) return;
      
      const note = melody[noteIdx];
      const time = this.ctx.currentTime;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle'; // Soft cozy synthesizer sound
      osc.frequency.setValueAtTime(note.f, time);
      
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.035, time + 0.05); // very soft background volume
      gain.gain.exponentialRampToValueAtTime(0.001, time + note.d);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(time);
      osc.stop(time + note.d);
      
      const delay = note.d * 1000 + 80;
      noteIdx = (noteIdx + 1) % melody.length;
      
      this.musicTimer = setTimeout(playNextNote, delay);
    };
    
    playNextNote();
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  playSwap() {
    if (this.mutedSFX) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(380, this.ctx.currentTime + 0.12);
    
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  playPop(combo = 0) {
    if (this.mutedSFX) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    const pitch = Math.min(900, 300 + combo * 55);
    osc.frequency.setValueAtTime(pitch, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(70, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playSpecial() {
    if (this.mutedSFX) return;
    this.init();
    const duration = 0.35;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(45, this.ctx.currentTime + duration);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc2.frequency.linearRampToValueAtTime(350, this.ctx.currentTime + duration);
    
    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + duration);
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc1.start();
    osc2.start();
    osc1.stop(this.ctx.currentTime + duration);
    osc2.stop(this.ctx.currentTime + duration);
  }

  playLaserBlast() {
    if (this.mutedSFX) return;
    this.init();
    const duration = 0.45;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + duration);
    
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playRevert() {
    if (this.mutedSFX) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, this.ctx.currentTime);
    osc.frequency.setValueAtTime(85, this.ctx.currentTime + 0.08);
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playJellyPop() {
    if (this.mutedSFX) return;
    this.init();
    const duration = 0.22;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(350, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + duration);
    
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playLevelUp() {
    if (this.mutedSFX) return;
    this.init();
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C4, E4, G4, C5, E5, G5
    const now = this.ctx.currentTime;
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      gain.gain.setValueAtTime(0.1, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.07 + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.25);
    });
  }

  playGameOver() {
    if (this.mutedSFX) return;
    this.init();
    const notes = [392.00, 311.13, 261.63, 196.00]; // G4, Eb4, C4, G3
    const now = this.ctx.currentTime;
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);
      gain.gain.setValueAtTime(0.15, now + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.15 + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 0.35);
    });
  }
}

const soundEngine = new SoundEngine();

// --- 3. EFEKT SİSTEMİ (Canvas Üzerinde Parçacıklar ve Yazılar) ---
let effects = [];

function spawnParticles(x, y, type, count = 12) {
  const rect = boardContainer.getBoundingClientRect();
  const cellWidth = rect.width / GRID_SIZE;
  const cellHeight = rect.height / GRID_SIZE;
  const px = (x + 0.5) * cellWidth;
  const py = (y + 0.5) * cellHeight;
  const color = CANDY_COLORS[type] || '#ffd23f';

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 4.0 + 2.0; // Daha kontrollü hız
    effects.push({
      type: 'particle',
      x: px,
      y: py,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5, // Hafif yukarı fırlasınlar
      gravity: 0.15, // Daha hızlı yerçekimi (snappy)
      color: color,
      radius: Math.random() * 3.5 + 2.0, // Daha küçük partiküller (snappy)
      alpha: 1,
      decay: Math.random() * 0.025 + 0.02, // Daha hızlı yok olma süresi (snappy)
      isStar: Math.random() < 0.45 // %45 ihtimalle parlak yıldız efekti (vibrant)
    });
  }
}

function spawnFloatingText(x, y, text, color = '#ffffff') {
  const rect = boardContainer.getBoundingClientRect();
  const cellWidth = rect.width / GRID_SIZE;
  const cellHeight = rect.height / GRID_SIZE;
  const px = (x + 0.5) * cellWidth;
  const py = (y + 0.5) * cellHeight;

  effects.push({
    type: 'text',
    x: px,
    y: py - 10,
    vy: -1.2,
    text: text,
    color: color,
    size: Math.floor(cellWidth * 0.36),
    alpha: 1,
    decay: 0.02
  });
}

function spawnComboSplash(text, type) {
  const container = document.getElementById('game-screen');
  if (!container) return;
  
  const div = document.createElement('div');
  div.className = `combo-splash ${type}`;
  div.innerText = text;
  div.style.left = '50%';
  div.style.top = '40%';
  div.style.transform = 'translate(-50%, -50%)';
  
  container.appendChild(div);
  
  soundEngine.playLevelUp();
  
  setTimeout(() => {
    div.remove();
  }, 1200);
}

function spawnSpecialExplosion(x, y, specialType, candyType) {
  const rect = boardContainer.getBoundingClientRect();
  const cellWidth = rect.width / GRID_SIZE;
  const cellHeight = rect.height / GRID_SIZE;
  const px = (x + 0.5) * cellWidth;
  const py = (y + 0.5) * cellHeight;
  const color = CANDY_COLORS[candyType] || '#ffd23f';

  if (specialType === 'striped-h') {
    // Yatay Işın/Lazer Efekti (Satır patlaması)
    effects.push({
      type: 'laser',
      x: px,
      y: py,
      dir: 'horizontal',
      color: color,
      width: rect.width,
      thickness: 12,
      alpha: 1,
      decay: 0.08
    });
  } else if (specialType === 'striped-v') {
    // Dikey Işın/Lazer Efekti (Sütun patlaması)
    effects.push({
      type: 'laser',
      x: px,
      y: py,
      dir: 'vertical',
      color: color,
      height: rect.height,
      thickness: 12,
      alpha: 1,
      decay: 0.08
    });
  } else if (specialType === 'wrapped') {
    // Büyük Şok Dalgası Halka Efekti
    effects.push({
      type: 'shockwave',
      x: px,
      y: py,
      radius: 5,
      maxRadius: cellWidth * 1.8,
      color: color,
      thickness: 8,
      alpha: 1,
      decay: 0.06
    });
  }
}

function spawnBombLasers(bombX, bombY, targets) {
  const rect = boardContainer.getBoundingClientRect();
  const cellWidth = rect.width / GRID_SIZE;
  const cellHeight = rect.height / GRID_SIZE;
  const px1 = (bombX + 0.5) * cellWidth;
  const py1 = (bombY + 0.5) * cellHeight;

  // Gökkuşağı lazer sütunu (Rainbow laser beam)
  effects.push({
    type: 'rainbow-beam',
    x: px1,
    width: cellWidth * 1.6,
    alpha: 1,
    decay: 0.045
  });

  targets.forEach(target => {
    const px2 = (target.x + 0.5) * cellWidth;
    const py2 = (target.y + 0.5) * cellHeight;
    const color = CANDY_COLORS[target.type] || '#ffd23f';
    effects.push({
      type: 'bomb-laser',
      x1: px1,
      y1: py1,
      x2: px2,
      y2: py2,
      color: color,
      thickness: 8,
      alpha: 1,
      decay: 0.08
    });
  });
}

function spawnFishSwim(x1, y1, x2, y2, color) {
  const rect = boardContainer.getBoundingClientRect();
  const cellWidth = rect.width / GRID_SIZE;
  const cellHeight = rect.height / GRID_SIZE;
  const px1 = (x1 + 0.5) * cellWidth;
  const py1 = (y1 + 0.5) * cellHeight;
  const px2 = (x2 + 0.5) * cellWidth;
  const py2 = (y2 + 0.5) * cellHeight;

  // Bezier kavis kontrol noktası
  const mx = (px1 + px2) / 2 + (Math.random() - 0.5) * 140;
  const my = (py1 + py2) / 2 - 100 - Math.random() * 80;

  effects.push({
    type: 'fish',
    x: px1,
    y: py1,
    x1: px1,
    y1: py1,
    x2: px2,
    y2: py2,
    mx: mx,
    my: my,
    t: 0,
    color: color || '#00d2ff',
    alpha: 1,
    decay: 0,
    angle: 0
  });
}

function popCandy(candy, delay = 0) {
  if (!candy || !candy.element) return;
  
  if (delay > 0) {
    candy.element.classList.add('waiting-for-fish');
    setTimeout(() => {
      if (candy.element) {
        candy.element.classList.remove('waiting-for-fish');
        performPop(candy);
      }
    }, delay);
  } else {
    performPop(candy);
  }
}

function performPop(candy) {
  if (!candy.element) return;
  candy.element.classList.add('match-pop');
  
  const particleColorType = candy.type === -1 ? 1 : candy.type;
  spawnParticles(candy.x, candy.y, particleColorType, 10);
  
  const rect = boardContainer.getBoundingClientRect();
  const cellWidth = rect.width / GRID_SIZE;
  const px = (candy.x + 0.5) * cellWidth;
  const py = (candy.y + 0.5) * cellWidth;
  const color = CANDY_COLORS[particleColorType] || '#ffd23f';
  
  effects.push({
    type: 'shockwave',
    x: px,
    y: py,
    radius: 4,
    maxRadius: cellWidth * 0.7,
    color: color,
    thickness: 4,
    alpha: 1,
    decay: 0.07
  });

  if (candy.special && candy.special !== 'bomb' && candy.special !== 'fish') {
    spawnSpecialExplosion(candy.x, candy.y, candy.special, candy.type);
  }
  
  trackTargetCollection(candy.type);
}

function updateAndDrawEffects() {
  ctx.clearRect(0, 0, effectsCanvas.width, effectsCanvas.height);

  for (let i = effects.length - 1; i >= 0; i--) {
    const eff = effects[i];
    eff.alpha -= eff.decay;

    if (eff.alpha <= 0) {
      effects.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.globalAlpha = eff.alpha;

    if (eff.type === 'particle') {
      eff.vy += eff.gravity;
      eff.x += eff.vx;
      eff.y += eff.vy;

      ctx.beginPath();
      if (eff.isStar) {
        // Yıldız şeklinde parlama çiz - Gölgeler iptal, hafif opak dış çember çizelim
        ctx.fillStyle = '#ffffff';
        const r = eff.radius;
        ctx.moveTo(eff.x, eff.y - r);
        ctx.lineTo(eff.x + r / 3.5, eff.y - r / 3.5);
        ctx.lineTo(eff.x + r, eff.y);
        ctx.lineTo(eff.x + r / 3.5, eff.y + r / 3.5);
        ctx.lineTo(eff.x, eff.y + r);
        ctx.lineTo(eff.x - r / 3.5, eff.y + r / 3.5);
        ctx.lineTo(eff.x - r, eff.y);
        ctx.lineTo(eff.x - r / 3.5, eff.y - r / 3.5);
        ctx.closePath();
        ctx.fill();

        // Dış parıldama çemberi
        ctx.beginPath();
        ctx.arc(eff.x, eff.y, r * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = eff.color;
        ctx.globalAlpha = eff.alpha * 0.35;
        ctx.fill();
      } else {
        ctx.arc(eff.x, eff.y, eff.radius, 0, Math.PI * 2);
        ctx.fillStyle = eff.color;
        ctx.fill();
      }

    } else if (eff.type === 'text') {
      eff.y += eff.vy;
      ctx.font = `700 ${eff.size}px Fredoka`;
      ctx.textAlign = 'center';
      ctx.fillStyle = eff.color;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeText(eff.text, eff.x, eff.y);
      ctx.fillText(eff.text, eff.x, eff.y);

    } else if (eff.type === 'laser') {
      // Önce daha kalın ve yarı şeffaf bir çizgi çizerek neon parlaması verelim
      ctx.beginPath();
      ctx.strokeStyle = eff.color;
      ctx.lineWidth = (eff.thickness + 12) * eff.alpha;
      ctx.globalAlpha = eff.alpha * 0.4;
      if (eff.dir === 'horizontal') {
        ctx.moveTo(0, eff.y);
        ctx.lineTo(eff.width, eff.y);
      } else {
        ctx.moveTo(eff.x, 0);
        ctx.lineTo(eff.x, eff.height);
      }
      ctx.stroke();

      // Ana merkezdeki beyaz çizgi
      ctx.beginPath();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = eff.thickness * eff.alpha;
      ctx.globalAlpha = eff.alpha;
      if (eff.dir === 'horizontal') {
        ctx.moveTo(0, eff.y);
        ctx.lineTo(eff.width, eff.y);
      } else {
        ctx.moveTo(eff.x, 0);
        ctx.lineTo(eff.x, eff.height);
      }
      ctx.stroke();

    } else if (eff.type === 'bomb-laser') {
      // Neon parlaması
      ctx.beginPath();
      ctx.strokeStyle = eff.color;
      ctx.lineWidth = (eff.thickness + 12) * eff.alpha;
      ctx.globalAlpha = eff.alpha * 0.4;
      ctx.moveTo(eff.x1, eff.y1);
      ctx.lineTo(eff.x2, eff.y2);
      ctx.stroke();

      // Beyaz lazer çizgisi
      ctx.beginPath();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = eff.thickness * eff.alpha;
      ctx.globalAlpha = eff.alpha;
      ctx.moveTo(eff.x1, eff.y1);
      ctx.lineTo(eff.x2, eff.y2);
      ctx.stroke();

    } else if (eff.type === 'fish') {
      eff.t += 0.045;
      if (eff.t >= 1) {
        eff.alpha = 0;
        effects.push({
          type: 'shockwave',
          x: eff.x2,
          y: eff.y2,
          radius: 3,
          maxRadius: 24,
          color: eff.color,
          thickness: 5,
          alpha: 1,
          decay: 0.06
        });
      } else {
        const u = 1 - eff.t;
        const tt = eff.t * eff.t;
        const uu = u * u;
        
        const prevX = eff.x;
        const prevY = eff.y;

        eff.x = uu * eff.x1 + 2 * u * eff.t * eff.mx + tt * eff.x2;
        eff.y = uu * eff.y1 + 2 * u * eff.t * eff.my + tt * eff.y2;
        
        const dx = eff.x - prevX;
        const dy = eff.y - prevY;
        if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
          eff.angle = Math.atan2(dy, dx);
        }

        ctx.save();
        ctx.translate(eff.x, eff.y);
        ctx.rotate(eff.angle);
        // 1. Neon Dış Parlama (Outer Glow)
        ctx.beginPath();
        ctx.ellipse(0, 0, 15, 11, 0, 0, Math.PI * 2);
        ctx.fillStyle = eff.color;
        ctx.globalAlpha = eff.alpha * 0.35;
        ctx.fill();

        // Kuyruk parlaması
        ctx.beginPath();
        ctx.moveTo(-11, 0);
        ctx.lineTo(-20, -10);
        ctx.lineTo(-17, 0);
        ctx.lineTo(-20, 10);
        ctx.closePath();
        ctx.fill();

        // 2. Ana Gövde ve Kuyruk
        ctx.globalAlpha = eff.alpha;
        ctx.fillStyle = eff.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, 11, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(-11, 0);
        ctx.lineTo(-17, -7);
        ctx.lineTo(-15, 0);
        ctx.lineTo(-17, 7);
        ctx.closePath();
        ctx.fill();

        // 3. Parlak 3D Üst Yansıma (Glossy Highlight)
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = eff.alpha * 0.55;
        ctx.beginPath();
        ctx.ellipse(2, -2, 5, 2, Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();

        // 4. Balık gözü
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = eff.alpha;
        ctx.beginPath();
        ctx.arc(6, -2, 1.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

    } else if (eff.type === 'shockwave') {
      eff.radius += (eff.maxRadius - eff.radius) * 0.15;
      
      // Neon dış halka
      ctx.beginPath();
      ctx.strokeStyle = eff.color;
      ctx.lineWidth = (eff.thickness + 6) * eff.alpha;
      ctx.globalAlpha = eff.alpha * 0.4;
      ctx.arc(eff.x, eff.y, eff.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Beyaz iç halka
      ctx.beginPath();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = eff.thickness * eff.alpha;
      ctx.globalAlpha = eff.alpha;
      ctx.arc(eff.x, eff.y, eff.radius, 0, Math.PI * 2);
      ctx.stroke();

    } else if (eff.type === 'rainbow-beam') {
      const grad = ctx.createLinearGradient(eff.x - eff.width / 2, 0, eff.x + eff.width / 2, 0);
      grad.addColorStop(0, 'rgba(255, 63, 63, 0)');
      grad.addColorStop(0.25, 'rgba(255, 100, 63, 0.7)');
      grad.addColorStop(0.5, 'rgba(255, 230, 63, 0.9)');
      grad.addColorStop(0.75, 'rgba(63, 255, 120, 0.7)');
      grad.addColorStop(1, 'rgba(63, 175, 255, 0)');
      
      ctx.fillStyle = grad;
      ctx.fillRect(eff.x - (eff.width / 2) * eff.alpha, 0, eff.width * eff.alpha, effectsCanvas.height);
      
      if (Math.random() < 0.22) {
        effects.push({
          type: 'particle',
          x: eff.x + (Math.random() - 0.5) * eff.width,
          y: Math.random() * effectsCanvas.height,
          vx: (Math.random() - 0.5) * 3,
          vy: -Math.random() * 4 - 2,
          gravity: 0.12,
          radius: Math.random() * 5 + 3,
          color: '#ffffff',
          alpha: 1,
          decay: 0.035,
          isStar: true
        });
      }
    } else if (eff.type === 'ice-shard') {
      eff.vy += eff.gravity;
      eff.x += eff.vx;
      eff.y += eff.vy;
      eff.angle += eff.spin;
      
      ctx.save();
      ctx.translate(eff.x, eff.y);
      ctx.rotate(eff.angle);
      
      ctx.fillStyle = 'rgba(224, 242, 241, 0.75)';
      ctx.strokeStyle = 'rgba(128, 203, 196, 0.85)';
      ctx.lineWidth = 1.2;
      
      ctx.beginPath();
      ctx.moveTo(-eff.size, -eff.size);
      ctx.lineTo(eff.size, -eff.size);
      ctx.lineTo(0, eff.size);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  requestAnimationFrame(updateAndDrawEffects);
}

function resizeCanvas() {
  const rect = boardContainer.getBoundingClientRect();
  effectsCanvas.width = rect.width;
  effectsCanvas.height = rect.height;
}

// --- 4. OYUN TAHTASI GÜNCELLEME VE YÖNETİMİ ---

// Rastgele Şeker Seçimi
function getRandomType() {
  return Math.floor(Math.random() * activeCandyTypesCount);
}

// Şeker Objesi Oluşturma ve DOM'a Ekleme
function createCandy(x, y, type, special = null) {
  const element = document.createElement('div');
  element.className = 'candy';
  if (special) {
    element.classList.add(special);
  }
  
  // Mobil performansı için donanım ivmeli CSS transform kullanıyoruz
  element.style.transform = `translate3d(${x * 100}%, ${y * 100}%, 0) scale(1)`;
  
  let svgId;
  let overlayHtml = '';
  if (special === 'bomb') {
    svgId = 'candy-bomb';
    element.innerHTML = `<svg viewBox="0 0 48 48"><use href="#${svgId}"></use>${overlayHtml}</svg>`;
  } else if (special === 'fish') {
    const colorName = CANDY_IDS[type].replace('candy-', '');
    element.innerHTML = `<svg viewBox="0 0 48 48"><use href="#candy-fish-shape" fill="url(#grad-${colorName})"></use></svg>`;
  } else {
    if (special === 'striped-h' || special === 'striped-v') {
      svgId = `${CANDY_IDS[type]}-${special}`;
      element.innerHTML = `<svg viewBox="0 0 48 48"><use href="#${svgId}"></use></svg>`;
    } else if (special === 'wrapped') {
      svgId = CANDY_IDS[type];
      overlayHtml = `<use href="#special-wrapped"></use>`;
      element.innerHTML = `<svg viewBox="0 0 48 48"><use href="#${svgId}"></use>${overlayHtml}</svg>`;
    } else {
      svgId = CANDY_IDS[type];
      element.innerHTML = `<svg viewBox="0 0 48 48"><use href="#${svgId}"></use></svg>`;
    }
  }
  
  // Touch / Mouse olaylarını bağla
  element.addEventListener('mousedown', dragStart, { passive: false });
  element.addEventListener('touchstart', dragStart, { passive: false });
  
  boardContainer.appendChild(element);
  
  const id = candyIdCounter++;
  return {
    id,
    x,
    y,
    type,
    special,
    element
  };
}

// --- 3.5. BÖLÜM VE HEDEF SİSTEMİ VERİTABANI ---
const LEVELS = {
  1: {
    moves: 22,
    candyTypesCount: 4, // Sadece Kırmızı, Turuncu, Sarı, Yeşil
    targets: [
      { type: 0, required: 15 } // 15 Kırmızı Fasulye
    ]
  },
  2: {
    moves: 22,
    candyTypesCount: 4, // 4 renk ile kolay eşleşme
    targets: [
      { type: 2, required: 15 }, // 15 Sarı Damla
      { type: 1, required: 15 }  // 15 Turuncu Oval
    ]
  },
  3: {
    moves: 24,
    candyTypesCount: 5, // Mavi eklenir (0, 1, 2, 3, 4)
    targets: [
      { type: 3, required: 20 }, // 20 Yeşil Kare
      { type: 2, required: 20 }  // 20 Sarı Damla
    ]
  },
  4: {
    moves: 24,
    candyTypesCount: 5, // 5 renk
    targets: [
      { type: 0, required: 20 }, // 20 Kırmızı Fasulye
      { type: 4, required: 20 }  // 20 Mavi Küre
    ]
  },
  5: {
    moves: 32,
    candyTypesCount: 6, // Mor eklenir (Tüm renkler) - Zor
    targets: [
      { type: 0, required: 22 },
      { type: 1, required: 22 },
      { type: 2, required: 22 },
      { type: 3, required: 22 },
      { type: 4, required: 22 },
      { type: 5, required: 22 } // Her renkten 22 adet
    ]
  }
};

const THEMES = [
  { minLvl: 1, maxLvl: 2, className: 'theme-forest', name: 'Şeker Ormanı' },
  { minLvl: 3, maxLvl: 4, className: 'theme-chocolate', name: 'Çikolata Vadisi' },
  { minLvl: 5, maxLvl: 6, className: 'theme-mint', name: 'Nane Tepeleri' },
  { minLvl: 7, maxLvl: Infinity, className: 'theme-cosmic', name: 'Kozmik Galaksi' }
];

function getThemeForLevel(lvl) {
  return THEMES.find(t => lvl >= t.minLvl && lvl <= t.maxLvl) || THEMES[THEMES.length - 1];
}

function getLevelConfig(lvl) {
  if (LEVELS[lvl]) {
    return JSON.parse(JSON.stringify(LEVELS[lvl]));
  }
  
  // 5. seviyeden büyük seviyeleri dinamik ve zorlaşacak şekilde üret
  // Seviye 6'da 5 renk, seviye 7+ seviyelerinde 6 renk
  const candyTypesCount = lvl >= 7 ? 6 : 5;
  
  // Hedeflenecek şeker sayısı (2 veya 3)
  const numTargets = Math.min(3, Math.floor(Math.random() * 2) + 2);
  const typesUsed = [];
  const targets = [];
  
  while (typesUsed.length < numTargets) {
    // Sadece aktif renk sayısı içinden hedef şeker seç
    const t = Math.floor(Math.random() * candyTypesCount);
    if (!typesUsed.includes(t)) {
      typesUsed.push(t);
      // Seviye arttıkça hedef miktarı büyür (Maksimum 60)
      const req = Math.min(60, 15 + lvl * 3);
      targets.push({ type: t, required: req });
    }
  }
  
  // Seviye arttıkça hamle sayısı daralır (Minimum 15 hamle)
  const moves = Math.max(15, 28 - Math.floor(lvl / 1.6));
  
  return { moves, targets, candyTypesCount };
}

function loadLevel(lvl) {
  const config = getLevelConfig(lvl);
  
  // 3. denemede kolaylaştır
  if (currentLevelAttempts === 3) {
    config.moves = Math.floor(config.moves * 1.4);
    config.targets.forEach(t => {
      t.required = Math.max(5, Math.floor(t.required * 0.7));
    });
  }

  movesLeft = config.moves;
  activeCandyTypesCount = config.candyTypesCount;
  
  currentGoals = config.targets.map(t => ({
    type: t.type,
    required: t.required,
    collected: 0
  }));

  // Jöleleri ve Blockerları sıfırla
  jellyBoard.fill(0);
  jellyElements.fill(null);
  blockerBoard.fill(0);
  blockerElements.fill(null);
  gummyBoard.fill(0);
  gummyElements.fill(null);
  frostingBoard.fill(0);
  frostingElements.fill(null);
  activeGummyBears = [];
  gummyBearCellMap = {};
  chocolateBoard.fill(0);
  chocolateElements.fill(null);
  chocolateClearedThisTurn = false;

  let jellyCount = 0;
  let blockerCount = 0;
  let gummyCount = 0;
  let chocolateCount = 0;

  if (lvl === 2) {
    gummyCount = 3;
  } else if (lvl === 3) {
    chocolateCount = 8;
    jellyCount = 6;
  } else if (lvl === 4) {
    chocolateCount = 10;
    gummyCount = 3;
  } else if (lvl === 5) {
    jellyCount = 12;
    blockerCount = 10;
  } else if (lvl >= 6) {
    // Rastgele engel seç: 1 = jöle, 2 = blocker, 3 = her ikisi de, 4 = çikolata
    const obstacleType = Math.floor(Math.random() * 4) + 1;
    if (obstacleType === 1 || obstacleType === 3) {
      jellyCount = Math.min(24, 8 + Math.floor(lvl * 1.2));
    }
    if (obstacleType === 2 || obstacleType === 3) {
      blockerCount = Math.min(18, 6 + Math.floor(lvl * 0.9));
    }
    if (obstacleType === 4) {
      chocolateCount = Math.min(16, 6 + Math.floor(lvl * 1.0));
    }
    // Arada bir (çift seviyelerde) ayıcık hedefi de ekle
    if (lvl % 2 === 0) {
      gummyCount = Math.min(8, 3 + Math.floor(lvl / 3.5));
    }
  }

  // 3. denemede kolaylaştır (sayıları %40 azalt)
  if (currentLevelAttempts === 3) {
    jellyCount = Math.max(0, Math.floor(jellyCount * 0.6));
    blockerCount = Math.max(0, Math.floor(blockerCount * 0.6));
    gummyCount = Math.max(0, Math.floor(gummyCount * 0.6));
    chocolateCount = Math.max(0, Math.floor(chocolateCount * 0.6));
  }

  // Jelibon Ayıcıkları yerleştir
  if (gummyCount > 0) {
    // Bazı bölümlerde (çift seviyelerde) alttan çıkan büyük ayıcık yap
    const hasLargeGummy = (lvl % 2 === 0);
    
    if (hasLargeGummy) {
      // 1. Büyük Ayıcık yerleştir (2x4 boyutu = 8 hücre)
      // En alt 2 satırdan birinde yer bul (y: 6 ve 7)
      // startX: 0 ile GRID_SIZE - 4 (0, 1, 2, 3, 4)
      const startX = Math.floor(Math.random() * (GRID_SIZE - 3));
      const startY = 6;
      
      const largeGummy = {
        id: activeGummyBears.length + 1,
        type: 'large',
        cells: [],
        clearedCells: new Set(),
        isSaved: false,
        startX: startX,
        startY: startY
      };
      
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 4; dx++) {
          const x = startX + dx;
          const y = startY + dy;
          const idx = y * GRID_SIZE + x;
          
          gummyBoard[idx] = 2; // 2: Büyük ayıcık parçası
          frostingBoard[idx] = 1;
          gummyBearCellMap[idx] = largeGummy;
          largeGummy.cells.push(idx);
          
          // Bu hücrelerde diğer çakışan engelleri temizle
          blockerBoard[idx] = 0;
          jellyBoard[idx] = 0;
          chocolateBoard[idx] = 0;
        }
      }
      activeGummyBears.push(largeGummy);
      
      // 2. Kalan ayıcıkları küçük ayıcık olarak yerleştir
      const remainingGummies = Math.max(0, gummyCount - 1);
      let placed = 0;
      while (placed < remainingGummies) {
        const idx = Math.floor(Math.random() * (GRID_SIZE * GRID_SIZE));
        if (gummyBoard[idx] === 0 && blockerBoard[idx] === 0 && chocolateBoard[idx] === 0) {
          gummyBoard[idx] = 1; // 1: Küçük ayıcık
          frostingBoard[idx] = 1;
          
          const smallGummy = {
            id: activeGummyBears.length + 1,
            type: 'small',
            cells: [idx],
            clearedCells: new Set(),
            isSaved: false
          };
          gummyBearCellMap[idx] = smallGummy;
          activeGummyBears.push(smallGummy);
          placed++;
        }
      }
    } else {
      // Sadece küçük ayıcıklar yerleştir
      let placed = 0;
      while (placed < gummyCount) {
        const idx = Math.floor(Math.random() * (GRID_SIZE * GRID_SIZE));
        if (gummyBoard[idx] === 0) {
          gummyBoard[idx] = 1; // 1: Küçük ayıcık
          frostingBoard[idx] = 1;
          
          const smallGummy = {
            id: activeGummyBears.length + 1,
            type: 'small',
            cells: [idx],
            clearedCells: new Set(),
            isSaved: false
          };
          gummyBearCellMap[idx] = smallGummy;
          activeGummyBears.push(smallGummy);
          placed++;
        }
      }
    }
    
    currentGoals.push({
      type: 'gummy',
      required: activeGummyBears.length,
      collected: 0
    });
  }

  // Jöleleri yerleştir
  if (jellyCount > 0) {
    let placed = 0;
    while (placed < jellyCount) {
      const idx = Math.floor(Math.random() * (GRID_SIZE * GRID_SIZE));
      if (jellyBoard[idx] === 0) {
        jellyBoard[idx] = 1;
        placed++;
      }
    }
    currentGoals.push({
      type: 'jelly',
      required: jellyCount,
      collected: 0
    });
  }

  // Blockerları yerleştir
  if (blockerCount > 0) {
    let placed = 0;
    while (placed < blockerCount) {
      const idx = Math.floor(Math.random() * (GRID_SIZE * GRID_SIZE));
      if (blockerBoard[idx] === 0) {
        // Seviye >= 5 ise veya rastgele %30 ihtimalle çift katmanlı yap
        const strength = (lvl >= 5 && Math.random() < 0.4) ? 2 : 1;
        blockerBoard[idx] = strength;
        placed++;
      }
    }
    currentGoals.push({
      type: 'blocker',
      required: blockerCount,
      collected: 0
    });
  }

  // Çikolataları yerleştir
  if (chocolateCount > 0) {
    let placed = 0;
    while (placed < chocolateCount) {
      const idx = Math.floor(Math.random() * (GRID_SIZE * GRID_SIZE));
      // Diğer engellerin olmadığı yerlere koy
      if (chocolateBoard[idx] === 0 && jellyBoard[idx] === 0 && blockerBoard[idx] === 0 && frostingBoard[idx] === 0) {
        chocolateBoard[idx] = 1;
        placed++;
      }
    }
    currentGoals.push({
      type: 'chocolate',
      required: chocolateCount,
      collected: 0
    });
  }
  
  comboCount = 0;
  isAnimating = false;
  activeJoker = null;
  jokersAtLevelStart = { ...jokers };
  updateJokersUI();
  
  // Kolay mod göstergesi ekle/kaldır
  const targetsContainer = document.querySelector('.targets-container');
  if (targetsContainer) {
    const oldIndicator = document.getElementById('easy-mode-indicator');
    if (oldIndicator) oldIndicator.remove();

    if (currentLevelAttempts === 3) {
      const indicator = document.createElement('div');
      indicator.id = 'easy-mode-indicator';
      indicator.className = 'easy-mode-indicator';
      indicator.innerText = '3. Deneme: Kolay Mod Etkin!';
      targetsContainer.appendChild(indicator);
    }
  }

  // Tema ve Dünya Görsellerini güncelle
  const theme = getThemeForLevel(lvl);
  const container = document.querySelector('.game-container');
  if (container) {
    container.classList.remove('theme-forest', 'theme-chocolate', 'theme-mint', 'theme-cosmic');
    container.classList.add(theme.className);
  }
  
  const worldLabel = document.getElementById('world-name');
  if (worldLabel) {
    worldLabel.innerText = theme.name;
    // Fade in animasyonunu sıfırlayıp yeniden tetikleme
    worldLabel.style.animation = 'none';
    void worldLabel.offsetWidth; // Reflow tetikle
    worldLabel.style.animation = 'fadeInWorld 0.8s ease forwards';
  }
  
  renderTargets();
  updateHUD();
  initializeBoard();
}

function renderTargets() {
  const listElement = document.getElementById('targets-list');
  if (!listElement) return;
  listElement.innerHTML = '';
  
  currentGoals.forEach(goal => {
    const card = document.createElement('div');
    card.className = 'target-card';
    card.id = `target-card-${goal.type}`;
    
    if (goal.type === 'jelly') {
      card.innerHTML = `
        <span style="font-size: 1.3rem; line-height: 1; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.25)); margin-right: 4px;">🍮</span>
        <span class="target-count" id="target-count-${goal.type}">
          ${goal.collected}/${goal.required}
        </span>
      `;
    } else if (goal.type === 'blocker') {
      card.innerHTML = `
        <span style="font-size: 1.3rem; line-height: 1; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.25)); margin-right: 4px;">🧱</span>
        <span class="target-count" id="target-count-${goal.type}">
          ${goal.collected}/${goal.required}
        </span>
      `;
    } else if (goal.type === 'chocolate') {
      card.innerHTML = `
        <span style="font-size: 1.3rem; line-height: 1; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.25)); margin-right: 4px;">🍫</span>
        <span class="target-count" id="target-count-${goal.type}">
          ${goal.collected}/${goal.required}
        </span>
      `;
    } else if (goal.type === 'gummy') {
      card.innerHTML = `
        <span style="font-size: 1.3rem; line-height: 1; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.25)); margin-right: 4px;">🧸</span>
        <span class="target-count" id="target-count-${goal.type}">
          ${goal.collected}/${goal.required}
        </span>
      `;
    } else {
      const svgId = CANDY_IDS[goal.type];
      card.innerHTML = `
        <svg viewBox="0 0 48 48"><use href="#${svgId}"></use></svg>
        <span class="target-count" id="target-count-${goal.type}">
          ${goal.collected}/${goal.required}
        </span>
      `;
    }
    
    listElement.appendChild(card);
  });
}

function trackTargetCollection(type) {
  const goal = currentGoals.find(g => g.type === type);
  if (goal && goal.collected < goal.required) {
    goal.collected++;
    
    const countElement = document.getElementById(`target-count-${type}`);
    const cardElement = document.getElementById(`target-card-${type}`);
    
    if (countElement && cardElement) {
      if (goal.collected >= goal.required) {
        countElement.innerText = '✔';
        cardElement.classList.add('completed');
      } else {
        countElement.innerText = `${goal.collected}/${goal.required}`;
      }
      
      // Bounce animasyonunu tetikle
      cardElement.classList.remove('bounce');
      void cardElement.offsetWidth; // Force reflow
      cardElement.classList.add('bounce');
    }
  }
}

function updateCandyVisibility() {
  for (let idx = 0; idx < board.length; idx++) {
    const candy = board[idx];
    if (candy && candy.element) {
      const hasCover = blockerBoard[idx] > 0 || chocolateBoard[idx] > 0;
      candy.element.style.opacity = hasCover ? '0' : '1';
      candy.element.style.pointerEvents = hasCover ? 'none' : 'auto';
    }
  }
}

// Başlangıçta hiç eşleşme olmayan bir tahta kur
function initializeBoard() {
  // Eski şekerleri temizle
  boardContainer.innerHTML = '';
  board = new Array(GRID_SIZE * GRID_SIZE);
  candyIdCounter = 0;

  // Jöle, Blocker, Gummy ve Frosting elementlerini sıfırla
  jellyElements.fill(null);
  blockerElements.fill(null);
  gummyElements.fill(null);
  frostingElements.fill(null);
  chocolateElements.fill(null);

  // 1. Arka plan elemanlarını DOM'a ekle (Z-index sırasıyla)
  for (let idx = 0; idx < GRID_SIZE * GRID_SIZE; idx++) {
    const x = idx % GRID_SIZE;
    const y = Math.floor(idx / GRID_SIZE);

    // Arka plan dama tahtası hücresi (checkerboard tile)
    const tile = document.createElement('div');
    const isDark = (x + y) % 2 === 1;
    tile.className = `grid-tile ${isDark ? 'dark' : 'light'}`;
    tile.style.transform = `translate3d(${x * 100}%, ${y * 100}%, 0)`;
    boardContainer.appendChild(tile);

    // Gummy Bear (Ayıcık Jelibon) var mı?
    if (gummyBoard[idx] === 1) {
      // Küçük ayıcık
      const gummyDiv = document.createElement('div');
      gummyDiv.className = 'gummy-bear small';
      gummyDiv.style.transform = `translate3d(${x * 100}%, ${y * 100}%, 0)`;
      gummyDiv.style.opacity = '0.15'; // Faintly visible under frosting
      gummyDiv.innerHTML = getGummyBearSVG();
      boardContainer.appendChild(gummyDiv);
      gummyElements[idx] = gummyDiv;
    } else if (gummyBoard[idx] === 2) {
      // Büyük ayıcık parçası
      const bear = gummyBearCellMap[idx];
      if (bear) {
        const dx = x - bear.startX;
        const dy = y - bear.startY;
        const gummyDiv = document.createElement('div');
        gummyDiv.className = 'gummy-bear large-part';
        gummyDiv.style.transform = `translate3d(${x * 100}%, ${y * 100}%, 0)`;
        gummyDiv.style.opacity = '0.15'; // Faintly visible under frosting
        
        gummyDiv.innerHTML = `
          <div class="gummy-slice-wrapper">
            <div class="gummy-slice-svg" style="left: -${dx * 100}%; top: -${dy * 100}%;">
              ${getLargeGummyBearSVG(bear.id)}
            </div>
          </div>
        `;
        boardContainer.appendChild(gummyDiv);
        gummyElements[idx] = gummyDiv;
      }
    }

    // Jöle var mı?
    if (jellyBoard[idx] === 1) {
      const jellyDiv = document.createElement('div');
      jellyDiv.className = 'jelly';
      jellyDiv.style.transform = `translate3d(${x * 100}%, ${y * 100}%, 0)`;
      jellyDiv.innerHTML = '<div class="jelly-inner"></div>';
      boardContainer.appendChild(jellyDiv);
      jellyElements[idx] = jellyDiv;
    }

    // Frosting (Kaplama) var mı?
    if (frostingBoard[idx] === 1) {
      const frostingDiv = document.createElement('div');
      frostingDiv.className = 'frosting';
      frostingDiv.style.transform = `translate3d(${x * 100}%, ${y * 100}%, 0)`;
      frostingDiv.innerHTML = '<div class="frosting-inner"></div>';
      boardContainer.appendChild(frostingDiv);
      frostingElements[idx] = frostingDiv;
    }

    // Çikolata var mı?
    if (chocolateBoard[idx] === 1) {
      const chocolateDiv = document.createElement('div');
      chocolateDiv.className = 'chocolate';
      chocolateDiv.style.transform = `translate3d(${x * 100}%, ${y * 100}%, 0)`;
      chocolateDiv.innerHTML = `<div class="chocolate-inner">
        <svg viewBox="0 0 48 48" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="choc-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#7b3f00"/>
              <stop offset="40%" stop-color="#4e2204"/>
              <stop offset="100%" stop-color="#2a0e00"/>
            </linearGradient>
            <linearGradient id="choc-sheen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="rgba(255,220,160,0.35)"/>
              <stop offset="100%" stop-color="rgba(255,220,160,0)"/>
            </linearGradient>
          </defs>
          <!-- Base tile -->
          <rect x="2" y="2" width="44" height="44" rx="7" fill="url(#choc-grad)" stroke="#1a0800" stroke-width="1.5"/>
          <!-- Segment grid lines (chocolate bar look) -->
          <line x1="17" y1="2" x2="17" y2="46" stroke="#1a0800" stroke-width="1.5"/>
          <line x1="31" y1="2" x2="31" y2="46" stroke="#1a0800" stroke-width="1.5"/>
          <line x1="2" y1="17" x2="46" y2="17" stroke="#1a0800" stroke-width="1.5"/>
          <line x1="2" y1="31" x2="46" y2="31" stroke="#1a0800" stroke-width="1.5"/>
          <!-- Segment inner glow per square -->
          <rect x="3" y="3" width="13" height="13" rx="3" fill="rgba(255,180,60,0.07)"/>
          <rect x="18" y="3" width="12" height="13" rx="3" fill="rgba(255,180,60,0.07)"/>
          <rect x="32" y="3" width="13" height="13" rx="3" fill="rgba(255,180,60,0.07)"/>
          <rect x="3" y="18" width="13" height="12" rx="3" fill="rgba(255,180,60,0.07)"/>
          <rect x="18" y="18" width="12" height="12" rx="3" fill="rgba(255,180,60,0.07)"/>
          <rect x="32" y="18" width="13" height="12" rx="3" fill="rgba(255,180,60,0.07)"/>
          <rect x="3" y="32" width="13" height="13" rx="3" fill="rgba(255,180,60,0.07)"/>
          <rect x="18" y="32" width="12" height="13" rx="3" fill="rgba(255,180,60,0.07)"/>
          <rect x="32" y="32" width="13" height="13" rx="3" fill="rgba(255,180,60,0.07)"/>
          <!-- Top gloss sheen -->
          <rect x="3" y="3" width="42" height="18" rx="6" fill="url(#choc-sheen)"/>
          <!-- Highlight sparkle -->
          <ellipse cx="11" cy="8" rx="4" ry="2" transform="rotate(-20 11 8)" fill="rgba(255,255,255,0.18)"/>
        </svg>
      </div>`;
      boardContainer.appendChild(chocolateDiv);
      chocolateElements[idx] = chocolateDiv;
    }

    // Blocker (Duvar) var mı?
    if (blockerBoard[idx] > 0) {
      const blockerDiv = document.createElement('div');
      blockerDiv.className = `blocker layer-${blockerBoard[idx]}`;
      blockerDiv.style.transform = `translate3d(${x * 100}%, ${y * 100}%, 0)`;
      blockerDiv.innerHTML = `
        <div class="blocker-inner">
          <svg viewBox="0 0 48 48" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <!-- Brick face gradient: Layer 2 (intact, dark red brick) -->
              <linearGradient id="brick-face-2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stop-color="#c0472a"/>
                <stop offset="35%"  stop-color="#a53a22"/>
                <stop offset="100%" stop-color="#7a2910"/>
              </linearGradient>
              <!-- Brick face gradient: Layer 1 (damaged, faded brick) -->
              <linearGradient id="brick-face-1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stop-color="#b0927a"/>
                <stop offset="35%"  stop-color="#8c7060"/>
                <stop offset="100%" stop-color="#604840"/>
              </linearGradient>
              <!-- Brick top-edge highlight (3D bevel illusion) -->
              <linearGradient id="brick-top-2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stop-color="#e86040"/>
                <stop offset="100%" stop-color="#c0472a"/>
              </linearGradient>
              <linearGradient id="brick-top-1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stop-color="#d0b098"/>
                <stop offset="100%" stop-color="#9a7a68"/>
              </linearGradient>
              <!-- Mortar: recessed grey cement -->
              <linearGradient id="mortar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stop-color="#3a3028"/>
                <stop offset="100%" stop-color="#251e18"/>
              </linearGradient>
              <!-- Overall drop shadow -->
              <filter id="wall-drop-shadow">
                <feDropShadow dx="0" dy="2.5" stdDeviation="1.5" flood-color="#000" flood-opacity="0.7"/>
              </filter>
            </defs>

            <!-- ── MORTAR BACKGROUND (fills entire tile) ── -->
            <rect x="0" y="0" width="48" height="48" fill="url(#mortar)" rx="4"/>

            <!-- ════ ROW 1 (top): 2 full bricks, offset seam at centre ════ -->
            <!-- Brick 1-A -->
            <rect x="1"  y="1"  width="22" height="13" rx="1.5" class="brick-face"/>
            <rect x="1"  y="1"  width="22" height="3"  rx="1.5" class="brick-top"/>
            <!-- Brick 1-B -->
            <rect x="25" y="1"  width="22" height="13" rx="1.5" class="brick-face"/>
            <rect x="25" y="1"  width="22" height="3"  rx="1.5" class="brick-top"/>

            <!-- ════ ROW 2 (middle): offset — 3 bricks, seams stagger ════ -->
            <!-- Brick 2-A (half-brick left) -->
            <rect x="1"  y="16" width="11" height="13" rx="1.5" class="brick-face"/>
            <rect x="1"  y="16" width="11" height="3"  rx="1.5" class="brick-top"/>
            <!-- Brick 2-B (full middle) -->
            <rect x="14" y="16" width="20" height="13" rx="1.5" class="brick-face"/>
            <rect x="14" y="16" width="20" height="3"  rx="1.5" class="brick-top"/>
            <!-- Brick 2-C (half-brick right) -->
            <rect x="36" y="16" width="11" height="13" rx="1.5" class="brick-face"/>
            <rect x="36" y="16" width="11" height="3"  rx="1.5" class="brick-top"/>

            <!-- ════ ROW 3 (bottom): 2 full bricks (same as row 1) ════ -->
            <!-- Brick 3-A -->
            <rect x="1"  y="31" width="22" height="16" rx="1.5" class="brick-face"/>
            <rect x="1"  y="31" width="22" height="3"  rx="1.5" class="brick-top"/>
            <!-- Brick 3-B -->
            <rect x="25" y="31" width="22" height="16" rx="1.5" class="brick-face"/>
            <rect x="25" y="31" width="22" height="3"  rx="1.5" class="brick-top"/>

            <!-- ── CRACKS: hidden layer-2, shown layer-1 ── -->
            <g class="blocker-cracks">
              <!-- Crack on brick 1-A -->
              <polyline points="9,4 11,8 8,12 10,14" stroke="#1a0c06" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              <polyline points="9,4 11,8 8,12 10,14" stroke="rgba(255,160,80,0.3)" stroke-width="0.6" fill="none"/>
              <!-- Crack on brick 2-B -->
              <polyline points="22,19 24,23 21,27 23,29" stroke="#1a0c06" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              <polyline points="22,19 24,23 21,27 23,29" stroke="rgba(255,160,80,0.25)" stroke-width="0.6" fill="none"/>
              <!-- Crack on brick 3-B -->
              <polyline points="34,33 32,38 35,41 33,45" stroke="#1a0c06" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              <polyline points="34,33 32,38 35,41 33,45" stroke="rgba(255,160,80,0.2)" stroke-width="0.5" fill="none"/>
            </g>

            <!-- ── Global top-right gloss (subtle 3D light source) ── -->
            <rect x="0" y="0" width="48" height="18" rx="4" fill="rgba(255,240,210,0.06)"/>
          </svg>
        </div>
      `;
      boardContainer.appendChild(blockerDiv);
      blockerElements[idx] = blockerDiv;
    }
  }

  // 2. Şekerleri yerleştir
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      let type;
      // Kurulurken eşleşme olmayacak şekilde bir tür seç
      do {
        type = getRandomType();
      } while (
        (x >= 2 && board[y * GRID_SIZE + (x - 1)].type === type && board[y * GRID_SIZE + (x - 2)].type === type) ||
        (y >= 2 && board[(y - 1) * GRID_SIZE + x].type === type && board[(y - 2) * GRID_SIZE + x].type === type)
      );

      board[y * GRID_SIZE + x] = createCandy(x, y, type);
    }
  }

  updateCandyVisibility();

  // Eğer tahtada hiç yapılabilecek hamle kalmadıysa yeniden üret
  if (!hasPossibleMoves()) {
    initializeBoard();
  } else {
    startHintTimer();
  }
}

// --- 5. HAREKET VE KAYDIRMA (SWIPE) KONTROLÜ ---

function dragStart(e) {
  if (e.type === 'touchstart' && e.cancelable) {
    e.preventDefault();
  }
  if (isAnimating || movesLeft <= 0) return;

  clearHint();

  soundEngine.init(); // Mobil ses engeli aşmak için tetikleme

  // Etkin şekeri bul
  const candyElement = e.currentTarget;
  selectedCandy = board.find(c => c && c.element === candyElement);
  
  if (!selectedCandy) return;

  // JOKER KONTROLÜ
  if (activeJoker) {
    if (activeJoker === 'hammer') {
      handleJokerApplication(selectedCandy);
      selectedCandy = null;
      return;
    }
    // Sprey ise ve seçili şeker bir duvarın altındaysa izin verme!
    const cellIdx = selectedCandy.y * GRID_SIZE + selectedCandy.x;
    if (blockerBoard[cellIdx] > 0) {
      activeJoker = null;
      updateJokersUI();
      selectedCandy = null;
      return;
    }
    handleJokerApplication(selectedCandy);
    selectedCandy = null;
    return;
  }

  // Duvar altındaki şekerler hareket ettirilemez!
  const startIdx = selectedCandy.y * GRID_SIZE + selectedCandy.x;
  if (blockerBoard[startIdx] > 0) {
    selectedCandy = null;
    return;
  }

  // Koordinatları kaydet
  dragStartX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
  dragStartY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

  selectedCandy.element.classList.add('selected');

  if (!activeDragListeners) {
    window.addEventListener('mousemove', dragMove, { passive: false });
    window.addEventListener('touchmove', dragMove, { passive: false });
    window.addEventListener('mouseup', dragEnd);
    window.addEventListener('touchend', dragEnd);
    activeDragListeners = true;
  }
}

function dragMove(e) {
  if (!selectedCandy) return;

  // Mobil kaydırmayı engelle (sayfa kaymasın)
  if (e.cancelable) {
    e.preventDefault();
  }

  const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
  const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

  const dx = clientX - dragStartX;
  const dy = clientY - dragStartY;

  // Kaydırma mesafesi eşiği (30px)
  const swipeThreshold = 30;

  if (Math.abs(dx) > swipeThreshold || Math.abs(dy) > swipeThreshold) {
    let targetX = selectedCandy.x;
    let targetY = selectedCandy.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      targetX += dx > 0 ? 1 : -1;
    } else {
      targetY += dy > 0 ? 1 : -1;
    }

    // Ekran dışı kontrolü
    if (targetX >= 0 && targetX < GRID_SIZE && targetY >= 0 && targetY < GRID_SIZE) {
      const idx1 = selectedCandy.y * GRID_SIZE + selectedCandy.x;
      const idx2 = targetY * GRID_SIZE + targetX;
      
      // Hedef hücrede duvar varsa yer değiştirme engellensin!
      if (blockerBoard[idx2] > 0) {
        dragEnd();
        return;
      }

      lastSwappedIndices = [idx1, idx2];
      executeSwap(idx1, idx2);
    }

    dragEnd();
  }
}

function dragEnd() {
  if (selectedCandy) {
    selectedCandy.element.classList.remove('selected');
    selectedCandy = null;
  }

  if (activeDragListeners) {
    window.removeEventListener('mousemove', dragMove);
    window.removeEventListener('touchmove', dragMove);
    window.removeEventListener('mouseup', dragEnd);
    window.removeEventListener('touchend', dragEnd);
    activeDragListeners = false;
  }
  startHintTimer();
}

// İki Şekeri Değiştir ve Kontrol Et
async function executeSwap(idx1, idx2) {
  clearHint();
  isAnimating = true;

  const candy1 = board[idx1];
  const candy2 = board[idx2];

  if (!candy1 || !candy2) {
    isAnimating = false;
    return;
  }

  // Dizide yerlerini değiştir
  board[idx1] = candy2;
  board[idx2] = candy1;

  // Koordinatları güncelle
  const tempX = candy1.x;
  const tempY = candy1.y;
  candy1.x = candy2.x;
  candy1.y = candy2.y;
  candy2.x = tempX;
  candy2.y = tempY;

  // Görsel yer değişimi
  candy1.element.style.transform = `translate3d(${candy1.x * 100}%, ${candy1.y * 100}%, 0) scale(1)`;
  candy2.element.style.transform = `translate3d(${candy2.x * 100}%, ${candy2.y * 100}%, 0) scale(1)`;

  soundEngine.playSwap();

  // Animasyon bitimini bekle (220ms CSS transition)
  await new Promise(resolve => setTimeout(resolve, 230));

  // Eşleşme var mı kontrol et
  // Eşleşme var mı kontrol et
  const s1 = candy1.special;
  const s2 = candy2.special;

  // 1. GÜÇLÜ ŞEKER KOMBİNASYONU TESPİTİ
  if (s1 && s2) {
    // Hamle tüket
    movesLeft--;
    turnPlayedThisStep = true;
    updateHUD();
    isAnimating = true;

    const cx = candy2.x;
    const cy = candy2.y;

    let targetIndices = new Set();
    let soundToPlay = 'special';

    const isFishSwapWithStrong = (s1 === 'fish' && (s2 === 'bomb' || s2 === 'striped-h' || s2 === 'striped-v' || s2 === 'wrapped')) ||
                                 (s2 === 'fish' && (s1 === 'bomb' || s1 === 'striped-h' || s1 === 'striped-v' || s1 === 'wrapped'));

    if (isFishSwapWithStrong) {
      const fish = s1 === 'fish' ? candy1 : candy2;
      const other = s1 === 'fish' ? candy2 : candy1;
      const targetColor = fish.type;

      // Tahtadaki aynı renkteki şekerleri bul (other hariç)
      const matchingIndices = [];
      for (let i = 0; i < board.length; i++) {
        const c = board[i];
        if (c && c.type === targetColor && c !== other) {
          matchingIndices.push(i);
        }
      }

      // 1. Balığa dönüştür
      matchingIndices.forEach(idx => {
        const c = board[idx];
        if (c) {
          c.special = 'fish';
          c.element.className = 'candy fish';
          const colorName = CANDY_IDS[c.type].replace('candy-', '');
          c.element.innerHTML = `<svg viewBox="0 0 48 48"><use href="#candy-fish-shape" fill="url(#grad-${colorName})"></use></svg>`;
        }
      });

      soundEngine.playSpecial();

      // Oyuncunun dönüşümü görmesi için bekle
      await new Promise(r => setTimeout(r, 250));

      // 2. Her balık için hedef bul ve uçur
      targetIndices.add(idx1);
      targetIndices.add(idx2);

      const targetsFound = [];
      matchingIndices.forEach(idx => {
        const c = board[idx];
        if (c) {
          targetIndices.add(idx); // Kaynak hücre de temizlenecek listeye eklenir
          const tIdx = findFishTarget(targetIndices);
          if (tIdx !== undefined && tIdx !== null) {
            targetIndices.add(tIdx);
            const targetCandy = board[tIdx];
            if (targetCandy) {
              targetCandy.isFishTarget = true;
            }
            targetsFound.push({ from: c, toIdx: tIdx });
          }
        }
      });

      // Balıkları fırlat ve hedefe vardıklarında özel patlamaları tetikle
      const fishPromises = targetsFound.map(t => {
        return new Promise(resolve => {
          const tx = t.toIdx % GRID_SIZE;
          const ty = Math.floor(t.toIdx / GRID_SIZE);
          spawnFishSwim(t.from.x, t.from.y, tx, ty, CANDY_COLORS[fish.type]);
          
          // Balık ulaştığında özel patlamayı tetikle! (Yaklaşık 700ms sürer)
          setTimeout(() => {
            if (other.special === 'striped-h' || other.special === 'striped-v') {
              const expType = other.special;
              spawnSpecialExplosion(tx, ty, expType, fish.type);
              
              // Satır veya sütun patlat
              const extra = new Set();
              if (expType === 'striped-h') {
                for (let i = 0; i < GRID_SIZE; i++) {
                  extra.add(ty * GRID_SIZE + i);
                }
              } else {
                for (let i = 0; i < GRID_SIZE; i++) {
                  extra.add(i * GRID_SIZE + tx);
                }
              }
              
              extra.forEach(eIdx => {
                const c = board[eIdx];
                if (c) {
                  c.element.classList.add('match-pop');
                  spawnParticles(c.x, c.y, c.type, 8);
                  trackTargetCollection(c.type);
                  clearJelly(eIdx);
                  damageBlocker(eIdx);
                  clearFrosting(eIdx);
                  clearChocolate(eIdx);
                }
              });

              setTimeout(() => {
                extra.forEach(eIdx => {
                  if (board[eIdx]) {
                    if (board[eIdx].element) board[eIdx].element.remove();
                    board[eIdx] = null;
                  }
                });
                resolve();
              }, 350);

            } else if (other.special === 'wrapped') {
              spawnSpecialExplosion(tx, ty, 'wrapped', fish.type);
              
              // 3x3 alanı patlat
              const extra = new Set();
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  const ny = ty + dy;
                  const nx = tx + dx;
                  if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
                    extra.add(ny * GRID_SIZE + nx);
                  }
                }
              }
              
              extra.forEach(eIdx => {
                const c = board[eIdx];
                if (c) {
                  c.element.classList.add('match-pop');
                  spawnParticles(c.x, c.y, c.type, 8);
                  trackTargetCollection(c.type);
                  clearJelly(eIdx);
                  damageBlocker(eIdx);
                  clearFrosting(eIdx);
                  clearChocolate(eIdx);
                }
              });

              setTimeout(() => {
                extra.forEach(eIdx => {
                  if (board[eIdx]) {
                    if (board[eIdx].element) board[eIdx].element.remove();
                    board[eIdx] = null;
                  }
                });
                resolve();
              }, 350);

            } else if (other.special === 'bomb') {
              // En çok bulunan rengi yok et
              const colorCounts = new Array(activeCandyTypesCount).fill(0);
              for (let i = 0; i < board.length; i++) {
                const c = board[i];
                if (c && c.type >= 0 && c.type < activeCandyTypesCount) {
                  colorCounts[c.type]++;
                }
              }
              let targetColor = 0;
              let maxCount = -1;
              for (let i = 0; i < activeCandyTypesCount; i++) {
                if (colorCounts[i] > maxCount) {
                  maxCount = colorCounts[i];
                  targetColor = i;
                }
              }
              
              const extra = [];
              for (let i = 0; i < board.length; i++) {
                const c = board[i];
                if (c && c.type === targetColor) {
                  extra.push(i);
                }
              }
              
              spawnBombLasers(tx, ty, extra.map(i => board[i]));
              
              setTimeout(() => {
                extra.forEach(eIdx => {
                  const c = board[eIdx];
                  if (c) {
                    c.element.classList.add('match-pop');
                    spawnParticles(c.x, c.y, c.type, 8);
                    trackTargetCollection(c.type);
                    clearJelly(eIdx);
                    damageBlocker(eIdx);
                    clearFrosting(eIdx);
                    clearChocolate(eIdx);
                  }
                });

                setTimeout(() => {
                  extra.forEach(eIdx => {
                    if (board[eIdx]) {
                      if (board[eIdx].element) board[eIdx].element.remove();
                      board[eIdx] = null;
                    }
                  });
                  resolve();
                }, 350);
              }, 350);
            }
          }, 700);
        });
      });

      await Promise.all(fishPromises);
      soundToPlay = 'special';
      soundToPlay = 'special';
    }
    else if (s1 === 'bomb' && s2 === 'bomb') {
      // BOMB + BOMB: Tüm tahtayı sil!
      for (let i = 0; i < board.length; i++) {
        if (board[i]) targetIndices.add(i);
      }
      spawnFloatingText(cx, cy, "KOZMİK TEMİZLİK!", "#ffd23f");
    } 
    else if (s1 === 'bomb' || s2 === 'bomb') {
      // BOMB + STRIPE/WRAP/FISH: Diğer rengin tüm şekerlerini o özel şekere çevir ve patlat!
      const bomb = s1 === 'bomb' ? candy1 : candy2;
      const other = s1 === 'bomb' ? candy2 : candy1;
      const targetColor = other.type;
      const specialType = other.special;

      const conversionTargets = [];
      for (let i = 0; i < board.length; i++) {
        const c = board[i];
        if (c && c.type === targetColor && c !== bomb) {
          conversionTargets.push(i);
        }
      }

      spawnBombLasers(bomb.x, bomb.y, conversionTargets.map(i => board[i]));
      soundToPlay = 'laser';
      
      // Lazeri bekle
      await new Promise(r => setTimeout(r, 350));

      // Dönüştür ve patlat
      conversionTargets.forEach(i => {
        const c = board[i];
        if (c) {
          if (specialType) {
            c.special = specialType;
            c.element.className = `candy ${specialType}`;
            if (specialType === 'fish') {
              const colorName = CANDY_IDS[c.type].replace('candy-', '');
              c.element.innerHTML = `<svg viewBox="0 0 48 48"><use href="#candy-fish-shape" fill="url(#grad-${colorName})"></use></svg>`;
            } else if (specialType === 'striped-h' || specialType === 'striped-v') {
              const svgId = `${CANDY_IDS[c.type]}-${specialType}`;
              c.element.innerHTML = `<svg viewBox="0 0 48 48"><use href="#${svgId}"></use></svg>`;
            } else {
              const svgId = CANDY_IDS[c.type];
              let overlayHtml = '';
              if (specialType === 'wrapped') overlayHtml = `<use href="#special-wrapped"></use>`;
              c.element.innerHTML = `<svg viewBox="0 0 48 48"><use href="#${svgId}"></use>${overlayHtml}</svg>`;
            }
          }
          targetIndices.add(i);
        }
      });
      targetIndices.add(idx1);
      targetIndices.add(idx2);
    }
    else if ((s1 === 'striped-h' || s1 === 'striped-v') && (s2 === 'striped-h' || s2 === 'striped-v')) {
      // STRIPE + STRIPE: Dikey ve yatay tüm satır/sütun (artı şeklinde)
      for (let i = 0; i < GRID_SIZE; i++) {
        targetIndices.add(cy * GRID_SIZE + i);
        targetIndices.add(i * GRID_SIZE + cx);
      }
      spawnSpecialExplosion(cx, cy, 'striped-h', candy2.type === -1 ? 0 : candy2.type);
      spawnSpecialExplosion(cx, cy, 'striped-v', candy2.type === -1 ? 0 : candy2.type);
    }
    else if (s1 === 'wrapped' && s2 === 'wrapped') {
      // WRAP + WRAP: Devasa 5x5 patlama!
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const ny = cy + dy;
          const nx = cx + dx;
          if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
            targetIndices.add(ny * GRID_SIZE + nx);
          }
        }
      }
      spawnFloatingText(cx, cy, "DEV PATLAMA!", "#ffe082");
    }
    else if (((s1 === 'striped-h' || s1 === 'striped-v') && s2 === 'wrapped') || (s1 === 'wrapped' && (s2 === 'striped-h' || s2 === 'striped-v'))) {
      // STRIPE + WRAP: 3 satır ve 3 sütunu temizle! (Dev artı)
      for (let i = 0; i < GRID_SIZE; i++) {
        for (let d = -1; d <= 1; d++) {
          const ry = cy + d;
          const rx = cx + d;
          if (ry >= 0 && ry < GRID_SIZE) targetIndices.add(ry * GRID_SIZE + i);
          if (rx >= 0 && rx < GRID_SIZE) targetIndices.add(i * GRID_SIZE + rx);
        }
      }
      spawnFloatingText(cx, cy, "MEGA LAZER!", "#ffd23f");
      spawnSpecialExplosion(cx, cy, 'striped-h', candy2.type === -1 ? 0 : candy2.type);
      spawnSpecialExplosion(cx, cy, 'striped-v', candy2.type === -1 ? 0 : candy2.type);
    }
    else if (s1 === 'fish' && s2 === 'fish') {
      // FISH + FISH: 4 balık gönder!
      targetIndices.add(idx1);
      targetIndices.add(idx2);
      for (let f = 0; f < 4; f++) {
        const tIdx = findFishTarget(targetIndices);
        if (tIdx !== undefined && tIdx !== null) {
          targetIndices.add(tIdx);
          spawnFishSwim(cx, cy, tIdx % GRID_SIZE, Math.floor(tIdx / GRID_SIZE), CANDY_COLORS[candy1.type]);
        }
      }
    }

    // Ortak patlatma ve temizlik
    if (soundToPlay === 'laser') soundEngine.playLaserBlast();
    else soundEngine.playSpecial();

    const clearList = Array.from(targetIndices);
    const matchedCount = clearList.length;

    const addedScore = matchedCount * 80 * comboCount;
    score += addedScore;
    updateHUD();

    spawnFloatingText(cx, cy, `+${addedScore}`, '#ffd23f');

    // Jöle, Blocker, Buz ve Çikolataları Temizle
    clearList.forEach(idx => {
      clearJelly(idx);
      damageBlocker(idx);
      clearFrosting(idx);
      clearChocolate(idx);
    });

    // Komşu blocker, buz ve çikolataları temizle
    clearList.forEach(idx => {
      const adjacents = [];
      const acx = idx % GRID_SIZE;
      const acy = Math.floor(idx / GRID_SIZE);
      if (acx > 0) adjacents.push(idx - 1);
      if (acx < GRID_SIZE - 1) adjacents.push(idx + 1);
      if (acy > 0) adjacents.push(idx - GRID_SIZE);
      if (acy < GRID_SIZE - 1) adjacents.push(idx + GRID_SIZE);
      
      adjacents.forEach(adjIdx => {
        damageBlocker(adjIdx);
        clearFrosting(adjIdx);
        clearChocolate(adjIdx);
      });
    });

    clearList.forEach(idx => {
      const c = board[idx];
      if (c) {
        const delay = c.isFishTarget ? 320 : 0;
        popCandy(c, delay);
      }
    });

    await new Promise(r => setTimeout(r, 450));

    clearList.forEach(idx => {
      const c = board[idx];
      if (c) {
        if (c.isFishTarget) {
          setTimeout(() => {
            if (c.element) c.element.remove();
          }, 320);
        } else {
          if (c.element) c.element.remove();
        }
        board[idx] = null;
      }
    });

    await refillBoard();

    const nextMatchedData = findMatches();
    if (nextMatchedData.indices.size > 0) {
      comboCount = 1;
      await handleMatchResolution(nextMatchedData);
    }
    
    isAnimating = false;
    await checkGameEndState();
    return;
  }

  const isCandy1Bomb = (candy1.special === 'bomb');
  const isCandy2Bomb = (candy2.special === 'bomb');

  if (isCandy1Bomb || isCandy2Bomb) {
    // Hamle hakkını tüket
    movesLeft--;
    turnPlayedThisStep = true;
    updateHUD();

    let targetIndices = new Set();
    let soundToPlay = 'laser';

    if (isCandy1Bomb && isCandy2Bomb) {
      // İkisi de renk bombası: Tüm tahtayı temizle!
      for (let i = 0; i < board.length; i++) {
        if (board[i]) {
          targetIndices.add(i);
        }
      }
      soundToPlay = 'special';
    } else {
      // Biri renk bombası, diğeri normal/özel şeker
      const bombCandy = isCandy1Bomb ? candy1 : candy2;
      const targetCandy = isCandy1Bomb ? candy2 : candy1;

      // Hedef şekerin rengi (tipi)
      const targetColor = targetCandy.type;

      // Tahtadaki bu renkteki tüm şekerleri bul
      const targets = [];
      for (let i = 0; i < board.length; i++) {
        const c = board[i];
        if (c && c.type === targetColor) {
          targetIndices.add(i);
          targets.push(c);
        }
      }

      // Ayrıca bombayı ve hedef şekerin kendisini de temizle
      targetIndices.add(idx1);
      targetIndices.add(idx2);

      // Lazeri ateşle!
      spawnBombLasers(bombCandy.x, bombCandy.y, targets);
    }

    isAnimating = true;

    // Lazer sesini ve efektini oynat
    if (soundToPlay === 'laser') {
      soundEngine.playLaserBlast();
    } else {
      soundEngine.playSpecial();
    }

    // Lazerlerin gitmesi için hafif bekle
    await new Promise(resolve => setTimeout(resolve, 350));

    // Şekerleri patlat
    const clearList = Array.from(targetIndices);
    const matchedCount = clearList.length;

    // Skor ekle
    const addedScore = matchedCount * 80 * comboCount;
    score += addedScore;
    updateHUD();

    // Puan yazısını göster
    const bx = candy1.x;
    const by = candy1.y;
    spawnFloatingText(bx, by, `+${addedScore}`, '#ffd23f');

    // Jöle, Blocker, Buz ve Çikolataları Temizle
    clearList.forEach(idx => {
      clearJelly(idx);
      damageBlocker(idx);
      clearFrosting(idx);
      clearChocolate(idx);
    });

    // Komşu blocker, buz ve çikolataları temizle
    clearList.forEach(idx => {
      const adjacents = [];
      const acx = idx % GRID_SIZE;
      const acy = Math.floor(idx / GRID_SIZE);
      if (acx > 0) adjacents.push(idx - 1);
      if (acx < GRID_SIZE - 1) adjacents.push(idx + 1);
      if (acy > 0) adjacents.push(idx - GRID_SIZE);
      if (acy < GRID_SIZE - 1) adjacents.push(idx + GRID_SIZE);
      
      adjacents.forEach(adjIdx => {
        damageBlocker(adjIdx);
        clearFrosting(adjIdx);
        clearChocolate(adjIdx);
      });
    });

    clearList.forEach(idx => {
      const c = board[idx];
      if (c) {
        c.element.classList.add('match-pop');
        spawnParticles(c.x, c.y, c.type === -1 ? 1 : c.type, 12);
        if (c.special && c.special !== 'bomb') {
          spawnSpecialExplosion(c.x, c.y, c.special, c.type);
        }
        trackTargetCollection(c.type);
      }
    });

    await new Promise(resolve => setTimeout(resolve, 430));

    // Tahtadan sil
    clearList.forEach(idx => {
      const c = board[idx];
      if (c) {
        c.element.remove();
        board[idx] = null;
      }
    });

    // Boşlukları doldur
    await refillBoard();

    // Düşmelerden sonra yeni eşleşmeler var mı kontrol et
    const nextMatchedData = findMatches();
    if (nextMatchedData.indices.size > 0) {
      comboCount = 1;
      await handleMatchResolution(nextMatchedData);
    }
  } else {
    const matchedData = findMatches();
    if (matchedData.indices.size > 0) {
      // Eşleşme başarılı! Hamle hakkını azalt
      movesLeft--;
      turnPlayedThisStep = true;
      updateHUD();
      
      comboCount = 1;
      await handleMatchResolution(matchedData);
    } else {
      // Eşleşme yoksa geri al!
      board[idx1] = candy1;
      board[idx2] = candy2;
      
      candy1.x = idx1 % GRID_SIZE;
      candy1.y = Math.floor(idx1 / GRID_SIZE);
      
      candy2.x = idx2 % GRID_SIZE;
      candy2.y = Math.floor(idx2 / GRID_SIZE);

      candy1.element.style.transform = `translate3d(${candy1.x * 100}%, ${candy1.y * 100}%, 0) scale(1)`;
      candy2.element.style.transform = `translate3d(${candy2.x * 100}%, ${candy2.y * 100}%, 0) scale(1)`;

      soundEngine.playRevert();
      await new Promise(resolve => setTimeout(resolve, 230));
    }
  }

  isAnimating = false;
  await checkGameEndState();
}

// --- 6. EŞLEŞME TESPİT ETME ALGORİTMASI ---

function findMatches() {
  const matchedIndices = new Set();
  const horizontalMatches = [];
  const verticalMatches = [];

  // Engel (blocker) veya çikolata altındaki şekerler eşleştirilemez
  const isMatchable = (idx) => {
    const c = board[idx];
    if (!c || c.type === -1) return false;
    if (blockerBoard[idx] > 0 || chocolateBoard[idx] > 0) return false;
    return true;
  };

  // 1. Yatay Tarama
  for (let r = 0; r < GRID_SIZE; r++) {
    let matchStart = 0;
    while (matchStart < GRID_SIZE - 2) {
      let matchLen = 1;
      const baseIdx = r * GRID_SIZE + matchStart;
      if (isMatchable(baseIdx)) {
        const type = board[baseIdx].type;
        while (
          matchStart + matchLen < GRID_SIZE &&
          isMatchable(r * GRID_SIZE + matchStart + matchLen) &&
          board[r * GRID_SIZE + matchStart + matchLen].type === type
        ) {
          matchLen++;
        }
        if (matchLen >= 3) {
          const group = [];
          for (let i = 0; i < matchLen; i++) {
            const idx = r * GRID_SIZE + matchStart + i;
            matchedIndices.add(idx);
            group.push(idx);
          }
          horizontalMatches.push({ type, indices: group });
        }
      }
      matchStart += matchLen;
    }
  }

  // 2. Dikey Tarama
  for (let c = 0; c < GRID_SIZE; c++) {
    let matchStart = 0;
    while (matchStart < GRID_SIZE - 2) {
      let matchLen = 1;
      const baseIdx = matchStart * GRID_SIZE + c;
      if (isMatchable(baseIdx)) {
        const type = board[baseIdx].type;
        while (
          matchStart + matchLen < GRID_SIZE &&
          isMatchable((matchStart + matchLen) * GRID_SIZE + c) &&
          board[(matchStart + matchLen) * GRID_SIZE + c].type === type
        ) {
          matchLen++;
        }
        if (matchLen >= 3) {
          const group = [];
          for (let i = 0; i < matchLen; i++) {
            const idx = (matchStart + i) * GRID_SIZE + c;
            matchedIndices.add(idx);
            group.push(idx);
          }
          verticalMatches.push({ type, indices: group });
        }
      }
      matchStart += matchLen;
    }
  }

  // 3. Özel Şeker Oluşturma Tespiti (T/L Şeklinde Eşleşmeler)
  const specialSpawns = [];
  
  // Hem yatay hem dikey eşleşmelerde kesişen bir hücre var mı?
  // Varsa bu hücre 'wrapped' (bomba) şeker olur.
  const intersectionPoints = new Set();
  horizontalMatches.forEach(h => {
    verticalMatches.forEach(v => {
      const intersect = h.indices.filter(idx => v.indices.includes(idx));
      if (intersect.length > 0) {
        intersect.forEach(idx => intersectionPoints.add(idx));
      }
    });
  });

  // Kesişim noktalarını 'wrapped' olarak işaretle
  intersectionPoints.forEach(idx => {
    const candy = board[idx];
    if (candy) {
      specialSpawns.push({ index: idx, type: candy.type, special: 'wrapped' });
    }
  });

  // Diğer özel şeker durumları:
  // 5 veya daha fazla düz eşleşme -> 'bomb' (eğer henüz kesişimde değilse)
  // 4 düz eşleşme -> 'striped' (şeritli patlatıcı)
  const handleStraightSpecial = (groups, dirType) => {
    groups.forEach(g => {
      // Eğer gruptan herhangi bir hücre zaten kesişim noktası olarak işaretlenmişse pas geç
      if (g.indices.some(idx => intersectionPoints.has(idx))) return;

      let spawnIdx = g.indices[0];
      // Eğer bu grup son yapılan kullanıcı hamlesinin konumunu içeriyorsa, özel şekeri oraya koy
      const userSwappedIdx = g.indices.find(idx => lastSwappedIndices.includes(idx));
      if (userSwappedIdx !== undefined) {
        spawnIdx = userSwappedIdx;
      } else {
        // Yoksa grubun ortasına koy
        spawnIdx = g.indices[Math.floor(g.indices.length / 2)];
      }

      if (g.indices.length >= 5) {
        specialSpawns.push({ index: spawnIdx, type: -1, special: 'bomb' });
      } else if (g.indices.length === 4) {
        const specialType = dirType === 'horizontal' ? 'striped-h' : 'striped-v';
        specialSpawns.push({ index: spawnIdx, type: g.type, special: specialType });
      }
    });
  };

  // 4. 2x2 Kare Eşleşme Tespiti (Balık Şekeri için)
  for (let r = 0; r < GRID_SIZE - 1; r++) {
    for (let c = 0; c < GRID_SIZE - 1; c++) {
      const idx00 = r * GRID_SIZE + c;
      const idx01 = r * GRID_SIZE + c + 1;
      const idx10 = (r + 1) * GRID_SIZE + c;
      const idx11 = (r + 1) * GRID_SIZE + c + 1;

      const c00 = board[idx00];
      const c01 = board[idx01];
      const c10 = board[idx10];
      const c11 = board[idx11];

      // Aynı renkte mi ve eşleşebilir mi?
      if (isMatchable(idx00) && isMatchable(idx01) && isMatchable(idx10) && isMatchable(idx11) &&
          c00.type === c01.type &&
          c00.type === c10.type &&
          c00.type === c11.type) {
        
        // Bu 4 hücreyi eşleşmiş olarak işaretle
        matchedIndices.add(idx00);
        matchedIndices.add(idx01);
        matchedIndices.add(idx10);
        matchedIndices.add(idx11);

        // Nereye balık yerleştireceğimizi seç
        let spawnIdx = idx00;
        if (lastSwappedIndices.includes(idx01)) spawnIdx = idx01;
        else if (lastSwappedIndices.includes(idx10)) spawnIdx = idx10;
        else if (lastSwappedIndices.includes(idx11)) spawnIdx = idx11;

        // Çakışmaları önlemek için eğer bu bölgeden başka özel şeker (striped/wrapped) üretilmiyorsa ekleyelim
        if (!specialSpawns.some(s => [idx00, idx01, idx10, idx11].includes(s.index))) {
          specialSpawns.push({ index: spawnIdx, type: c00.type, special: 'fish' });
        }
      }
    }
  }

  handleStraightSpecial(horizontalMatches, 'horizontal');
  handleStraightSpecial(verticalMatches, 'vertical');

  return {
    indices: matchedIndices,
    specialSpawns: specialSpawns
  };
}

// --- 7. REKÜRSİF ÖZEL ŞEKER PATLATMA VE ZİNCİR REAKSİYON ---

function resolveSpecialExplosions(matchedIndicesSet) {
  let toProcess = Array.from(matchedIndicesSet);
  let processed = new Set();
  
  while (toProcess.length > 0) {
    const idx = toProcess.shift();
    if (processed.has(idx)) continue;
    processed.add(idx);

    const candy = board[idx];
    if (!candy) continue;

    if (candy.special === 'striped-h') {
      const cy = candy.y;
      
      // Tüm satırı ekle
      for (let i = 0; i < GRID_SIZE; i++) {
        const rowIdx = cy * GRID_SIZE + i;
        if (!matchedIndicesSet.has(rowIdx)) {
          matchedIndicesSet.add(rowIdx);
          toProcess.push(rowIdx);
        }
      }
    } else if (candy.special === 'striped-v') {
      const cx = candy.x;
      
      // Tüm sütunu ekle
      for (let i = 0; i < GRID_SIZE; i++) {
        const colIdx = i * GRID_SIZE + cx;
        if (!matchedIndicesSet.has(colIdx)) {
          matchedIndicesSet.add(colIdx);
          toProcess.push(colIdx);
        }
      }
    } else if (candy.special === 'wrapped') {
      const cx = candy.x;
      const cy = candy.y;
      
      // 3x3 çevresini ekle
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = cy + dy;
          const nx = cx + dx;
          if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
            const neighborIdx = ny * GRID_SIZE + nx;
            if (!matchedIndicesSet.has(neighborIdx)) {
              matchedIndicesSet.add(neighborIdx);
              toProcess.push(neighborIdx);
            }
          }
        }
      }
    } else if (candy.special === 'bomb') {
      // Tahtadaki en yaygın rengi bul ve onu temizle! (Daha tatmin edici)
      const colorCounts = new Array(activeCandyTypesCount).fill(0);
      for (let i = 0; i < board.length; i++) {
        const c = board[i];
        if (c && c.type >= 0 && c.type < activeCandyTypesCount) {
          colorCounts[c.type]++;
        }
      }
      let targetColor = 0;
      let maxCount = -1;
      for (let c = 0; c < activeCandyTypesCount; c++) {
        if (colorCounts[c] > maxCount) {
          maxCount = colorCounts[c];
          targetColor = c;
        }
      }
      for (let i = 0; i < board.length; i++) {
        const c = board[i];
        if (c && c.type === targetColor) {
          if (!matchedIndicesSet.has(i)) {
            matchedIndicesSet.add(i);
            toProcess.push(i);
          }
        }
      }
    }
  }
}

// --- 6.8. ENGEL VE JOKER YARDIMCI GÜNCELLEMELERİ ---

function findFishTarget(excludeSet = null) {
  const isAvailable = (idx) => {
    if (excludeSet && excludeSet.has(idx)) return false;
    return true;
  };

  // 1. Öncelik: Duvarlar/Bloklar
  const blockerIndices = [];
  for (let i = 0; i < board.length; i++) {
    if (blockerBoard[i] > 0 && isAvailable(i)) blockerIndices.push(i);
  }
  if (blockerIndices.length > 0) {
    return blockerIndices[Math.floor(Math.random() * blockerIndices.length)];
  }

  // 2. Öncelik: Jöleler
  const jellyIndices = [];
  for (let i = 0; i < board.length; i++) {
    if (jellyBoard[i] === 1 && isAvailable(i)) jellyIndices.push(i);
  }
  if (jellyIndices.length > 0) {
    return jellyIndices[Math.floor(Math.random() * jellyIndices.length)];
  }

  // 3. Öncelik: Bölüm hedeflerine uyan şekerler
  const goalTypes = currentGoals.filter(g => g.collected < g.required && typeof g.type === 'number').map(g => g.type);
  const goalCandyIndices = [];
  for (let i = 0; i < board.length; i++) {
    const c = board[i];
    if (c && goalTypes.includes(c.type) && isAvailable(i)) {
      goalCandyIndices.push(i);
    }
  }
  if (goalCandyIndices.length > 0) {
    return goalCandyIndices[Math.floor(Math.random() * goalCandyIndices.length)];
  }

  // 4. Öncelik: Herhangi bir şeker (boş olmayan)
  const candyIndices = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] && isAvailable(i)) candyIndices.push(i);
  }
  if (candyIndices.length > 0) {
    return candyIndices[Math.floor(Math.random() * candyIndices.length)];
  }

  // Yedek durum: Hariç tutulmayan herhangi bir kare
  const allAvailable = [];
  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
    if (isAvailable(i)) allAvailable.push(i);
  }
  if (allAvailable.length > 0) {
    return allAvailable[Math.floor(Math.random() * allAvailable.length)];
  }

  return Math.floor(Math.random() * (GRID_SIZE * GRID_SIZE));
}
function clearChocolate(idx) {
  if (chocolateBoard[idx] !== 1) return;
  chocolateBoard[idx] = 0;
  chocolateClearedThisTurn = true;

  const el = chocolateElements[idx];
  if (el) {
    el.classList.add('cleared');
    setTimeout(() => el.remove(), 400);
    chocolateElements[idx] = null;
  }
  soundEngine.playJellyPop();
  trackTargetCollection('chocolate');
  updateCandyVisibility();
}

async function spreadChocolate() {
  const chocolateIndices = [];
  for (let i = 0; i < board.length; i++) {
    if (chocolateBoard[i] === 1) {
      chocolateIndices.push(i);
    }
  }

  if (chocolateIndices.length === 0) return;

  const targetIndices = new Set();
  const directions = [-1, 1, -GRID_SIZE, GRID_SIZE];

  chocolateIndices.forEach(idx => {
    const cx = idx % GRID_SIZE;
    const cy = Math.floor(idx / GRID_SIZE);

    directions.forEach(dir => {
      const targetIdx = idx + dir;
      if (dir === -1 && cx === 0) return;
      if (dir === 1 && cx === GRID_SIZE - 1) return;
      if (targetIdx < 0 || targetIdx >= board.length) return;

      if (
        chocolateBoard[targetIdx] === 0 &&
        blockerBoard[targetIdx] === 0 &&
        frostingBoard[targetIdx] === 0 &&
        board[targetIdx] !== null
      ) {
        targetIndices.add(targetIdx);
      }
    });
  });

  if (targetIndices.size === 0) return;

  const targetList = Array.from(targetIndices);
  const spreadIdx = targetList[Math.floor(Math.random() * targetList.length)];

  chocolateBoard[spreadIdx] = 1;
  
  const x = spreadIdx % GRID_SIZE;
  const y = Math.floor(spreadIdx / GRID_SIZE);
  
  const chocolateDiv = document.createElement('div');
  chocolateDiv.className = 'chocolate chocolate-growing';
  chocolateDiv.style.transform = `translate3d(${x * 100}%, ${y * 100}%, 0)`;
  chocolateDiv.innerHTML = `<div class="chocolate-inner">
    <svg viewBox="0 0 48 48" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="choc-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#7b3f00"/>
          <stop offset="40%" stop-color="#4e2204"/>
          <stop offset="100%" stop-color="#2a0e00"/>
        </linearGradient>
        <linearGradient id="choc-sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(255,220,160,0.35)"/>
          <stop offset="100%" stop-color="rgba(255,220,160,0)"/>
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="7" fill="url(#choc-grad)" stroke="#1a0800" stroke-width="1.5"/>
      <line x1="17" y1="2" x2="17" y2="46" stroke="#1a0800" stroke-width="1.5"/>
      <line x1="31" y1="2" x2="31" y2="46" stroke="#1a0800" stroke-width="1.5"/>
      <line x1="2" y1="17" x2="46" y2="17" stroke="#1a0800" stroke-width="1.5"/>
      <line x1="2" y1="31" x2="46" y2="31" stroke="#1a0800" stroke-width="1.5"/>
      <rect x="3" y="3" width="42" height="18" rx="6" fill="url(#choc-sheen)"/>
      <ellipse cx="11" cy="8" rx="4" ry="2" transform="rotate(-20 11 8)" fill="rgba(255,255,255,0.18)"/>
    </svg>
  </div>`;
  
  boardContainer.appendChild(chocolateDiv);
  chocolateElements[spreadIdx] = chocolateDiv;
  updateCandyVisibility();

  soundEngine.playJellyPop();
  spawnParticles(x, y, 1, 10);
  spawnFloatingText(x, y, "Çikolata Yayıldı! 🍫", "#5c3a21");

  await new Promise(r => setTimeout(r, 500));
  chocolateDiv.classList.remove('chocolate-growing');
}

function clearJelly(idx) {
  if (jellyBoard[idx] !== 1) return;
  jellyBoard[idx] = 0;

  const el = jellyElements[idx];
  if (el) {
    el.classList.add('cleared');
    setTimeout(() => el.remove(), 400);
    jellyElements[idx] = null;
  }
  soundEngine.playJellyPop();
  trackTargetCollection('jelly');
}

function animateSavingGummy(gummyEl, x, y) {
  // Şekerin patlama animasyonu için 400ms bekle
  setTimeout(() => {
    gummyEl.style.opacity = '1';
    gummyEl.style.zIndex = '1000';
    
    const boardRect = boardContainer.getBoundingClientRect();
    const cellWidth = boardRect.width / GRID_SIZE;
    const cellHeight = boardRect.height / GRID_SIZE;
    
    const isLarge = gummyEl.classList.contains('large-flyer');
    const widthOffset = isLarge ? cellWidth * 2 : cellWidth / 2;
    const heightOffset = isLarge ? cellHeight : cellHeight / 2;
    
    const centerX = boardRect.width / 2 - widthOffset;
    const centerY = boardRect.height / 2 - heightOffset;
    
    // Aşama 1: Ekranın ortasına uç ve büyü
    gummyEl.style.transition = 'transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)';
    const scaleFactor = isLarge ? 1.4 : 2.8;
    gummyEl.style.transform = `translate3d(${centerX}px, ${centerY}px, 0) scale(${scaleFactor}) rotate(360deg)`;
    
    // Aşama 2: Ortada bekle, sonra hedef kutusuna uç
    setTimeout(() => {
      const targetCard = document.getElementById('target-card-gummy') || document.querySelector('.targets-container');
      let targetX, targetY;
      
      if (targetCard) {
        const targetRect = targetCard.getBoundingClientRect();
        targetX = targetRect.left - boardRect.left + (targetRect.width / 2 - widthOffset);
        targetY = targetRect.top - boardRect.top + (targetRect.height / 2 - heightOffset);
      } else {
        targetX = boardRect.width / 2 - widthOffset;
        targetY = -200;
      }
      
      gummyEl.style.transition = 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.8s ease-in';
      gummyEl.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) scale(0.15) rotate(720deg)`;
      gummyEl.style.opacity = '0';
      
      // Aşama 3: Tamamla ve temizle
      setTimeout(() => {
        if (gummyEl && gummyEl.parentNode) {
          gummyEl.remove();
        }
        if (targetCard) {
          targetCard.classList.remove('bounce');
          void targetCard.offsetWidth; // Reflow
          targetCard.classList.add('bounce');
        }
      }, 850);
    }, 1000);
  }, 400);
}

function spawnIceShards(x, y) {
  const rect = boardContainer.getBoundingClientRect();
  const cellWidth = rect.width / GRID_SIZE;
  const cellHeight = rect.height / GRID_SIZE;
  const px = (x + 0.5) * cellWidth;
  const py = (y + 0.5) * cellHeight;
  
  for (let i = 0; i < 14; i++) {
    effects.push({
      type: 'ice-shard',
      x: px,
      y: py,
      vx: (Math.random() - 0.5) * 7,
      vy: -Math.random() * 5 - 2,
      spin: (Math.random() - 0.5) * 0.25,
      size: Math.random() * 4 + 3,
      angle: Math.random() * Math.PI * 2,
      gravity: 0.22,
      alpha: 1,
      decay: 0.02
    });
  }
}

function clearFrosting(idx) {
  if (frostingBoard[idx] !== 1) return;
  frostingBoard[idx] = 0;

  const el = frostingElements[idx];
  if (el) {
    el.classList.add('cleared');
    setTimeout(() => el.remove(), 400);
    frostingElements[idx] = null;
  }
  soundEngine.playJellyPop();

  const x = idx % GRID_SIZE;
  const y = Math.floor(idx / GRID_SIZE);
  spawnIceShards(x, y);

  const bear = gummyBearCellMap[idx];
  if (bear) {
    bear.clearedCells.add(idx);
    
    // Kademe kademe gözüksün
    const gummyEl = gummyElements[idx];
    if (gummyEl) {
      gummyEl.style.opacity = '1';
    }
    
    // Ayıcığı saran şekerin tamamı patlatılınca ayıcık serbest kalsın
    if (bear.clearedCells.size === bear.cells.length && !bear.isSaved) {
      bear.isSaved = true;
      trackTargetCollection('gummy');
      
      const x = idx % GRID_SIZE;
      const y = Math.floor(idx / GRID_SIZE);
      
      if (bear.type === 'small') {
        if (gummyEl) {
          animateSavingGummy(gummyEl, x, y);
          gummyElements[idx] = null;
        }
        spawnFloatingText(x, y, "KURTARILDI! 🧸", "#00f5d4");
      } else if (bear.type === 'large') {
        // Clear all 8 slice elements from DOM
        bear.cells.forEach(cIdx => {
          const partEl = gummyElements[cIdx];
          if (partEl) {
            partEl.remove();
            gummyElements[cIdx] = null;
          }
        });
        
        // Create large flyer element at start position
        const largeFlyer = document.createElement('div');
        largeFlyer.className = 'gummy-bear large-flyer';
        largeFlyer.style.width = '50%';
        largeFlyer.style.height = '25%';
        largeFlyer.style.position = 'absolute';
        largeFlyer.style.transform = `translate3d(${bear.startX * 100}%, ${bear.startY * 100}%, 0)`;
        largeFlyer.style.opacity = '1';
        largeFlyer.style.zIndex = '1000';
        largeFlyer.innerHTML = getLargeGummyBearSVG(bear.id);
        boardContainer.appendChild(largeFlyer);
        
        const midX = bear.startX + 1.5;
        const midY = bear.startY + 0.5;
        
        animateSavingGummy(largeFlyer, midX, midY);
        spawnFloatingText(midX, midY, "DEV AYICIK KURTARILDI! 🧸✨", "#ff007f");
      }
    }
  }
}

function getLargeGummyBearSVG(id) {
  return `<svg viewBox="0 0 100 100" class="gummy-bear-svg" style="width:100%; height:100%;">
  <defs>
    <radialGradient id="large-jelly-body-grad-${id}" cx="35%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#ff6b6b" />
      <stop offset="60%" stop-color="#ff007f" />
      <stop offset="100%" stop-color="#7209b7" />
    </radialGradient>
    <filter id="soft-shadow-${id}" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <ellipse cx="50" cy="88" rx="22" ry="5" fill="#000000" opacity="0.25" />
  <g filter="url(#soft-shadow-${id})">
    <!-- Left Ear -->
    <circle cx="28" cy="22" r="13" fill="url(#large-jelly-body-grad-${id})" />
    <circle cx="28" cy="22" r="8" fill="#7209b7" opacity="0.25" />
    <circle cx="26" cy="20" r="4.5" fill="#ffffff" opacity="0.25" />
    
    <!-- Right Ear -->
    <circle cx="72" cy="22" r="13" fill="url(#large-jelly-body-grad-${id})" />
    <circle cx="72" cy="22" r="8" fill="#7209b7" opacity="0.25" />
    <circle cx="70" cy="20" r="4.5" fill="#ffffff" opacity="0.25" />

    <!-- Left Foot -->
    <circle cx="28" cy="78" r="13.5" fill="url(#large-jelly-body-grad-${id})" />
    <ellipse cx="28" cy="78" rx="8" ry="6.5" fill="#ffffff" opacity="0.18" />
    
    <!-- Right Foot -->
    <circle cx="72" cy="78" r="13.5" fill="url(#large-jelly-body-grad-${id})" />
    <ellipse cx="72" cy="78" rx="8" ry="6.5" fill="#ffffff" opacity="0.18" />

    <!-- Left Arm -->
    <ellipse cx="20" cy="51" rx="10.5" ry="12.5" transform="rotate(-15 20 51)" fill="url(#large-jelly-body-grad-${id})" />
    <ellipse cx="18" cy="49" rx="4" ry="6.5" transform="rotate(-15 18 49)" fill="#ffffff" opacity="0.18" />

    <!-- Right Arm -->
    <ellipse cx="80" cy="51" rx="10.5" ry="12.5" transform="rotate(15 80 51)" fill="url(#large-jelly-body-grad-${id})" />
    <ellipse cx="82" cy="49" rx="4" ry="6.5" transform="rotate(15 82 49)" fill="#ffffff" opacity="0.18" />

    <!-- Body -->
    <ellipse cx="50" cy="62" rx="25" ry="23" fill="url(#large-jelly-body-grad-${id})" />
    <ellipse cx="50" cy="62" rx="17" ry="14" fill="#ffffff" opacity="0.12" />
    <path d="M 33,56 A 17,17 0 0 1 67,56" fill="none" stroke="#ffffff" stroke-width="2.2" opacity="0.3" stroke-linecap="round" />

    <!-- Head -->
    <circle cx="50" cy="37" r="20" fill="url(#large-jelly-body-grad-${id})" />
    <path d="M 34,29 A 16,16 0 0 1 66,29" fill="none" stroke="#ffffff" stroke-width="2.5" opacity="0.45" stroke-linecap="round" />
    <ellipse cx="43" cy="26" rx="3.5" ry="1.8" transform="rotate(-20 43 26)" fill="#ffffff" opacity="0.6" />
    
    <!-- Eyes -->
    <circle cx="41" cy="35" r="2.8" fill="#3a0ca3" />
    <circle cx="40.2" cy="34.2" r="0.9" fill="#ffffff" />
    <circle cx="59" cy="35" r="2.8" fill="#3a0ca3" />
    <circle cx="58.2" cy="34.2" r="0.9" fill="#ffffff" />

    <!-- Snout & Smile -->
    <ellipse cx="50" cy="42" rx="7" ry="5" fill="#ff007f" opacity="0.35" />
    <ellipse cx="50" cy="42" rx="4.5" ry="3" fill="#ffffff" opacity="0.25" />
    <path d="M 48,40 Q 50,38.5 52,40" fill="none" stroke="#3a0ca3" stroke-width="1.5" stroke-linecap="round" />
    <path d="M 46.5,44 Q 50,47.5 53.5,44" fill="none" stroke="#3a0ca3" stroke-width="1.5" stroke-linecap="round" />
  </g>
</svg>`;
}

function getGummyBearSVG() {
  return `<svg viewBox="0 0 100 100" class="gummy-bear-svg" style="width:100%; height:100%;">
  <defs>
    <radialGradient id="jelly-body-grad" cx="35%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#0df5db" />
      <stop offset="60%" stop-color="#00b4d8" />
      <stop offset="100%" stop-color="#0077b6" />
    </radialGradient>
    <filter id="soft-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <ellipse cx="50" cy="88" rx="22" ry="5" fill="#000000" opacity="0.25" />
  <g filter="url(#soft-shadow)">
    <!-- Left Ear -->
    <circle cx="28" cy="22" r="13" fill="url(#jelly-body-grad)" />
    <circle cx="28" cy="22" r="8" fill="#0077b6" opacity="0.25" />
    <circle cx="26" cy="20" r="4.5" fill="#ffffff" opacity="0.25" />
    
    <!-- Right Ear -->
    <circle cx="72" cy="22" r="13" fill="url(#jelly-body-grad)" />
    <circle cx="72" cy="22" r="8" fill="#0077b6" opacity="0.25" />
    <circle cx="70" cy="20" r="4.5" fill="#ffffff" opacity="0.25" />

    <!-- Left Foot -->
    <circle cx="28" cy="78" r="13.5" fill="url(#jelly-body-grad)" />
    <ellipse cx="28" cy="78" rx="8" ry="6.5" fill="#ffffff" opacity="0.18" />
    
    <!-- Right Foot -->
    <circle cx="72" cy="78" r="13.5" fill="url(#jelly-body-grad)" />
    <ellipse cx="72" cy="78" rx="8" ry="6.5" fill="#ffffff" opacity="0.18" />

    <!-- Left Arm -->
    <ellipse cx="20" cy="51" rx="10.5" ry="12.5" transform="rotate(-15 20 51)" fill="url(#jelly-body-grad)" />
    <ellipse cx="18" cy="49" rx="4" ry="6.5" transform="rotate(-15 18 49)" fill="#ffffff" opacity="0.18" />

    <!-- Right Arm -->
    <ellipse cx="80" cy="51" rx="10.5" ry="12.5" transform="rotate(15 80 51)" fill="url(#jelly-body-grad)" />
    <ellipse cx="82" cy="49" rx="4" ry="6.5" transform="rotate(15 82 49)" fill="#ffffff" opacity="0.18" />

    <!-- Body -->
    <ellipse cx="50" cy="62" rx="25" ry="23" fill="url(#jelly-body-grad)" />
    <ellipse cx="50" cy="62" rx="17" ry="14" fill="#ffffff" opacity="0.12" />
    <path d="M 33,56 A 17,17 0 0 1 67,56" fill="none" stroke="#ffffff" stroke-width="2.2" opacity="0.3" stroke-linecap="round" />

    <!-- Head -->
    <circle cx="50" cy="37" r="20" fill="url(#jelly-body-grad)" />
    <path d="M 34,29 A 16,16 0 0 1 66,29" fill="none" stroke="#ffffff" stroke-width="2.5" opacity="0.45" stroke-linecap="round" />
    <ellipse cx="43" cy="26" rx="3.5" ry="1.8" transform="rotate(-20 43 26)" fill="#ffffff" opacity="0.6" />
    
    <!-- Eyes -->
    <circle cx="41" cy="35" r="2.8" fill="#003566" />
    <circle cx="40.2" cy="34.2" r="0.9" fill="#ffffff" />
    <circle cx="59" cy="35" r="2.8" fill="#003566" />
    <circle cx="58.2" cy="34.2" r="0.9" fill="#ffffff" />

    <!-- Snout & Smile -->
    <ellipse cx="50" cy="42" rx="7" ry="5" fill="#00b4d8" opacity="0.35" />
    <ellipse cx="50" cy="42" rx="4.5" ry="3" fill="#ffffff" opacity="0.25" />
    <path d="M 48,40 Q 50,38.5 52,40" fill="none" stroke="#003566" stroke-width="1.5" stroke-linecap="round" />
    <path d="M 46.5,44 Q 50,47.5 53.5,44" fill="none" stroke="#003566" stroke-width="1.5" stroke-linecap="round" />
  </g>
</svg>`;
}

function damageBlocker(idx) {
  if (blockerBoard[idx] <= 0) return;
  blockerBoard[idx]--;

  const el = blockerElements[idx];
  if (blockerBoard[idx] === 1) {
    // 2. katmandan 1. katmana düşüş
    if (el) {
      el.classList.remove('layer-2');
      el.classList.add('layer-1');
      // Hit shake animation
      el.classList.remove('hit');
      void el.offsetWidth; // force reflow
      el.classList.add('hit');
      setTimeout(() => el && el.classList.remove('hit'), 350);
    }
    soundEngine.playRevert();
    spawnParticles(idx % GRID_SIZE, Math.floor(idx / GRID_SIZE), 1, 12); // Tahta kıymıkları
  } else if (blockerBoard[idx] === 0) {
    // Tamamen kırıldı
    if (el) {
      el.classList.add('cleared');
      setTimeout(() => el.remove(), 450);
      blockerElements[idx] = null;
    }
    soundEngine.playSpecial();
    spawnParticles(idx % GRID_SIZE, Math.floor(idx / GRID_SIZE), 1, 12); // bol miktarda tahta parçacığı
    trackTargetCollection('blocker');
    updateCandyVisibility();
  }
}

// Eşleşen Şekerleri Patlat, Skoru Ekle ve Boşlukları Hazırla
async function handleMatchResolution(matchedData) {
  // 1. Rekürsif olarak satır/sütun/bomba zincirleme patlamaları ilk kez çöz (böylece patlamalarda yok olan balıklar da yakalanır)
  resolveSpecialExplosions(matchedData.indices);

  // 2. Balık Şekerleri kontrolü ve tetiklenmesi
  const fishToProcess = [];
  matchedData.indices.forEach(idx => {
    const candy = board[idx];
    if (candy && candy.special === 'fish') {
      fishToProcess.push(idx);
    }
  });

  fishToProcess.forEach(fishIdx => {
    const fishCandy = board[fishIdx];
    if (!fishCandy) return;

    const targetIdx = findFishTarget(matchedData.indices);
    if (targetIdx !== undefined && targetIdx !== null) {
      matchedData.indices.add(targetIdx);
      const targetCandy = board[targetIdx];
      if (targetCandy) {
        targetCandy.isFishTarget = true;
      }
      // Balık yüzüşü efekti tetikle (Canvas balık partikülü fırlatır)
      spawnFishSwim(fishCandy.x, fishCandy.y, targetIdx % GRID_SIZE, Math.floor(targetIdx / GRID_SIZE), CANDY_COLORS[fishCandy.type]);
    }
  });

  // 3. Balık hedeflerinde özel şekerler olabileceğinden tekrar patlamaları çöz
  resolveSpecialExplosions(matchedData.indices);

  const clearList = Array.from(matchedData.indices);
  const matchedCount = clearList.length;

  if (matchedCount === 0) return;

  // Jöle, Duvar, Buz ve Çikolataları Temizle
  clearList.forEach(idx => {
    clearJelly(idx);
    damageBlocker(idx);
    clearFrosting(idx);
    clearChocolate(idx);
  });

  // Komşu hücrelerdeki duvar, buz ve çikolataları patlat
  clearList.forEach(idx => {
    const cx = idx % GRID_SIZE;
    const cy = Math.floor(idx / GRID_SIZE);
    const adjacents = [];
    if (cx > 0) adjacents.push(idx - 1);
    if (cx < GRID_SIZE - 1) adjacents.push(idx + 1);
    if (cy > 0) adjacents.push(idx - GRID_SIZE);
    if (cy < GRID_SIZE - 1) adjacents.push(idx + GRID_SIZE);
    
    adjacents.forEach(adjIdx => {
      damageBlocker(adjIdx);
      clearFrosting(adjIdx);
      clearChocolate(adjIdx);
    });
  });

  // Skor hesaplama: Temel puan * patlayan adet * kombo çarpanı
  const addedScore = matchedCount * 60 * comboCount;
  score += addedScore;
  updateHUD();

  // Kombo bildirim metinleri
  if (comboCount === 2) {
    spawnComboSplash("NEFİS! 🍭", 'splash-tasty');
  } else if (comboCount === 3) {
    spawnComboSplash("HARİKA! 🌟", 'splash-delicious');
  } else if (comboCount === 4) {
    spawnComboSplash("İNANILMAZ! ✨", 'splash-divine');
  } else if (comboCount >= 5) {
    spawnComboSplash("SUGAR CRUSH! 👑", 'splash-sugar-crush');
  }

  // İlk eşleşen şeker bölgesine uçuşan puanı koy
  const firstIdx = clearList[0];
  const fx = firstIdx % GRID_SIZE;
  const fy = Math.floor(firstIdx / GRID_SIZE);
  spawnFloatingText(fx, fy, `+${addedScore}`, '#fff');

  // Her şeker için yok olma efekti, ses ve parçacık
  let hasSpecialDetonated = false;
  clearList.forEach(idx => {
    const candy = board[idx];
    if (candy) {
      const delay = candy.isFishTarget ? 320 : 0;
      popCandy(candy, delay);
      if (candy.special) {
        hasSpecialDetonated = true;
      }
    }
  });

  if (hasSpecialDetonated) {
    soundEngine.playSpecial();
  } else {
    soundEngine.playPop(comboCount);
  }

  // Yok olma animasyonunun bitmesini bekle (şaşalı animasyon için süre uzatıldı)
  await new Promise(resolve => setTimeout(resolve, 430));

  // DOM'dan şeker elemanlarını sil ve tahta dizisini temizle
  clearList.forEach(idx => {
    const candy = board[idx];
    if (candy) {
      if (candy.isFishTarget) {
        setTimeout(() => {
          if (candy.element) candy.element.remove();
        }, 320);
      } else {
        if (candy.element) candy.element.remove();
      }
      board[idx] = null;
    }
  });

  // Özel şeker yaratılacak yerlere yeni özel şekerleri yerleştir
  matchedData.specialSpawns.forEach(spawn => {
    // Eğer patlama esnasında bu hücre de yok olduysa, buraya yeni özel şeker kur
    if (board[spawn.index] === null) {
      board[spawn.index] = createCandy(
        spawn.index % GRID_SIZE,
        Math.floor(spawn.index / GRID_SIZE),
        spawn.type,
        spawn.special
      );
    }
  });

  // Boşlukları doldur
  await refillBoard();

  // Düşmeler tamamlandıktan sonra yeni tahtada tekrar eşleşme kontrolü yap
  const nextMatchedData = findMatches();
  if (nextMatchedData.indices.size > 0) {
    comboCount++;
    // Yeni bir tur reaksiyon başlat
    await handleMatchResolution(nextMatchedData);
  }
}

// --- 8. YERÇEKİMİ VE YUKARIDAN DÖKÜLME ---

function refillBoard() {
  return new Promise((resolve) => {
    let maxFallDistance = 0;

    // Her sütun için işlemleri yap
    for (let x = 0; x < GRID_SIZE; x++) {
      let emptyCount = 0;
      
      // Sütunu aşağıdan yukarıya doğru tara
      for (let y = GRID_SIZE - 1; y >= 0; y--) {
        const idx = y * GRID_SIZE + x;
        if (board[idx] === null) {
          emptyCount++;
        } else if (emptyCount > 0) {
          // Bu şekeri emptyCount kadar aşağı kaydır
          const candy = board[idx];
          const newIdx = (y + emptyCount) * GRID_SIZE + x;
          
          board[newIdx] = candy;
          board[idx] = null;
          candy.y = y + emptyCount;

          // CSS animasyonunu tetikle
          candy.element.style.transform = `translate3d(${x * 100}%, ${candy.y * 100}%, 0) scale(1)`;
          maxFallDistance = Math.max(maxFallDistance, emptyCount);
        }
      }

      // Sütunun tepesinde oluşan boşluklara yenilerini yerleştir
      for (let i = 0; i < emptyCount; i++) {
        const targetY = emptyCount - 1 - i;
        const startY = -(i + 1); // Ekranın hemen üzerinden dökülsün
        
        let type = getRandomType();
        let special = null;
        
        if (level >= 3) {
          const rand = Math.random();
          if (rand < 0.005) {
            type = -1;
            special = 'bomb';
          } else if (rand < 0.015) {
            special = 'wrapped';
          } else if (rand < 0.035) {
            special = Math.random() < 0.5 ? 'striped-h' : 'striped-v';
          }
        }

        const candy = createCandy(x, startY, type, special);
        board[targetY * GRID_SIZE + x] = candy;
        candy.y = targetY;

        // Force browser reflow: Başlangıç konumunun tarayıcı tarafından kayda geçmesini sağla
        candy.element.getBoundingClientRect();

        // Hedef konuma düşür
        candy.element.style.transform = `translate3d(${x * 100}%, ${targetY * 100}%, 0) scale(1)`;
        maxFallDistance = Math.max(maxFallDistance, emptyCount);
      }
    }

    // Düşme mesafesine göre dinamik bekleme süresi
    const fallDuration = 200 + maxFallDistance * 40;
    setTimeout(() => {
      updateCandyVisibility();
      resolve();
    }, fallDuration);
  });
}

// --- 9. OYUN BİTİŞ KONTROLÜ VE NO-MOVE KARIŞTIRMA ---

// Yapılabilecek hamle var mı diye tahtayı tara
function hasPossibleMoves() {
  const directions = [
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 }
  ];

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const idx1 = y * GRID_SIZE + x;
      const candy1 = board[idx1];
      if (!candy1 || blockerBoard[idx1] > 0 || chocolateBoard[idx1] > 0) continue;

      for (const dir of directions) {
        const nx = x + dir.dx;
        const ny = y + dir.dy;

        if (nx < GRID_SIZE && ny < GRID_SIZE) {
          const idx2 = ny * GRID_SIZE + nx;
          const candy2 = board[idx2];
          if (!candy2 || blockerBoard[idx2] > 0 || chocolateBoard[idx2] > 0) continue;

          // Eğer şekerlerden biri renk bombası ise, bu her zaman geçerli bir hamledir!
          if (candy1.special === 'bomb' || candy2.special === 'bomb') {
            return true;
          }

          // Geçici swap yap
          board[idx1] = candy2;
          board[idx2] = candy1;

          const matched = findMatches();

          // Geri al
          board[idx1] = candy1;
          board[idx2] = candy2;

          if (matched.indices.size > 0) {
            return true; // Hamle var!
          }
        }
      }
    }
  }
  return false;
}

function findHintMove() {
  const directions = [
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 }
  ];

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const idx1 = y * GRID_SIZE + x;
      const candy1 = board[idx1];
      if (!candy1 || blockerBoard[idx1] > 0 || chocolateBoard[idx1] > 0) continue;

      for (const dir of directions) {
        const nx = x + dir.dx;
        const ny = y + dir.dy;

        if (nx < GRID_SIZE && ny < GRID_SIZE) {
          const idx2 = ny * GRID_SIZE + nx;
          const candy2 = board[idx2];
          if (!candy2 || blockerBoard[idx2] > 0 || chocolateBoard[idx2] > 0) continue;

          if (candy1.special === 'bomb' || candy2.special === 'bomb') {
            return { idx1, idx2 };
          }

          board[idx1] = candy2;
          board[idx2] = candy1;

          const matched = findMatches();

          board[idx1] = candy1;
          board[idx2] = candy2;

          if (matched.indices.size > 0) {
            return { idx1, idx2 };
          }
        }
      }
    }
  }
  return null;
}

function showHint() {
  if (isAnimating || movesLeft <= 0) return;

  const hint = findHintMove();
  if (hint) {
    const c1 = board[hint.idx1];
    const c2 = board[hint.idx2];
    if (c1 && c2) {
      c1.element.classList.add('hint-pulse');
      c2.element.classList.add('hint-pulse');
      activeHintCandies = [c1, c2];
    }
  }
}

function clearHint() {
  if (hintTimeout) {
    clearTimeout(hintTimeout);
    hintTimeout = null;
  }
  activeHintCandies.forEach(c => {
    if (c && c.element) {
      c.element.classList.remove('hint-pulse');
    }
  });
  activeHintCandies = [];
}

function startHintTimer() {
  clearHint();
  const screen = document.getElementById('game-screen');
  if (screen && screen.classList.contains('active') && !isAnimating && movesLeft > 0) {
    hintTimeout = setTimeout(showHint, 5000);
  }
}

// Kilitlenme durumunda tahtayı karıştır (Shuffle)
async function shuffleBoard() {
  isAnimating = true;
  
  // Ekranda yüzen bildirim
  spawnFloatingText(3, 3, "HAMLE KALMADI!", "#ffd23f");
  spawnFloatingText(3, 4, "KARIŞTIRILIYOR...", "#ffd23f");
  soundEngine.playRevert();

  await new Promise(r => setTimeout(r, 1000));

  // Rastgele karıştırma (Tahtadaki şekerlerin tiplerini topla ve karıştır)
  const types = board.map(c => c ? c.type : getRandomType());
  
  let validShuffle = false;
  while (!validShuffle) {
    // Fisher-Yates karıştırma algoritması
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = types[i];
      types[i] = types[j];
      types[j] = temp;
    }

    // Tahtaya geçici ata ve kontrol et
    let hasMatches = false;
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const t = types[y * GRID_SIZE + x];
        if (
          (x >= 2 && types[y * GRID_SIZE + (x - 1)] === t && types[y * GRID_SIZE + (x - 2)] === t) ||
          (y >= 2 && types[(y - 1) * GRID_SIZE + x] === t && types[(y - 2) * GRID_SIZE + x] === t)
        ) {
          hasMatches = true;
          break;
        }
      }
      if (hasMatches) break;
    }

    // Eşleşme yoksa ve yapılabilecek hamle varsa karıştırma geçerlidir
    if (!hasMatches) {
      // Geçici olarak tahta şeker tiplerini güncelle ve kontrol et
      for (let i = 0; i < board.length; i++) {
        if (board[i]) board[i].type = types[i];
      }
      if (hasPossibleMoves()) {
        validShuffle = true;
      }
    }
  }

  // Karıştırma animasyonunu oynat (şekerleri merkezde topla ve geri fırlat)
  const rect = boardContainer.getBoundingClientRect();
  const cellWidth = rect.width / GRID_SIZE;
  const cellHeight = rect.height / GRID_SIZE;

  // Merkezde topla
  board.forEach(c => {
    if (c) {
      c.element.style.transform = `translate3d(350%, 350%, 0) scale(0.2)`;
    }
  });

  await new Promise(r => setTimeout(r, 300));

  // Geri yerlerine gönder ve görselleri güncelle
  board.forEach((c, idx) => {
    if (c) {
      if (c.special === 'bomb') {
        c.element.className = 'candy bomb';
        c.element.innerHTML = `<svg viewBox="0 0 48 48"><use href="#candy-bomb"></use></svg>`;
      } else if (c.special === 'fish') {
        c.element.className = 'candy fish';
        const colorName = CANDY_IDS[c.type].replace('candy-', '');
        c.element.innerHTML = `<svg viewBox="0 0 48 48"><use href="#candy-fish-shape" fill="url(#grad-${colorName})"></use></svg>`;
      } else {
        if (c.special === 'striped-h' || c.special === 'striped-v') {
          const svgId = `${CANDY_IDS[c.type]}-${c.special}`;
          c.element.innerHTML = `<svg viewBox="0 0 48 48"><use href="#${svgId}"></use></svg>`;
        } else {
          const svgId = CANDY_IDS[c.type];
          let overlayHtml = '';
          if (c.special === 'wrapped') {
            overlayHtml = `<use href="#special-wrapped"></use>`;
          }
          c.element.innerHTML = `<svg viewBox="0 0 48 48"><use href="#${svgId}"></use>${overlayHtml}</svg>`;
        }
      }
      c.element.style.transform = `translate3d(${c.x * 100}%, ${c.y * 100}%, 0) scale(1)`;
    }
  });

  await new Promise(r => setTimeout(r, 300));
  updateCandyVisibility();
  isAnimating = false;
  startHintTimer();
}

// Haritaya geri dön (geri butonu)
function exitToMap() {
  if (isAnimating) return; // Animasyon sırasında engelle
  isAnimating = false;
  activeJoker = null;
  saveGameState();
  showScreenWithTransition(mapScreen, () => {
    initMap(level);
  });
}

// Oyundaki hedeflere ulaşıldı mı veya bitti mi kontrol et
async function checkGameEndState() {
  let allTargetsMet = currentGoals.every(g => g.collected >= g.required);

  if (!allTargetsMet && turnPlayedThisStep) {
    turnPlayedThisStep = false;
    if (!chocolateClearedThisTurn) {
      await spreadChocolate();
    }
    chocolateClearedThisTurn = false;
    allTargetsMet = currentGoals.every(g => g.collected >= g.required);
  } else {
    turnPlayedThisStep = false;
    chocolateClearedThisTurn = false;
  }
  
  if (allTargetsMet) {
    // SEVİYE GEÇİLDİ!
    isAnimating = true;

    // 1. ŞEKER YAĞMURU (SUGAR CRUSH) KONTROLÜ
    // Tahtadaki tüm özel şekerlerin indekslerini bul
    let specialIndices = [];
    for (let i = 0; i < board.length; i++) {
      if (board[i] && board[i].special) {
        specialIndices.push(i);
      }
    }

    if (specialIndices.length > 0) {
      // "Dokun ve Geç" Butonu oluştur
      const skipBtn = document.createElement('button');
      skipBtn.className = 'skip-crush-btn';
      skipBtn.innerText = 'DOKUN VE GEÇ ⏩';
      document.body.appendChild(skipBtn);

      let skipSugarCrush = false;
      skipBtn.addEventListener('click', () => {
        skipSugarCrush = true;
        skipBtn.remove();
      });

      // Sırayla patlat
      while (specialIndices.length > 0 && !skipSugarCrush) {
        specialIndices = [];
        for (let i = 0; i < board.length; i++) {
          if (board[i] && board[i].special) {
            specialIndices.push(i);
          }
        }

        if (specialIndices.length === 0) break;

        const targetIdx = specialIndices[0];
        
        // Bu şekeri tekil patlama olarak handleMatchResolution'a gönder
        await handleMatchResolution({ indices: new Set([targetIdx]), specialSpawns: [] });
        
        // Patlamalar arası bekleme süresi
        await new Promise(r => setTimeout(r, 450));
      }

      // Buton hala ekrandaysa kaldır
      if (skipBtn.parentNode) {
        skipBtn.remove();
      }

      // Eğer geçildiyse kalanları anında topla ve temizle
      if (skipSugarCrush) {
        let remainingCount = 0;
        for (let i = 0; i < board.length; i++) {
          if (board[i] && board[i].special) {
            remainingCount++;
          }
        }

        if (remainingCount > 0) {
          const instantScore = remainingCount * 600;
          score += instantScore;
          updateHUD();
          spawnFloatingText(3, 3, `+${instantScore} SUGAR CRUSH!`, '#ffd23f');
          soundEngine.playSpecial();
        }

        // Tahtadaki tüm şekerleri sil
        for (let i = 0; i < board.length; i++) {
          if (board[i]) {
            board[i].element.remove();
            board[i] = null;
          }
        }

        // Tahtayı doldur
        await refillBoard();
        await new Promise(r => setTimeout(r, 600));
      }
    }

    // Normal Seviye Sonu Süreci
    soundEngine.playLevelUp();
    spawnFloatingText(3, 3, "BÖLÜM GEÇİLDİ!", "#4caf50");
    
    await new Promise(r => setTimeout(r, 1200));
    
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('candy_high_score', highScore);
    }
    
    // Bölüm bazlı yüksek skoru kaydet
    const savedLvlHighScore = parseInt(localStorage.getItem(`candy_highscore_lvl_${level}`) || '0');
    if (score > savedLvlHighScore) {
      localStorage.setItem(`candy_highscore_lvl_${level}`, score);
    }
    
    document.getElementById('game-over-title').innerText = "TEBRİKLER!";
    document.getElementById('game-over-title').style.color = '#4caf50';
    document.getElementById('game-over-message').innerText = `${level}. seviye başarıyla tamamlandı! Yeni bahçeye geçmeye hazır mısın?`;
    
    document.getElementById('final-level').innerText = level;
    document.getElementById('final-score').innerText = score;
    document.getElementById('high-score').innerText = highScore;
    
    nextLevelBtn.style.display = 'block';
    retryLevelBtn.style.display = 'none';
    
    showScreen(gameOverScreen);
    isAnimating = false;
  } else if (movesLeft <= 0) {
    // HAMLE BİTTİ, BAŞARISIZ!
    isAnimating = true;
    soundEngine.playGameOver();
    spawnFloatingText(3, 3, "HAMLE BİTTİ!", "#ff3366");
    
    // Can düşür (Can sadece bölüm geçilemediğinde düşer)
    lives = Math.max(0, lives - 1);
    if (lives === 4) {
      lastLifeTime = Date.now();
    }
    saveGameState();
    updateLivesUI();
    
    await new Promise(r => setTimeout(r, 1200));
    
    document.getElementById('game-over-title').innerText = "BAŞARISIZ";
    document.getElementById('game-over-title').style.color = '#ff3366';
    document.getElementById('game-over-message').innerText = "Hedefleri toplamak için yeterli hamleniz kalmadı.";
    
    document.getElementById('final-level').innerText = level;
    document.getElementById('final-score').innerText = score;
    document.getElementById('high-score').innerText = highScore;
    
    nextLevelBtn.style.display = 'none';
    retryLevelBtn.style.display = 'block';
    
    showScreen(gameOverScreen);
    isAnimating = false;
  } else if (!hasPossibleMoves()) {
    // Hamle kaldı ama tahta tıkandıysa karıştır
    await shuffleBoard();
  } else {
    startHintTimer();
  }
}

// --- 10. HUD VE ARAYÜZ YÖNETİMİ ---

function updateHUD() {
  scoreVal.innerText = score;
  levelVal.innerText = level;
  movesVal.innerText = movesLeft;

  // Hamle sayısı az kaldığında uyarı kırmızısı
  if (movesLeft <= 5) {
    movesVal.parentElement.style.borderColor = '#ff3366';
    movesVal.style.color = '#ff3366';
  } else {
    movesVal.parentElement.style.borderColor = 'rgba(255, 255, 255, 0.15)';
    movesVal.style.color = '#ffffff';
  }

  // Yıldız Barı İlerlemesi Güncellemesi
  const targetScore = 10000 + level * 5000;
  const pct = Math.min(100, (score / targetScore) * 100);
  
  const progressBar = document.getElementById('star-bar-progress');
  if (progressBar) {
    progressBar.style.width = `${pct}%`;
  }
  
  const star1 = document.getElementById('star-milestone-1');
  const star2 = document.getElementById('star-milestone-2');
  const star3 = document.getElementById('star-milestone-3');
  
  if (star1) {
    if (pct >= 30) star1.classList.add('active');
    else star1.classList.remove('active');
  }
  if (star2) {
    if (pct >= 60) star2.classList.add('active');
    else star2.classList.remove('active');
  }
  if (star3) {
    if (pct >= 93) star3.classList.add('active');
    else star3.classList.remove('active');
  }
}

function showScreen(screen) {
  startScreen.classList.remove('active');
  mapScreen.classList.remove('active');
  gameScreen.classList.remove('active');
  gameOverScreen.classList.remove('active');
  
  screen.classList.add('active');
  
  clearHint();
  
  // Oyun ekranına geçişte canvası ayarla ve render döngüsünü başlat
  if (screen === gameScreen) {
    setTimeout(() => {
      resizeCanvas();
    }, 100);
    startHintTimer();
    soundEngine.startMusic();
  } else {
    soundEngine.stopMusic();
  }
}

// --- 10.5. JOKER BOOSTER YARDIMCI METOTLARI ---

function updateJokersUI() {
  const hammerBadge = document.getElementById('joker-hammer-count');
  const sprayBadge = document.getElementById('joker-spray-count');
  const movesBadge = document.getElementById('joker-moves-count');
  const bombBadge = document.getElementById('joker-bomb-count');
  const fishBadge = document.getElementById('joker-fish-count');
  
  const updateBadge = (badgeElement, count) => {
    if (!badgeElement) return;
    if (count > 0) {
      badgeElement.innerText = count;
      badgeElement.classList.remove('empty-badge');
    } else {
      badgeElement.innerText = '+📺';
      badgeElement.classList.add('empty-badge');
    }
  };

  updateBadge(hammerBadge, jokers.hammer);
  updateBadge(sprayBadge, jokers.spray);
  updateBadge(movesBadge, jokers.moves);
  updateBadge(bombBadge, jokers.bomb);
  updateBadge(fishBadge, jokers.fish);
  
  const hammerBtn = document.getElementById('joker-hammer');
  const sprayBtn = document.getElementById('joker-spray');
  const bombBtn = document.getElementById('joker-bomb');
  const fishBtn = document.getElementById('joker-fish');
  const movesBtn = document.getElementById('joker-moves');
  
  // Seviye kısıtlamalarına göre göster/gizle (display: none/flex)
  if (hammerBtn) {
    hammerBtn.style.display = 'flex'; // Çekiç her zaman açık
    if (activeJoker === 'hammer') {
      hammerBtn.classList.add('active');
    } else {
      hammerBtn.classList.remove('active');
    }
  }
  
  if (movesBtn) {
    movesBtn.style.display = level >= 2 ? 'flex' : 'none';
  }

  if (sprayBtn) {
    sprayBtn.style.display = level >= 3 ? 'flex' : 'none';
    if (activeJoker === 'spray') {
      sprayBtn.classList.add('active');
    } else {
      sprayBtn.classList.remove('active');
    }
  }

  if (bombBtn) {
    bombBtn.style.display = level >= 4 ? 'flex' : 'none';
    if (activeJoker === 'bomb') {
      bombBtn.classList.add('active');
    } else {
      bombBtn.classList.remove('active');
    }
  }

  if (fishBtn) {
    fishBtn.style.display = level >= 5 ? 'flex' : 'none';
    if (activeJoker === 'fish') {
      fishBtn.classList.add('active');
    } else {
      fishBtn.classList.remove('active');
    }
  }
  
  if (boardContainer) {
    boardContainer.classList.remove('joker-active-hammer', 'joker-active-spray', 'joker-active-bomb', 'joker-active-fish');
    if (activeJoker === 'hammer') {
      boardContainer.classList.add('joker-active-hammer');
    } else if (activeJoker === 'spray') {
      boardContainer.classList.add('joker-active-spray');
    } else if (activeJoker === 'bomb') {
      boardContainer.classList.add('joker-active-bomb');
    } else if (activeJoker === 'fish') {
      boardContainer.classList.add('joker-active-fish');
    }
  }
}

async function handleJokerApplication(candy) {
  if (isAnimating) return;
  isAnimating = true;

  const clickedIdx = candy.y * GRID_SIZE + candy.x;

  if (activeJoker === 'hammer') {
    jokers.hammer--;
    activeJoker = null;
    updateJokersUI();

    if (candy.special) {
      // Çekiçle güçlü şekere vurunca güçlü şeker ortadan kaybolmasın kendi görevini yapsın
      const matchedData = { indices: new Set([clickedIdx]), specialSpawns: [] };
      await handleMatchResolution(matchedData);
      isAnimating = false;
      await checkGameEndState();
    } else {
      candy.element.classList.add('match-pop');
      spawnParticles(candy.x, candy.y, candy.type, 10);
      soundEngine.playSpecial();

      trackTargetCollection(candy.type);
      clearChocolate(clickedIdx);

      await new Promise(r => setTimeout(r, 250));
      candy.element.remove();
      board[clickedIdx] = null;

      await refillBoard();

      const nextMatchedData = findMatches();
      if (nextMatchedData.indices.size > 0) {
        comboCount = 1;
        await handleMatchResolution(nextMatchedData);
      }

      isAnimating = false;
      await checkGameEndState();
    }

  } else if (activeJoker === 'spray') {
    if (candy.type === -1) {
      activeJoker = null;
      updateJokersUI();
      isAnimating = false;
      return;
    }

    jokers.spray--;
    activeJoker = null;
    updateJokersUI();

    const specialType = Math.random() < 0.5 ? (Math.random() < 0.5 ? 'striped-h' : 'striped-v') : 'wrapped';
    candy.special = specialType;
    candy.element.className = `candy ${specialType}`;
    
    if (specialType === 'striped-h' || specialType === 'striped-v') {
      const svgId = `${CANDY_IDS[candy.type]}-${specialType}`;
      candy.element.innerHTML = `<svg viewBox="0 0 48 48"><use href="#${svgId}"></use></svg>`;
    } else {
      const svgId = CANDY_IDS[candy.type];
      let overlayHtml = '';
      if (specialType === 'wrapped') {
        overlayHtml = `<use href="#special-wrapped"></use>`;
      }
      candy.element.innerHTML = `<svg viewBox="0 0 48 48"><use href="#${svgId}"></use>${overlayHtml}</svg>`;
    }

    soundEngine.playSpecial();

    const nextMatchedData = findMatches();
    if (nextMatchedData.indices.size > 0) {
      comboCount = 1;
      await handleMatchResolution(nextMatchedData);
    }

    isAnimating = false;
    await checkGameEndState();

  } else if (activeJoker === 'bomb') {
    if (candy.type === -1) {
      activeJoker = null;
      updateJokersUI();
      isAnimating = false;
      return;
    }

    jokers.bomb--;
    activeJoker = null;
    updateJokersUI();

    candy.special = 'bomb';
    candy.element.className = `candy bomb`;
    candy.element.innerHTML = `<svg viewBox="0 0 48 48"><use href="#candy-bomb"></use></svg>`;

    soundEngine.playSpecial();

    const nextMatchedData = findMatches();
    if (nextMatchedData.indices.size > 0) {
      comboCount = 1;
      await handleMatchResolution(nextMatchedData);
    }

    isAnimating = false;
    await checkGameEndState();

  } else if (activeJoker === 'fish') {
    if (candy.type === -1) {
      activeJoker = null;
      updateJokersUI();
      isAnimating = false;
      return;
    }

    jokers.fish--;
    activeJoker = null;
    updateJokersUI();

    candy.special = 'fish';
    candy.element.className = `candy fish`;
    const colorName = CANDY_IDS[candy.type].replace('candy-', '');
    candy.element.innerHTML = `<svg viewBox="0 0 48 48"><use href="#candy-fish-shape" fill="url(#grad-${colorName})"></use></svg>`;

    soundEngine.playSpecial();

    const nextMatchedData = findMatches();
    if (nextMatchedData.indices.size > 0) {
      comboCount = 1;
      await handleMatchResolution(nextMatchedData);
    }

    isAnimating = false;
    await checkGameEndState();
  }
}

// --- 10.8. OYUN DURUMU YEREL KAYDETME (LOCALSTORAGE) ---

function saveGameState() {
  localStorage.setItem('candy_level', level);
  localStorage.setItem('candy_score', score);
  localStorage.setItem('candy_score_start', scoreAtLevelStart);
  localStorage.setItem('candy_jokers', JSON.stringify(jokers));
  localStorage.setItem('candy_jokers_start', JSON.stringify(jokersAtLevelStart));
  localStorage.setItem('candy_attempts', currentLevelAttempts);
  
  localStorage.setItem('candy_max_unlocked_level', maxUnlockedLevel);
  localStorage.setItem('candy_level_stars', JSON.stringify(levelStars));
  localStorage.setItem('candy_gold', goldBars);
  localStorage.setItem('candy_lives', lives);
  localStorage.setItem('candy_last_life_time', lastLifeTime);
  localStorage.setItem('candy_inbox', JSON.stringify(inboxMessages));
}

function loadGameState() {
  const savedLevel = localStorage.getItem('candy_level');
  
  maxUnlockedLevel = parseInt(localStorage.getItem('candy_max_unlocked_level') || '1');
  goldBars = parseInt(localStorage.getItem('candy_gold') || '7648');
  lives = parseInt(localStorage.getItem('candy_lives') || '5');
  lastLifeTime = parseInt(localStorage.getItem('candy_last_life_time') || Date.now().toString());
  
  const savedInbox = localStorage.getItem('candy_inbox');
  if (savedInbox) {
    try {
      inboxMessages = JSON.parse(savedInbox);
    } catch(e) {
      inboxMessages = JSON.parse(JSON.stringify(DEFAULT_INBOX_MESSAGES));
    }
  } else {
    inboxMessages = JSON.parse(JSON.stringify(DEFAULT_INBOX_MESSAGES));
  }
  try {
    levelStars = JSON.parse(localStorage.getItem('candy_level_stars') || '{}');
  } catch(e) {
    levelStars = {};
  }

  const savedGoogleLogin = localStorage.getItem('google_logged_in');
  if (savedGoogleLogin === 'true') {
    googleLoggedIn = true;
    googleUserName = localStorage.getItem('google_user_name') || '';
    googleUserEmail = localStorage.getItem('google_user_email') || '';
    googleUserBgClass = localStorage.getItem('google_user_bg_class') || '';
    googleUserLetter = localStorage.getItem('google_user_letter') || '';
    googleUserPicUrl = localStorage.getItem('google_user_pic_url') || '';
  }

  if (savedLevel) {
    level = parseInt(savedLevel);
    score = parseInt(localStorage.getItem('candy_score') || '0');
    scoreAtLevelStart = parseInt(localStorage.getItem('candy_score_start') || '0');
    currentLevelAttempts = parseInt(localStorage.getItem('candy_attempts') || '1');
    try {
      jokers = JSON.parse(localStorage.getItem('candy_jokers') || '{"hammer":3,"spray":2,"moves":2,"bomb":2,"fish":2}');
      jokersAtLevelStart = JSON.parse(localStorage.getItem('candy_jokers_start') || '{"hammer":3,"spray":2,"moves":2,"bomb":2,"fish":2}');
    } catch(e) {
      jokers = { hammer: 3, spray: 2, moves: 2, bomb: 2, fish: 2 };
      jokersAtLevelStart = { hammer: 3, spray: 2, moves: 2, bomb: 2, fish: 2 };
    }
    return true;
  }
  return false;
}

// --- 11. OYUN BAŞLANGICI VE ILKLENDIRME ---

function startGame() {
  score = 0;
  scoreAtLevelStart = 0;
  level = 1;
  jokers = { hammer: 3, spray: 2, moves: 2, bomb: 2, fish: 2 };
  jokersAtLevelStart = { hammer: 3, spray: 2, moves: 2, bomb: 2, fish: 2 };
  currentLevelAttempts = 1;
  activeJoker = null;
  saveGameState();
  loadLevel(level);
  showScreen(gameScreen);
}

// Tarayıcı ve DOM hazır olduğunda tetiklenir
document.addEventListener('DOMContentLoaded', () => {
  // DOM Referansları
  boardContainer = document.getElementById('game-board');
  effectsCanvas = document.getElementById('effects-canvas');
  ctx = effectsCanvas.getContext('2d');
  
  startScreen = document.getElementById('start-screen');
  gameScreen = document.getElementById('game-screen');
  gameOverScreen = document.getElementById('game-over-screen');
  
  scoreVal = document.getElementById('score');
  levelVal = document.getElementById('level');
  movesVal = document.getElementById('moves-left');
  
  muteMusicBtn = document.getElementById('btn-mute-music');
  muteSFXBtn = document.getElementById('btn-mute-sfx');
  soundEngine.updateMuteButtonsUI();
  restartBtn = document.getElementById('btn-back-to-map');
  startBtn = document.getElementById('btn-start');
  nextLevelBtn = document.getElementById('btn-next-level');
  retryLevelBtn = document.getElementById('btn-retry-level');

  // --- HARİTA VE MODAL DOM BINDINGS ---
  mapScreen = document.getElementById('map-screen');
  mapViewport = document.getElementById('map-viewport');
  mapScrollContainer = document.getElementById('map-scroll-container');
  mapPathLine = document.getElementById('map-path-line');
  mapNodesContainer = document.getElementById('map-nodes-container');
  playerAvatarToken = document.getElementById('player-avatar-token');
  
  levelModal = document.getElementById('level-modal');
  closeModalBtn = document.getElementById('btn-close-modal');
  playLevelBtn = document.getElementById('btn-play-level');
  modalLevelTitle = document.getElementById('modal-level-title');
  modalLevelStars = document.getElementById('modal-level-stars');
  modalGoalsList = document.getElementById('modal-goals-list');
  modalHighScoreVal = document.getElementById('modal-high-score-val');
  screenTransition = document.getElementById('screen-transition');

  // Yüksek Skoru Yükle
  const savedHighScore = localStorage.getItem('candy_high_score');
  if (savedHighScore) {
    highScore = parseInt(savedHighScore);
  }

  // Kalınan seviyeyi kontrol et ve başlığı güncelle
  loadGameState(); // Harita ve kayıtlı seviye verilerini yükle
  updateInboxUI(); // Gelen kutusu arayüzünü ve rozetini güncelle
  if (startBtn) {
    startBtn.innerText = `DEVAM ET (SEVİYE ${maxUnlockedLevel})`;
  }

  // Google Login UI'ı ilk yüklemede güncelle
  if (googleLoggedIn) {
    const btn = document.getElementById('btn-google-login');
    if (btn) {
      btn.innerHTML = `✔️ ${googleUserName || 'Giriş Yapıldı'}`;
      btn.disabled = true;
      btn.style.opacity = '0.7';
    }
    updateSidebarStats();
  }

  // Olay Dinleyicileri (Event Listeners)
  startBtn.addEventListener('click', () => {
    soundEngine.init();
    loadGameState();
    showScreenWithTransition(mapScreen, () => {
      initMap();
    });
  });

  // Google Sign-In SDK'sını Yerel Olarak Başlatmayı Dene
  try {
    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
      const clientId = localStorage.getItem('google_client_id') || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
      google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          try {
            // Google ID Token (JWT) çözümlenir
            const base64Url = response.credential.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            const payload = JSON.parse(jsonPayload);
            const name = payload.name || 'Google Oyuncusu';
            const email = payload.email || '';
            const picUrl = payload.picture || '';

            // Bilgileri kaydet
            googleLoggedIn = true;
            googleUserName = name;
            googleUserEmail = email;
            googleUserPicUrl = picUrl;
            googleUserBgClass = '';
            googleUserLetter = name.charAt(0).toUpperCase();

            localStorage.setItem('google_logged_in', 'true');
            localStorage.setItem('google_user_name', name);
            localStorage.setItem('google_user_email', email);
            localStorage.setItem('google_user_pic_url', picUrl);
            localStorage.setItem('google_user_letter', googleUserLetter);

            const btn = document.getElementById('btn-google-login');
            if (btn) {
              btn.innerHTML = `✔️ ${googleUserName}`;
              btn.disabled = true;
              btn.style.opacity = '0.7';
            }
            updateSidebarStats();
            
            soundEngine.playLevelUp();
            spawnFloatingText(3, 3, "HOŞ GELDİNİZ! 🌟", "#ffd23f");
          } catch (err) {
            console.error("Google Token decode hatası:", err);
            triggerGoogleLoginFallback();
          }
        }
      });
    }
  } catch (e) {
    console.warn("Google SDK yükleme hatası:", e);
  }

  // Google Popup İletişim Dinleyicisi
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'google-login-success') {
      const { name, email, bgClass, letter } = event.data;

      googleLoggedIn = true;
      googleUserName = name;
      googleUserEmail = email;
      googleUserBgClass = bgClass;
      googleUserLetter = letter;
      googleUserPicUrl = '';

      localStorage.setItem('google_logged_in', 'true');
      localStorage.setItem('google_user_name', name);
      localStorage.setItem('google_user_email', email);
      localStorage.setItem('google_user_bg_class', bgClass);
      localStorage.setItem('google_user_letter', letter);
      localStorage.setItem('google_user_pic_url', '');

      const btn = document.getElementById('btn-google-login');
      if (btn) {
        btn.innerHTML = `✔️ ${googleUserName}`;
        btn.disabled = true;
        btn.style.opacity = '0.7';
      }
      
      updateSidebarStats();
      
      soundEngine.playLevelUp();
      spawnFloatingText(3, 3, "HOŞ GELDİNİZ! 🌟", "#ffd23f");
    }
  });

  function triggerGoogleLoginFallback() {
    const btn = document.getElementById('btn-google-login');
    const width = 500;
    const height = 650;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;
    
    const popup = window.open(
      'google_login.html',
      'GoogleLoginPopup',
      `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      alert("Lütfen tarayıcınızda açılır pencerelere (popup) izin verin ve tekrar deneyin.");
      if (btn) {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.innerHTML = `Google ile Giriş Yap`;
      }
    }
  }

  const googleBtn = document.getElementById('btn-google-login');
  if (googleBtn) {
    googleBtn.addEventListener('click', () => {
      soundEngine.init();
      googleBtn.disabled = true;
      googleBtn.style.opacity = '0.8';
      googleBtn.innerHTML = `
        <svg class="google-icon loading" viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg" style="margin-right: 8px; vertical-align: middle;">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
        </svg>
        Giriş Yapılıyor...
      `;
      
      const isLocalFile = window.location.protocol === 'file:';
      const sdkLoaded = typeof google !== 'undefined' && google.accounts && google.accounts.id;
      const customClientId = localStorage.getItem('google_client_id') || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
      const isPlaceholder = customClientId.includes('YOUR_GOOGLE_CLIENT_ID');

      if (!isLocalFile && sdkLoaded && !isPlaceholder) {
        google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            triggerGoogleLoginFallback();
          }
        });
      } else {
        triggerGoogleLoginFallback();
      }
    });
  }

  nextLevelBtn.addEventListener('click', () => {
    soundEngine.init();
    if (typeof showInterstitialAd === 'function') showInterstitialAd();
    const oldLevel = level;
    
    // Yıldız Hesapla
    const config = getLevelConfig(oldLevel);
    let earnedStars = 1;
    const targetScore = 10000 + oldLevel * 5000;
    if (score >= targetScore) earnedStars = 3;
    else if (score >= targetScore * 0.60) earnedStars = 2;
    
    if (movesLeft >= config.moves * 0.40) earnedStars = Math.max(earnedStars, 3);
    else if (movesLeft >= config.moves * 0.15) earnedStars = Math.max(earnedStars, 2);
    
    const prevStars = levelStars[oldLevel] || 0;
    if (earnedStars > prevStars) {
      levelStars[oldLevel] = earnedStars;
    }
    
    // Altın Ödülü (+20 Altın Külçesi!)
    goldBars += 20;

    // Yeni Seviye Kilit Açma
    let oldMaxUnlocked = maxUnlockedLevel;
    if (oldLevel === maxUnlockedLevel) {
      maxUnlockedLevel = Math.min(MAP_LEVELS_COUNT, maxUnlockedLevel + 1);
    }
    
    // Bir sonraki seviyeyi varsayılan olarak seç
    level = Math.min(MAP_LEVELS_COUNT, oldLevel + 1);
    
    // Jokerleri ödüllendir (+1)
    jokers.hammer++;
    jokers.spray++;
    jokers.moves++;
    activeJoker = null;
    currentLevelAttempts = 1;

    saveGameState();
    
    // Haritaya geç ve avatarı hareket ettir
    showScreenWithTransition(mapScreen, () => {
      updateSidebarStats();
      
      if (maxUnlockedLevel > oldMaxUnlocked) {
        // Yeni bir bölüm açıldı! Avatarı eski konumdan yeniye yürüt
        initMap(oldLevel);
        setTimeout(() => {
          animateAvatar(oldLevel, maxUnlockedLevel, () => {
            initMap(maxUnlockedLevel);
            soundEngine.playLevelUp();
            spawnFloatingText(3, 3, "YENİ BÖLÜM! 🔓", "#ffd23f");
          });
        }, 500);
      } else {
        // Zaten açılmış seviyeyse normal yükle
        initMap(level);
      }
    });
  });

  retryLevelBtn.addEventListener('click', () => {
    soundEngine.init();
    if (typeof showInterstitialAd === 'function') showInterstitialAd();
    score = scoreAtLevelStart; // Skoru seviye başlangıcına sıfırla
    jokers = { ...jokersAtLevelStart };
    activeJoker = null;

    saveGameState();
    
    // Haritaya geri dönüp o seviye detaylarını aç
    showScreenWithTransition(mapScreen, () => {
      initMap(level);
      openLevelDetails(level);
    });
  });

  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      exitToMap();
    });
  }

  if (muteMusicBtn) {
    muteMusicBtn.addEventListener('click', () => {
      soundEngine.toggleMuteMusic();
    });
  }
  if (muteSFXBtn) {
    muteSFXBtn.addEventListener('click', () => {
      soundEngine.toggleMuteSFX();
    });
  }

  // Modal Kontrolleri
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      levelModal.classList.remove('active');
    });
  }
  
  if (playLevelBtn) {
    playLevelBtn.addEventListener('click', () => {
      soundEngine.init();
      if (lives <= 0) {
        levelModal.classList.remove('active');
        showRefillLivesModal();
        return;
      }
      
      levelModal.classList.remove('active');
      showScreenWithTransition(gameScreen, () => {
        level = selectedMapLevel;
        loadLevel(level);
      });
    });
  }

  // Sidebar Müzik ve SFX Butonları (Mute Toggles)
  const mapMuteMusicBtn = document.getElementById('btn-map-mute-music');
  if (mapMuteMusicBtn) {
    mapMuteMusicBtn.addEventListener('click', () => {
      soundEngine.init();
      const muteStatus = soundEngine.toggleMuteMusic();
      spawnFloatingText(1, 20, muteStatus ? "MÜZİK KAPALI 🔇" : "MÜZİK AÇIK 🎵", "#ffffff");
    });
  }
  const mapMuteSFXBtn = document.getElementById('btn-map-mute-sfx');
  if (mapMuteSFXBtn) {
    mapMuteSFXBtn.addEventListener('click', () => {
      soundEngine.init();
      const muteStatus = soundEngine.toggleMuteSFX();
      spawnFloatingText(1, 20, muteStatus ? "EFEKTLER KAPALI 🔇" : "EFEKTLER AÇIK 🔊", "#ffffff");
    });
  }

  // Joker Butonları Dinleyicileri
  const hammerBtn = document.getElementById('joker-hammer');
  const sprayBtn = document.getElementById('joker-spray');
  const movesBtn = document.getElementById('joker-moves');

  if (hammerBtn) {
    hammerBtn.addEventListener('click', () => {
      if (isAnimating || movesLeft <= 0) return;
      soundEngine.init();
      if (jokers.hammer <= 0) {
        soundEngine.playRevert();
        if (confirm("Çekiç bitti! Ücretsiz 1 Çekiç kazanmak için kısa bir reklam izlemek ister misiniz?")) {
          showRewardedAdForBooster('hammer');
        }
        return;
      }

      if (activeJoker === 'hammer') {
        activeJoker = null;
      } else {
        activeJoker = 'hammer';
      }
      updateJokersUI();
    });
  }

  if (sprayBtn) {
    sprayBtn.addEventListener('click', () => {
      if (isAnimating || movesLeft <= 0) return;
      soundEngine.init();
      if (jokers.spray <= 0) {
        soundEngine.playRevert();
        if (confirm("Sprey bitti! Ücretsiz 1 Sprey kazanmak için kısa bir reklam izlemek ister misiniz?")) {
          showRewardedAdForBooster('spray');
        }
        return;
      }

      if (activeJoker === 'spray') {
        activeJoker = null;
      } else {
        activeJoker = 'spray';
      }
      updateJokersUI();
    });
  }

  if (movesBtn) {
    movesBtn.addEventListener('click', () => {
      if (isAnimating || movesLeft <= 0) return;
      soundEngine.init();
      if (jokers.moves <= 0) {
        soundEngine.playRevert();
        if (confirm("Ek hamle bitti! Ücretsiz +5 Hamle kazanmak için kısa bir reklam izlemek ister misiniz?")) {
          showRewardedAdForBooster('moves');
        }
        return;
      }

      jokers.moves--;
      movesLeft += 5;
      soundEngine.playSpecial(); // Play booster sound
      spawnFloatingText(3, 1, "+5 HAMLE", "#4caf50");
      updateHUD();
      updateJokersUI();
    });
  }

  const bombBtn = document.getElementById('joker-bomb');
  if (bombBtn) {
    bombBtn.addEventListener('click', () => {
      if (isAnimating || movesLeft <= 0) return;
      soundEngine.init();
      if (jokers.bomb <= 0) {
        soundEngine.playRevert();
        if (confirm("Bomba bitti! Ücretsiz 1 Bomba kazanmak için kısa bir reklam izlemek ister misiniz?")) {
          showRewardedAdForBooster('bomb');
        }
        return;
      }

      if (activeJoker === 'bomb') {
        activeJoker = null;
      } else {
        activeJoker = 'bomb';
      }
      updateJokersUI();
    });
  }

  const fishBtn = document.getElementById('joker-fish');
  if (fishBtn) {
    fishBtn.addEventListener('click', () => {
      if (isAnimating || movesLeft <= 0) return;
      soundEngine.init();
      if (jokers.fish <= 0) {
        soundEngine.playRevert();
        if (confirm("Balık bitti! Ücretsiz 1 Balık kazanmak için kısa bir reklam izlemek ister misiniz?")) {
          showRewardedAdForBooster('fish');
        }
        return;
      }

      if (activeJoker === 'fish') {
        activeJoker = null;
      } else {
        activeJoker = 'fish';
      }
      updateJokersUI();
    });
  }

  // Pencere boyutu değiştiğinde canvas'ı güncelle
  window.addEventListener('resize', resizeCanvas);

  // Parçacık efekt animasyon döngüsünü başlat
  updateAndDrawEffects();
});

// ==========================================================================
// HARİTA VE GEÇİŞ SİSTEMİ FONKSİYONLARI (MAP & TRANSITIONS SYSTEM)
// ==========================================================================

let mapStartLevel = 1;
const MAP_LEVELS_COUNT = 5000;
const mapWidthVB = 1000;
const mapHeightVB = 2500;
const levelSpacing = 120;

function getLevelCoords(lvl, startLvl = mapStartLevel) {
  // Koordinatları pencerenin başlangıç seviyesine göre hesaplar
  const relativeLvl = lvl - startLvl + 1;
  const y = mapHeightVB - (relativeLvl * levelSpacing) - 50;
  // Sinüs dalgası kıvrımı
  const x = 500 + 300 * Math.sin(lvl * 1.5);
  return { x, y };
}

function getBezierPoint(p0, p1, p2, p3, t) {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
  };
}

function initMap(forcedAvatarLevel = null) {
  if (!mapNodesContainer) return;
  mapNodesContainer.innerHTML = '';

  const avatarLevel = forcedAvatarLevel || maxUnlockedLevel;
  
  // Ekranda aynı anda gösterilecek maksimum seviye sayısı
  const windowSize = 20; 
  const startLvl = Math.max(1, avatarLevel - 6);
  const endLvl = Math.min(MAP_LEVELS_COUNT, startLvl + windowSize - 1);
  
  // Global mapStartLevel'ı güncelle
  mapStartLevel = startLvl;

  // 1. Kesikli Yol Çizgisini SVG ile Çiz
  let dPath = "";
  const p1 = getLevelCoords(startLvl, startLvl);
  dPath += `M ${p1.x} ${p1.y}`;
  
  for (let l = startLvl + 1; l <= endLvl; l++) {
    const pPrev = getLevelCoords(l - 1, startLvl);
    const pCurr = getLevelCoords(l, startLvl);
    const cp1x = pPrev.x;
    const cp1y = pPrev.y - levelSpacing / 2;
    const cp2x = pCurr.x;
    const cp2y = pCurr.y + levelSpacing / 2;
    
    dPath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pCurr.x} ${pCurr.y}`;
  }
  
  const svgLayer = document.getElementById('map-svg-layer');
  if (svgLayer) {
    svgLayer.setAttribute('viewBox', `0 0 ${mapWidthVB} ${mapHeightVB}`);
  }
  
  if (mapPathLine) {
    mapPathLine.setAttribute('d', dPath);
  }

  // 2. Dekorasyonları Konumlandır (Bulutlar)
  const decorContainer = document.getElementById('map-decorations');
  if (decorContainer) {
    decorContainer.innerHTML = '';
    
    for (let c = 0; c < 3; c++) {
      const cloud = document.createElement('div');
      cloud.className = 'map-cloud';
      cloud.style.top = (150 + c * 800) + 'px';
      cloud.style.animationDelay = (c * 8) + 's';
      cloud.style.transform = `scale(${0.7 + c * 0.25})`;
      cloud.style.opacity = '0.7';
      decorContainer.appendChild(cloud);
    }
  }

  // 3. Bölüm Düğmelerini Yerleştir
  for (let l = startLvl; l <= endLvl; l++) {
    const coords = getLevelCoords(l, startLvl);
    
    const wrapper = document.createElement('div');
    wrapper.className = 'level-node-wrapper';
    wrapper.style.left = `calc(${coords.x / 10}%)`;
    wrapper.style.top = `${coords.y}px`;
    
    if (l > maxUnlockedLevel) {
      wrapper.classList.add('locked');
    } else if (l === maxUnlockedLevel) {
      wrapper.classList.add('active');
    } else {
      wrapper.classList.add('completed');
    }
    
    // Özel dekorasyonlar (her 10 seviyede bir Taç, her 5 seviyede bir Kuru Kafa)
    if (l % 10 === 0) {
      const dec = document.createElement('div');
      dec.className = 'level-decoration';
      dec.innerText = '👑';
      wrapper.appendChild(dec);
    } else if (l % 5 === 0) {
      const dec = document.createElement('div');
      dec.className = 'level-decoration';
      dec.innerText = '💀';
      wrapper.appendChild(dec);
    }
    
    const btn = document.createElement('button');
    btn.className = 'level-node-btn';
    btn.innerText = l;
    
    const starsDiv = document.createElement('div');
    starsDiv.className = 'level-stars-container';
    
    const earnedStars = levelStars[l] || 0;
    for (let s = 1; s <= 3; s++) {
      const starSpan = document.createElement('span');
      starSpan.className = 'node-star';
      starSpan.innerText = '★';
      if (s <= earnedStars) {
        starSpan.classList.add('filled');
      }
      starsDiv.appendChild(starSpan);
    }
    
    if (l <= maxUnlockedLevel) {
      btn.addEventListener('click', () => {
        soundEngine.playPop(0);
        openLevelDetails(l);
      });
    }
    
    wrapper.appendChild(btn);
    wrapper.appendChild(starsDiv);
    mapNodesContainer.appendChild(wrapper);
  }
  
  // 4. Oyuncu Karakter Simgesini Konumlandır
  const avatarCoords = getLevelCoords(avatarLevel, startLvl);
  if (playerAvatarToken) {
    playerAvatarToken.style.left = `calc(${avatarCoords.x / 10}%)`;
    playerAvatarToken.style.top = `${avatarCoords.y}px`;
    
    setTimeout(() => {
      const targetScroll = avatarCoords.y - mapViewport.clientHeight / 2;
      mapViewport.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth'
      });
    }, 100);
  }

  updateSidebarStats();
}

function updateSidebarStats() {
  updateLivesUI();
  const goldLabel = document.getElementById('gold-value');
  if (goldLabel) {
    goldLabel.innerText = goldBars;
  }
  
  const scoreBadge = document.querySelector('.profile-score-badge');
  if (scoreBadge) {
    scoreBadge.innerText = highScore;
  }

  const avatarBadge = document.querySelector('.profile-avatar-badge');
  if (avatarBadge) {
    avatarBadge.innerText = maxUnlockedLevel;
  }

  if (googleLoggedIn) {
    const pic = document.getElementById('map-profile-pic');
    if (pic) {
      if (googleUserPicUrl) {
        pic.innerText = '';
        pic.className = 'profile-avatar has-img';
        pic.style.backgroundImage = `url(${googleUserPicUrl})`;
      } else if (googleUserLetter) {
        pic.innerText = googleUserLetter;
        pic.className = `profile-avatar google-avatar ${googleUserBgClass}`;
        pic.style.backgroundImage = 'none';
      } else {
        pic.innerText = '🧑‍🚀';
        pic.className = 'profile-avatar';
        pic.style.backgroundImage = 'none';
      }
    }
    const frame = document.querySelector('.profile-avatar-frame');
    if (frame) frame.classList.add('logged-in');
    const badge = document.querySelector('.profile-avatar-badge');
    if (badge) badge.classList.add('logged-in');
  } else {
    const pic = document.getElementById('map-profile-pic');
    if (pic) {
      pic.innerText = '🍭';
      pic.className = 'profile-avatar';
      pic.style.backgroundImage = 'none';
    }
    const frame = document.querySelector('.profile-avatar-frame');
    if (frame) frame.classList.remove('logged-in');
    const badge = document.querySelector('.profile-avatar-badge');
    if (badge) badge.classList.remove('logged-in');
  }
}

// --- CAN (LIVES) SİSTEMİ YARDIMCI FONKSİYONLARI ---

function checkLivesRegeneration() {
  if (lives >= 5) {
    lives = 5;
    return;
  }
  const now = Date.now();
  const timePassed = now - lastLifeTime;
  const lifeRecoveryTime = 15 * 60 * 1000; // 15 dakika = 900,000 ms
  
  if (timePassed >= lifeRecoveryTime) {
    const livesToRecover = Math.floor(timePassed / lifeRecoveryTime);
    lives = Math.min(5, lives + livesToRecover);
    if (lives >= 5) {
      lastLifeTime = now;
    } else {
      lastLifeTime = lastLifeTime + (livesToRecover * lifeRecoveryTime);
    }
    saveGameState();
    updateLivesUI();
  }
}

function updateLivesUI() {
  const livesValEl = document.getElementById('lives-value');
  const livesLabelEl = document.getElementById('lives-label');
  if (livesValEl) livesValEl.innerText = lives;
  
  // Header can göstergesini güncelle
  const headerLivesVal = document.getElementById('header-lives-val');
  const headerLivesTimer = document.getElementById('header-lives-timer');
  if (headerLivesVal) {
    headerLivesVal.innerText = `❤️ ${lives}`;
  }
  
  if (livesLabelEl) {
    if (lives >= 5) {
      livesLabelEl.innerText = "Full";
      livesLabelEl.style.color = "#ffffff";
      if (headerLivesTimer) headerLivesTimer.style.display = 'none';
    } else {
      const now = Date.now();
      const remaining = (15 * 60 * 1000) - (now - lastLifeTime);
      if (remaining > 0) {
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
        livesLabelEl.innerText = timeStr;
        livesLabelEl.style.color = "#ff3366"; // Kırmızı geri sayım
        
        if (headerLivesTimer) {
          headerLivesTimer.innerText = timeStr;
          headerLivesTimer.style.display = 'block';
        }
      } else {
        livesLabelEl.innerText = "Yükleniyor";
        if (headerLivesTimer) headerLivesTimer.innerText = "00:00";
      }
    }
  } else {
    // Eğer livesLabelEl yoksa bile headerLivesTimer'ı güncelle
    if (lives >= 5) {
      if (headerLivesTimer) headerLivesTimer.style.display = 'none';
    } else {
      const now = Date.now();
      const remaining = (15 * 60 * 1000) - (now - lastLifeTime);
      if (remaining > 0) {
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
        if (headerLivesTimer) {
          headerLivesTimer.innerText = timeStr;
          headerLivesTimer.style.display = 'block';
        }
      }
    }
  }
}

function showRefillLivesModal() {
  const modal = document.getElementById('lives-refill-modal');
  if (modal) {
    modal.classList.add('active');
  }
}

function closeRefillLivesModal() {
  const modal = document.getElementById('lives-refill-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

function openLevelDetails(lvl) {
  if (!levelModal) return;
  
  selectedMapLevel = lvl;
  
  if (modalLevelTitle) {
    modalLevelTitle.innerText = `BÖLÜM ${lvl}`;
  }
  
  const earnedStars = levelStars[lvl] || 0;
  const modalStarsContainer = document.getElementById('modal-level-stars');
  if (modalStarsContainer) {
    modalStarsContainer.innerHTML = '';
    for (let s = 1; s <= 3; s++) {
      const star = document.createElement('span');
      star.className = 'modal-star';
      star.innerText = '★';
      if (s <= earnedStars) {
        star.classList.add('filled');
      }
      modalStarsContainer.appendChild(star);
    }
  }

  if (modalGoalsList) {
    modalGoalsList.innerHTML = '';
    const config = getLevelConfig(lvl);
    
    config.targets.forEach(goal => {
      const item = document.createElement('div');
      item.className = 'modal-goal-item';
      
      if (goal.type === 'jelly') {
        item.innerHTML = `<span>🍮</span><span>${goal.required}</span>`;
      } else if (goal.type === 'blocker') {
        item.innerHTML = `<span>🧱</span><span>${goal.required}</span>`;
      } else if (goal.type === 'chocolate') {
        item.innerHTML = `<span>🍫</span><span>${goal.required}</span>`;
      } else if (goal.type === 'gummy') {
        item.innerHTML = `<span>🧸</span><span>${goal.required}</span>`;
      } else {
        const svgId = CANDY_IDS[goal.type];
        item.innerHTML = `
          <svg viewBox="0 0 48 48"><use href="#${svgId}"></use></svg>
          <span>${goal.required}</span>
        `;
      }
      modalGoalsList.appendChild(item);
    });
  }
  
  const lvlHighScore = localStorage.getItem(`candy_highscore_lvl_${lvl}`) || '0';
  if (modalHighScoreVal) {
    modalHighScoreVal.innerText = lvlHighScore;
  }
  
  levelModal.classList.add('active');
}

function animateAvatar(fromL, toL, onComplete) {
  if (!playerAvatarToken) return;
  
  const pStart = getLevelCoords(fromL);
  const pEnd = getLevelCoords(toL);
  
  const cp1 = { x: pStart.x, y: pStart.y - levelSpacing / 2 };
  const cp2 = { x: pEnd.x, y: pEnd.y + levelSpacing / 2 };
  
  let start = null;
  const duration = 1200;
  
  function step(timestamp) {
    if (!start) start = timestamp;
    const progress = timestamp - start;
    let t = Math.min(progress / duration, 1);
    
    // Easing: easeInOutQuad
    const easedT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    
    const pos = getBezierPoint(pStart, cp1, cp2, pEnd, easedT);
    
    playerAvatarToken.style.left = `calc(${pos.x / 10}%)`;
    playerAvatarToken.style.top = `${pos.y}px`;
    
    const targetScroll = pos.y - mapViewport.clientHeight / 2;
    mapViewport.scrollTop = Math.max(0, targetScroll);
    
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      if (onComplete) onComplete();
    }
  }
  
  requestAnimationFrame(step);
}

function showScreenWithTransition(targetScreen, callback) {
  if (!screenTransition) {
    showScreen(targetScreen);
    if (callback) callback();
    return;
  }

  screenTransition.classList.add('active');
  
  setTimeout(() => {
    showScreen(targetScreen);
    if (callback) callback();
    
    setTimeout(() => {
      screenTransition.classList.remove('active');
    }, 200);
  }, 500);
}

// --- GÜNLÜK ÇARKIFELEK (Daily Spin Wheel) ---
document.addEventListener('DOMContentLoaded', () => {
  const btnDailySpin = document.getElementById('btn-daily-spin');
  const spinModal = document.getElementById('spin-wheel-modal');
  const btnCloseSpin = document.getElementById('btn-close-spin-modal');
  const btnSpin = document.getElementById('btn-spin-wheel');
  
  if (btnDailySpin && spinModal) {
    btnDailySpin.addEventListener('click', () => {
      soundEngine.init();
      checkDailySpinState();
      spinModal.classList.add('active');
    });
  }
  
  if (btnCloseSpin && spinModal) {
    btnCloseSpin.addEventListener('click', () => {
      if (!isWheelSpinning) {
        spinModal.classList.remove('active');
      }
    });
  }
  
  if (btnSpin) {
    btnSpin.addEventListener('click', triggerWheelSpin);
  }

  // --- GELEN KUTUSU (Inbox) BINDINGS ---
  const btnOpenInbox = document.getElementById('btn-open-inbox');
  const inboxModal = document.getElementById('inbox-modal');
  const btnCloseInbox = document.getElementById('btn-close-inbox-modal');
  const btnClaimAllInbox = document.getElementById('btn-claim-all-inbox');
  
  if (btnOpenInbox && inboxModal) {
    btnOpenInbox.addEventListener('click', () => {
      soundEngine.init();
      soundEngine.playPop(0);
      updateInboxUI();
      inboxModal.classList.add('active');
    });
  }
  
  if (btnCloseInbox && inboxModal) {
    btnCloseInbox.addEventListener('click', () => {
      soundEngine.init();
      soundEngine.playPop(0);
      inboxModal.classList.remove('active');
    });
  }
  
  if (btnClaimAllInbox) {
    btnClaimAllInbox.addEventListener('click', () => {
      soundEngine.init();
      claimAllInboxRewards();
    });
  }

  // --- CAN REFILL MODALİ BINDINGS ---
  const btnCloseLivesModal = document.getElementById('btn-close-lives-modal');
  const btnRefillLivesGold = document.getElementById('btn-refill-lives-gold');
  
  if (btnCloseLivesModal) {
    btnCloseLivesModal.addEventListener('click', closeRefillLivesModal);
  }
  
  if (btnRefillLivesGold) {
    btnRefillLivesGold.addEventListener('click', () => {
      soundEngine.init();
      if (goldBars >= 150) {
        goldBars -= 150;
        lives = 5;
        lastLifeTime = Date.now();
        saveGameState();
        updateLivesUI();
        updateSidebarStats();
        soundEngine.playLevelUp();
        closeRefillLivesModal();
        spawnFloatingText(1, 20, "Canlar Dolduruldu! ❤️", "#2ed573");
      } else {
        soundEngine.playPop(0);
        spawnFloatingText(1, 20, "Yetersiz Altın! 🪙", "#ff3366");
      }
    });
  }

  // Can yenilenmesini periyodik kontrol et
  setInterval(() => {
    checkLivesRegeneration();
    updateLivesUI();
  }, 1000);
});

let isWheelSpinning = false;

function checkDailySpinState() {
  const lastSpin = localStorage.getItem('candy_last_spin_time');
  const btnSpin = document.getElementById('btn-spin-wheel');
  const timerMsg = document.getElementById('spin-wheel-timer-msg');
  const timerSpan = document.getElementById('spin-wheel-time-left');
  
  // Modal içi istatistikleri güncelle
  const goldValEl = document.getElementById('wheel-gold-value');
  const freeSpinsEl = document.getElementById('wheel-free-spins');
  if (goldValEl) goldValEl.innerText = goldBars;
  
  if (!lastSpin) {
    if (btnSpin) {
      btnSpin.disabled = false;
      btnSpin.innerText = "ÜCRETSİZ ÇEVİR";
    }
    if (freeSpinsEl) {
      freeSpinsEl.innerText = "1";
      freeSpinsEl.style.color = "#4caf50";
    }
    if (timerMsg) timerMsg.style.display = 'none';
    return;
  }
  
  const diff = Date.now() - parseInt(lastSpin, 10);
  const oneDay = 24 * 60 * 60 * 1000;
  
  if (diff < oneDay) {
    if (freeSpinsEl) {
      freeSpinsEl.innerText = "0";
      freeSpinsEl.style.color = "#ff5252";
    }
    if (btnSpin) {
      btnSpin.disabled = false; // Altın ile çevirmeye izin ver
      btnSpin.innerText = "50 ALTIN İLE ÇEVİR";
    }
    if (timerMsg) timerMsg.style.display = 'block';
    
    const updateCountdown = () => {
      const remaining = oneDay - (Date.now() - parseInt(lastSpin, 10));
      if (remaining <= 0) {
        if (btnSpin) {
          btnSpin.disabled = false;
          btnSpin.innerText = "ÜCRETSİZ ÇEVİR";
        }
        if (freeSpinsEl) {
          freeSpinsEl.innerText = "1";
          freeSpinsEl.style.color = "#4caf50";
        }
        if (timerMsg) timerMsg.style.display = 'none';
        if (window.spinTimerInterval) {
          clearInterval(window.spinTimerInterval);
          window.spinTimerInterval = null;
        }
      } else {
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        if (timerSpan) {
          timerSpan.innerText = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
      }
    };
    
    updateCountdown();
    if (window.spinTimerInterval) clearInterval(window.spinTimerInterval);
    window.spinTimerInterval = setInterval(updateCountdown, 1000);
  } else {
    if (btnSpin) {
      btnSpin.disabled = false;
      btnSpin.innerText = "ÜCRETSİZ ÇEVİR";
    }
    if (freeSpinsEl) {
      freeSpinsEl.innerText = "1";
      freeSpinsEl.style.color = "#4caf50";
    }
    if (timerMsg) timerMsg.style.display = 'none';
  }
}

function triggerWheelSpin() {
  if (isWheelSpinning) return;
  
  const lastSpin = localStorage.getItem('candy_last_spin_time');
  const diff = lastSpin ? Date.now() - parseInt(lastSpin, 10) : Infinity;
  const oneDay = 24 * 60 * 60 * 1000;
  
  let isFree = true;
  if (diff < oneDay) {
    if (goldBars < 50) {
      soundEngine.playPop(0);
      spawnFloatingText(1, 20, "Yetersiz Altın! 🪙", "#ff3366");
      alert("Çarkıfeleği döndürmek için yeterli Altınınız yok! (50 Altın gerekli)");
      return;
    }
    isFree = false;
  }
  
  if (!isFree) {
    goldBars -= 50;
    saveGameState();
    updateHUD();
    updateSidebarStats();
    const goldValEl = document.getElementById('wheel-gold-value');
    if (goldValEl) goldValEl.innerText = goldBars;
  }
  
  isWheelSpinning = true;
  const btnSpin = document.getElementById('btn-spin-wheel');
  const btnClose = document.getElementById('btn-close-spin-modal');
  if (btnSpin) btnSpin.disabled = true;
  if (btnClose) btnClose.style.display = 'none';
  
  // 6 Sektörlü çark, rastgele ödül seç
  // 0: 250 Altın (Cyan)
  // 1: Boş (Green)
  // 2: 1 Çekiç (Yellow)
  // 3: 500 Altın (Blue)
  // 4: Boş (Green)
  // 5: 1000 Altın (Purple)
  const targetSector = Math.floor(Math.random() * 6);
  const wheelMain = document.getElementById('wheel-main');
  
  const finalAngle = (5 * 360) + (360 - (targetSector * 60 + 30));
  
  if (wheelMain) {
    wheelMain.style.transform = `rotate(${finalAngle}deg)`;
  }
  
  setTimeout(() => {
    isWheelSpinning = false;
    if (btnClose) btnClose.style.display = 'block';
    
    let prizeName = "";
    if (targetSector === 0) {
      jokers.bomb++;
      prizeName = "1 adet Renk Bombası 💣";
    } else if (targetSector === 1) {
      prizeName = "Maalesef Boş Çıktı! 🍃 Yeni şanslar!";
    } else if (targetSector === 2) {
      jokers.hammer++;
      prizeName = "1 adet Çekiç 🔨";
    } else if (targetSector === 3) {
      jokers.fish++;
      prizeName = "1 adet Jelibon Balığı 🐠";
    } else if (targetSector === 4) {
      prizeName = "Maalesef Boş Çıktı! 🍃 Yeni şanslar!";
    } else if (targetSector === 5) {
      jokers.spray++;
      prizeName = "1 adet Sprey 🚀";
    }
    
    if (isFree) {
      localStorage.setItem('candy_last_spin_time', Date.now().toString());
    }
    
    saveGameState();
    updateHUD();
    updateJokersUI();
    updateSidebarStats();
    checkDailySpinState();
    
    if (targetSector === 1 || targetSector === 4) {
      soundEngine.playPop(0);
      alert(`Çark Sonucu:\n${prizeName}`);
    } else {
      soundEngine.playLevelUp();
      alert(`Tebrikler! Çarkıfelekten şunu kazandınız:\n${prizeName}`);
    }
    
    const modal = document.getElementById('spin-wheel-modal');
    if (modal) modal.classList.remove('active');
    
    setTimeout(() => {
      if (wheelMain) {
        wheelMain.style.transition = 'none';
        wheelMain.style.transform = 'rotate(0deg)';
        void wheelMain.offsetHeight;
        wheelMain.style.transition = 'transform 5s cubic-bezier(0.1, 0.8, 0.1, 1)';
      }
    }, 500);
    
  }, 5000);
}

function updateInboxUI() {
  const badge = document.querySelector('.inbox-badge');
  const unreadCount = inboxMessages.filter(m => !m.claimed).length;
  
  if (badge) {
    if (unreadCount > 0) {
      badge.innerText = unreadCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }
  
  const listEl = document.getElementById('inbox-messages-list');
  if (!listEl) return;
  
  listEl.innerHTML = '';
  
  if (inboxMessages.length === 0) {
    listEl.innerHTML = `<div style="text-align: center; color: #888; padding: 20px; font-weight: 700;">Gelen kutunuz boş.</div>`;
    return;
  }
  
  inboxMessages.forEach(msg => {
    const card = document.createElement('div');
    card.style.background = 'rgba(255, 255, 255, 0.05)';
    card.style.border = '1px solid rgba(255, 255, 255, 0.08)';
    card.style.borderRadius = '12px';
    card.style.padding = '12px';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.gap = '6px';
    card.style.textAlign = 'left';
    
    const timeStr = new Date(msg.date).toLocaleDateString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    
    let rewardBadgeHtml = '';
    if (msg.reward) {
      let rewardText = '';
      if (msg.reward.type === 'gold') rewardText = `+${msg.reward.amount} Altın 🪙`;
      else if (msg.reward.type === 'lives') rewardText = `+${msg.reward.amount} Can ❤️`;
      else if (msg.reward.type === 'joker') {
        const jokerNames = { hammer: 'Çekiç 🔨', spray: 'Sprey 🚀', bomb: 'Bomba 💣', fish: 'Balık 🐠' };
        rewardText = `+${msg.reward.amount} ${jokerNames[msg.reward.jokerType] || 'Joker'}`;
      }
      
      rewardBadgeHtml = `<span style="background: rgba(254, 211, 48, 0.15); color: #ffd23f; padding: 2px 8px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; width: fit-content; margin-top: 4px;">${rewardText}</span>`;
    }
    
    let btnHtml = '';
    if (msg.reward) {
      if (msg.claimed) {
        btnHtml = `<button disabled style="background: rgba(255,255,255,0.08); color: #777; border: none; padding: 6px 12px; border-radius: 8px; font-weight: bold; font-size: 0.85rem; cursor: not-allowed; align-self: flex-end;">Alındı</button>`;
      } else {
        btnHtml = `<button onclick="claimInboxReward('${msg.id}')" style="background: #2ed573; color: white; border: none; padding: 6px 14px; border-radius: 8px; font-weight: 900; font-size: 0.85rem; cursor: pointer; align-self: flex-end; box-shadow: 0 2px 6px rgba(46, 213, 115, 0.3); transition: transform 0.1s ease;">Al</button>`;
      }
    } else {
      if (msg.claimed) {
        btnHtml = `<span style="color: #666; font-size: 0.8rem; align-self: flex-end; font-weight: 700; margin-top: 4px;">Okundu</span>`;
      } else {
        btnHtml = `<button onclick="readInboxMessage('${msg.id}')" style="background: #7c4dff; color: white; border: none; padding: 6px 14px; border-radius: 8px; font-weight: bold; font-size: 0.85rem; cursor: pointer; align-self: flex-end;">Tamam</button>`;
      }
    }
    
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
        <strong style="color: #ffd23f; font-size: 0.95rem;">${msg.title}</strong>
        <span style="color: #777; font-size: 0.75rem; white-space: nowrap;">${timeStr}</span>
      </div>
      <p style="color: #ddd; font-size: 0.85rem; margin: 0; line-height: 1.35;">${msg.desc}</p>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
        ${rewardBadgeHtml}
        ${btnHtml}
      </div>
    `;
    
    listEl.appendChild(card);
  });
}

window.claimInboxReward = function(id) {
  const msg = inboxMessages.find(m => m.id === id);
  if (!msg || msg.claimed || !msg.reward) return;
  
  const reward = msg.reward;
  if (reward.type === 'gold') {
    goldBars += reward.amount;
    spawnFloatingText(1, 20, `+${reward.amount} Altın! 🪙`, "#2ed573");
  } else if (reward.type === 'lives') {
    lives = Math.min(5, lives + reward.amount);
    spawnFloatingText(1, 20, `+${reward.amount} Can! ❤️`, "#ff3366");
  } else if (reward.type === 'joker') {
    jokers[reward.jokerType] += reward.amount;
    const jokerNames = { hammer: 'Çekiç 🔨', spray: 'Sprey 🚀', bomb: 'Bomba 💣', fish: 'Balık 🐠' };
    spawnFloatingText(1, 20, `+1 ${jokerNames[reward.jokerType]}!`, "#ffd23f");
  }
  
  msg.claimed = true;
  saveGameState();
  updateHUD();
  updateJokersUI();
  updateSidebarStats();
  updateInboxUI();
  
  soundEngine.playLevelUp();
};

window.readInboxMessage = function(id) {
  const msg = inboxMessages.find(m => m.id === id);
  if (!msg || msg.claimed) return;
  
  msg.claimed = true;
  saveGameState();
  updateInboxUI();
};

function claimAllInboxRewards() {
  let claimedAny = false;
  inboxMessages.forEach(msg => {
    if (!msg.claimed) {
      if (msg.reward) {
        const reward = msg.reward;
        if (reward.type === 'gold') {
          goldBars += reward.amount;
        } else if (reward.type === 'lives') {
          lives = Math.min(5, lives + reward.amount);
        } else if (reward.type === 'joker') {
          jokers[reward.jokerType] += reward.amount;
        }
      }
      msg.claimed = true;
      claimedAny = true;
    }
  });
  
  if (claimedAny) {
    saveGameState();
    updateHUD();
    updateJokersUI();
    updateSidebarStats();
    updateInboxUI();
    soundEngine.playLevelUp();
    spawnFloatingText(1, 20, "Tüm Hediyeler Alındı! 🎁", "#2ed573");
    alert("Tüm hediyeler başarıyla toplandı ve envanterinize eklendi!");
  } else {
    alert("Alınacak yeni bir hediye yok.");
  }
}


// ══════════════════════════════════════════════════════════════
// GÜNLÜK GİRİŞ ÖDÜL SİSTEMİ (DAILY LOGIN REWARD)
// ══════════════════════════════════════════════════════════════

const DAILY_REWARDS = [
  { day: 1, icon: '🔨',   name: '1× Çekiç',        joker: 'hammer',  amount: 1 },
  { day: 2, icon: '🚀',   name: '1× Sprey',         joker: 'spray',   amount: 1 },
  { day: 3, icon: '⚡',   name: '+5 Hamle',          joker: 'moves',   amount: 1 },
  { day: 4, icon: '💣',   name: '1× Bomba',         joker: 'bomb',    amount: 1 },
  { day: 5, icon: '🐠',   name: '1× Balık',         joker: 'fish',    amount: 1 },
  { day: 6, icon: '🎁',   name: '1× Çekiç + Bomba', joker: 'multi',   amount: 1 },
  { day: 7, icon: '🌟',   name: '2× Her Joker!',    joker: 'jackpot', amount: 2 },
];

function getDailyRewardState() {
  try {
    const raw = localStorage.getItem('daily_reward_state');
    return raw ? JSON.parse(raw) : { streak: 0, lastClaimDate: null };
  } catch(e) { return { streak: 0, lastClaimDate: null }; }
}

function saveDailyRewardState(state) {
  localStorage.setItem('daily_reward_state', JSON.stringify(state));
}

function getTodayDateStr() {
  const d = new Date();
  return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
}

function getYesterdayDateStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
}

function buildDailyRewardGrid(todayIndex) {
  const grid = document.getElementById('daily-reward-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const dayLabels = ['G1','G2','G3','G4','G5','G6','G7'];
  DAILY_REWARDS.forEach((reward, i) => {
    const card = document.createElement('div');
    card.className = 'dr-day-card';
    if      (i < todayIndex)  card.classList.add('claimed');
    else if (i === todayIndex) card.classList.add('today');
    else                       card.classList.add('locked');
    if (i === 6)               card.classList.add('jackpot');

    card.innerHTML =
      '<span class="dr-day-label">' + dayLabels[i] + '</span>' +
      '<span class="dr-day-icon">'  + reward.icon  + '</span>' +
      '<span class="dr-day-amount">G' + reward.day + '</span>';
    grid.appendChild(card);
  });
}

function applyDailyReward(reward) {
  if (reward.joker === 'multi') {
    jokers.hammer++;
    jokers.bomb++;
  } else if (reward.joker === 'jackpot') {
    jokers.hammer += 2;
    jokers.spray  += 2;
    jokers.moves  += 2;
    jokers.bomb   += 2;
    jokers.fish   += 2;
  } else {
    jokers[reward.joker] += reward.amount;
  }
  saveGameState();
  updateJokersUI();
  if (typeof updateSidebarStats === 'function') updateSidebarStats();
}

function checkAndShowDailyReward() {
  const state    = getDailyRewardState();
  const today    = getTodayDateStr();
  const yesterday = getYesterdayDateStr();

  // Bugün zaten alındıysa gösterme
  if (state.lastClaimDate === today) return;

  // Streak hesapla
  let newStreak;
  if (state.lastClaimDate === yesterday) {
    newStreak = Math.min((state.streak || 0) + 1, 7);
  } else {
    newStreak = 1; // ilk giriş veya streak kırıldı
  }

  const dayIndex   = newStreak - 1;
  const todayReward = DAILY_REWARDS[dayIndex];

  buildDailyRewardGrid(dayIndex);

  const iconEl = document.getElementById('daily-reward-today-icon');
  const nameEl = document.getElementById('daily-reward-today-name');
  if (iconEl) iconEl.textContent = todayReward.icon;
  if (nameEl) nameEl.textContent = todayReward.name;

  const modal = document.getElementById('daily-reward-modal');
  if (modal) modal.classList.add('active');

  // Al butonuna listener ekle (klon ile öncekini temizle)
  const claimBtn = document.getElementById('btn-claim-daily');
  if (claimBtn) {
    const newBtn = claimBtn.cloneNode(true);
    claimBtn.parentNode.replaceChild(newBtn, claimBtn);
    newBtn.addEventListener('click', function() {
      applyDailyReward(todayReward);
      saveDailyRewardState({ streak: newStreak, lastClaimDate: today });
      if (modal) modal.classList.remove('active');
      if (typeof spawnFloatingText === 'function') {
        spawnFloatingText(3, 2, 'Gunluk Odul: ' + todayReward.name + ' 🎉', '#ffd23f');
      }
      if (typeof soundEngine !== 'undefined') soundEngine.playLevelUp();
    });
  }
}

// Sayfa yüklendikten 1.2sn sonra günlük ödülü kontrol et
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(checkAndShowDailyReward, 1200);
  setTimeout(initCapacitorAdMob, 500);
});

// ══════════════════════════════════════════════════════════════
// GOOGLE ADMOB REKLAM ENTEGRASYONU (CAPACITOR COMMUNITY ADMOB)
// ══════════════════════════════════════════════════════════════

let adShowCounter = 0;

async function initCapacitorAdMob() {
  if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.Plugins.AdMob) {
    const { AdMob } = window.Capacitor.Plugins;
    try {
      await AdMob.initialize({
        initializeForTesting: true // Test reklamları aktif
      });
      console.log("AdMob başarıyla başlatıldı.");
    } catch (e) {
      console.error("AdMob başlatılamadı:", e);
    }
  }
}

async function showInterstitialAd() {
  if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.Plugins.AdMob) {
    const { AdMob } = window.Capacitor.Plugins;
    adShowCounter++;
    
      // Her 3 ekran geçişinde bir reklam göster
      if (adShowCounter % 3 !== 0) {
        console.log("Reklam sayacı: " + adShowCounter + "/3 (Reklam gösterilmeyecek)");
        return;
      }

      // Android Test Interstitial Ad ID: ca-app-pub-3940256099942544/1033173712
      // Gerçek reklam ID'si aldığında bu test ID'yi onunla değiştireceksin.
      await AdMob.prepareInterstitial({
        adId: 'ca-app-pub-3940256099942544/1033173712',
        isTesting: true
      });
      await AdMob.showInterstitial();
      console.log("Geçiş reklamı gösterildi.");
    } catch (e) {
      console.error("Geçiş reklamı gösterim hatası:", e);
    }
  }
}

async function showRewardedAdForBooster(boosterType) {
  const names = { hammer: 'Çekiç 🔨', spray: 'Sprey 🚀', moves: '+5 Hamle ⚡', bomb: 'Bomba 💣', fish: 'Balık 🐠' };
  const nameTr = names[boosterType] || 'Joker 🎁';

  if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.Plugins.AdMob) {
    const { AdMob } = window.Capacitor.Plugins;
    try {
      spawnFloatingText(3, 2, "Reklam yükleniyor...", "#ffd23f");
      
      // Android Test Rewarded Ad ID: ca-app-pub-3940256099942544/5224354917
      await AdMob.prepareRewardVideoAd({
        adId: 'ca-app-pub-3940256099942544/5224354917',
        isTesting: true
      });
      
      let gotReward = false;
      const listener = await AdMob.addListener('rewardedVideoAdReward', (info) => {
        gotReward = true;
      });
      const listenerAlt = await AdMob.addListener('onAdReward', (info) => {
        gotReward = true;
      });

      await AdMob.showRewardVideoAd();

      // Dinleyicileri temizle
      setTimeout(() => {
        listener.remove();
        listenerAlt.remove();
      }, 1000);

      // Ödülü ver
      if (gotReward) {
        jokers[boosterType]++;
        saveGameState();
        updateJokersUI();
        if (typeof updateSidebarStats === 'function') updateSidebarStats();
        soundEngine.playSpecial();
        spawnFloatingText(3, 2, "+1 " + nameTr + " Kazanıldı! 🎉", "#4caf50");
      } else {
        spawnFloatingText(3, 2, "Reklam tamamlanmadı 😢", "#ff6b6b");
      }
    } catch (e) {
      console.error("Rewarded ad error:", e);
      spawnFloatingText(3, 2, "Reklam yüklenemedi 😞", "#ff6b6b");
    }
  } else {
    // Tarayıcı test simülasyonu
    if (confirm("Web tarayıcısındasınız. Test amaçlı reklam izlemeyi simüle edip +1 " + nameTr + " kazanmak ister misiniz?")) {
      jokers[boosterType]++;
      saveGameState();
      updateJokersUI();
      if (typeof updateSidebarStats === 'function') updateSidebarStats();
      soundEngine.playSpecial();
      spawnFloatingText(3, 2, "+1 " + nameTr + " (Simüle) 🎁", "#4caf50");
    }
  }
}
