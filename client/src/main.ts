// WAKE.EXE - Master Game Engine, 3D Vector Viewport & Minimalist Centered Terminal Client
import {
  parseCommand,
  getAutocompleteSuggestions,
  ChallengeItem,
  PlayerProfile
} from '@wake/shared';
import {
  STORY_ROOMS,
  TITLE_ART,
  DEATH_ART,
  FALLBACK_CHALLENGES
} from '@wake/content';
import {
  BandersnatchRunner,
  MinigameState
} from './minigames/runners.js';
import { soundEngine } from './audio.js';
import { DoomViewRenderer } from './doomView.js';

interface HealthData {
  status: 'ok' | 'degraded' | 'error';
  provider: string;
  model: string;
  providerConnected: boolean;
  version: string;
  details?: string;
}

// DOM Elements
const chamberViewEl = document.getElementById('chamber-view') as HTMLElement;
const logsViewEl = document.getElementById('logs-view') as HTMLElement;
const tabChamberBtn = document.getElementById('tab-chamber-btn') as HTMLButtonElement;
const tabLogsBtn = document.getElementById('tab-logs-btn') as HTMLButtonElement;

const roomCanvasEl = document.getElementById('room-canvas-3d') as HTMLCanvasElement;
const roomTitleEl = document.getElementById('room-title') as HTMLElement;
const ghostStatusBadgeEl = document.getElementById('ghost-status-badge') as HTMLElement;
const narrativeOutputEl = document.getElementById('narrative-output') as HTMLDivElement;
const minigameArenaEl = document.getElementById('minigame-arena') as HTMLDivElement;
const actionPillsEl = document.getElementById('action-pills') as HTMLDivElement;
const inputEl = document.getElementById('terminal-input') as HTMLInputElement;
const distanceMeterEl = document.getElementById('distance-meter') as HTMLElement;

// Logs tab elements
const terminalHistoryEl = document.getElementById('terminal-history-output') as HTMLDivElement;
const ghostProviderEl = document.getElementById('ghost-provider') as HTMLElement;
const ghostModelEl = document.getElementById('ghost-model') as HTMLElement;
const ghostLatencyEl = document.getElementById('ghost-latency') as HTMLElement;
const profileTagsEl = document.getElementById('profile-tags') as HTMLElement;
const queueSlotsEl = document.getElementById('queue-slots') as HTMLElement;
const learningFeedEl = document.getElementById('learning-feed') as HTMLElement;

// Controls
const themeToggleEl = document.getElementById('theme-toggle') as HTMLElement;
const safeModeToggleEl = document.getElementById('safe-mode-toggle') as HTMLElement;
const audioToggleEl = document.getElementById('audio-toggle') as HTMLElement;
const debugModalEl = document.getElementById('debug-modal') as HTMLElement;
const closeDebugBtn = document.getElementById('close-debug-btn') as HTMLElement;
const debugJsonEl = document.getElementById('debug-json') as HTMLElement;
const jumpscareOverlayEl = document.getElementById('jumpscare-overlay') as HTMLElement;
const konamiSkullCanvas = document.getElementById('konami-skull-canvas') as HTMLCanvasElement;
const jumpscareTextEl = document.getElementById('jumpscare-text') as HTMLElement;
const jumpscareSubEl = document.getElementById('jumpscare-sub') as HTMLElement;

// 2.5D Doom-style Opaque Raycast Canvas Visualizer
const doomRenderer = new DoomViewRenderer(roomCanvasEl);

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

// UI Settings
let isMonochrome = false;
let isSafeMode = false;
let isAudioMuted = false;
let isDebugOpen = false;

// Helper: Logging to history transcript
function appendHistory(text: string, className = ''): void {
  const line = document.createElement('div');
  line.className = className;
  line.textContent = text;
  terminalHistoryEl.appendChild(line);
  terminalHistoryEl.scrollTop = terminalHistoryEl.scrollHeight;
}

