import { SCRIPT_MAX_CHARS, validateScriptFile, validateScriptFileContent, validateScriptText } from './scriptValidation';

describe('validateScriptFile', () => {
  it('rejects unsupported formats', () => {
    const file = new File(['x'], 'script.zip', { type: 'application/zip' });
    const result = validateScriptFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('不支持的文件格式');
  });

  it('rejects binary document formats (first phase is txt / md only)', () => {
    for (const name of ['剧本.docx', '剧本.pdf', '剧本.doc']) {
      const file = new File(['x'], name, { type: 'application/octet-stream' });
      const result = validateScriptFile(file);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message).toContain('txt / md');
    }
  });

  it('rejects files larger than 10MB', () => {
    const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'a.txt', { type: 'text/plain' });
    const result = validateScriptFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('10MB');
  });

  it('accepts txt and counts characters', async () => {
    const file = new File(['hello-world'], '逆命木叶.txt', { type: 'text/plain' });
    const result = await validateScriptFileContent(file);
    expect(result).toMatchObject({ ok: true, charCount: 11 });
  });
});

describe('validateScriptText', () => {
  it('rejects text shorter than 10 characters', () => {
    const result = validateScriptText('太短了');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('至少 10 字');
  });

  it('rejects text over 300000 characters', () => {
    const result = validateScriptText('字'.repeat(SCRIPT_MAX_CHARS + 1));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('30 万字');
  });

  it('accepts a valid pasted script', () => {
    const result = validateScriptText('林晚扶着廊柱，指尖颤抖。鼬从阴影走出。');
    expect(result).toMatchObject({ ok: true, charCount: 19 });
  });
});
