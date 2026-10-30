import {
  evaluateWordleGuess,
  calculateHandValue,
  createDeck,
  Card,
  renderDarkMaze
} from '@wake/shared';
import { soundEngine } from '../audio.js';

export interface MinigameState {
  template: string;
  active: boolean;
  params: any;
  inventory?: Set<string>;
  containerEl?: HTMLElement;
  onSuccess: () => void;
  onMistake: (penaltyDistance: number, mistakeName: string) => void;
  onDistanceChange?: (delta: number) => void;
  print: (text: string, className?: string) => void;
}

export class WordleRunner {
  private attempts: Array<{ guess: string; feedback: Array<{ letter: string; status: string }> }> = [];
  private target: string;
  private maxAttempts: number;
  private state: MinigameState;

  constructor(state: MinigameState) {
    this.state = state;
    this.target = (state.params.targetWord || 'GHOST').toUpperCase();
    this.maxAttempts = state.params.maxAttempts || 6;
  }

  public start(): void {
    this.state.print('\n=== WORD PUZZLE LOCK ===', 'bright');
    this.state.print(`Decrypt the 5-letter seal. You have ${this.maxAttempts} attempts.`);
    if (this.state.params.hint) {
      this.state.print(`Hint: ${this.state.params.hint}`);
    }
    this.render();
  }

  public handleInput(input: string): boolean {
    const guess = input.trim().toUpperCase();
    if (guess.length !== 5) {
      this.state.print('Enter exactly 5 letters.');
      return false;
    }

    const feedback = evaluateWordleGuess(this.target, guess);
    this.attempts.push({ guess, feedback });

    if (guess === this.target) {
      this.render();
      this.state.print('\n>>> THE SEAL UNLOCKS WITH A SHUDDER! <<<', 'bright');
      this.state.onSuccess();
      return true;
    }

    if (this.attempts.length >= this.maxAttempts) {
      this.render();
      this.state.print(`\n>>> FAILED. The word was "${this.target}". The thing surges closer! <<<`, 'danger');
      this.state.onMistake(2, `Failed wordle: ${this.target}`);
      this.state.onSuccess(); // progress anyway with distance penalty
      return true;
    }

    this.render();
    soundEngine.playGlitchNoise();
    this.state.onMistake(1, `Wrong guess: ${guess}`);
    return false;
  }

  private render(): void {
    this.state.print(`\n[ATTEMPTS: ${this.attempts.length}/${this.maxAttempts}]`);
    for (const att of this.attempts) {
      const line = att.feedback
        .map((f) => {
          if (f.status === 'correct') return `[${f.letter}]*`;
          if (f.status === 'present') return `(${f.letter})?`;
          return ` ${f.letter} `;
        })
        .join(' ');
      this.state.print(`  ${line}`);
    }
  }
}

export class BlackjackRunner {
  private deck: Card[] = [];
  private playerHand: Card[] = [];
  private dealerHand: Card[] = [];
  private state: MinigameState;
  private roundsWon = 0;
  private targetPoints = 1;
  private stakeDistance = 1;
  private roundOver = false;

  constructor(state: MinigameState) {
    this.state = state;
    this.targetPoints = state.params.targetPoints || 1;
    this.stakeDistance = state.params.stakeDistance || 1;
    this.deck = createDeck();
  }

  public start(): void {
    this.state.print('\n=== BLACKJACK VS THE THING ===', 'bright');
    this.state.print(`The hunched figure rasps: "${this.state.params.initialTaunt || 'Draw your card.'}"`);
    this.state.print(`Stakes: ${this.stakeDistance} Distance points. Rounds needed: ${this.targetPoints}`);
    this.startRound();
  }

  private startRound(): void {
    if (this.deck.length < 15) this.deck = createDeck();
    this.playerHand = [this.deck.pop()!, this.deck.pop()!];
    this.dealerHand = [this.deck.pop()!, this.deck.pop()!];
    this.roundOver = false;
    this.renderHands(true);
  }

