// WAKE.EXE - Master Game Engine & Director-Driven Terminal Client
import {
  parseCommand,
  getAutocompleteSuggestions,
  ChallengeItem,
  PlayerProfile
} from '@wake/shared';
import {
  STORY_ROOMS,
  ROOM_ART,
  TITLE_ART,
  DEATH_ART,
  MIRROR_MORPH_FRAMES,
  FALLBACK_CHALLENGES
} from '@wake/content';
import {
  WordleRunner,
  BlackjackRunner,
  CipherRunner,
  SimonRunner,
  DarkMazeRunner,
  MinigameState
} from './minigames/runners.js';
import { soundEngine } from './audio.js';

interface HealthData {
  status: 'ok' | 'degraded' | 'error';
  provider: string;
  model: string;
  providerConnected: boolean;
  version: string;
  details?: string;
}

// DOM Elements
const outputEl = document.getElementById('terminal-output') as HTMLDivElement;
const inputEl = document.getElementById('terminal-input') as HTMLInputElement;
const distanceMeterEl = document.getElementById('distance-meter') as HTMLElement;
const ghostProviderEl = document.getElementById('ghost-provider') as HTMLElement;
const ghostModelEl = document.getElementById('ghost-model') as HTMLElement;
const ghostStatusEl = document.getElementById('ghost-status') as HTMLElement;
const ghostLatencyEl = document.getElementById('ghost-latency') as HTMLElement;
const profileTagsEl = document.getElementById('profile-tags') as HTMLElement;
const queueSlotsEl = document.getElementById('queue-slots') as HTMLElement;
const learningFeedEl = document.getElementById('learning-feed') as HTMLElement;
const themeToggleEl = document.getElementById('theme-toggle') as HTMLElement;
const safeModeToggleEl = document.getElementById('safe-mode-toggle') as HTMLElement;
const audioToggleEl = document.getElementById('audio-toggle') as HTMLElement;
const debugModalEl = document.getElementById('debug-modal') as HTMLElement;
const closeDebugBtn = document.getElementById('close-debug-btn') as HTMLElement;
const debugJsonEl = document.getElementById('debug-json') as HTMLElement;
const jumpscareOverlayEl = document.getElementById('jumpscare-overlay') as HTMLElement;
const jumpscareArtEl = document.getElementById('jumpscare-art') as HTMLElement;
const jumpscareTextEl = document.getElementById('jumpscare-text') as HTMLElement;

// Konami Code Tracker
const KONAMI_CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let konamiPos = 0;

// Session & State
const sessionId = localStorage.getItem('wake_session_id') || `wake-${Math.random().toString(36).substring(2, 9)}`;
localStorage.setItem('wake_session_id', sessionId);

let currentRoomId = 'bedroom';
let checkpointRoomId = 'bedroom';
let distance = 10;
const inventory = new Set<string>();
const solvedRooms = new Set<string>();
const visitedRooms = new Set<string>();

// Telemetry & Profiler State
let deaths = 0;
let mistakes = 0;
let roomsRevisited = 0;
const startTime = Date.now();
let lastCommandTimestamp = Date.now();
const idleTimeSamples: number[] = [];
let keystrokeCount = 0;
let typingSpeedWpm = 50;
let lastDirectorData: any = null;
let activeMinigame: any = null;
let isEndingPlayed = false;

// Lookahead Queue State
let lookaheadQueue: ChallengeItem[] = [];
let isQueueGenerating = false;

// UI State
let isMonochrome = false;
let isSafeMode = false;
let isAudioMuted = true;
let isDebugOpen = false;

// Output formatting
function printLine(text: string, className = ''): void {
  const line = document.createElement('div');
  line.className = className;
  line.textContent = text;
  outputEl.appendChild(line);
  outputEl.scrollTop = outputEl.scrollHeight;
}

function printArt(lines: string[], className = ''): void {
  for (const l of lines) {
    printLine(l, className);
  }
}

