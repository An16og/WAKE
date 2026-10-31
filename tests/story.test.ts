import { describe, it, expect } from 'vitest';
import { STORY_ROOMS, FALLBACK_CHALLENGES } from '@wake/content';

describe('Bandersnatch Story & Branching Architecture', () => {
  it('verifies all rooms in the story have itemless design', () => {
    for (const [roomId, room] of Object.entries(STORY_ROOMS)) {
      expect(room.items).toBeDefined();
      expect(room.items.length).toBe(0);
      expect(room.narration.length).toBeGreaterThan(0);
      expect(room.firstPersonDrift.length).toBeGreaterThan(0);
    }
  });

  it('verifies the bedroom inciting dilemma branches into meta and beast paths', () => {
    const bedroomDilemma = FALLBACK_CHALLENGES.find((c) => c.id === 'bandersnatch-bedroom-dilemma');
    expect(bedroomDilemma).toBeDefined();
    expect(bedroomDilemma?.params.choices.length).toBe(2);

    const choices = bedroomDilemma?.params.choices;
    const metaChoice = choices?.find((c: any) => c.branchId === 'meta');
    const beastChoice = choices?.find((c: any) => c.branchId === 'beast');

    expect(metaChoice).toBeDefined();
    expect(metaChoice?.nextRoomId).toBe('server_archive');
    expect(metaChoice?.sanityDelta).toBeLessThan(0);

    expect(beastChoice).toBeDefined();
    expect(beastChoice?.nextRoomId).toBe('flesh_cellar');
    expect(beastChoice?.sanityDelta).toBeLessThan(0);
  });

  it('verifies the meta path leads sequentially to mirror_vault', () => {
    const serverDilemma = FALLBACK_CHALLENGES.find((c) => c.id === 'bandersnatch-server-dilemma');
    expect(serverDilemma).toBeDefined();
    expect(serverDilemma?.params.choices.every((c: any) => c.nextRoomId === 'simulation_core')).toBe(true);

    const simDilemma = FALLBACK_CHALLENGES.find((c) => c.id === 'bandersnatch-sim-dilemma');
    expect(simDilemma).toBeDefined();
    expect(simDilemma?.params.choices.every((c: any) => c.nextRoomId === 'mirror_vault')).toBe(true);
  });

  it('verifies the beast path leads sequentially to mirror_vault', () => {
    const cellarDilemma = FALLBACK_CHALLENGES.find((c) => c.id === 'bandersnatch-cellar-dilemma');
    expect(cellarDilemma).toBeDefined();
    expect(cellarDilemma?.params.choices.every((c: any) => c.nextRoomId === 'pulsing_antechamber')).toBe(true);

    const antechamberDilemma = FALLBACK_CHALLENGES.find((c) => c.id === 'bandersnatch-antechamber-dilemma');
    expect(antechamberDilemma).toBeDefined();
    expect(antechamberDilemma?.params.choices.every((c: any) => c.nextRoomId === 'mirror_vault')).toBe(true);
  });
});