  private renderHands(hideDealerSecond: boolean): void {
    const pVal = calculateHandValue(this.playerHand);
    const pCards = this.playerHand.map((c) => `[${c.value}${c.suit}]`).join(' ');

    let dCards = '';
    let dValStr = '';
    if (hideDealerSecond) {
      dCards = `[${this.dealerHand[0].value}${this.dealerHand[0].suit}] [???]`;
      dValStr = `${calculateHandValue([this.dealerHand[0]])}+?`;
    } else {
      dCards = this.dealerHand.map((c) => `[${c.value}${c.suit}]`).join(' ');
      dValStr = `${calculateHandValue(this.dealerHand)}`;
    }

    this.state.print(`\nTHE THING:  ${dCards} (Total: ${dValStr})`);
    this.state.print(`YOU:        ${pCards} (Total: ${pVal})`);
    if (!this.roundOver) {
      this.state.print(`Commands: type "hit" (or "h") / "stand" (or "s")`);
    }
  }

  public handleInput(input: string): boolean {
    const cmd = input.trim().toLowerCase();
    if (cmd === 'hit' || cmd === 'h') {
      this.playerHand.push(this.deck.pop()!);
      const pVal = calculateHandValue(this.playerHand);
      if (pVal > 21) {
        this.renderHands(false);
        this.state.print('>>> BUST! Your total exceeded 21! The thing grins. <<<', 'danger');
        this.state.onMistake(this.stakeDistance, 'Blackjack bust');
        return this.finishRound(false);
      } else {
        this.renderHands(true);
      }
      return false;
    }

    if (cmd === 'stand' || cmd === 's') {
      this.roundOver = true;
      // Dealer AI: hits until 17 or higher
      while (calculateHandValue(this.dealerHand) < 17) {
        this.dealerHand.push(this.deck.pop()!);
      }
      const pVal = calculateHandValue(this.playerHand);
      const dVal = calculateHandValue(this.dealerHand);

      this.renderHands(false);

      if (dVal > 21) {
        this.state.print('>>> THE THING BUSTS! You take the round. <<<', 'bright');
        return this.finishRound(true);
      } else if (pVal > dVal) {
        this.state.print('>>> YOU WIN THE HAND! <<<', 'bright');
        return this.finishRound(true);
      } else if (pVal < dVal) {
        this.state.print('>>> THE THING OUTSCORED YOU. <<<', 'danger');
        this.state.onMistake(this.stakeDistance, 'Blackjack dealer win');
        return this.finishRound(false);
      } else {
        this.state.print('>>> PUSH (TIE). Draw another hand. <<<');
        this.startRound();
        return false;
      }
    }

    this.state.print('Invalid card action. Type "hit" or "stand".');
    return false;
  }

  private finishRound(playerWon: boolean): boolean {
    if (playerWon) {
      this.roundsWon++;
      if (this.roundsWon >= this.targetPoints) {
        this.state.print('\n>>> THE SILHOUETTE DROPS ITS CARDS AND MELTS INTO SHADOW! <<<', 'bright');
        this.state.onSuccess();
        return true;
      } else {
        this.state.print(`\nRound won! (${this.roundsWon}/${this.targetPoints}). Dealing next...`);
        this.startRound();
        return false;
      }
    } else {
      this.state.print('\n>>> THE THING STANDS ASIDE WITH A MOCKING BOW. The door is clear, at great cost. <<<', 'danger');
      this.state.onSuccess();
      return true;
    }
  }
}

export class CipherRunner {
  private plaintext: string;
  private state: MinigameState;

  constructor(state: MinigameState) {
    this.state = state;
    this.plaintext = (state.params.plaintext || 'WAKE').toUpperCase();
  }

  public start(): void {
    this.state.print('\n=== CIPHER INSCRIPTION ===', 'bright');
    this.state.print(`ENCRYPTED: "${this.state.params.ciphertext}"`);
    this.state.print(`TYPE: ${this.state.params.cipherType?.toUpperCase() || 'UNKNOWN'}`);
    if (this.state.params.hint) {
      this.state.print(`HINT: ${this.state.params.hint}`);
    }
    this.state.print('Type your decoded answer:');
  }