// Helper: Output to active narrative card
function printNarrative(text: string, className = ''): void {
  const line = document.createElement('div');
  line.className = className;
  line.textContent = text;
  narrativeOutputEl.appendChild(line);
  narrativeOutputEl.scrollTop = narrativeOutputEl.scrollHeight;
  appendHistory(text, className);
}

function clearNarrative(): void {
  narrativeOutputEl.innerHTML = '';
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
  addLearningFeed(`> Mistake registered: ${mistakeName} (Distance -${penalty})`);
  recalculateProfileAndTags();
  triggerDirectorLookahead();
}

function addLearningFeed(msg: string): void {
  const item = document.createElement('div');
  item.className = 'feed-item';
  item.textContent = msg;
  learningFeedEl.prepend(item);
  if (learningFeedEl.children.length > 10) {
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

// Lookahead Queue UI
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
      slotDiv.textContent = `[SLOT ${i + 1}] NEURAL MODEL SYNTHESIZING...`;
    } else {
      slotDiv.className = 'queue-slot empty';
      slotDiv.textContent = `[SLOT ${i + 1}] QUEUED (AWAITING GENERATION)`;
    }
    queueSlotsEl.appendChild(slotDiv);
  }
}

// Background Director Generation
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
        addLearningFeed(`> Monster Taunt Prepared: "${taunt}"`);
      }
    }
  } catch (err: any) {
    console.warn('[Director Client] Request failed, using fallback:', err.message);
  } finally {
    isQueueGenerating = false;
    renderQueueSlots();
  }
}

// Render Available Action Pills
function renderActionPills(room: any): void {
  actionPillsEl.innerHTML = '';
  actionPillsEl.classList.remove('hidden');

  const choicesContainerEl = document.getElementById('bandersnatch-choices');
  if (choicesContainerEl) choicesContainerEl.innerHTML = '';

  // Exits
  for (const exit of room.exits) {
    const pill = document.createElement('button');
    pill.className = 'bs-choice-btn';
    const status = exit.locked && !solvedRooms.has(room.id) ? ' [LOCKED]' : '';
    pill.textContent = `GO ${exit.direction.toUpperCase()}${status}`;
    pill.addEventListener('click', () => {
      handleCommand(`go ${exit.direction}`);
    });
    actionPillsEl.appendChild(pill);
  }

  // Items in room
  if (room.items) {
    for (const it of room.items) {
      const pill = document.createElement('button');
      pill.className = 'bs-choice-btn';
      pill.textContent = `TAKE ${it.toUpperCase()}`;
      pill.addEventListener('click', () => {
        handleCommand(`take ${it}`);
      });
      actionPillsEl.appendChild(pill);
    }
  }

  // Common quick actions
  const lookPill = document.createElement('button');
  lookPill.className = 'bs-choice-btn';
  lookPill.textContent = room.id === 'mirror_room' ? 'LOOK MIRROR' : 'LOOK';
  lookPill.addEventListener('click', () => {
    handleCommand(room.id === 'mirror_room' ? 'look mirror' : 'look');
  });
  actionPillsEl.appendChild(lookPill);

  // Usable item action pills
  for (const it of inventory) {
    const itPill = document.createElement('button');
    itPill.className = 'bs-choice-btn';
    itPill.textContent = `USE ${it.toUpperCase()}`;
    itPill.addEventListener('click', () => {
      handleCommand(`use ${it}`);
    });
    actionPillsEl.appendChild(itPill);
  }
}

