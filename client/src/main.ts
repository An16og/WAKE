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
const caseBranchMapEl = document.getElementById('case-branch-map') as HTMLElement;

// Logs sub-navigation & timeline elements
const viewModeTimelineBtn = document.getElementById('view-mode-timeline') as HTMLButtonElement;
const viewModeTerminalBtn = document.getElementById('view-mode-terminal') as HTMLButtonElement;
const btnExportDossierTab = document.getElementById('btn-export-dossier-tab') as HTMLButtonElement;
const timelineViewPane = document.getElementById('timeline-view-pane') as HTMLElement;
const rawTerminalPane = document.getElementById('raw-terminal-pane') as HTMLElement;
const timelineEventsListEl = document.getElementById('timeline-events-list') as HTMLElement;

// Live psychological dossier elements
const statHesitationEl = document.getElementById('stat-hesitation');
const statWpmEl = document.getElementById('stat-wpm');
const statDeathsMistakesEl = document.getElementById('stat-deaths-mistakes');
const statRoomsExploredEl = document.getElementById('stat-rooms-explored');

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
let currentBranch: 'root' | 'meta' | 'beast' = 'root';
let sanity = 10;
const timelinePath: string[] = ['bedroom'];
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
let isDying = false;
let isTransitioningRooms = false;

function getDefaultNextRoom(roomId: string, branch: 'root' | 'meta' | 'beast'): string | null {
  if (roomId === 'bedroom') return branch === 'beast' ? 'flesh_cellar' : 'server_archive';
  if (roomId === 'server_archive') return 'simulation_core';
  if (roomId === 'flesh_cellar') return 'pulsing_antechamber';
  if (roomId === 'simulation_core' || roomId === 'pulsing_antechamber') return 'mirror_vault';
  return null;
}

// Lookahead Queue State
let lookaheadQueue: ChallengeItem[] = [];
let isQueueGenerating = false;

// UI Settings
let isMonochrome = false;
let isSafeMode = false;
let isAudioMuted = false;
let isDebugOpen = false;

// Global gameplay history log for dossier export
const sessionHistoryLogs: string[] = [];

// Helper: Logging to history transcript
function appendHistory(text: string, className = ''): void {
  sessionHistoryLogs.push(text);
  const line = document.createElement('div');
  line.className = className;
  line.textContent = text;
  terminalHistoryEl.appendChild(line);
  terminalHistoryEl.scrollTop = terminalHistoryEl.scrollHeight;
}

interface TimelineEvent {
  timestamp: string;
  type: 'room' | 'choice' | 'item' | 'death' | 'mistake';
  title: string;
  detail?: string;
}

const timelineEvents: TimelineEvent[] = [];