async function typeWriter(text: string, speed = 12): Promise<void> {
  const line = document.createElement('div');
  outputEl.appendChild(line);
  for (let i = 0; i < text.length; i++) {
    line.textContent += text[i];
    outputEl.scrollTop = outputEl.scrollHeight;
    soundEngine.playKeyClick();
    await new Promise((r) => setTimeout(r, speed));
  }
}

// Distance Meter
function updateDistance(newDist: number): void {
  distance = Math.max(0, Math.min(10, newDist));
  soundEngine.setDistance(distance);

  const filled = '='.repeat(distance);
  const empty = ' '.repeat(10 - distance);
  distanceMeterEl.textContent = `DISTANCE TO THING: [${filled}${empty}] ${distance}/10`;

  if (distance <= 0) {
    triggerDeath();
  }
}

function recordMistake(penalty: number, mistakeName: string): void {
  mistakes++;
  updateDistance(distance - penalty);
  postTelemetry('mistake', { mistakeName, penalty, distanceRemaining: distance });
  addLearningFeed(`> Mistake noted: ${mistakeName} (Distance -${penalty})`);
  recalculateProfileAndTags();
  triggerDirectorLookahead();
}

function addLearningFeed(msg: string): void {
  const item = document.createElement('div');
  item.className = 'feed-item';
  item.textContent = msg;
  learningFeedEl.prepend(item);
  if (learningFeedEl.children.length > 8) {
    learningFeedEl.removeChild(learningFeedEl.lastChild!);
  }
}

function buildPlayerProfile(): PlayerProfile {
  const totalPlayTimeMs = Date.now() - startTime;
  const avgIdle = idleTimeSamples.length > 0
    ? idleTimeSamples.reduce((a, b) => a + b, 0) / idleTimeSamples.length
    : 2000;

  const tags: string[] = [];
  if (typingSpeedWpm > 70) tags.push('FAST TYPIST');
  else if (typingSpeedWpm < 30) tags.push('SLOW TYPIST');

  if (avgIdle > 4000 && mistakes <= 1) tags.push('CAUTIOUS');
  else if (avgIdle < 1500 && mistakes >= 2) tags.push('RECKLESS');
  else if (mistakes === 0 && totalPlayTimeMs > 8000) tags.push('METHODICAL');

  if (avgIdle > 5000) tags.push('HESITANT');
  if (deaths > 0) tags.push('MARKED');
  if (roomsRevisited >= 2) tags.push('INQUISITIVE');
  if (tags.length === 0) tags.push('CALIBRATING');

  return {
    sessionId,
    totalPlayTimeMs: Math.round(totalPlayTimeMs),
    typingSpeedWpm: Math.round(typingSpeedWpm),
    commandIdleTimeAvgMs: Math.round(avgIdle),
    deaths,
    mistakesTotal: mistakes,
    hintsUsedTotal: 0,
    roomsRevisitedCount: roomsRevisited,
    itemsIgnoredCount: 0,
    solveTimesByTemplate: {},
    tags,
    recentMistake: mistakes > 0 ? `mistake #${mistakes}` : undefined
  };
}

function recalculateProfileAndTags(): void {
  const profile = buildPlayerProfile();
  profileTagsEl.innerHTML = '';
  for (const t of profile.tags) {
    const span = document.createElement('span');
    span.className = 'tag';
    span.textContent = t;
    profileTagsEl.appendChild(span);
  }
}

// Lookahead Queue UI Updater
function renderQueueSlots(): void {
  queueSlotsEl.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const slotDiv = document.createElement('div');
    if (i < lookaheadQueue.length) {
      const ch = lookaheadQueue[i];
      slotDiv.className = 'queue-slot validated';
      slotDiv.textContent = `[SLOT ${i + 1}] ${ch.template.toUpperCase()} (LVL ${ch.difficulty}) [READY]`;
    } else if (isQueueGenerating) {
      slotDiv.className = 'queue-slot generating';
      slotDiv.textContent = `[SLOT ${i + 1}] NEURAL SYNAPSE COMPUTING...`;
    } else {
      slotDiv.className = 'queue-slot empty';
      slotDiv.textContent = `[SLOT ${i + 1}] PREPARING NEXT WAVE`;
    }
    queueSlotsEl.appendChild(slotDiv);
  }
}