// Room Transition and Entry
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

  // Doom-style Perspective Step Transition
  doomRenderer.setRoom(roomId, true);
  roomTitleEl.textContent = `LOCATION // ${room.name}`;

  // Atmospheric room audio effects
  if (roomId === 'mirror_room') {
    soundEngine.playSfx('whisper');
  } else if (roomId === 'hallway' || roomId === 'corridor') {
    soundEngine.playSfx('footsteps');
  } else if (roomId === 'pantry' || roomId === 'basement') {
    soundEngine.playSfx('breath');
  } else {
    soundEngine.playSfx('door_creak');
  }

  clearNarrative();
  minigameArenaEl.innerHTML = '';
  minigameArenaEl.classList.add('hidden');

  // Narrative blending (2nd person -> 1st person)
  const roomSequence = ['bedroom', 'hallway', 'kitchen', 'pantry', 'stairwell', 'basement', 'corridor', 'mirror_room'];
  const driftIndex = roomSequence.indexOf(roomId);

  const subtitleEl = document.getElementById('scene-subtitle');
  if (driftIndex >= 5) {
    for (const line of room.firstPersonDrift) {
      printNarrative(line);
    }
    if (subtitleEl) subtitleEl.textContent = room.firstPersonDrift[0] || '';
  } else {
    for (const line of room.narration) {
      printNarrative(line);
    }
    if (subtitleEl) subtitleEl.textContent = room.narration[0] || '';
  }

  // Director whisper taunt if distance is close
  if (lastDirectorData?.response?.taunts?.length && distance <= 6 && Math.random() > 0.4) {
    const taunt = lastDirectorData.response.taunts[0];
    printNarrative(`\nA cold whisper touches the back of your skull: "${taunt}"`, 'danger');
  }

  // Check if room challenge exists and unsolved
  if (room.challengeTemplate && !solvedRooms.has(roomId)) {
    startRoomChallenge(room.challengeTemplate, room.defaultChallengeId);
  } else {
    renderActionPills(room);
  }

  syncState();
  recalculateProfileAndTags();
  triggerDirectorLookahead();
}

// Start Room Minigame
function startRoomChallenge(template: string, defaultChallengeId?: string): void {
  let challengeToRun: ChallengeItem | null = null;

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

  if (!challengeToRun) {
    challengeToRun = FALLBACK_CHALLENGES.find((c) => c.id === defaultChallengeId) ||
      FALLBACK_CHALLENGES.find((c) => c.template === template) ||
      FALLBACK_CHALLENGES[0];
    addLearningFeed(`> Lookahead fallback: Delivered static ${template}`);
  }

  minigameArenaEl.classList.remove('hidden');
  actionPillsEl.innerHTML = `<span class="action-label">CHALLENGE ACTIVE: Resolve the puzzle below</span>`;

  const state: MinigameState = {
    template: challengeToRun.template,
    active: true,
    params: challengeToRun.params,
    inventory,
    containerEl: minigameArenaEl,
    onDistanceChange: (delta: number) => {
      updateDistance(distance + delta);
    },
    print: (txt: string, cls?: string) => {
      const line = document.createElement('div');
      if (cls) line.className = cls;
      line.textContent = txt;
      narrativeOutputEl.appendChild(line);
      narrativeOutputEl.scrollTop = narrativeOutputEl.scrollHeight;
      appendHistory(txt, cls);
    },
    onSuccess: () => {
      solvedRooms.add(currentRoomId);
      activeMinigame = null;
      setTimeout(() => {
        minigameArenaEl.innerHTML = '';
        minigameArenaEl.classList.add('hidden');
      }, 1200);
      printNarrative('\n>>> PATH UNSEALED. You can move forward now. <<<', 'bright');
      renderActionPills(STORY_ROOMS[currentRoomId]);
      syncState();
      triggerDirectorLookahead();
    },
    onMistake: (penalty: number, mistakeName: string) => {
      recordMistake(penalty, mistakeName);
    }
  };

  activeMinigame = new BandersnatchRunner(state);
  actionPillsEl.innerHTML = '';
  actionPillsEl.classList.add('hidden');
  activeMinigame.start();
}