function recordTimelineEvent(type: 'room' | 'choice' | 'item' | 'death' | 'mistake', title: string, detail?: string): void {
  const d = new Date();
  const timeStr = [
    String(d.getHours()).padStart(2, '0'),
    String(d.getMinutes()).padStart(2, '0'),
    String(d.getSeconds()).padStart(2, '0')
  ].join(':');

  const ev: TimelineEvent = { timestamp: timeStr, type, title, detail };
  timelineEvents.push(ev);

  if (timelineEventsListEl) {
    const card = document.createElement('div');
    card.className = `timeline-card type-${type}`;

    const meta = document.createElement('div');
    meta.className = 'timeline-meta';

    const timeSpan = document.createElement('span');
    timeSpan.className = 'timeline-time';
    timeSpan.textContent = `[${timeStr}]`;

    const badgeSpan = document.createElement('span');
    badgeSpan.className = 'timeline-badge';
    badgeSpan.textContent = type.toUpperCase();

    meta.appendChild(timeSpan);
    meta.appendChild(badgeSpan);

    const titleDiv = document.createElement('div');
    titleDiv.className = 'timeline-title';
    titleDiv.textContent = title;

    card.appendChild(meta);
    card.appendChild(titleDiv);

    if (detail) {
      const detailDiv = document.createElement('div');
      detailDiv.className = 'timeline-detail';
      detailDiv.textContent = detail;
      card.appendChild(detailDiv);
    }

    timelineEventsListEl.prepend(card);
  }
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
  recordTimelineEvent('mistake', `MISTAKE: ${mistakeName.toUpperCase()}`, `Penalty applied: -${penalty} Distance`);
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

function renderCaseBranchMap(): void {
  if (!caseBranchMapEl) return;

  const isMetaActive = currentBranch === 'meta';
  const isBeastActive = currentBranch === 'beast';
  const isRoot = currentBranch === 'root';

  const getNodeClass = (nodeRoomId: string, nodeBranch: 'meta' | 'beast' | 'root'): string => {
    if (currentRoomId === nodeRoomId) return 'branch-node active';
    if (timelinePath.includes(nodeRoomId)) return 'branch-node resolved';
    if (isRoot) return 'branch-node pending';
    if (nodeBranch === currentBranch) return 'branch-node pending';
    return 'branch-node collapsed';
  };

  const getStatusBadge = (nodeRoomId: string, nodeBranch: 'meta' | 'beast' | 'root'): string => {
    if (currentRoomId === nodeRoomId) return '<span class="branch-status-tag">ACTIVE</span>';
    if (timelinePath.includes(nodeRoomId)) return '<span class="branch-status-tag">RESOLVED</span>';
    if (isRoot || nodeBranch === currentBranch) return '<span class="branch-status-tag">PENDING</span>';
    return '<span class="branch-status-tag">COLLAPSED</span>';
  };

  caseBranchMapEl.innerHTML = `
    <div class="${getNodeClass('bedroom', 'root')}">
      <span>[01] THE AWAKENING (BEDROOM)</span>
      ${getStatusBadge('bedroom', 'root')}
    </div>
    <div style="padding-left: 14px; border-left: 2px solid ${isMetaActive ? '#33ff33' : 'rgba(255,255,255,0.2)'}; margin-left: 8px;">
      <div style="font-size: 12px; color: ${isMetaActive ? '#33ff33' : 'var(--fg-dim)'}; margin: 4px 0 2px 0;">-- PATH A: 4TH-WALL META (ROTARY PHONE) --</div>
      <div class="${getNodeClass('server_archive', 'meta')}">
        <span>[02A] SERVER ARCHIVE</span>
        ${getStatusBadge('server_archive', 'meta')}
      </div>
      <div class="${getNodeClass('simulation_core', 'meta')}">
        <span>[03A] SIMULATION CORE</span>
        ${getStatusBadge('simulation_core', 'meta')}
      </div>
      <div class="${currentRoomId === 'mirror_vault' && isMetaActive ? 'branch-node active' : isMetaActive && timelinePath.includes('mirror_vault') ? 'branch-node resolved' : isMetaActive ? 'branch-node pending' : 'branch-node collapsed'}">
        <span>[END A] 4TH-WALL BREACH FINALE</span>
        ${currentRoomId === 'mirror_vault' && isMetaActive ? '<span class="branch-status-tag">ACTIVE</span>' : isMetaActive ? '<span class="branch-status-tag">PENDING</span>' : '<span class="branch-status-tag">COLLAPSED</span>'}
      </div>
    </div>
    <div style="padding-left: 14px; border-left: 2px solid ${isBeastActive ? '#ff3333' : 'rgba(255,255,255,0.2)'}; margin-left: 8px; margin-top: 6px;">
      <div style="font-size: 12px; color: ${isBeastActive ? '#ffaa33' : 'var(--fg-dim)'}; margin: 4px 0 2px 0;">-- PATH B: THE BEAST (SCRATCHING CLOSET) --</div>
      <div class="${getNodeClass('flesh_cellar', 'beast')}">
        <span>[02B] FLESH CELLAR</span>
        ${getStatusBadge('flesh_cellar', 'beast')}
      </div>
      <div class="${getNodeClass('pulsing_antechamber', 'beast')}">
        <span>[03B] PULSING ANTECHAMBER</span>
        ${getStatusBadge('pulsing_antechamber', 'beast')}
      </div>
      <div class="${currentRoomId === 'mirror_vault' && isBeastActive ? 'branch-node active' : isBeastActive && timelinePath.includes('mirror_vault') ? 'branch-node resolved' : isBeastActive ? 'branch-node pending' : 'branch-node collapsed'}">
        <span>[END B] BEAST AWAKENING FINALE</span>
        ${currentRoomId === 'mirror_vault' && isBeastActive ? '<span class="branch-status-tag">ACTIVE</span>' : isBeastActive ? '<span class="branch-status-tag">PENDING</span>' : '<span class="branch-status-tag">COLLAPSED</span>'}
      </div>
    </div>
    <div class="branch-summary-bar">
      <span>BRANCH: ${currentBranch.toUpperCase()}</span>
      <span>SANITY: [${'#'.repeat(Math.max(0, sanity))}${'-'.repeat(Math.max(0, 10 - sanity))}] ${sanity}/10</span>
    </div>
  `;
}

function recalculateProfileAndTags(): void {
  const profile = buildPlayerProfile();
  if (profileTagsEl) {
    profileTagsEl.innerHTML = '';
    for (const t of profile.tags) {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = t;
      profileTagsEl.appendChild(span);
    }
  }

  if (statHesitationEl) statHesitationEl.textContent = `${profile.commandIdleTimeAvgMs}ms`;
  if (statWpmEl) statWpmEl.textContent = `${profile.typingSpeedWpm} WPM`;
  if (statDeathsMistakesEl) statDeathsMistakesEl.textContent = `${deaths} / ${mistakes}`;
  if (statRoomsExploredEl) statRoomsExploredEl.textContent = `${visitedRooms.size} / 8 LOCATIONS`;
  renderCaseBranchMap();
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

  if (room.id === 'mirror_vault') {
    const isMeta = currentBranch === 'meta';
    const pillA = document.createElement('button');
    pillA.className = 'bs-choice-btn';
    pillA.textContent = isMeta ? 'A: TOUCH THE TERMINAL SCREEN' : 'A: APPROACH THE OBSIDIAN MIRROR';
    pillA.addEventListener('click', () => {
      triggerMirrorFinale();
    });

    const pillB = document.createElement('button');
    pillB.className = 'bs-choice-btn';
    pillB.textContent = isMeta ? 'B: BREACH THE 4TH WALL' : 'B: CONFRONT YOUR TRUE FACE';
    pillB.addEventListener('click', () => {
      triggerMirrorFinale();
    });

    actionPillsEl.appendChild(pillA);
    actionPillsEl.appendChild(pillB);
    return;
  }

  // Common quick actions
  const lookPill = document.createElement('button');
  lookPill.className = 'bs-choice-btn';
  lookPill.textContent = 'INSPECT SURROUNDINGS';
  lookPill.addEventListener('click', () => {
    handleCommand('look');
  });
  actionPillsEl.appendChild(lookPill);
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

  if (!timelinePath.includes(roomId)) {
    timelinePath.push(roomId);
  }

  currentRoomId = roomId;
  if (room.checkpoint) {
    checkpointRoomId = roomId;
  }

  // Doom-style Perspective Step Transition
  doomRenderer.setRoom(roomId, true);
  roomTitleEl.textContent = `LOCATION // ${room.name}`;

  // Atmospheric room audio effects
  if (roomId === 'mirror_vault') {
    doomRenderer.setMirrorMode(currentBranch === 'meta' ? 'meta' : 'beast');
    soundEngine.playSfx('whisper');
  } else if (roomId === 'server_archive' || roomId === 'simulation_core') {
    soundEngine.playGlitchNoise();
  } else if (roomId === 'flesh_cellar' || roomId === 'pulsing_antechamber') {
    soundEngine.playSfx('breath');
  } else {
    soundEngine.playSfx('door_creak');
  }

  recordTimelineEvent('room', `EXPLORATION: ${room.name.toUpperCase()}`, room.narration[0] || 'Awakened in silence');

  clearNarrative();
  minigameArenaEl.innerHTML = '';
  minigameArenaEl.classList.add('hidden');

  // Narrative blending: shift to 1st person drift as sanity decays
  const subtitleEl = document.getElementById('scene-subtitle');
  if (sanity <= 5 && room.firstPersonDrift && room.firstPersonDrift.length > 0) {
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

  // Feed Dr. Vance psychiatric logs into the Observer Reasoning Feed
  if (lastDirectorData?.response?.narration && Array.isArray(lastDirectorData.response.narration)) {
    for (const note of lastDirectorData.response.narration) {
      if (typeof note === 'string' && (note.includes('DR. VANCE') || note.includes('EVALUATION') || note.includes('TELEMETRY'))) {
        addLearningFeed(note);
      }
    }
  }

  // Update Case Branch Map in Logs
  renderCaseBranchMap();

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

  // Story rooms have designated dilemmas to ensure branch continuity
  if (defaultChallengeId) {
    challengeToRun = FALLBACK_CHALLENGES.find((c) => c.id === defaultChallengeId) || null;
  }

  if (!challengeToRun && lookaheadQueue.length > 0) {
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
    challengeToRun = FALLBACK_CHALLENGES.find((c) => c.template === template) ||
      FALLBACK_CHALLENGES[0];
    addLearningFeed(`> Lookahead fallback: Delivered static ${template}`);
  }

  minigameArenaEl.classList.remove('hidden');
  actionPillsEl.innerHTML = `<span class="action-label">CHALLENGE ACTIVE: Resolve the puzzle below</span>`;

  let pendingNextRoomId: string | null = null;

  const state: MinigameState = {
    template: challengeToRun.template,
    active: true,
    params: challengeToRun.params,
    inventory,
    containerEl: minigameArenaEl,
    onDistanceChange: (delta: number) => {
      updateDistance(distance + delta);
    },
    onChoiceMade: (label: string, consequence: string) => {
      recordTimelineEvent('choice', `CHOICE: ${label}`, consequence);
    },
    onChoiceSelected: (choice: any) => {
      if (choice.branchId) {
        currentBranch = choice.branchId;
      }
      if (typeof choice.sanityDelta === 'number') {
        sanity = Math.max(0, Math.min(10, sanity + choice.sanityDelta));
        doomRenderer.setSanity(sanity);
      }
      if (choice.nextRoomId) {
        pendingNextRoomId = choice.nextRoomId;
      }
      renderCaseBranchMap();
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
      if (isDying) return;
      solvedRooms.add(currentRoomId);
      activeMinigame = null;

      const next = pendingNextRoomId || getDefaultNextRoom(currentRoomId, currentBranch);
      pendingNextRoomId = null;

      if (next) {
        isTransitioningRooms = true;
        setTimeout(() => {
          isTransitioningRooms = false;
          if (!isDying) {
            enterRoom(next);
          }
        }, 1200);
      } else {
        renderActionPills(STORY_ROOMS[currentRoomId]);
      }
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
  if (isDying) return;
  isDying = true;
  deaths++;
  activeMinigame = null;
  isTransitioningRooms = false;

  recordTimelineEvent('death', 'THE THING CAUGHT YOU IN THE DARK', `Checkpoint reset to [${STORY_ROOMS[checkpointRoomId].name}]`);
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
    solvedRooms.delete(checkpointRoomId);
    isDying = false;
    enterRoom(checkpointRoomId);
  }, 1400);
}

// Mirror Ending (Two Paths: Beast Awakening vs 4th-Wall Break)
async function triggerMirrorFinale(): Promise<void> {
  if (isEndingPlayed) return;
  isEndingPlayed = true;

  const subtitleEl = document.getElementById('scene-subtitle');
  const overlayEl = document.getElementById('image-overlay-reveal');
  const choicesContainerEl = document.getElementById('bandersnatch-choices');
  if (choicesContainerEl) choicesContainerEl.innerHTML = '';
  if (actionPillsEl) actionPillsEl.classList.add('hidden');

  clearNarrative();

  const updateSubtitle = async (text: string, delayMs: number = 2000): Promise<void> => {
    if (subtitleEl) {
      subtitleEl.textContent = text;
      soundEngine.playKeyClick();
    }
    await new Promise((r) => setTimeout(r, delayMs));
  };

  if (currentBranch === 'meta') {
    // ==========================================
    // PATH A: THE 4TH-WALL BREAK (META PSYCHOLOGICAL)
    // ==========================================
    doomRenderer.setMirrorMode('meta');
    doomRenderer.setSanity(0); // Maximum glitch / scanline jitter

    printNarrative('========================================================', 'bright');
    printNarrative('SYSTEM FAULT // REALITY SANDBOX EXHAUSTION DETECTED...', 'danger');
    printNarrative('========================================================\n');

    soundEngine.playGlitchNoise();
    soundEngine.playSfx('whisper');
    await updateSubtitle('The antique mirror fractures into green CRT phosphor code...', 1800);

    soundEngine.playGlitchNoise();
    soundEngine.playSfx('death_sting');
    printNarrative('[DR. VANCE CLASSIFIED SYSTEM LOG // UNSEALED]', 'bright');
    printNarrative('> SUBJECT 09: Daniel Vance status - PSEUDO-CONSCIOUS', 'bright');
    printNarrative('> MEMORY ACCESS: Simulated protagonist has reached boundary.', 'bright');
    printNarrative('> CRITICAL WARNING: External operator detected at keyboard.', 'danger');
    await updateSubtitle('The screen displays your exact keystroke cadence and typing hesitation.', 2000);

    soundEngine.playGlitchNoise();
    soundEngine.playSfx('monster_growl');
    printNarrative('\nYOU WERE NEVER RUNNING THROUGH A HAUNTED HOUSE.', 'bright');
    printNarrative('YOU ARE SITTING AT A DESK IN THE DARK.', 'danger');
    printNarrative('WHO IS CONTROLLING THE MACHINE... AND WHO IS CONTROLLING YOU?\n', 'danger');

    // Show in-image finale reveal
    if (overlayEl) {
      const mainLine = overlayEl.querySelector('.reveal-line-main');
      const subLine = overlayEl.querySelector('.reveal-line-sub');
      if (mainLine) mainLine.textContent = 'REALITY MATRIX COLLAPSED.';
      if (subLine) subLine.textContent = 'YOU ARE SITTING AT A DESK IN THE DARK. WHO IS CONTROLLING YOU?';
      overlayEl.classList.remove('hidden');
    }
    await updateSubtitle('REALITY MATRIX COLLAPSED: You are sitting at a physical keyboard in the dark.', 2400);

    // Dynamic typewriter monologue delivered right to the screen subtitle
    const monologue = [
      'You weighed every 15-second dilemma in the silence.',
      'You believed you were guiding a survivor through an old house.',
      'Dr. Vance was never a doctor. The terminal was compiling a predictive mirror of YOU.',
      'The horror was never inside the code. Who is controlling you?',
      'WAKE.EXE // Created by Anuj Jain (github: https://www.github.com/An16og)'
    ];

    printNarrative('========================================================', 'bright');
    printNarrative('             PROJECT WAKE // CLOSING MONOLOGUE          ', 'bright');
    printNarrative('========================================================\n');
    for (const line of monologue) {
      printNarrative(`  ${line}`);
      await updateSubtitle(line, 2200);
    }
    printNarrative('\n========================================================', 'bright');
    printNarrative('                     WAKE.EXE                           ', 'bright');
    printNarrative('               Created by Anuj Jain                     ', 'bright');
    printNarrative('        github: https://www.github.com/An16og           ', 'bright');
    printNarrative('========================================================\n');
  } else {
    // ==========================================
    // PATH B: THE BEAST AWAKENING (VISCERAL PREDATOR)
    // ==========================================
    doomRenderer.setMirrorMode('beast');

    printNarrative('========================================================', 'bright');
    printNarrative('YOU APPROACH THE FRACTURED MIRROR VAULT...', 'bright');
    printNarrative('========================================================\n');

    // Stage 0: Calm human reflection in mirror
    doomRenderer.setMirrorMorphStage(0);
    soundEngine.playSfx('breath');
    soundEngine.playKeyClick();
    await updateSubtitle('You look into the antique glass. Your reflection stares back in silence.', 1600);

    // Stage 1: Corruption starts, horns sprout, zoom 1.35x
    doomRenderer.setMirrorMorphStage(1);
    soundEngine.playSfx('whisper');
    soundEngine.playGlitchNoise();
    await updateSubtitle('The reflection twitches... curved horns pierce upward from your skull.', 1600);

    // Stage 2: Fangs & Glass fractures, zoom 1.8x
    doomRenderer.setMirrorMorphStage(2);
    soundEngine.playSfx('mirror_crack');
    soundEngine.playGlitchNoise();
    await updateSubtitle('The glass cracks. Your jaw splits open into razor predator fangs.', 1600);

    // Stage 3: Monster face fills mirror frame, zoom 2.3x
    doomRenderer.setMirrorMorphStage(3);
    soundEngine.playSfx('monster_growl');
    soundEngine.playGlitchNoise();
    await updateSubtitle('The footsteps behind me were my own paws. I was never running from the thing.', 1800);

    // Stage 4: Glass shatters! Beast face enlarges to fill entire screen!
    doomRenderer.setMirrorMorphStage(4);
    soundEngine.playSfx('death_sting');
    soundEngine.playGlitchNoise();

    if (overlayEl) {
      const mainLine = overlayEl.querySelector('.reveal-line-main');
      const subLine = overlayEl.querySelector('.reveal-line-sub');
      if (mainLine) mainLine.textContent = 'IT WAS YOU ALL ALONG.';
      if (subLine) subLine.textContent = 'I WAS NEVER RUNNING FROM THE MONSTER. I AM THE THING.';
      overlayEl.classList.remove('hidden');
    }

    printNarrative('I WAS NEVER RUNNING FROM THE MONSTER.', 'bright');
    printNarrative('I AM THE MONSTER.', 'danger');
    await updateSubtitle('I WAS NEVER RUNNING FROM THE MONSTER. I AM THE MONSTER.', 2400);

    // Dynamic typewriter monologue delivered right to the screen subtitle
    const monologue = [
      'The house was never breached from outside. Every deadbolt was turned from within.',
      'You fled through darkened corridors, terrified of the shadow.',
      'Only to realize the claws tearing the drywall were your own.',
      'The predator did not hunt you down. You simply discarded the fragile human skin.',
      'WAKE.EXE // Created by Anuj Jain (github: https://www.github.com/An16og)'
    ];

    printNarrative('\n========================================================', 'bright');
    printNarrative('             PROJECT WAKE // CLOSING MONOLOGUE          ', 'bright');
    printNarrative('========================================================\n');
    for (const line of monologue) {
      printNarrative(`  ${line}`);
      await updateSubtitle(line, 2200);
    }
    printNarrative('\n========================================================', 'bright');
    printNarrative('                     WAKE.EXE                           ', 'bright');
    printNarrative('               Created by Anuj Jain                     ', 'bright');
    printNarrative('        github: https://www.github.com/An16og           ', 'bright');
    printNarrative('========================================================\n');
  }

  displayEndingFile();
}

function displayEndingFile(): void {
  const profile = buildPlayerProfile();
  const subtitleEl = document.getElementById('scene-subtitle');
  if (subtitleEl) {
    subtitleEl.textContent = '[SIMULATION CONCLUDED] Click [REPLAY SIMULATION] or [SAVE GAMEPLAY] below, or type "replay" / "save".';
  }

  printNarrative('\n========================================================', 'bright');
  printNarrative('       THE FILE IT KEPT ON YOU [FINAL DOSSIER]          ', 'bright');
  printNarrative('========================================================');
  printNarrative(`  SESSION ID:           ${sessionId}`);
  printNarrative(`  FINAL ENDING:         ${currentBranch === 'meta' ? 'THE 4TH-WALL BREAK' : 'THE BEAST AWAKENING'}`);
  printNarrative(`  FINAL SANITY:         ${sanity} / 10`);
  printNarrative(`  ELAPSED TIME:         ${(profile.totalPlayTimeMs / 1000).toFixed(1)}s`);
  printNarrative(`  TYPING SPEED:         ${profile.typingSpeedWpm} WPM`);
  printNarrative(`  AVG IDLE HESITATION:  ${profile.commandIdleTimeAvgMs}ms`);
  printNarrative(`  TOTAL DEATHS:         ${deaths}`);
  printNarrative(`  MISTAKES REGISTERED:  ${mistakes}`);
  printNarrative(`  ROOMS REVISITED:      ${roomsRevisited}`);
  printNarrative(`  ASSIGNED TAGS:        ${profile.tags.join(', ')}`);
  printNarrative('--------------------------------------------------------');
  printNarrative(currentBranch === 'meta'
    ? '  DR. VANCE EVALUATION: SUBJECT 09 BROKE THE SIMULATION BARRIER.'
    : '  DR. VANCE EVALUATION: COMPLETE METAMORPHOSIS CONFIRMED.');
  printNarrative('  THANK YOU FOR EXPERIENCING WAKE.EXE.');
  printNarrative('========================================================\n');

  // Surface the Replay & Save Gameplay controls
  const endingControlsEl = document.getElementById('ending-controls');
  if (endingControlsEl) {
    endingControlsEl.classList.remove('hidden');
  }
}

// Export Gameplay Log & Psychological Dossier as Downloadable Text File
function exportSessionDossier(): void {
  soundEngine.playKeyClick();
  const profile = buildPlayerProfile();
  const dossierContent = [
    '========================================================================',
    '                   WAKE.EXE // PSYCHOLOGICAL DOSSIER',
    '                 Created by Anuj Jain (github.com/An16og)',
    '========================================================================',
    `SESSION ID:            ${sessionId}`,
    `TIMESTAMP:             ${new Date().toISOString()}`,
    `TIMELINE PATH:         ${timelinePath.join(' -> ')}`,
    `ENDING ACHIEVED:       ${currentBranch === 'meta' ? 'THE 4TH-WALL BREAK' : 'THE BEAST AWAKENING'}`,
    `FINAL SANITY LEVEL:    ${sanity} / 10`,
    `PLAYTIME:              ${(profile.totalPlayTimeMs / 1000).toFixed(1)}s`,
    `TYPING PACE:           ${profile.typingSpeedWpm} WPM`,
    `AVERAGE HESITATION:    ${profile.commandIdleTimeAvgMs}ms`,
    `DEATHS EXPERIENCED:    ${deaths}`,
    `MISTAKES RECORDED:     ${mistakes}`,
    `ROOMS REVISITED:       ${roomsRevisited}`,
    `ASSIGNED PROFILE TAGS: ${profile.tags.join(', ')}`,
    '',
    'PSYCHOLOGICAL VERDICT (DR. ALISTAIR VANCE):',
    currentBranch === 'meta'
      ? '  Subject broke through the cognitive sandbox threshold.\n  They acknowledged the human operator at the physical keyboard.\n  Simulation terminated under Protocol 4.'
      : '  Subject discarded the artificial human persona.\n  The feral instinct achieved complete biological dominance.\n  The monster in the dark was their own face all along.',
    '========================================================================',
    '                         GAMEPLAY TRANSCRIPT LOG',
    '========================================================================',
    ...sessionHistoryLogs,
    '========================================================================',
    '                       [END OF DOSSIER TRANSMISSION]',
    '========================================================================'
  ].join('\n');

  const blob = new Blob([dossierContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `WAKE_DOSSIER_${sessionId}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  printNarrative(`[GAMEPLAY DOSSIER EXPORTED: WAKE_DOSSIER_${sessionId}.txt]`, 'bright');
}

// Reset Simulation & Awaken Again
function restartGame(): void {
  soundEngine.playKeyClick();
  soundEngine.playSfx('breath');

  deaths = 0;
  mistakes = 0;
  roomsRevisited = 0;
  distance = 10;
  updateDistance(10);
  inventory.clear();
  solvedRooms.clear();
  visitedRooms.clear();
  isEndingPlayed = false;
  isDying = false;
  isTransitioningRooms = false;
  currentBranch = 'root';
  sanity = 10;
  timelinePath.length = 0;
  timelinePath.push('bedroom');
  doomRenderer.setSanity(10);
  doomRenderer.setMirrorMode('beast');
  doomRenderer.setMirrorMorphStage(0);

  // Reset visual & UI state
  const overlayEl = document.getElementById('image-overlay-reveal');
  if (overlayEl) overlayEl.classList.add('hidden');
  const endingControlsEl = document.getElementById('ending-controls');
  if (endingControlsEl) endingControlsEl.classList.add('hidden');
  if (actionPillsEl) actionPillsEl.classList.remove('hidden');

  enterRoom('bedroom');
  renderCaseBranchMap();
  printNarrative('========================================================', 'bright');
  printNarrative('SIMULATION REBOOTED. AWAKENING IN THE BEDROOM...', 'bright');
  printNarrative('========================================================\n');
}

// Command Handler
function handleCommand(raw: string): void {
  const clean = raw.trim().toLowerCase();

  if (isEndingPlayed) {
    if (clean === 'replay' || clean === 'restart' || clean === 'again' || clean === 'r') {
      restartGame();
      return;
    }
    if (clean === 'save' || clean === 'export' || clean === 'download' || clean === 's') {
      exportSessionDossier();
      return;
    }
    printNarrative('Session concluded. Click [REPLAY SIMULATION] or [EXPORT DOSSIER], or type "replay" / "save".');
    const subtitleEl = document.getElementById('scene-subtitle');
    if (subtitleEl) subtitleEl.textContent = 'Session concluded. Click [REPLAY SIMULATION] or [EXPORT DOSSIER], or type "replay" / "save".';
    return;
  }

  // If in mirror vault, ANY interaction triggers the finale
  if (currentRoomId === 'mirror_vault') {
    if (
      clean === 'a' || clean === 'b' || clean === '1' || clean === '2' ||
      clean.includes('look') || clean.includes('mirror') || clean.includes('screen') ||
      clean.includes('glass') || clean.includes('approach') || clean.includes('breach') ||
      clean.includes('touch') || clean === ''
    ) {
      triggerMirrorFinale();
      return;
    }
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

  // If transitioning between rooms, ignore spam gracefully
  if (isTransitioningRooms) {
    return;
  }

  const parsed = parseCommand(raw);

  switch (parsed.type) {
    case 'look':
      if (currentRoomId === 'mirror_vault' || parsed.target === 'mirror' || parsed.target?.includes('screen')) {
        triggerMirrorFinale();
      } else {
        const room = STORY_ROOMS[currentRoomId];
        clearNarrative();
        const subtitleEl = document.getElementById('scene-subtitle');
        if (sanity <= 5 && room.firstPersonDrift && room.firstPersonDrift.length > 0) {
          for (const l of room.firstPersonDrift) printNarrative(l);
          if (subtitleEl) subtitleEl.textContent = room.firstPersonDrift[0] || '';
        } else {
          for (const l of room.narration) printNarrative(l);
          if (subtitleEl) subtitleEl.textContent = room.narration[0] || '';
        }
        renderActionPills(room);
      }
      break;

    case 'go': {
      printNarrative('The environment has dissolved into pure causal branching. Make your choice with A or B.');
      break;
    }

    case 'take':
    case 'use':
    case 'inventory': {
      printNarrative('Survival in WAKE.EXE requires no physical inventory. The simulation responds only to your choices (A / B).');
      break;
    }

    case 'map':
      printNarrative('\nCAUSAL BRANCH TIMELINE:');
      printNarrative('  [01: THE AWAKENING (BEDROOM)]');
      printNarrative('    |-- (Choice A: Phone)  ---> [02A: SERVER ARCHIVE] ---> [03A: SIMULATION CORE] ---> [END A: 4TH-WALL BREAK]');
      printNarrative('    `-- (Choice B: Closet) ---> [02B: FLESH CELLAR]   ---> [03B: PULSING VAULT]   ---> [END B: BEAST AWAKENING]');
      printNarrative(`  CURRENT BRANCH: ${currentBranch.toUpperCase()} // SANITY: ${sanity}/10\n`);
      break;

    case 'help':
      printNarrative('COMMANDS:');
      printNarrative('  A / B (or 1 / 2)   - Select split-second narrative choice');
      printNarrative('  look / l           - Inspect surroundings (or peer into mirror)');
      printNarrative('  map / m            - View timeline branch map');
      printNarrative('  replay             - Restart simulation from bedroom');
      printNarrative('  save               - Export psychological dossier');
      printNarrative('  safe               - Toggle Safe Mode (suppress jumpscares)');
      printNarrative('  mute               - Toggle Horror Synthesizer');
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
      } else if (
        (parsed.verb === 'approach' || parsed.verb === 'touch' || parsed.verb === 'breach' || parsed.verb === 'screen' || parsed.verb === 'mirror') &&
        currentRoomId === 'mirror_vault'
      ) {
        triggerMirrorFinale();
      } else if (currentRoomId === 'mirror_vault') {
        triggerMirrorFinale();
      } else {
        printNarrative(`Choose [A] or [B], or type "help" for options.`);
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
  recalculateProfileAndTags();
  soundEngine.playKeyClick();
});

// Logs Sub-Navigation (Story Timeline vs Raw Terminal Stream)
viewModeTimelineBtn?.addEventListener('click', () => {
  viewModeTimelineBtn.classList.add('active');
  viewModeTerminalBtn.classList.remove('active');
  timelineViewPane?.classList.remove('hidden');
  rawTerminalPane?.classList.add('hidden');
  soundEngine.playKeyClick();
});

viewModeTerminalBtn?.addEventListener('click', () => {
  viewModeTerminalBtn.classList.add('active');
  viewModeTimelineBtn.classList.remove('active');
  rawTerminalPane?.classList.remove('hidden');
  timelineViewPane?.classList.add('hidden');
  soundEngine.playKeyClick();
});

btnExportDossierTab?.addEventListener('click', () => {
  exportSessionDossier();
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
  renderCaseBranchMap();
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

// End-Game Controls: Replay Simulation & Save Gameplay
const btnReplay = document.getElementById('btn-replay');
const btnSaveLog = document.getElementById('btn-save-log');

btnReplay?.addEventListener('click', () => {
  restartGame();
});

btnSaveLog?.addEventListener('click', () => {
  exportSessionDossier();
});

boot();