// Background Director Invocation
async function triggerDirectorLookahead(): Promise<void> {
  if (isQueueGenerating) return;
  isQueueGenerating = true;
  renderQueueSlots();

  const profile = buildPlayerProfile();
  const startReq = performance.now();

  try {
    const res = await fetch('/api/director', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile,
        currentRoom: currentRoomId,
        runState: { distance, inventory: Array.from(inventory) }
      })
    });

    const latency = Math.round(performance.now() - startReq);
    ghostLatencyEl.textContent = `${latency}ms`;

    if (res.ok) {
      const data = await res.json();
      lastDirectorData = data;
      debugJsonEl.textContent = JSON.stringify({ profile, director: data }, null, 2);

      if (data.validatedChallenges && data.validatedChallenges.length > 0) {
        lookaheadQueue = data.validatedChallenges;
        addLearningFeed(`> Director adapted 3 challenges (Latency: ${latency}ms)`);
      }

      if (data.response?.taunts && data.response.taunts.length > 0) {
        const taunt = data.response.taunts[Math.floor(Math.random() * data.response.taunts.length)];
        addLearningFeed(`> Taunt prepared: "${taunt}"`);
      }
    }
  } catch (err: any) {
    console.warn('[Director Client] Request failed, using fallback:', err.message);
  } finally {
    isQueueGenerating = false;
    renderQueueSlots();
  }
}

// Room Display Engine
function enterRoom(roomId: string): void {
  const room = STORY_ROOMS[roomId];
  if (!room) return;

  if (visitedRooms.has(roomId)) {
    roomsRevisited++;
  } else {
    visitedRooms.add(roomId);
  }

  currentRoomId = roomId;
  if (room.checkpoint) {
    checkpointRoomId = roomId;
  }

  printLine('\n========================================================', 'bright');
  printLine(`  LOCATION: [${room.name}]`, 'bright');
  printLine('========================================================\n');

  if (ROOM_ART[roomId]) {
    printArt(ROOM_ART[roomId]);
    printLine('');
  }

  // Narration blending
  const roomSequence = ['bedroom', 'hallway', 'kitchen', 'pantry', 'stairwell', 'basement', 'corridor', 'mirror_room'];
  const driftIndex = roomSequence.indexOf(roomId);

  if (driftIndex >= 5) {
    for (const line of room.firstPersonDrift) {
      printLine(line);
    }
  } else {
    for (const line of room.narration) {
      printLine(line);
    }
  }

  // If director had a taunt ready and distance is getting close, whisper it
  if (lastDirectorData?.response?.taunts?.length && distance <= 6 && Math.random() > 0.4) {
    const taunt = lastDirectorData.response.taunts[0];
    printLine(`\nWhisper behind your ear: "${taunt}"`, 'danger');
  }

  if (room.challengeTemplate && !solvedRooms.has(roomId)) {
    startRoomChallenge(room.challengeTemplate, room.defaultChallengeId);
  } else {
    printRoomExits(room);
  }

  syncState();
  recalculateProfileAndTags();
  // Trigger director background generation for upcoming rooms!
  triggerDirectorLookahead();
}

function printRoomExits(room: any): void {
  printLine('\nOBVIOUS EXITS:');
  for (const exit of room.exits) {
    const targetRoom = STORY_ROOMS[exit.targetRoomId];
    const status = exit.locked && !solvedRooms.has(room.id) ? '[LOCKED]' : '[OPEN]';
    printLine(`  - ${exit.direction.toUpperCase()} -> ${targetRoom?.name || exit.targetRoomId} ${status}`);
  }
  if (room.items && room.items.length > 0) {
    printLine(`ITEMS HERE: ${room.items.join(', ')}`);
  }
}