// Death & Respawn
function triggerDeath(): void {
  deaths++;
  soundEngine.playSfx('monster_growl');
  setTimeout(() => soundEngine.playSfx('death_sting'), 300);
  soundEngine.playGlitchNoise();
  clearNarrative();
  const subtitleEl = document.getElementById('scene-subtitle');
  if (subtitleEl) subtitleEl.textContent = 'THE THING CAUGHT YOU IN THE DARK. Respawning...';

  printNarrative('========================================================', 'danger');
  printNarrative('THE THING CAUGHT YOU IN THE DARK.', 'danger');
  for (const l of DEATH_ART) appendHistory(l);
  printNarrative(`Respawning at checkpoint: [${STORY_ROOMS[checkpointRoomId].name}]...\n`);

  addLearningFeed(`> Death event #${deaths} registered.`);
  postTelemetry('death', { room: currentRoomId, deathsTotal: deaths });

  setTimeout(() => {
    distance = 7;
    updateDistance(distance);
    enterRoom(checkpointRoomId);
  }, 1400);
}

// Mirror Ending
async function triggerMirrorFinale(): Promise<void> {
  if (isEndingPlayed) return;
  isEndingPlayed = true;

  const subtitleEl = document.getElementById('scene-subtitle');
  const overlayEl = document.getElementById('image-overlay-reveal');
  const choicesContainerEl = document.getElementById('bandersnatch-choices');
  if (choicesContainerEl) choicesContainerEl.innerHTML = '';
  if (actionPillsEl) actionPillsEl.classList.add('hidden');

  clearNarrative();
  printNarrative('========================================================', 'bright');
  printNarrative('YOU APPROACH THE MIRROR VAULT GLASS...', 'bright');
  printNarrative('========================================================\n');

  // Stage 0: Calm human reflection in mirror
  doomRenderer.setMirrorMorphStage(0);
  if (subtitleEl) subtitleEl.textContent = 'You look into the antique glass. Your reflection stares back in silence.';
  soundEngine.playSfx('breath');
  soundEngine.playKeyClick();
  await new Promise((r) => setTimeout(r, 1400));

  // Stage 1: Corruption starts, horns sprout, zoom 1.35x
  doomRenderer.setMirrorMorphStage(1);
  soundEngine.playSfx('whisper');
  soundEngine.playGlitchNoise();
  if (subtitleEl) subtitleEl.textContent = 'The reflection twitches... horns begin rising from your skull.';
  await new Promise((r) => setTimeout(r, 1400));

  // Stage 2: Fangs & Glass fractures, zoom 1.8x
  doomRenderer.setMirrorMorphStage(2);
  soundEngine.playSfx('mirror_crack');
  soundEngine.playGlitchNoise();
  if (subtitleEl) subtitleEl.textContent = 'The glass cracks. The jaw splits open into snarling predator fangs.';
  await new Promise((r) => setTimeout(r, 1400));

  // Stage 3: Monster face fills mirror frame, zoom 2.3x
  doomRenderer.setMirrorMorphStage(3);
  soundEngine.playSfx('monster_growl');
  soundEngine.playGlitchNoise();
  if (subtitleEl) subtitleEl.textContent = 'The footsteps behind me were my own paws. I was never running from the thing.';
  await new Promise((r) => setTimeout(r, 1600));

  // Stage 4: Glass shatters! Beast face enlarges to fill entire screen!
  doomRenderer.setMirrorMorphStage(4);
  soundEngine.playSfx('death_sting');
  soundEngine.playGlitchNoise();
  await new Promise((r) => setTimeout(r, 800));

  // DISPLAY "IT WAS YOU ALL ALONG" DIRECTLY IN THE IMAGE AREA!
  if (subtitleEl) subtitleEl.textContent = '';
  if (overlayEl) {
    overlayEl.classList.remove('hidden');
  }

  printNarrative('I WAS NEVER RUNNING FROM THE MONSTER.', 'bright');
  printNarrative('I AM THE MONSTER.', 'danger');

  await new Promise((r) => setTimeout(r, 4000));
  displayEndingFile();
}

