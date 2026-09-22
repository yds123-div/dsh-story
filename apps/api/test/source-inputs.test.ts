import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { SOURCE_INPUT_LIMITS } from '@dsh-story/contracts';
import { createTestApp, type TestContext } from './support.js';

let ctx: TestContext | undefined;
afterEach(async () => {
  await ctx?.close();
  ctx = undefined;
});

async function createProject(mode?: 'script' | 'novel'): Promise<string> {
  const res = await ctx!.app.inject({
    method: 'POST',
    url: '/api/product/projects',
    payload: mode ? { title: '原始输入', mode } : { title: '原始输入' },
  });
  return res.json().project.id as string;
}

/** 构造 multipart/form-data 请求体（light-my-request 直接发原始字节） */
function multipartBody(boundary: string, field: string, filename: string, content: string): { headers: Record<string, string>; payload: string } {
  const body = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="${field}"; filename="${filename}"`,
    'Content-Type: text/plain',
    '',
    content,
    `--${boundary}--`,
    '',
  ].join('\r\n');
  return {
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
    payload: body,
  };
}

function injectUpload(projectId: string, filename: string, content: string) {
  const { headers, payload } = multipartBody('dsh-boundary', 'file', filename, content);
  return ctx!.app.inject({
    method: 'POST',
    url: `/api/product/projects/${projectId}/inputs/file`,
    headers,
    payload,
  });
}

describe('POST /api/product/projects/:id/inputs/file', () => {
  it('保存上传的 txt 文件到本地目录并登记元数据', async () => {
    ctx = await createTestApp();
    const projectId = await createProject();
    const res = await injectUpload(projectId, '逆命木叶.txt', '【木叶长廊 内 夜】\n林晚扶着廊柱。');
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.projectId).toBe(projectId);
    expect(body.kind).toBe('source-input');
    expect(body.role).toBe('script-source');
    expect(body.mimeType).toBe('text/plain');
    expect(body.path).toMatch(new RegExp(`^source-input/${projectId}/[\\w-]+-逆命木叶\\.txt$`));
    const onDisk = readFileSync(path.join(ctx.dataDir, body.path), 'utf8');
    expect(onDisk).toBe('【木叶长廊 内 夜】\n林晚扶着廊柱。');
    expect(body.sizeBytes).toBeGreaterThan(0);
  });

  it('小说项目的原始输入记为 novel-source 角色，md 文件记 text/markdown', async () => {
    ctx = await createTestApp();
    const projectId = await createProject('novel');
    const res = await injectUpload(projectId, '第一章.md', '林晚扶着廊柱，指尖颤抖。');
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.role).toBe('novel-source');
    expect(body.mimeType).toBe('text/markdown');
  });

  it('同名文件重复保存不覆盖旧文件：两份记录各自的内容可追溯', async () => {
    ctx = await createTestApp();
    const projectId = await createProject();
    const first = await injectUpload(projectId, '剧本.txt', '第一次保存的原始内容。');
    expect(first.statusCode).toBe(201);
    const second = await injectUpload(projectId, '剧本.txt', '第二次保存的原始内容，与第一份不同。');
    expect(second.statusCode).toBe(201);
    const firstPath = first.json().path as string;
    const secondPath = second.json().path as string;
    expect(firstPath).not.toBe(secondPath);
    expect(readFileSync(path.join(ctx.dataDir, firstPath), 'utf8')).toBe('第一次保存的原始内容。');
    expect(readFileSync(path.join(ctx.dataDir, secondPath), 'utf8')).toBe('第二次保存的原始内容，与第一份不同。');
  });

  it('含 Windows 保留字符的文件名收敛到随机文件名', async () => {
    ctx = await createTestApp();
    const projectId = await createProject();
    const res = await injectUpload(projectId, '剧:本.txt', '含保留字符的文件名测试文本。');
    expect(res.statusCode).toBe(201);
    expect(res.json().path).toMatch(new RegExp(`^source-input/${projectId}/[\\w-]+-input-[\\w-]+\\.txt$`));
  });

  it('拒绝非法文件类型（415）', async () => {
    ctx = await createTestApp();
    const projectId = await createProject();
    const res = await injectUpload(projectId, '剧本.docx', 'binary-ish');
    expect(res.statusCode).toBe(415);
    expect(res.json().message).toContain('txt / md');
  });

  it('拒绝非 UTF-8 文本内容（400）', async () => {
    ctx = await createTestApp();
    const projectId = await createProject();
    const boundary = 'dsh-boundary';
    const body = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="a.txt"',
      'Content-Type: text/plain',
      '',
    ].join('\r\n');
    // GBK 编码的中文，UTF-8 解码必然失败
    const payload = Buffer.concat([
      Buffer.from(body + '\r\n', 'utf8'),
      Buffer.from([0xc1, 0xf2, 0xcd, 0xed]), // “林晚” 的 GBK 字节
      Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8'),
    ]);
    const res = await ctx.app.inject({
      method: 'POST',
      url: `/api/product/projects/${projectId}/inputs/file`,
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toContain('UTF-8');
  });

  it('拒绝超过字数上限的文件（413）', async () => {
    ctx = await createTestApp();
    const projectId = await createProject('novel');
    const res = await injectUpload(projectId, '长篇.txt', '字'.repeat(SOURCE_INPUT_LIMITS.novelMaxChars + 1));
    expect(res.statusCode).toBe(413);
  });

  it('拒绝超过 10MB 的文件（413）', async () => {
    ctx = await createTestApp();
    const projectId = await createProject();
    const res = await injectUpload(projectId, '超大.txt', 'x'.repeat(SOURCE_INPUT_LIMITS.maxFileBytes + 1024));
    expect(res.statusCode).toBe(413);
  });

  it('未知项目返回 404', async () => {
    ctx = await createTestApp();
    const res = await injectUpload('no-such-id', 'a.txt', '内容太短也会先被 404 拦截');
    expect(res.statusCode).toBe(404);
  });
});

describe('POST /api/product/projects/:id/inputs（文本）', () => {
  it('拒绝超过字数上限的文本（413）', async () => {
    ctx = await createTestApp();
    const projectId = await createProject();
    const res = await ctx.app.inject({
      method: 'POST',
      url: `/api/product/projects/${projectId}/inputs`,
      payload: { text: '字'.repeat(SOURCE_INPUT_LIMITS.scriptMaxChars + 1) },
    });
    expect(res.statusCode).toBe(413);
    expect(res.json().message).toContain('30 万字');
  });

  it('小说项目按 10 万字上限校验', async () => {
    ctx = await createTestApp();
    const projectId = await createProject('novel');
    const res = await ctx.app.inject({
      method: 'POST',
      url: `/api/product/projects/${projectId}/inputs`,
      payload: { text: '字'.repeat(SOURCE_INPUT_LIMITS.novelMaxChars + 1) },
    });
    expect(res.statusCode).toBe(413);
  });
});

describe('GET /api/product/projects/:id/inputs/:fileId', () => {
  it('返回原始输入的只读文本内容', async () => {
    ctx = await createTestApp();
    const projectId = await createProject();
    const saved = await ctx.app.inject({
      method: 'POST',
      url: `/api/product/projects/${projectId}/inputs`,
      payload: { filename: 'a.txt', text: '第一场 内景 长廊 - 夜' },
    });
    const fileId = saved.json().id as string;
    const res = await ctx.app.inject({ method: 'GET', url: `/api/product/projects/${projectId}/inputs/${fileId}` });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.body).toBe('第一场 内景 长廊 - 夜');
  });

  it('其他项目的文件返回 404', async () => {
    ctx = await createTestApp();
    const projectId = await createProject();
    const otherId = await createProject();
    const saved = await ctx.app.inject({
      method: 'POST',
      url: `/api/product/projects/${projectId}/inputs`,
      payload: { text: '第一场 内景 长廊 - 夜' },
    });
    const fileId = saved.json().id as string;
    const res = await ctx.app.inject({ method: 'GET', url: `/api/product/projects/${otherId}/inputs/${fileId}` });
    expect(res.statusCode).toBe(404);
  });

  it('未知文件返回 404', async () => {
    ctx = await createTestApp();
    const projectId = await createProject();
    const res = await ctx.app.inject({ method: 'GET', url: `/api/product/projects/${projectId}/inputs/no-such-file` });
    expect(res.statusCode).toBe(404);
  });
});

describe('POST /api/product/projects/:id/runs（原始输入引用）', () => {
  it('运行必须引用本项目的原始输入文件', async () => {
    ctx = await createTestApp();
    const projectId = await createProject();
    const saved = await ctx.app.inject({
      method: 'POST',
      url: `/api/product/projects/${projectId}/inputs`,
      payload: { text: '第一场 内景 长廊 - 夜' },
    });
    const sourceFileId = saved.json().id as string;
    const res = await ctx.app.inject({
      method: 'POST',
      url: `/api/product/projects/${projectId}/runs`,
      payload: { kind: 'script', sourceFileId },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().sourceFileId).toBe(sourceFileId);
  });

  it('缺少 sourceFileId 拒绝（400）', async () => {
    ctx = await createTestApp();
    const projectId = await createProject();
    const res = await ctx.app.inject({
      method: 'POST',
      url: `/api/product/projects/${projectId}/runs`,
      payload: { kind: 'script' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toContain('sourceFileId');
  });

  it('asset-extraction 运行暂不要求原始输入引用（其引用模型由工单 04+ 定义）', async () => {
    ctx = await createTestApp();
    const projectId = await createProject();
    const res = await ctx.app.inject({
      method: 'POST',
      url: `/api/product/projects/${projectId}/runs`,
      payload: { kind: 'asset-extraction' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().sourceFileId).toBeNull();
  });

  it('引用不存在或其他项目的文件拒绝（404）', async () => {
    ctx = await createTestApp();
    const projectId = await createProject();
    const otherId = await createProject();
    const saved = await ctx.app.inject({
      method: 'POST',
      url: `/api/product/projects/${otherId}/inputs`,
      payload: { text: '别人项目的原始输入内容' },
    });
    const otherFileId = saved.json().id as string;
    const notExist = await ctx.app.inject({
      method: 'POST',
      url: `/api/product/projects/${projectId}/runs`,
      payload: { kind: 'script', sourceFileId: 'no-such-file' },
    });
    expect(notExist.statusCode).toBe(404);
    const crossProject = await ctx.app.inject({
      method: 'POST',
      url: `/api/product/projects/${projectId}/runs`,
      payload: { kind: 'script', sourceFileId: otherFileId },
    });
    expect(crossProject.statusCode).toBe(404);
  });
});