// Challenge Launcher (Uses Lookahead Queue when available!)
function startRoomChallenge(template: string, defaultChallengeId?: string): void {
  let challengeToRun: ChallengeItem | null = null;

  // Check if lookahead queue has a matching or adapted challenge ready
  if (lookaheadQueue.length > 0) {
    const matchIdx = lookaheadQueue.findIndex((c) => c.template === template);
    if (matchIdx >= 0) {
      challengeToRun = lookaheadQueue.splice(matchIdx, 1)[0];
      addLearningFeed(`> Lookahead HIT: Delivered ${template} (adapted)`);
    } else {
      challengeToRun = lookaheadQueue.shift() || null;
    }
    renderQueueSlots();
  }

  // Fallback to static pool if lookahead queue was empty
  if (!challengeToRun) {
    challengeToRun = FALLBACK_CHALLENGES.find((c) => c.id === defaultChallengeId) ||
      FALLBACK_CHALLENGES.find((c) => c.template === template) ||
      FALLBACK_CHALLENGES[0];
    addLearningFeed(`> Lookahead fallback: Delivered static ${template}`);
  }

  const state: MinigameState = {
    template: challengeToRun.template,
    active: true,
    params: challengeToRun.params,
    print: (txt: string, cls?: string) => printLine(txt, cls),
    onSuccess: () => {
      solvedRooms.add(currentRoomId);
      activeMinigame = null;
      printLine('\nPath unsealed. You can move forward now.', 'bright');
      printRoomExits(STORY_ROOMS[currentRoomId]);
      syncState();
      triggerDirectorLookahead();
    },
    onMistake: (penalty: number, mistakeName: string) => {
      recordMistake(penalty, mistakeName);
    }
  };

  switch (challengeToRun.template) {
    case 'wordle':
      activeMinigame = new WordleRunner(state);
      break;
    case 'blackjack':
      activeMinigame = new BlackjackRunner(state);
      break;
    case 'cipher':
      activeMinigame = new CipherRunner(state);
      break;
    case 'simon':
      activeMinigame = new SimonRunner(state);
      break;
    case 'dark_maze':
      activeMinigame = new DarkMazeRunner(state);
      break;
    default:
      solvedRooms.add(currentRoomId);
      return;
  }

  activeMinigame.start();
}

// Map
function printAsciiMap(): void {
  printLine('\n=================== ARCHITECTURAL MAP ===================', 'bright');
  const getMarker = (id: string) => (currentRoomId === id ? '@' : ' ');
  printLine(`  [${getMarker('bedroom')}] BEDROOM ---> [${getMarker('hallway')}] HALLWAY ---> [${getMarker('kitchen')}] KITCHEN === [${getMarker('pantry')}] PANTRY`);
  printLine(`                                     |`);
  printLine(`                               [${getMarker('stairwell')}] STAIRWELL`);
  printLine(`                                     |`);
  printLine(`                               [${getMarker('basement')}] BASEMENT`);
  printLine(`                                     |`);
  printLine(`                               [${getMarker('corridor')}] CORRIDOR`);
  printLine(`                                     |`);
  printLine(`                               [${getMarker('mirror_room')}] MIRROR VAULT`);
  printLine('=========================================================\n');
}

// Death
function triggerDeath(): void {
  deaths++;
  soundEngine.playGlitchNoise();
  printArt(DEATH_ART, 'danger');
  printLine('\nTHE THING CAUGHT YOU IN THE DARK.', 'danger');
  printLine(`Respawning at checkpoint: [${STORY_ROOMS[checkpointRoomId].name}]...\n`);

  addLearningFeed(`> Death event #${deaths} registered.`);
  postTelemetry('death', { room: currentRoomId, deathsTotal: deaths });

  setTimeout(() => {
    distance = 7;
    updateDistance(distance);
    enterRoom(checkpointRoomId);
  }, 1200);
}

