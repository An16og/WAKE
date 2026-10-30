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

  // 6. Bandersnatch Timed Dilemmas (Difficulties 1-5)
  {
    id: 'fallback-bandersnatch-1',
    template: 'bandersnatch',
    difficulty: 1,
    params: {
      scenario: 'Claws scrape behind the drywall. You see an unlatched iron bulkhead and a low crawlspace duct.',
      timeLimitSec: 10,
      choices: [
        {
          id: 'choice-slam',
          label: 'A: SLAM IRON BULKHEAD',
          description: 'Heave the heavy iron door shut and drop the latch.',
          consequence: 'The heavy iron slab slams shut with a deafening boom. Something crashes violently against the opposite side, but the latch holds!',
          distanceDelta: 1
        },
        {
          id: 'choice-duct',
          label: 'B: DIVE INTO DUCT',
          description: 'Squeeze through the narrow ventilation shaft in silence.',
          consequence: 'You slide into the narrow cold duct. The thing drags past the hallway outside without detecting your position!',
          distanceDelta: 2
        },
        {
          id: 'choice-flash',
          label: 'C: [FLASHLIGHT] BLIND THE SHADOW',
          description: 'Turn and fire high lumens directly down the hallway.',
          consequence: 'The intense beam catches a glistening silhouette. A horrifying shriek tears through the corridor as it recoils backwards into shadow!',
          distanceDelta: 3,
          requiredItem: 'flashlight'
        }
      ],
      defaultChoiceIndex: 0,
      hint: 'Decide quickly before the monster reaches the door.'
    },
    hint: 'A quick reaction earns precious distance.'
  },
  {
    id: 'fallback-bandersnatch-2',
    template: 'bandersnatch',
    difficulty: 2,
    params: {
      scenario: 'The floorboards groan and begin to splinter. Ahead, high-voltage junction cables hang spit sparks over a flooded floor.',
      timeLimitSec: 8,
      choices: [
        {
          id: 'choice-leap',
          label: 'A: SPRINT THROUGH WATER',
          description: 'Risk the shallow water and sprint across the live cables.',
          consequence: 'Current shocks your boots and numbness bites your legs, but momentum carries you across to safety!',
          distanceDelta: 1
        },
        {
          id: 'choice-pipe',
          label: 'B: CLIMB STEAM PIPES',
          description: 'Pull yourself up and shimmy along the boiling pipes.',
          consequence: 'The heat burns your palms, but you bypass the electrified pool completely. The monster hesitates at the water!',
          distanceDelta: 2
        },
        {
          id: 'choice-wrench',
          label: 'C: [WRENCH] CUT POWER BREAKER',
          description: 'Lever the wrench against the master breaker box.',
          consequence: 'With a heavy metallic snap, you smash the circuit breaker. Sparks die out and the corridor plunges into dead silence!',
          distanceDelta: 3,
          requiredItem: 'wrench'
        }
      ],
      defaultChoiceIndex: 0,
      hint: 'Choose your crossing before the floor collapses.'
    },
    hint: 'Hazardous terrain ahead.'
  },
  {
    id: 'fallback-bandersnatch-3',
    template: 'bandersnatch',
    difficulty: 3,
    params: {
      scenario: 'The furnace groans at critical pressure. Black smoke pours through the grating. An emergency blow-off valve is stuck.',
      timeLimitSec: 7,
      choices: [
        {
          id: 'choice-vent',
          label: 'A: VENT STEAM REARWARD',
          description: 'Force the lever to flood the corridor behind you with boiling fog.',
          consequence: 'Superheated vapor engulfs the corridor behind you. A howling screech confirms the monster was caught in the blast!',
          distanceDelta: 2
        },
        {
          id: 'choice-evade',
          label: 'B: DUCK BEHIND RETAINING WALL',
          description: 'Brace behind concrete shields as pipes begin to burst.',
          consequence: 'Shrapnel ricochets off concrete shields. You emerge coughing through smoke, untouched.',
          distanceDelta: 1
        }
      ],
      defaultChoiceIndex: 0,
      hint: 'The pressure gauge is already in the red zone.'
    },
    hint: 'Steam is your shield.'
  }
];