  public handleInput(input: string): boolean {
    const guess = input.trim().toUpperCase();
    if (guess === this.plaintext) {
      this.state.print('\n>>> CIPHER SOLVED! The lock clicks open. <<<', 'bright');
      this.state.onSuccess();
      return true;
    } else {
      this.state.print(`>>> INCORRECT DECRYPTION: "${guess}". Gears grind violently! <<<`, 'danger');
      this.state.onMistake(1, `Wrong cipher guess: ${guess}`);
      soundEngine.playGlitchNoise();
      return false;
    }
  }
}

export class SimonRunner {
  private sequence: string[];
  private state: MinigameState;

  constructor(state: MinigameState) {
    this.state = state;
    this.sequence = state.params.sequence || ['^', 'v', '<', '>'];
  }

  public async start(): Promise<void> {
    this.state.print('\n=== BREAKER GLYPH ALIGNMENT (SIMON) ===', 'bright');
    this.state.print('Watch the circuit sequence:');
    const speed = this.state.params.displaySpeedMs || 700;

    await new Promise((r) => setTimeout(r, 600));
    for (let i = 0; i < this.sequence.length; i++) {
      soundEngine.playKeyClick();
      this.state.print(`  [STEP ${i + 1}]  >>>  ${this.sequence[i]}  <<<`, 'bright');
      await new Promise((r) => setTimeout(r, speed));
    }

    this.state.print('\nNow repeat the full sequence separated by spaces:');
    this.state.print(`Example: "${this.sequence.join(' ')}"`);
  }

  public handleInput(input: string): boolean {
    const tokens = input.trim().split(/\s+/);
    if (tokens.length !== this.sequence.length) {
      this.state.print(`Expected ${this.sequence.length} glyphs, got ${tokens.length}.`);
      this.state.onMistake(1, 'Simon wrong length');
      soundEngine.playGlitchNoise();
      return false;
    }

    for (let i = 0; i < this.sequence.length; i++) {
      if (tokens[i].toUpperCase() !== this.sequence[i].toUpperCase()) {
        this.state.print(`Mismatch at step ${i + 1}! Electrical shock!`, 'danger');
        this.state.onMistake(1, `Simon mismatch at step ${i + 1}`);
        soundEngine.playGlitchNoise();
        return false;
      }
    }

    this.state.print('\n>>> BREAKER ALIGNED! High voltage hums through the door latch! <<<', 'bright');
    this.state.onSuccess();
    return true;
  }
}

export class DarkMazeRunner {
  private grid: string[];
  private playerPos: [number, number];
  private exitPos: [number, number];
  private visionRadius: number;
  private movesLeft: number;
  private state: MinigameState;

  constructor(state: MinigameState) {
    this.state = state;
    this.grid = state.params.grid;
    this.playerPos = [state.params.start[0], state.params.start[1]];
    this.exitPos = [state.params.exit[0], state.params.exit[1]];
    this.visionRadius = state.params.visionRadius || 2;
    this.movesLeft = state.params.moveBudget || 30;
  }

  public start(): void {
    this.state.print('\n=== NAVIGATING THE PITCH DARK ===', 'bright');
    this.state.print(`Find the exit [E]. Vision radius: ${this.visionRadius} tiles. Moves remaining: ${this.movesLeft}`);
    this.state.print('Controls: "w" (north), "s" (south), "a" (west), "d" (east).');
    this.render();
  }

  public handleInput(input: string): boolean {
    const dir = input.trim().toLowerCase();
    let dr = 0;
    let dc = 0;

    if (dir === 'w' || dir === 'north' || dir === 'n') dr = -1;
    else if (dir === 's' || dir === 'south') dr = 1;
    else if (dir === 'a' || dir === 'west') dc = -1;
    else if (dir === 'd' || dir === 'east') dc = 1;
    else {
      this.state.print('Use w/a/s/d or north/south/east/west to step through the dark.');
      return false;
    }

    const nr = this.playerPos[0] + dr;
    const nc = this.playerPos[1] + dc;

    if (
      nr < 0 ||
      nr >= this.grid.length ||
      nc < 0 ||
      nc >= this.grid[0].length ||
      this.grid[nr][nc] === '#'
    ) {
      this.state.print('You walk into a cold, slimy brick wall.');
      soundEngine.playGlitchNoise();
      return false;
    }

    this.playerPos = [nr, nc];
    this.movesLeft--;

    if (this.playerPos[0] === this.exitPos[0] && this.playerPos[1] === this.exitPos[1]) {
      this.render();
      this.state.print('\n>>> YOU REACH THE BASEMENT ARCHWAY AND TUMBLE THROUGH! <<<', 'bright');
      this.state.onSuccess();
      return true;
    }

    if (this.movesLeft <= 0) {
      this.state.print('\n>>> EXHAUSTED IN THE DARK. The thing catches up to you! <<<', 'danger');
      this.state.onMistake(3, 'Dark maze exhausted moves');
      this.state.onSuccess(); // progress with major penalty
      return true;
    }

    this.render();
    return false;
  }