function displayEndingFile(): void {
  const profile = buildPlayerProfile();
  printNarrative('\n\n========================================================', 'bright');
  printNarrative('       THE FILE IT KEPT ON YOU [FINAL DOSSIER]          ', 'bright');
  printNarrative('========================================================');
  printNarrative(`  SESSION ID:           ${sessionId}`);
  printNarrative(`  ELAPSED TIME:         ${profile.totalPlayTimeMs / 1000}s`);
  printNarrative(`  TYPING SPEED:         ${profile.typingSpeedWpm} WPM`);
  printNarrative(`  AVG IDLE HESITATION:  ${profile.commandIdleTimeAvgMs}ms`);
  printNarrative(`  TOTAL DEATHS:         ${deaths}`);
  printNarrative(`  MISTAKES REGISTERED:  ${mistakes}`);
  printNarrative(`  ROOMS REVISITED:      ${roomsRevisited}`);
  printNarrative(`  ASSIGNED TAGS:        ${profile.tags.join(', ')}`);
  printNarrative('--------------------------------------------------------');
  printNarrative('  VERDICT: THE MACHINE REMEMBERS EVERYTHING YOU DID.');
  printNarrative('  THANK YOU FOR PLAYING WAKE.EXE.');
  printNarrative('========================================================\n');
}

