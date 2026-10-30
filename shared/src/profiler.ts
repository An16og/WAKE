import { PlayerProfile } from './types.js';

export interface TelemetryInputs {
  sessionId: string;
  totalPlayTimeMs: number;
  typingSpeedWpm: number;
  commandIdleTimeAvgMs: number;
  deaths: number;
  mistakesTotal: number;
  hintsUsedTotal: number;
  roomsRevisitedCount: number;
  itemsIgnoredCount: number;
  solveTimesByTemplate?: Record<string, number[]>;
  recentMistake?: string;
}

export function computePlayerProfile(inputs: TelemetryInputs): PlayerProfile {
  const tags: string[] = [];

  // Typing speed analysis
  if (inputs.typingSpeedWpm > 70) {
    tags.push('fast typist');
  } else if (inputs.typingSpeedWpm > 0 && inputs.typingSpeedWpm < 30) {
    tags.push('slow typist');
  }

  // Playstyle analysis
  if (inputs.commandIdleTimeAvgMs > 4000 && inputs.mistakesTotal <= 1) {
    tags.push('cautious');
  } else if (inputs.commandIdleTimeAvgMs < 1400 && inputs.mistakesTotal >= 2) {
    tags.push('reckless');
  } else if (inputs.mistakesTotal === 0 && inputs.totalPlayTimeMs > 10000) {
    tags.push('methodical');
  }

  if (inputs.commandIdleTimeAvgMs > 5500) {
    tags.push('hesitant');
  }

  if (inputs.deaths > 0) {
    tags.push('marked');
  }

  if (inputs.roomsRevisitedCount >= 2) {
    tags.push('inquisitive');
  }

  if (tags.length === 0) {
    tags.push('calibrating');
  }

  return {
    sessionId: inputs.sessionId,
    totalPlayTimeMs: Math.round(inputs.totalPlayTimeMs),
    typingSpeedWpm: Math.round(inputs.typingSpeedWpm),
    commandIdleTimeAvgMs: Math.round(inputs.commandIdleTimeAvgMs),
    deaths: inputs.deaths,
    mistakesTotal: inputs.mistakesTotal,
    hintsUsedTotal: inputs.hintsUsedTotal,
    roomsRevisitedCount: inputs.roomsRevisitedCount,
    itemsIgnoredCount: inputs.itemsIgnoredCount,
    solveTimesByTemplate: inputs.solveTimesByTemplate || {},
    tags,
    recentMistake: inputs.recentMistake || undefined
  };
}
