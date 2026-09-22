export type PromptPart = { kind: 'text'; text: string } | { kind: 'mention'; assetId: string };

const MENTION = /@\[([^\]]+)\]/g;

export function parsePromptParts(prompt: string): PromptPart[] {
  const parts: PromptPart[] = [];
  let last = 0;
  for (const match of prompt.matchAll(MENTION)) {
    const start = match.index ?? 0;
    if (start > last) parts.push({ kind: 'text', text: prompt.slice(last, start) });
    parts.push({ kind: 'mention', assetId: match[1] ?? '' });
    last = start + match[0].length;
  }
  if (last < prompt.length) parts.push({ kind: 'text', text: prompt.slice(last) });
  if (parts.length === 0 && prompt.length === 0) return [];
  if (parts.length === 0) return [{ kind: 'text', text: prompt }];
  return parts;
}

export function mentionToken(assetId: string): string {
  return `@[${assetId}]`;
}

export function insertAssetMention(
  prompt: string,
  cursor: number,
  assetId: string,
): { prompt: string; cursor: number } {
  const safeCursor = Math.max(0, Math.min(cursor, prompt.length));
  const before = prompt.slice(0, safeCursor);
  const after = prompt.slice(safeCursor);
  const replaced = before.endsWith('@') ? before.slice(0, -1) : before;
  const token = mentionToken(assetId);
  const next = `${replaced}${token}${after}`;
  return { prompt: next, cursor: replaced.length + token.length };
}