// Mirror Ending
async function triggerMirrorFinale(): Promise<void> {
  if (isEndingPlayed) return;
  isEndingPlayed = true;

  printLine('\n========================================================', 'bright');
  printLine('  YOU APPROACH THE MIRROR VAULT GLASS...                ', 'bright');
  printLine('========================================================\n');

  for (let i = 0; i < MIRROR_MORPH_FRAMES.length; i++) {
    await new Promise((r) => setTimeout(r, 900));
    soundEngine.playGlitchNoise();
    printLine(`\n[REFLECTION CYCLE ${i + 1}/5]`);
    printArt(MIRROR_MORPH_FRAMES[i], i === 4 ? 'bright' : '');
  }

  await new Promise((r) => setTimeout(r, 1200));
  await typeWriter('\nI looked into the glass.', 20);
  await typeWriter('There was no one behind me.', 20);
  await typeWriter('The heavy footsteps... were my own paws.', 20);
  await typeWriter('The voice in the walls... was my own hunger.', 20);
  await typeWriter('I WAS NEVER RUNNING FROM THE MONSTER.', 25);
  await typeWriter('I AM THE MONSTER.', 30);

  await new Promise((r) => setTimeout(r, 1500));
  displayEndingFile();
}

function displayEndingFile(): void {
  const profile = buildPlayerProfile();
  printLine('\n\n========================================================', 'bright');
  printLine('       THE FILE IT KEPT ON YOU [FINAL DOSSIER]          ', 'bright');
  printLine('========================================================');
  printLine(`  SESSION ID:           ${sessionId}`);
  printLine(`  ELAPSED TIME:         ${profile.totalPlayTimeMs / 1000}s`);
  printLine(`  TYPING SPEED:         ${profile.typingSpeedWpm} WPM`);
  printLine(`  AVG IDLE HESITATION:  ${profile.commandIdleTimeAvgMs}ms`);
  printLine(`  TOTAL DEATHS:         ${deaths}`);
  printLine(`  MISTAKES REGISTERED:  ${mistakes}`);
  printLine(`  ROOMS REVISITED:      ${roomsRevisited}`);
  printLine(`  ASSIGNED TAGS:        ${profile.tags.join(', ')}`);
  printLine('--------------------------------------------------------');
  printLine('  NEURAL PROFILE DUMP (RAW JSON):');
  printLine(JSON.stringify(profile, null, 2));
  printLine('--------------------------------------------------------');
  printLine('  VERDICT: THE MACHINE REMEMBERS EVERYTHING YOU DID.');
  printLine('  THANK YOU FOR PLAYING WAKE.EXE.');
  printLine('========================================================\n');
}

