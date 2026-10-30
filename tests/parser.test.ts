import { describe, it, expect } from 'vitest';
import { parseCommand, getAutocompleteSuggestions } from '@wake/shared';

describe('Deterministic Command Parser', () => {
  it('parses directional movement aliases', () => {
    expect(parseCommand('n')).toEqual({ type: 'go', direction: 'north' });
    expect(parseCommand('south')).toEqual({ type: 'go', direction: 'south' });
    expect(parseCommand('go east')).toEqual({ type: 'go', direction: 'east' });
    expect(parseCommand('move up')).toEqual({ type: 'go', direction: 'up' });
    expect(parseCommand('d')).toEqual({ type: 'go', direction: 'down' });
  });

  it('parses look commands and targets', () => {
    expect(parseCommand('look')).toEqual({ type: 'look', target: undefined });
    expect(parseCommand('l mirror')).toEqual({ type: 'look', target: 'mirror' });
    expect(parseCommand('examine table')).toEqual({ type: 'look', target: 'table' });
  });

  it('parses item manipulation', () => {
    expect(parseCommand('take rusty_key')).toEqual({ type: 'take', item: 'rusty_key' });
    expect(parseCommand('use key on door')).toEqual({ type: 'use', item: 'key', target: 'door' });
    expect(parseCommand('use ethanol')).toEqual({ type: 'use', item: 'ethanol', target: undefined });
  });

  it('parses utility commands', () => {
    expect(parseCommand('inventory')).toEqual({ type: 'inventory' });
    expect(parseCommand('i')).toEqual({ type: 'inventory' });
    expect(parseCommand('map')).toEqual({ type: 'map' });
    expect(parseCommand('safe')).toEqual({ type: 'safe' });
    expect(parseCommand('help')).toEqual({ type: 'help' });
  });

  it('provides autocomplete suggestions', () => {
    expect(getAutocompleteSuggestions('go n')).toContain('go north');
    expect(getAutocompleteSuggestions('loo')).toContain('look');
  });
});