  private render(): void {
    this.state.print(`[MOVES LEFT: ${this.movesLeft}]`);
    const lines = renderDarkMaze(this.grid, this.playerPos, this.visionRadius);
    for (const l of lines) {
      this.state.print(l);
    }
  }
}

export class BandersnatchRunner {
  private state: MinigameState;
  private scenario: string;
  private choices: any[];
  private timeLimitSec: number;
  private timeLeft: number;
  private timerId: any = null;
  private isResolved: boolean = false;
  private timerDigitsEl: HTMLElement | null = null;
  private timerFillEl: HTMLElement | null = null;
  private timerBoxEl: HTMLElement | null = null;

  constructor(state: MinigameState) {
    this.state = state;
    this.scenario = state.params.scenario || 'A sudden choice looms in the dark...';
    this.choices = state.params.choices || [];
    // If player has flashlight, gives +4 seconds bonus decision time!
    const bonus = state.inventory?.has('flashlight') ? 4 : 0;
    this.timeLimitSec = (state.params.timeLimitSec || 10) + bonus;
    this.timeLeft = this.timeLimitSec;
  }

  public start(): void {
    if (this.state.containerEl) {
      this.state.containerEl.innerHTML = '';
      const card = document.createElement('div');
      card.className = 'bandersnatch-container';

      const header = document.createElement('div');
      header.className = 'bandersnatch-header';
      header.innerHTML = `<span>SPLIT-SECOND DILEMMA</span><span class="live-indicator">● LIVE COUNTDOWN</span>`;
      card.appendChild(header);

      const scenario = document.createElement('div');
      scenario.className = 'bandersnatch-scenario';
      scenario.textContent = this.scenario;
      card.appendChild(scenario);

      if (this.state.inventory?.has('flashlight')) {
        const perk = document.createElement('div');
        perk.className = 'bandersnatch-perk';
        perk.textContent = '⚡ FLASHLIGHT PERK: Illumination adds +4s decision buffer!';
        card.appendChild(perk);
      }

      // Dedicated in-place timer element
      const timerBox = document.createElement('div');
      timerBox.className = 'bandersnatch-timer-box';
      timerBox.innerHTML = `
        <div class="bandersnatch-timer-header">
          <span class="bandersnatch-timer-label">DECISION COUNTDOWN</span>
          <span class="bandersnatch-timer-digits" id="bs-timer-digits">${this.timeLeft}s REMAINING</span>
        </div>
        <div class="bandersnatch-progress-track">
          <div class="bandersnatch-progress-fill" id="bs-timer-fill" style="width: 100%;"></div>
        </div>
      `;
      card.appendChild(timerBox);
      this.timerBoxEl = timerBox;
      this.timerDigitsEl = timerBox.querySelector('#bs-timer-digits');
      this.timerFillEl = timerBox.querySelector('#bs-timer-fill');

      // Clickable Choices List
      const choicesList = document.createElement('div');
      choicesList.className = 'bandersnatch-choices-list';

      for (let i = 0; i < this.choices.length; i++) {
        const c = this.choices[i];
        const key = String.fromCharCode(65 + i);
        const hasItem = !c.requiredItem || (this.state.inventory && this.state.inventory.has(c.requiredItem));

        const choiceItem = document.createElement('div');
        choiceItem.className = `bandersnatch-choice-item ${!hasItem ? 'locked' : ''}`;
        choiceItem.innerHTML = `
          <span class="bandersnatch-choice-key">[ ${key} ]</span>
          <span class="bandersnatch-choice-label">${c.label}</span>
          <span class="bandersnatch-choice-desc">${hasItem ? c.description : `(LOCKED: Requires ${c.requiredItem})`}</span>
        `;
        if (hasItem) {
          choiceItem.addEventListener('click', () => {
            this.handleInput(key);
          });
        }
        choicesList.appendChild(choiceItem);
      }
      card.appendChild(choicesList);
      this.state.containerEl.appendChild(card);
    } else {
      this.state.print('\n=== DYNAMIC SPLIT-SECOND DILEMMA (BANDERSNATCH) ===', 'bright');
      this.state.print(this.scenario, 'bright');
      for (let i = 0; i < this.choices.length; i++) {
        const c = this.choices[i];
        this.state.print(`  [${String.fromCharCode(65 + i)}]: ${c.label} - ${c.description}`, 'bright');
      }
    }

    this.startTimer();
  }

