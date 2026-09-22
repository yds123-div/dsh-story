import { insertAssetMention, parsePromptParts } from './promptMentions';

describe('parsePromptParts', () => {
  it('turns @[assetId] into a mention chip part', () => {
    expect(parsePromptParts('在 @[proj-nming-muye-char-linwan] 身边')).toEqual([
      { kind: 'text', text: '在 ' },
      { kind: 'mention', assetId: 'proj-nming-muye-char-linwan' },
      { kind: 'text', text: ' 身边' },
    ]);
  });

  it('keeps plain prompt text as a single part', () => {
    expect(parsePromptParts('冷白月光洒在深色木地板上')).toEqual([
      { kind: 'text', text: '冷白月光洒在深色木地板上' },
    ]);
  });
});

describe('insertAssetMention', () => {
  it('replaces a trailing @ at the cursor with an asset mention', () => {
    const next = insertAssetMention('走廊 @', 4, 'proj-nming-muye-scene-corridor');
    expect(next.prompt).toBe('走廊 @[proj-nming-muye-scene-corridor]');
    expect(next.cursor).toBe('走廊 @[proj-nming-muye-scene-corridor]'.length);
  });

  it('inserts a mention at the cursor when there is no trailing @', () => {
    const next = insertAssetMention('走廊 ', 3, 'proj-nming-muye-char-linwan');
    expect(next.prompt).toBe('走廊 @[proj-nming-muye-char-linwan]');
  });
});
