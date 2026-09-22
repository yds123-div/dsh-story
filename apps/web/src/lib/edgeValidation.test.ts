import { describe, expect, it } from 'vitest';
import type { Edge } from '@xyflow/react';
import { hasEquivalentEdge, isValidConnection } from './edgeValidation';

const EDGES: Edge[] = [
  { id: 'e-script-linwan', source: 'script', target: 'linwan' },
  { id: 'e-img1-vid1', source: 'img1', target: 'vid1' },
];

describe('isValidConnection', () => {
  it('accepts a connection between two distinct nodes', () => {
    expect(isValidConnection({ source: 'a', target: 'b' })).toBe(true);
  });

  it('rejects self loops', () => {
    expect(isValidConnection({ source: 'a', target: 'a' })).toBe(false);
  });

  it('rejects missing endpoints', () => {
    expect(isValidConnection(null)).toBe(false);
    expect(isValidConnection({ source: '', target: 'b' })).toBe(false);
    expect(isValidConnection({ source: 'a', target: '' })).toBe(false);
  });
});

describe('hasEquivalentEdge', () => {
  it('detects an existing edge in the same direction', () => {
    expect(hasEquivalentEdge(EDGES, 'script', 'linwan')).toBe(true);
  });

  it('detects an existing edge in the reverse direction', () => {
    expect(hasEquivalentEdge(EDGES, 'linwan', 'script')).toBe(true);
  });

  it('passes when no equivalent edge exists', () => {
    expect(hasEquivalentEdge(EDGES, 'linwan', 'vid1')).toBe(false);
    expect(hasEquivalentEdge([], 'a', 'b')).toBe(false);
  });
});