// Commands
function handleCommand(raw: string): void {
  if (isEndingPlayed) {
    printLine('Session concluded. Reload to awaken again.');
    return;
  }

  // Calculate idle time before acting
  const now = Date.now();
  const idleMs = now - lastCommandTimestamp;
  idleTimeSamples.push(idleMs);
  lastCommandTimestamp = now;

  if (activeMinigame) {
    const finished = activeMinigame.handleInput(raw);
    if (finished) {
      activeMinigame = null;
    }
    return;
  }

  const parsed = parseCommand(raw);

  switch (parsed.type) {
    case 'look':
      if (parsed.target === 'mirror' && currentRoomId === 'mirror_room') {
        triggerMirrorFinale();
      } else {
        const room = STORY_ROOMS[currentRoomId];
        printLine(`\n${room.name}:`);
        for (const l of room.narration) printLine(l);
        printRoomExits(room);
      }
      break;

    case 'go': {
      const room = STORY_ROOMS[currentRoomId];
      const exit = room.exits.find((e) => e.direction === parsed.direction);
      if (!exit) {
        printLine(`You cannot go ${parsed.direction} from here.`);
        return;
      }
      if (exit.locked && !solvedRooms.has(currentRoomId)) {
        printLine(`Locked: ${exit.lockDescription || 'The way is barred.'}`, 'danger');
        return;
      }
      enterRoom(exit.targetRoomId);
      break;
    }

    case 'take': {
      const room = STORY_ROOMS[currentRoomId];
      const itemIndex = room.items.indexOf(parsed.item);
      if (itemIndex >= 0) {
        room.items.splice(itemIndex, 1);
        inventory.add(parsed.item);
        printLine(`Taken: ${parsed.item}.`);
      } else {
        printLine(`No "${parsed.item}" found to take.`);
      }
      break;
    }

    case 'use':
      if (parsed.item === 'ethanol' && inventory.has('ethanol')) {
        inventory.delete('ethanol');
        updateDistance(distance + 2);
        printLine('You drink the ethanol. The chemical burn clears your mind. Distance +2!', 'bright');
      } else if (parsed.item === 'flashlight' && inventory.has('flashlight')) {
        printLine('The beam flickers, illuminating claw scratches on the ceiling.');
      } else {
        printLine(`You cannot use "${parsed.item}" right now.`);
      }
      break;

    case 'inventory':
      if (inventory.size === 0) {
        printLine('Your pockets are empty.');
      } else {
        printLine(`YOU CARRY: ${Array.from(inventory).join(', ')}`);
      }
      break;

    case 'map':
      printAsciiMap();
      break;

    case 'help':
      printLine('COMMANDS:');
      printLine('  look / l           - Inspect surroundings');
      printLine('  go <dir> / n,s,e,w - Move through doors');
      printLine('  take <item>        - Collect item');
      printLine('  use <item>         - Consume or interact');
      printLine('  inventory / i      - Review your items');
      printLine('  map / m            - Display ASCII floorplan');
      printLine('  safe               - Toggle Safe Mode');
      printLine('  mute               - Toggle Sound Synthesizer');
      break;

    case 'safe':
      safeModeToggleEl.click();
      break;

    case 'mute':
      audioToggleEl.click();
      break;

    case 'action':
      if (parsed.verb === 'approach' && parsed.arg === 'mirror' && currentRoomId === 'mirror_room') {
        triggerMirrorFinale();
      } else {
        printLine(`Unknown action: "${raw}". Type "help" for valid commands.`);
      }
      break;

    default:
      printLine(`Unknown command: "${raw}". Type "help" for options.`);
  }
}

// Telemetry & Sync
async function syncState(): Promise<void> {
  const profile = buildPlayerProfile();
  const state = {
    sessionId,
    currentRoom: currentRoomId,
    distance,
    inventory: Array.from(inventory),
    solvedRooms: Array.from(solvedRooms),
    checkpointRoom: checkpointRoomId,
    deaths,
    mistakes,
    playerProfile: profile
  };
  debugJsonEl.textContent = JSON.stringify(state, null, 2);

  try {
    await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    });
  } catch (e) {
    // offline
  }
}

async function postTelemetry(type: string, data: any): Promise<void> {
  try {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, type, data })
    });
  } catch (e) {
    // offline
  }
}

// Boot
async function boot(): Promise<void> {
  printArt(TITLE_ART, 'bright');
  printLine('\n[SYSTEM INITIALIZED] Connecting to Ghost in the Machine...');

  const startReq = performance.now();
  try {
    const res = await fetch('/health');
    const latency = Math.round(performance.now() - startReq);
    ghostLatencyEl.textContent = `${latency}ms`;
    const health = (await res.json()) as HealthData;
    ghostProviderEl.textContent = health.provider.toUpperCase();
    ghostModelEl.textContent = health.model;
    ghostStatusEl.textContent = health.providerConnected ? 'ONLINE' : 'FALLBACK';
  } catch (err) {
    ghostLatencyEl.textContent = '0ms';
    ghostProviderEl.textContent = 'NONE';
    ghostStatusEl.textContent = 'STANDALONE';
  }

  updateDistance(10);
  renderQueueSlots();
  enterRoom('bedroom');
}