// Command Handler
function handleCommand(raw: string): void {
  if (isEndingPlayed) {
    printNarrative('Session concluded. Reload to awaken again.');
    return;
  }

  const now = Date.now();
  const idleMs = now - lastCommandTimestamp;
  idleTimeSamples.push(idleMs);
  lastCommandTimestamp = now;

  appendHistory(`> ${raw}`);

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
        clearNarrative();
        for (const l of room.narration) printNarrative(l);
        renderActionPills(room);
      }
      break;

    case 'go': {
      const room = STORY_ROOMS[currentRoomId];
      const exit = room.exits.find((e) => e.direction === parsed.direction);
      if (!exit) {
        printNarrative(`You cannot go ${parsed.direction} from here.`);
        return;
      }
      if (exit.locked && !solvedRooms.has(currentRoomId)) {
        printNarrative(`Locked: ${exit.lockDescription || 'The way is barred.'}`, 'danger');
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
        printNarrative(`Taken: ${parsed.item}.`);
        renderActionPills(room);
      } else {
        printNarrative(`No "${parsed.item}" found to take.`);
      }
      break;
    }

    case 'use': {
      const it = parsed.item.toLowerCase();
      if (!inventory.has(it)) {
        printNarrative(`You do not carry any "${parsed.item}". Check your inventory.`, 'danger');
        break;
      }

      if (it === 'ethanol') {
        inventory.delete('ethanol');
        updateDistance(distance + 2);
        printNarrative('You drink the ethanol. The chemical fire numbs your racing pulse. Distance +2!', 'bright');
        renderActionPills(STORY_ROOMS[currentRoomId]);
      } else if (it === 'salt_shaker') {
        inventory.delete('salt_shaker');
        updateDistance(distance + 2);
        printNarrative('You pour a clean white line of coarse mineral salt across the threshold. A sharp hiss rises as unseen claws recoil from the ward! Distance +2!', 'bright');
        renderActionPills(STORY_ROOMS[currentRoomId]);
      } else if (it === 'chalk') {
        inventory.delete('chalk');
        updateDistance(distance + 2);
        printNarrative('You scrape the chalk across the floor, drawing an elder binding ward. The temperature drops as the sigil glows, halting the monster advance! Distance +2!', 'bright');
        renderActionPills(STORY_ROOMS[currentRoomId]);
      } else if (it === 'wrench') {
        if (currentRoomId === 'basement' || currentRoomId === 'stairwell') {
          updateDistance(distance + 3);
          printNarrative('You latch the wrench onto the relief valve and heave. A scalding blast of high-pressure steam engulfs the corridor behind you! Distance +3!', 'bright');
        } else {
          updateDistance(distance + 1);
          printNarrative('You rap the steel wrench hard against the floor pipes. The metallic ringing echoes violently, confusing the beast tracking your scent! Distance +1!', 'bright');
        }
      } else if (it === 'iron_key') {
        if (currentRoomId === 'basement') {
          inventory.delete('iron_key');
          updateDistance(distance + 3);
          printNarrative('You turn the iron key inside the furnace lock. With a heavy clunk, the iron hatch unlocks, revealing an emergency shelter vent! Distance +3!', 'bright');
          renderActionPills(STORY_ROOMS[currentRoomId]);
        } else {
          printNarrative('You inspect the heavy iron key. Its teeth match a heavy padlock in the lower basement.');
        }
      } else if (it === 'flashlight') {
        updateDistance(distance + 1);
        printNarrative('You sweep the high-intensity flashlight beam into the corners. The blinding beam forces a stalking silhouette back into the rafters! Distance +1. (Also grants +4s decision time in timed dilemmas!)', 'bright');
      } else if (it === 'journal_page') {
        printNarrative('You read the blood-spotted journal page: "The beast did not breach the house from outside. Look at the locks. Every deadbolt was turned from the inside. We are what we were running from."', 'bright');
      } else {
        printNarrative(`You examine "${it}", but see no immediate way to apply it here.`);
      }
      break;
    }

    case 'inventory':
      if (inventory.size === 0) {
        printNarrative('Your pockets are empty.');
      } else {
        printNarrative(`YOU CARRY: ${Array.from(inventory).join(', ')}`);
      }
      break;

    case 'map':
      printNarrative('\nARCHITECTURAL MAP:');
      printNarrative('  [BEDROOM] ---> [HALLWAY] ---> [KITCHEN] === [PANTRY]');
      printNarrative('                                   |');
      printNarrative('                             [STAIRWELL]');
      printNarrative('                                   |');
      printNarrative('                             [BASEMENT]');
      printNarrative('                                   |');
      printNarrative('                             [CORRIDOR]');
      printNarrative('                                   |');
      printNarrative('                             [MIRROR VAULT]');
      break;

    case 'help':
      printNarrative('COMMANDS:');
      printNarrative('  look / l           - Inspect surroundings');
      printNarrative('  go <dir> / n,s,e,w - Move through doors');
      printNarrative('  take <item>        - Collect item');
      printNarrative('  use <item>         - Consume or interact');
      printNarrative('  inventory / i      - Review your items');
      printNarrative('  map / m            - Display ASCII floorplan');
      printNarrative('  safe               - Toggle Safe Mode');
      printNarrative('  mute               - Toggle Sound Synthesizer');
      break;

    case 'safe':
      safeModeToggleEl.click();
      break;

    case 'mute':
      audioToggleEl.click();
      break;

    case 'action':
      if (parsed.verb === 'konami') {
        triggerKonamiJumpscare();
      } else if (parsed.verb === 'approach' && parsed.arg === 'mirror' && currentRoomId === 'mirror_room') {
        triggerMirrorFinale();
      } else {
        printNarrative(`Unknown action: "${raw}". Type "help" or click an available action above.`);
      }
      break;

    default:
      if (raw.toLowerCase() === 'konami') {
        triggerKonamiJumpscare();
        break;
      }
      printNarrative(`Unknown command: "${raw}". Type "help" for options.`);
  }
}