  private startTimer(): void {
    this.updateInPlaceTimer();
    this.timerId = setInterval(() => {
      this.timeLeft--;
      soundEngine.playKeyClick();
      this.updateInPlaceTimer();

      if (this.timeLeft <= 0) {
        this.handleTimeout();
      }
    }, 1000);
  }

  private updateInPlaceTimer(): void {
    const bars = Math.max(0, this.timeLeft);
    const filled = '█'.repeat(bars);
    const empty = '░'.repeat(Math.max(0, this.timeLimitSec - bars));
    const pct = Math.max(0, (this.timeLeft / this.timeLimitSec) * 100);

    if (this.timerDigitsEl) {
      this.timerDigitsEl.textContent = `[${filled}${empty}] ${this.timeLeft}s REMAINING`;
    }
    if (this.timerFillEl) {
      this.timerFillEl.style.width = `${pct}%`;
    }
    if (this.timerBoxEl) {
      if (this.timeLeft <= 3) {
        this.timerBoxEl.classList.add('urgent');
      } else {
        this.timerBoxEl.classList.remove('urgent');
      }
    }
  }

  private handleTimeout(): void {
    if (this.isResolved) return;
    this.cleanup();
    this.isResolved = true;

    soundEngine.playGlitchNoise();
    this.state.print('\n>>> TIME EXPIRED! HESITATION HAS CONSEQUENCES! <<<', 'danger');
    this.state.print('You froze in indecision. The thing claws across your back before you break through!', 'danger');
    this.state.onMistake(2, 'Bandersnatch timer expired');
    this.state.onSuccess();
  }

  public handleInput(input: string): boolean {
    if (this.isResolved) return true;
    const clean = input.trim().toUpperCase();

    // Determine choice index (A, B, C or 1, 2, 3)
    let idx = -1;
    if (clean === 'A' || clean === '1') idx = 0;
    else if (clean === 'B' || clean === '2') idx = 1;
    else if (clean === 'C' || clean === '3') idx = 2;
    else {
      // Check if typed partial choice label
      for (let i = 0; i < this.choices.length; i++) {
        if (clean.includes(this.choices[i].id.toUpperCase()) || clean.includes(this.choices[i].label.toUpperCase())) {
          idx = i;
          break;
        }
      }
    }

    if (idx < 0 || idx >= this.choices.length) {
      this.state.print('Invalid selection! Quick: choose A, B, or C!');
      return false;
    }

    const choice = this.choices[idx];
    if (choice.requiredItem && (!this.state.inventory || !this.state.inventory.has(choice.requiredItem))) {
      this.state.print(`You do not possess the required item: "${choice.requiredItem}"! Pick another option!`, 'danger');
      return false;
    }

    this.cleanup();
    this.isResolved = true;

    this.state.print(`\n>>> YOU CHOSE: [${choice.label}] <<<`, 'bright');
    this.state.print(choice.consequence, 'bright');

    if (choice.distanceDelta !== 0 && this.state.onDistanceChange) {
      this.state.onDistanceChange(choice.distanceDelta);
      this.state.print(`Distance adjusted by ${choice.distanceDelta > 0 ? '+' : ''}${choice.distanceDelta}!`, 'bright');
    }

    this.state.onSuccess();
    return true;
  }

  private cleanup(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}
