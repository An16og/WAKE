// WAKE.EXE - Client Core Boot Engine

interface HealthData {
  status: 'ok' | 'degraded' | 'error';
  provider: string;
  model: string;
  providerConnected: boolean;
  version: string;
  details?: string;
}

const outputEl = document.getElementById('terminal-output') as HTMLDivElement;
const inputEl = document.getElementById('terminal-input') as HTMLInputElement;
const ghostProviderEl = document.getElementById('ghost-provider') as HTMLElement;
const ghostModelEl = document.getElementById('ghost-model') as HTMLElement;
const ghostStatusEl = document.getElementById('ghost-status') as HTMLElement;
const ghostLatencyEl = document.getElementById('ghost-latency') as HTMLElement;
const themeToggleEl = document.getElementById('theme-toggle') as HTMLElement;
const safeModeToggleEl = document.getElementById('safe-mode-toggle') as HTMLElement;
const debugModalEl = document.getElementById('debug-modal') as HTMLElement;
const closeDebugBtn = document.getElementById('close-debug-btn') as HTMLElement;

let isMonochrome = false;
let isSafeMode = false;
let isDebugOpen = false;

function printLine(text: string, className = ''): void {
  const line = document.createElement('div');
  line.className = className;
  line.textContent = text;
  outputEl.appendChild(line);
  outputEl.scrollTop = outputEl.scrollHeight;
}

async function typeWriter(text: string, speed = 15): Promise<void> {
  const line = document.createElement('div');
  outputEl.appendChild(line);
  for (let i = 0; i < text.length; i++) {
    line.textContent += text[i];
    outputEl.scrollTop = outputEl.scrollHeight;
    await new Promise((r) => setTimeout(r, speed));
  }
}

async function checkHealth(): Promise<HealthData | null> {
  const start = performance.now();
  try {
    const res = await fetch('/health');
    const latency = Math.round(performance.now() - start);
    ghostLatencyEl.textContent = `${latency}ms`;
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = (await res.json()) as HealthData;
    ghostProviderEl.textContent = data.provider.toUpperCase();
    ghostModelEl.textContent = data.model;
    ghostStatusEl.textContent = data.providerConnected ? 'ONLINE' : 'DEGRADED';
    ghostStatusEl.style.color = data.providerConnected ? 'var(--fg-bright)' : 'var(--danger-color)';
    return data;
  } catch (err: any) {
    ghostProviderEl.textContent = 'ERROR';
    ghostStatusEl.textContent = 'OFFLINE';
    ghostStatusEl.style.color = 'var(--danger-color)';
    return null;
  }
}

async function runBootSequence(): Promise<void> {
  printLine('========================================================');
  printLine('  WAKE.EXE [ROM BIOS v0.1.0-alpha] (c) 2026            ');
  printLine('  MEMORY TEST: 65536 KB OK                             ');
  printLine('========================================================\n');

  await new Promise((r) => setTimeout(r, 200));
  await typeWriter('> INITIALIZING GHOST DIRECTIVE SUBSYSTEM...', 10);
  
  const health = await checkHealth();
  if (health) {
    await typeWriter(`> CONNECTED TO PROVIDER: [${health.provider.toUpperCase()}]`, 10);
    await typeWriter(`> ACTIVE MODEL: [${health.model}]`, 10);
    if (!health.providerConnected) {
      printLine(`> WARNING: ${health.details || 'Model not loaded; deterministic fallback active.'}`, 'danger');
    }
  } else {
    printLine('> ERROR: Could not contact neural backend. Falling back to local offline mode.', 'danger');
  }

  await typeWriter('> CHECKING REALITY BUFFER INTEGRITY... [OK]', 10);
  await typeWriter('> DISTANCE TRACKER ENGAGED: TARGET RANGE 10 METERS', 10);
  printLine('\n');
  printLine('--------------------------------------------------------');
  printLine('YOU WAKE FROM A NIGHTMARE.');
  printLine('THE MONSTER IS STILL CHASING YOU.');
  printLine('TYPE "help" OR "look" TO BEGIN.');
  printLine('--------------------------------------------------------\n');
}

// Event Listeners
themeToggleEl.addEventListener('click', () => {
  isMonochrome = !isMonochrome;
  document.body.classList.toggle('monochrome', isMonochrome);
  themeToggleEl.textContent = isMonochrome ? '[COLOR: MONO]' : '[COLOR: GREEN]';
});

safeModeToggleEl.addEventListener('click', () => {
  isSafeMode = !isSafeMode;
  document.body.classList.toggle('safe-mode', isSafeMode);
  safeModeToggleEl.textContent = isSafeMode ? '[SAFE MODE: ON]' : '[SAFE MODE: OFF]';
});

window.addEventListener('keydown', (e) => {
  if (e.key === '`' || e.key === '~') {
    e.preventDefault();
    isDebugOpen = !isDebugOpen;
    debugModalEl.classList.toggle('hidden', !isDebugOpen);
  }
});

closeDebugBtn.addEventListener('click', () => {
  isDebugOpen = false;
  debugModalEl.classList.add('hidden');
});

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const val = inputEl.value.trim();
    if (!val) return;
    printLine(`> ${val}`);
    inputEl.value = '';
    handleCommand(val);
  }
});

function handleCommand(cmd: string): void {
  const lower = cmd.toLowerCase();
  if (lower === 'help') {
    printLine('AVAILABLE COMMANDS:');
    printLine('  look / l           - Inspect the current surroundings');
    printLine('  go <dir> / n,s,e,w - Move through the corridors');
    printLine('  take <item>        - Collect an object');
    printLine('  use <item>         - Interact with mechanism or room');
    printLine('  inventory / i      - Check what you carry');
    printLine('  map / m            - View known layout');
    printLine('  safe               - Toggle safe sensory mode');
    printLine('  mute               - Toggle sound synthesizer');
  } else if (lower === 'safe') {
    safeModeToggleEl.click();
    printLine(`Safe mode is now ${isSafeMode ? 'ACTIVE' : 'DISABLED'}.`);
  } else {
    printLine(`Unknown command: "${cmd}". Type "help" for options.`);
  }
}

// Start boot
runBootSequence();