// Event Listeners
inputEl.addEventListener('keydown', (e) => {
  soundEngine.initOnGesture();
  soundEngine.playKeyClick();
  keystrokeCount++;

  // Simple typing speed tracking
  const elapsedMinutes = Math.max(0.1, (Date.now() - startTime) / 60000);
  typingSpeedWpm = Math.round((keystrokeCount / 5) / elapsedMinutes);

  if (e.key === 'Tab') {
    e.preventDefault();
    const suggestions = getAutocompleteSuggestions(inputEl.value);
    if (suggestions.length > 0) {
      inputEl.value = suggestions[0];
    }
    return;
  }

  if (e.key === 'Enter') {
    const val = inputEl.value.trim();
    if (!val) return;
    printLine(`> ${val}`);
    inputEl.value = '';
    handleCommand(val);
  }
});

themeToggleEl.addEventListener('click', () => {
  isMonochrome = !isMonochrome;
  document.body.classList.toggle('monochrome', isMonochrome);
  themeToggleEl.textContent = isMonochrome ? '[COLOR: MONO]' : '[COLOR: GREEN]';
});

safeModeToggleEl.addEventListener('click', () => {
  isSafeMode = !isSafeMode;
  document.body.classList.toggle('safe-mode', isSafeMode);
  soundEngine.setSafeMode(isSafeMode);
  safeModeToggleEl.textContent = isSafeMode ? '[SAFE MODE: ON]' : '[SAFE MODE: OFF]';
  printLine(`Safe Mode is now ${isSafeMode ? 'ON (No jumpscares/flashing)' : 'OFF'}.`);
});

audioToggleEl.addEventListener('click', () => {
  soundEngine.initOnGesture();
  isAudioMuted = soundEngine.toggleMute();
  audioToggleEl.textContent = isAudioMuted ? '[AUDIO: OFF]' : '[AUDIO: ON]';
});

function triggerKonamiJumpscare(): void {
  const monsterAscii = `
      \\ \\  / /      .------.      \\ \\  / /     
       \\ \\/ /     /  (X)  (X) \\    \\ \\/ /      
        \\  /     |   /=====\\   |    \\  /       
        /  \\     |  |||||||||  |    /  \\       
       / /\\ \\     \\  \\=====/  /    / /\\ \\      
      / /  \\ \\     '--------'     / /  \\ \\     
     / /    \\ \\   / / |  | \\ \\   / /    \\ \\    
  `;

  jumpscareArtEl.textContent = monsterAscii;

  if (isSafeMode) {
    jumpscareTextEl.textContent = '[SAFE MODE: THE GHOST OBSERVES YOUR CHEAT CODE IN SILENCE]';
    soundEngine.playKeyClick();
  } else {
    jumpscareTextEl.textContent = 'YOU CALLED UPON WHAT SHOULD HAVE SLEPT';
    soundEngine.playGlitchNoise();
  }

  jumpscareOverlayEl.classList.remove('hidden');
  jumpscareOverlayEl.classList.add('active');

  setTimeout(() => {
    jumpscareOverlayEl.classList.remove('active');
    jumpscareOverlayEl.classList.add('hidden');
    printLine('\n[SYSTEM: KONAMI SEQUENCE DETECTED. GHOST PROFILE UPDATED.]', 'danger');
    addLearningFeed('> Konami code breached memory limits.');
  }, isSafeMode ? 2500 : 1800);
}

// Global Key Listeners
window.addEventListener('keydown', (e) => {
  if (e.key === '`' || e.key === '~') {
    e.preventDefault();
    isDebugOpen = !isDebugOpen;
    debugModalEl.classList.toggle('hidden', !isDebugOpen);
    return;
  }

  // Konami progress check
  if (e.key.toLowerCase() === KONAMI_CODE[konamiPos].toLowerCase()) {
    konamiPos++;
    if (konamiPos === KONAMI_CODE.length) {
      konamiPos = 0;
      triggerKonamiJumpscare();
    }
  } else {
    konamiPos = 0;
  }
});

closeDebugBtn.addEventListener('click', () => {
  isDebugOpen = false;
  debugModalEl.classList.add('hidden');
});

// Run boot
boot();