// 1-Bit Scanline Skull Renderer matching Reference Image
function drawKonamiSkull(canvas: HTMLCanvasElement, isMono: boolean): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);

  const fgColor = isMono ? '#ffffff' : '#33ff33';
  const dimColor = isMono ? '#888888' : '#1a771a';

  // 36x42 Matrix mapping the exact reference 1-bit scanline skull
  const skullRows = [
    "             XXXXXXXXXXXX             ",
    "           XXXXXXXXXXXXXXXX           ",
    "         XXXXXXXXXXXXXXXXXXXX         ",
    "        XXXXXXXXXXXXXXXXXXXXXX        ",
    "       XXXXXXXXXXXXXXXXXXXXXXXX       ",
    "      XXXXXXXXXXXXXXXXXXXXXXXXXX      ",
    "     XXXXXXXXXXXXXXXXXXXXXXXXXXXX     ",
    "    XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX    ",
    "    XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX    ",
    "   XXXXX      XXXXXXXXXX      XXXXX   ",
    "   XXXX        XXXXXXXX        XXXX   ",
    "  XXXX          XXXXXX          XXXX  ",
    "  XXXX     +    XXXXXX     +    XXXX  ",
    "  XXXX    +++   XXXXXX    +++   XXXX  ",
    "  XXXX     +    XXXXXX     +    XXXX  ",
    "  XXXX          XXXXXX          XXXX  ",
    "   XXXX        XXX  XXX        XXXX   ",
    "   XXXXX      XXXX  XXXX      XXXXX   ",
    "   XXXXXXXXXXXXXX    XXXXXXXXXXXXXX   ",
    "    XXXXXXXXXXXXX    XXXXXXXXXXXXX    ",
    "    XXXXXXXXXXXX      XXXXXXXXXXXX    ",
    "  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX  ",
    "  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX  ",
    "  XX X X X XXXXXXXXXXXXXXXX X X X XX  ",
    "  XX X X X XXXXXXXXXXXXXXXX X X X XX  ",
    "   X X X X                  X X X X   ",
    "         XXXXXXXXXXXXXXXXXXXX         ",
    "         XXXX              XXXX       ",
    "         XXXX  T  T  T  T  XXXX       ",
    "         XXXX  T  T  T  T  XXXX       ",
    "         XXXX  T  T  T  T  XXXX       ",
    "         XXXX  T  T  T  T  XXXX       ",
    "         XXXXXXXXXXXXXXXXXXXX         ",
    "          XXXXXXXXXXXXXXXXXX          ",
    "          XXXX   XXXXXX   XXXX        ",
    "           XXX   XXXXXX   XXX         ",
    "           XXX    XXXX    XXX         ",
    "            XX     XX     XX          ",
    "                   XX                 ",
    "                   XX                 ",
    "                    X                 "
  ];

  const scale = 5;
  const offX = Math.floor((w - 38 * scale) / 2);
  const offY = Math.floor((h - skullRows.length * scale) / 2);

  for (let r = 0; r < skullRows.length; r++) {
    const row = skullRows[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      const px = offX + c * scale;
      const py = offY + r * scale;

      if (ch === 'X') {
        // Authentic horizontal scanline / stipple
        ctx.fillStyle = (r % 2 === 0) ? fgColor : dimColor;
        ctx.fillRect(px, py, scale, scale);
      } else if (ch === '+') {
        // Pure stark star-cross glint
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px, py, scale, scale);
      } else if (ch === 'T') {
        // Vertical sharp white fangs
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px, py, scale, scale);
      }
    }
  }
}

// Konami Jumpscare
function triggerKonamiJumpscare(): void {
  if (konamiSkullCanvas) {
    drawKonamiSkull(konamiSkullCanvas, isMonochrome);
  }

  if (isSafeMode) {
    jumpscareTextEl.textContent = '[SAFE MODE: THE GHOST OBSERVES IN SILENCE]';
    if (jumpscareSubEl) {
      jumpscareSubEl.textContent = 'Cheat sequence registered. Secret memory unlocked.';
    }
    soundEngine.playKeyClick();
  } else {
    jumpscareTextEl.textContent = 'YOU CALLED UPON WHAT SHOULD HAVE SLEPT';
    if (jumpscareSubEl) {
      jumpscareSubEl.textContent = 'WHAT WATCHES YOU FROM THE MACHINE HAS YOUR FACE, YOUR TEETH, YOUR SINS.';
    }
    soundEngine.playSfx('monster_growl');
    soundEngine.playGlitchNoise();
  }

  jumpscareOverlayEl.classList.remove('hidden');

  const dismiss = () => {
    jumpscareOverlayEl.classList.add('hidden');
    window.removeEventListener('keydown', dismiss);
    jumpscareOverlayEl.removeEventListener('click', dismiss);
  };

  jumpscareOverlayEl.addEventListener('click', dismiss, { once: true });
  window.addEventListener('keydown', dismiss, { once: true });

  setTimeout(dismiss, isSafeMode ? 3500 : 4500);

  printNarrative('\n[SYSTEM: KONAMI SEQUENCE DETECTED. GHOST PROFILE UPDATED.]', 'danger');
  addLearningFeed('> Konami code breached memory limits.');
}

