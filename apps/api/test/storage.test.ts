import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestContext } from './support.js';

let ctx: TestContext | undefined;
afterEach(async () => {
  await ctx?.close();
  ctx = undefined;
});

describe('LocalStorage', () => {
  it('saveGenerated 把生成文件存到 generated/<项目>/<运行>/ 下', async () => {
    ctx = await createTestApp();
    const saved = ctx.storage.saveGenerated('project-1', 'run-1', 'script-output.txt', '生成产物');
    expect(saved.relPath).toBe('generated/project-1/run-1/script-output.txt');
    const onDisk = readFileSync(path.join(ctx.dataDir, saved.relPath), 'utf8');
    expect(onDisk).toBe('生成产物');
    expect(saved.sizeBytes).toBe(Buffer.byteLength('生成产物', 'utf8'));
  });

  it('saveSourceInput 与 saveGenerated 路径互不重叠', async () => {
    ctx = await createTestApp();
    const source = ctx.storage.saveSourceInput('p', 'script-source.txt', 'a');
    const generated = ctx.storage.saveGenerated('p', 'r', 'script-output.txt', 'b');
    expect(source.relPath.startsWith('source-input/')).toBe(true);
    expect(generated.relPath.startsWith('generated/')).toBe(true);
  });
});
