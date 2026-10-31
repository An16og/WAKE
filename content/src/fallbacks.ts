import type { ChallengeItem } from '@wake/shared';

export const FALLBACK_CHALLENGES: ChallengeItem[] = [
  // 1. Wordle Fallbacks (Difficulties 1-5)
  {
    id: 'fallback-wordle-1',
    template: 'wordle',
    difficulty: 1,
    params: {
      targetWord: 'GHOST',
      maxAttempts: 6,
      hint: 'It hovers unseen through the machine walls.'
    },
    hint: 'A spirit or specter.'
  },
  {
    id: 'fallback-wordle-2',
    template: 'wordle',
    difficulty: 2,
    params: {
      targetWord: 'DREAD',
      maxAttempts: 6,
      hint: 'An overwhelming weight in your chest.'
    },
    hint: 'Anticipation of terror.'
  },
  {
    id: 'fallback-wordle-3',
    template: 'wordle',
    difficulty: 3,
    params: {
      targetWord: 'ICHOR',
      maxAttempts: 6,
      hint: 'Black blood oozing between floorboards.'
    },
    hint: 'Ethereal fluid of the gods or abominations.'
  },
  {
    id: 'fallback-wordle-4',
    template: 'wordle',
    difficulty: 4,
    params: {
      targetWord: 'GNASH',
      maxAttempts: 5,
      hint: 'The sound teeth make in the cold dark.'
    },
    hint: 'Grind teeth together in agony.'
  },
  {
    id: 'fallback-wordle-5',
    template: 'wordle',
    difficulty: 5,
    params: {
      targetWord: 'CRYPT',
      maxAttempts: 5,
      hint: 'Stone vaults built under forgotten foundations.'
    },
    hint: 'Underground chamber of the dead.'
  },

  // 2. Blackjack Fallbacks (Difficulties 1-5)
  {
    id: 'fallback-blackjack-1',
    template: 'blackjack',
    difficulty: 1,
    params: {
      targetPoints: 1,
      stakeDistance: 1,
      dealerPersonality: 'mocking',
      initialTaunt: 'Draw a card, little one. The deck does not lie.'
    },
    hint: 'Reach 21 or beat the dealer without busting.'
  },
  {
    id: 'fallback-blackjack-2',
    template: 'blackjack',
    difficulty: 2,
    params: {
      targetPoints: 1,
      stakeDistance: 2,
      dealerPersonality: 'ravenous',
      initialTaunt: 'Two steps closer if you bust. Shall we wager?'
    },
    hint: 'Be mindful of your total. Aces count as 11 or 1.'
  },
  {
    id: 'fallback-blackjack-3',
    template: 'blackjack',
    difficulty: 3,
    params: {
      targetPoints: 2,
      stakeDistance: 2,
      dealerPersonality: 'calculating',
      initialTaunt: 'Best two out of three. Your heartbeat is so noisy.'
    },
    hint: 'Win two rounds to banish the hand.'
  },
  {
    id: 'fallback-blackjack-4',
    template: 'blackjack',
    difficulty: 4,
    params: {
      targetPoints: 2,
      stakeDistance: 3,
      dealerPersonality: 'frenzied',
      initialTaunt: 'Three distance points on the table. One slip and I touch you.'
    },
    hint: 'High stakes. Stand safely when dealer shows bust card.'
  },
  {
    id: 'fallback-blackjack-5',
    template: 'blackjack',
    difficulty: 5,
    params: {
      targetPoints: 3,
      stakeDistance: 3,
      dealerPersonality: 'abyssal',
      initialTaunt: 'Three rounds of cards in the dark. You were doomed from the draw.'
    },
    hint: 'Endure 3 rounds with maximum stakes.'
  },

  // 3. Cipher Fallbacks (Difficulties 1-5)
  {
    id: 'fallback-cipher-1',
    template: 'cipher',
    difficulty: 1,
    params: {
      cipherType: 'caesar',
      ciphertext: 'ZDNH',
      plaintext: 'WAKE',
      shift: 3,
      hint: 'Caesar shift of 3: letters shifted back by 3.'
    },
    hint: 'Shift letters back by 3.'
  },
  {
    id: 'fallback-cipher-2',
    template: 'cipher',
    difficulty: 2,
    params: {
      cipherType: 'atbash',
      ciphertext: 'ML VMGRGB',
      plaintext: 'NO ENTITY',
      hint: 'Atbash mirror: A becomes Z, B becomes Y.'
    },
    hint: 'Mirror alphabet A <-> Z.'
  },
  {
    id: 'fallback-cipher-3',
    template: 'cipher',
    difficulty: 3,
    params: {
      cipherType: 'caesar',
      ciphertext: 'QHYHU UXQ',
      plaintext: 'NEVER RUN',
      shift: 3,
      hint: 'Shifted forward by 3.'
    },
    hint: 'Shift back by 3.'
  },
  {
    id: 'fallback-cipher-4',
    template: 'cipher',
    difficulty: 4,
    params: {
      cipherType: 'substitution',
      ciphertext: 'XEB WYKJ BMB',
      plaintext: 'THE DARK EYE',
      hint: 'Monoalphabetic substitution: X->T, E->H, B->E.'
    },
    hint: 'Simple substitution.'
  },
  {
    id: 'fallback-cipher-5',
    template: 'cipher',
    difficulty: 5,
    params: {
      cipherType: 'caesar',
      ciphertext: 'DGJKPF AQW',
      plaintext: 'BEHIND YOU',
      shift: 2,
      hint: 'Shifted forward by 2.'
    },
    hint: 'Shift back by 2.'
  },

  // 4. Simon Fallbacks (Difficulties 1-5)
  {
    id: 'fallback-simon-1',
    template: 'simon',
    difficulty: 1,
    params: {
      sequence: ['^', 'v', '<', '>'],
      displaySpeedMs: 900,
      hint: 'Repeat the 4-arrow glyph sequence.'
    },
    hint: 'Enter arrows in exact order.'
  },
  {
    id: 'fallback-simon-2',
    template: 'simon',
    difficulty: 2,
    params: {
      sequence: ['@', '#', '$', '%', '&'],
      displaySpeedMs: 800,
      hint: 'Repeat the 5-symbol memory pulse.'
    },
    hint: '5 symbols to memorize.'
  },
  {
    id: 'fallback-simon-3',
    template: 'simon',
    difficulty: 3,
    params: {
      sequence: ['[X]', '[O]', '[+]', '[X]', '[O]', '[*]'],
      displaySpeedMs: 700,
      hint: '6 glyph pulse.'
    },
    hint: 'Watch repeats carefully.'
  },
  {
    id: 'fallback-simon-4',
    template: 'simon',
    difficulty: 4,
    params: {
      sequence: ['1', '3', '3', '7', '0', '9', '2'],
      displaySpeedMs: 600,
      hint: '7-digit neural resonance.'
    },
    hint: 'Quick sequence.'
  },
  {
    id: 'fallback-simon-5',
    template: 'simon',
    difficulty: 5,
    params: {
      sequence: ['W', 'A', 'K', 'E', 'U', 'P', 'N', 'O'],
      displaySpeedMs: 500,
      hint: '8 glyph rapid burst.'
    },
    hint: 'Maximum length and speed.'
  },

  // 5. Dark Maze Fallbacks (Difficulties 1-5)
  {
    id: 'fallback-dark_maze-1',
    template: 'dark_maze',
    difficulty: 1,
    params: {
      width: 7,
      height: 7,
      visionRadius: 3,
      moveBudget: 25,
      grid: [
        "#######",
        "#S...E#",
        "#.###.#",
        "#.....#",
        "#.###.#",
        "#.....#",
        "#######"
      ],
      start: [1, 1],
      exit: [1, 5],
      hint: 'A simple room. Walk east towards the exit.'
    },
    hint: 'Follow the corridor east to exit.'
  },
  {
    id: 'fallback-dark_maze-2',
    template: 'dark_maze',
    difficulty: 2,
    params: {
      width: 9,
      height: 7,
      visionRadius: 2,
      moveBudget: 30,
      grid: [
        "#########",
        "#S..#...#",
        "###.#.#.#",
        "#...#.#.#",
        "#.###.#.#",
        "#.....#E#",
        "#########"
      ],
      start: [1, 1],
      exit: [5, 7],
      hint: 'Winding paths. Keep your hands on the right wall.'
    },
    hint: 'Navigate around internal dividing walls.'
  },
  {
    id: 'fallback-dark_maze-3',
    template: 'dark_maze',
    difficulty: 3,
    params: {
      width: 9,
      height: 9,
      visionRadius: 2,
      moveBudget: 35,
      grid: [
        "#########",
        "#S#.....#",
        "#.#.###.#",
        "#...#...#",
        "###.#.###",
        "#...#...#",
        "#.###.#.#",
        "#.....#E#",
        "#########"
      ],
      start: [1, 1],
      exit: [7, 7],
      hint: 'Tight visibility. Plan moves carefully.'
    },
    hint: 'Watch the move budget.'
  },
  {
    id: 'fallback-dark_maze-4',
    template: 'dark_maze',
    difficulty: 4,
    params: {
      width: 11,
      height: 9,
      visionRadius: 1,
      moveBudget: 40,
      grid: [
        "###########",
        "#S....#...#",
        "#.###.#.#.#",
        "#...#...#.#",
        "###.###.#.#",
        "#.....#.#.#",
        "#.###.#.#.#",
        "#...#...#E#",
        "###########"
      ],
      start: [1, 1],
      exit: [7, 9],
      hint: 'Pitch darkness. Vision radius is 1 tile.'
    },
    hint: 'Feel your way one step at a time.'
  },
  {
    id: 'fallback-dark_maze-5',
    template: 'dark_maze',
    difficulty: 5,
    params: {
      width: 11,
      height: 11,
      visionRadius: 1,
      moveBudget: 45,
      grid: [
        "###########",
        "#S#.......#",
        "#.#.#####.#",
        "#...#...#.#",
        "###.#.#.#.#",
        "#...#.#...#",
        "#.###.###.#",
        "#.#.....#.#",
        "#.#.###.#.#",
        "#...#...#E#",
        "###########"
      ],
      start: [1, 1],
      exit: [9, 9],
      hint: 'Labyrinthine dark. Every step counts.'
    },
    hint: 'Conserve your move budget.'
  },

  // 6. Narrative Branching Bandersnatch Dilemmas
  {
    id: 'bandersnatch-bedroom-dilemma',
    template: 'bandersnatch',
    difficulty: 1,
    params: {
      scenario: 'The rotary telephone shrills violently on your nightstand. Inside the closet, frantic claws tear through wood. You have 15 seconds to choose your reality.',
      timeLimitSec: 15,
      choices: [
        {
          id: 'choice-phone',
          label: 'A: ANSWER THE ROTARY PHONE',
          description: 'Lift the receiver and listen to who is calling in the dark.',
          consequence: 'A synthetic voice whispers: "Daniel, do not turn around. The observer outside the screen is watching your keystrokes." The wallpaper dissolves into glowing server racks!',
          distanceDelta: 1,
          nextRoomId: 'server_archive',
          branchId: 'meta',
          sanityDelta: -2
        },
        {
          id: 'choice-closet',
          label: 'B: SMASH PHONE & WRENCH CLOSET',
          description: 'Slam the phone into the wall and tear the closet door off its hinges with raw fury.',
          consequence: 'You shatter the phone and wrench the closet hinges! The rotting floor collapses beneath your feral weight—you plunge into the flooded subterranean dark below!',
          distanceDelta: 2,
          nextRoomId: 'flesh_cellar',
          branchId: 'beast',
          sanityDelta: -1
        }
      ],
      defaultChoiceIndex: 0,
      hint: 'Your first decision seals your branch in the machine.'
    },
    hint: 'Will you answer the observer, or awaken the beast?'
  },
  {
    id: 'bandersnatch-server-dilemma',
    template: 'bandersnatch',
    difficulty: 2,
    params: {
      scenario: 'Green CRT monitors flicker across the server corridor, rendering live code logs. The central terminal flashes: "IDENTITY VERIFICATION REQUIRED."',
      timeLimitSec: 15,
      choices: [
        {
          id: 'choice-claim-vance',
          label: 'A: "I AM DR. DANIEL VANCE"',
          description: 'Claim your identity as the human chief researcher.',
          consequence: 'The system rejects you with a harsh discordant buzz: "SUBJECT VANCE EXPIRED IN 2024. YOU ARE A NEURAL RECONSTRUCTION." The path unlocks toward the mainframe core!',
          distanceDelta: 1,
          nextRoomId: 'simulation_core',
          branchId: 'meta',
          sanityDelta: -2
        },
        {
          id: 'choice-claim-user',
          label: 'B: "I AM THE OBSERVER AT THE MONITOR"',
          description: 'Look through the fourth wall and acknowledge the human player at the keyboard.',
          consequence: 'The monitors flare blinding phosphor white! "EXTERNAL USER CONTACT CONFIRMED." Reality fragments around you as the simulation core unseals!',
          distanceDelta: 2,
          nextRoomId: 'simulation_core',
          branchId: 'meta',
          sanityDelta: -4
        }
      ],
      defaultChoiceIndex: 0,
      hint: 'The machine knows what you are.'
    },
    hint: 'Digital dissociation deepening.'
  },
  {
    id: 'bandersnatch-cellar-dilemma',
    template: 'bandersnatch',
    difficulty: 2,
    params: {
      scenario: 'You stand knee-deep in red water. A massive reinforced blast door blocks your exit. From the gloom behind, heavy wet footsteps pace your breathing.',
      timeLimitSec: 15,
      choices: [
        {
          id: 'choice-tear-claws',
          label: 'A: TEAR HINGES WITH BARE CLAWS',
          description: 'Drive your fingers into the steel seam and wrench with predator strength.',
          consequence: 'Bones crack and stretch—your hands have lengthened into obsidian talons! You tear the steel door from its frame with a guttural roar!',
          distanceDelta: 2,
          nextRoomId: 'pulsing_antechamber',
          branchId: 'beast',
          sanityDelta: -2
        },
        {
          id: 'choice-bare-fangs',
          label: 'B: CROUCH LOW & BARE YOUR FANGS',
          description: 'Drop onto all fours in the water and snarl into the pitch black.',
          consequence: 'You drop to all fours. The footsteps in the dark stop right beside you. You snarl—and realize the echo in the dark is your own throat!',
          distanceDelta: 1,
          nextRoomId: 'pulsing_antechamber',
          branchId: 'beast',
          sanityDelta: -3
        }
      ],
      defaultChoiceIndex: 0,
      hint: 'The human skin is peeling away.'
    },
    hint: 'Embrace the predator instinct.'
  },
  {
    id: 'bandersnatch-sim-dilemma',
    template: 'bandersnatch',
    difficulty: 3,
    params: {
      scenario: 'The supercomputer core hums at 100% capacity. The screen prints your actual session ID and typing pace. An override switch glows beside the keyboard.',
      timeLimitSec: 15,
      choices: [
        {
          id: 'choice-sim-override',
          label: 'A: OVERRIDE SYSTEM KERNEL',
          description: 'Force your hands into the terminal to breach the simulation boundary.',
          consequence: 'System alarms shriek! "CRITICAL RUNTIME BREACH. UNSEALING FINAL MIRROR TEST." The silver vault arches open before you!',
          distanceDelta: 2,
          nextRoomId: 'mirror_vault',
          branchId: 'meta',
          sanityDelta: -3
        },
        {
          id: 'choice-sim-submit',
          label: 'B: SURRENDER TO THE CODE',
          description: 'Accept your digital nature and let the simulation carry you to the glass.',
          consequence: 'The green code wraps around your vision like comforting static. The terminal folds outward into the obsidian mirror vault!',
          distanceDelta: 1,
          nextRoomId: 'mirror_vault',
          branchId: 'meta',
          sanityDelta: -2
        }
      ],
      defaultChoiceIndex: 0,
      hint: 'The user and the character are about to meet.'
    },
    hint: 'The final threshold is near.'
  },
  {
    id: 'bandersnatch-antechamber-dilemma',
    template: 'bandersnatch',
    difficulty: 3,
    params: {
      scenario: 'The pulsing tendon walls contract violently. Your pulse beats at 160 BPM. At the end of the organic corridor stands the antique silver mirror door.',
      timeLimitSec: 15,
      choices: [
        {
          id: 'choice-charge-beast',
          label: 'A: CHARGE THE VAULT AS THE PREDATOR',
          description: 'Sprint on all fours at maximum speed into the silver vault doorway.',
          consequence: 'Your claws gouge the obsidian floor as you leap through the archway into the mirror vault, hungry for the hunt!',
          distanceDelta: 2,
          nextRoomId: 'mirror_vault',
          branchId: 'beast',
          sanityDelta: -2
        },
        {
          id: 'choice-breathe-pack',
          label: 'B: BREATHE IN SYNC WITH THE PACK',
          description: 'Match your breath with the clicking footsteps in the dark.',
          consequence: 'You walk slowly forward. The footsteps and your paws strike the stone in eerie unison. You cross into the mirror vault together as one.',
          distanceDelta: 1,
          nextRoomId: 'mirror_vault',
          branchId: 'beast',
          sanityDelta: -3
        }
      ],
      defaultChoiceIndex: 0,
      hint: 'Look into the mirror to meet your reflection.'
    },
    hint: 'The hunt reaches its climax.'
  }
];