// Telemetry & State Persistence
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

// Navigation Tabs
tabChamberBtn.addEventListener('click', () => {
  tabChamberBtn.classList.add('active');
  tabLogsBtn.classList.remove('active');
  chamberViewEl.classList.remove('hidden');
  logsViewEl.classList.add('hidden');
  inputEl.focus();
});

tabLogsBtn.addEventListener('click', () => {
  tabLogsBtn.classList.add('active');
  tabChamberBtn.classList.remove('active');
  logsViewEl.classList.remove('hidden');
  chamberViewEl.classList.add('hidden');
});

// Boot & Init
async function boot(): Promise<void> {
  for (const l of TITLE_ART) appendHistory(l);
  appendHistory('\n[SYSTEM INITIALIZED] Connecting to Ghost in the Machine...');

  const startReq = performance.now();
  try {
    const res = await fetch('/health');
    const latency = Math.round(performance.now() - startReq);
    ghostLatencyEl.textContent = `${latency}ms`;
    const health = (await res.json()) as HealthData;
    ghostProviderEl.textContent = health.provider.toUpperCase();
    ghostModelEl.textContent = health.model;
    ghostStatusBadgeEl.textContent = health.providerConnected ? 'GHOST: ONLINE' : 'GHOST: FALLBACK';
  } catch (err) {
    ghostLatencyEl.textContent = '0ms';
    ghostProviderEl.textContent = 'NONE';
    ghostStatusBadgeEl.textContent = 'GHOST: STANDALONE';
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
    inputEl.value = '';
    handleCommand(val);
  }
});

themeToggleEl.addEventListener('click', () => {
  isMonochrome = !isMonochrome;
  document.body.classList.toggle('monochrome', isMonochrome);
  themeToggleEl.textContent = isMonochrome ? '[COLOR: MONO]' : '[COLOR: GREEN]';
  doomRenderer.setMonochrome(isMonochrome);
});

safeModeToggleEl.addEventListener('click', () => {
  isSafeMode = !isSafeMode;
  document.body.classList.toggle('safe-mode', isSafeMode);
  soundEngine.setSafeMode(isSafeMode);
  safeModeToggleEl.textContent = isSafeMode ? '[SAFE: ON]' : '[SAFE: OFF]';
  printNarrative(`Safe Mode is now ${isSafeMode ? 'ON (Suppressing flashes & jumpscares)' : 'OFF'}.`);
});

audioToggleEl.addEventListener('click', (e) => {
  e.stopPropagation();
  soundEngine.initOnGesture();
  isAudioMuted = soundEngine.toggleMute();
  audioToggleEl.textContent = isAudioMuted ? '[AUDIO: OFF]' : '[AUDIO: ON]';
});

// Auto-unlock Web Audio on first user interaction anywhere
const unlockAudioOnGesture = () => {
  if (!isAudioMuted) {
    soundEngine.initOnGesture();
  }
};
window.addEventListener('click', unlockAudioOnGesture, { passive: true });
window.addEventListener('keydown', unlockAudioOnGesture, { passive: true });
window.addEventListener('pointerdown', unlockAudioOnGesture, { passive: true });

window.addEventListener('keydown', (e) => {
  if (e.key === '`' || e.key === '~') {
    e.preventDefault();
    isDebugOpen = !isDebugOpen;
    debugModalEl.classList.toggle('hidden', !isDebugOpen);
    return;
  }

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

boot();
