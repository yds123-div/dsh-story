export const SCRIPT_MAX_CHARS = 300_000;
export const SCRIPT_MIN_CHARS = 10;
export const SCRIPT_MAX_BYTES = 10 * 1024 * 1024;
export const ALLOWED_SCRIPT_EXTS = ['.txt', '.pdf', '.doc', '.docx', '.md'] as const;

export const NOVEL_MAX_CHARS = 100_000;
export const NOVEL_MIN_CHARS = 10;
export const NOVEL_MAX_BYTES = 10 * 1024 * 1024;
export const ALLOWED_NOVEL_EXTS = ['.txt', '.pdf', '.docx', '.md'] as const;

export type ScriptValidationOk = {
  ok: true;
  fileName: string;
  sizeBytes: number;
  charCount?: number;
};

export type ScriptValidationErr = {
  ok: false;
  message: string;
};

export type ScriptValidation = ScriptValidationOk | ScriptValidationErr;

function extensionOf(fileName: string): string {
  const i = fileName.lastIndexOf('.');
  return i >= 0 ? fileName.slice(i).toLowerCase() : '';
}

export function validateScriptFile(file: File): ScriptValidation {
  const ext = extensionOf(file.name);
  if (!ALLOWED_SCRIPT_EXTS.includes(ext as (typeof ALLOWED_SCRIPT_EXTS)[number])) {
    return { ok: false, message: '不支持的文件格式，请上传 txt / pdf / doc / docx / md' };
  }
  if (file.size > SCRIPT_MAX_BYTES) {
    return { ok: false, message: '文件过大：单文件不超过 10MB' };
  }
  return { ok: true, fileName: file.name, sizeBytes: file.size };
}

function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('读取文件失败'));
    reader.readAsText(blob);
  });
}

export async function validateScriptFileContent(file: File): Promise<ScriptValidation> {
  const base = validateScriptFile(file);
  if (!base.ok) return base;
  const ext = extensionOf(file.name);
  if (ext === '.txt' || ext === '.md') {
    const text = await readBlobText(file);
    if (text.length > SCRIPT_MAX_CHARS) {
      return { ok: false, message: '超出字数上限：剧本不超过 30 万字' };
    }
    return { ...base, charCount: text.length };
  }
  return base;
}

export function validateScriptText(text: string): ScriptValidation {
  const trimmed = text.trim();
  if (trimmed.length < SCRIPT_MIN_CHARS) {
    return { ok: false, message: '文本太短：请粘贴至少 10 字的剧本内容' };
  }
  if (trimmed.length > SCRIPT_MAX_CHARS) {
    return { ok: false, message: '超出字数上限：剧本不超过 30 万字' };
  }
  return {
    ok: true,
    fileName: '粘贴文本',
    sizeBytes: new TextEncoder().encode(trimmed).length,
    charCount: trimmed.length,
  };
}

export function validateNovelFile(file: File): ScriptValidation {
  const ext = extensionOf(file.name);
  if (!ALLOWED_NOVEL_EXTS.includes(ext as (typeof ALLOWED_NOVEL_EXTS)[number])) {
    return { ok: false, message: '不支持的文件格式，请上传 txt / docx / pdf / md' };
  }
  if (file.size > NOVEL_MAX_BYTES) {
    return { ok: false, message: '文件过大：单文件不超过 10MB' };
  }
  return { ok: true, fileName: file.name, sizeBytes: file.size };
}

export async function validateNovelFileContent(file: File): Promise<ScriptValidation> {
  const base = validateNovelFile(file);
  if (!base.ok) return base;
  const ext = extensionOf(file.name);
  if (ext === '.txt' || ext === '.md') {
    const text = await readBlobText(file);
    if (text.length > NOVEL_MAX_CHARS) {
      return { ok: false, message: '超出字数上限：小说不超过 10 万字' };
    }
    return { ...base, charCount: text.length };
  }
  return base;
}

export function validateNovelText(text: string): ScriptValidation {
  const trimmed = text.trim();
  if (trimmed.length < NOVEL_MIN_CHARS) {
    return { ok: false, message: '文本太短：请粘贴至少 10 字的小说内容' };
  }
  if (trimmed.length > NOVEL_MAX_CHARS) {
    return { ok: false, message: '超出字数上限：小说不超过 10 万字' };
  }
  return {
    ok: true,
    fileName: '粘贴文本',
    sizeBytes: new TextEncoder().encode(trimmed).length,
    charCount: trimmed.length,
  };
}
