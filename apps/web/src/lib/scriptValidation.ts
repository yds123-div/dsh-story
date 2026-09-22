import { SOURCE_INPUT_LIMITS } from '@dsh-story/contracts';

/**
 * 原始输入校验：约束以产品契约（SOURCE_INPUT_LIMITS）为单一来源，
 * 与后端 /api/product/projects/:id/inputs* 的服务端校验保持一致。
 * 首期文件上传只支持 txt / md 纯文本；pdf / docx 等二进制格式的解析是后续工单范围。
 */
export const SCRIPT_MAX_CHARS = SOURCE_INPUT_LIMITS.scriptMaxChars;
export const SCRIPT_MIN_CHARS = SOURCE_INPUT_LIMITS.minChars;
export const SCRIPT_MAX_BYTES = SOURCE_INPUT_LIMITS.maxFileBytes;
export const ALLOWED_SCRIPT_EXTS = SOURCE_INPUT_LIMITS.allowedFileExtensions;

export const NOVEL_MAX_CHARS = SOURCE_INPUT_LIMITS.novelMaxChars;
export const NOVEL_MIN_CHARS = SOURCE_INPUT_LIMITS.minChars;
export const NOVEL_MAX_BYTES = SOURCE_INPUT_LIMITS.maxFileBytes;
export const ALLOWED_NOVEL_EXTS = SOURCE_INPUT_LIMITS.allowedFileExtensions;

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

type FileLimits = {
  allowedExts: readonly string[];
  maxBytes: number;
};

function extensionOf(fileName: string): string {
  const i = fileName.lastIndexOf('.');
  return i >= 0 ? fileName.slice(i).toLowerCase() : '';
}

/** 文件扩展名与大小校验：剧本 / 小说共用，只在约束与措辞上参数化 */
function validateFileBase(file: File, limits: FileLimits, label: string): ScriptValidation {
  const ext = extensionOf(file.name);
  if (!limits.allowedExts.includes(ext)) {
    return { ok: false, message: `不支持的文件格式，请上传${label}文本文件` };
  }
  if (file.size > limits.maxBytes) {
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

/** 读取文件文本并校验字数上限：剧本 / 小说共用 */
async function validateFileContent(file: File, maxChars: number, tooLong: string, limits: FileLimits, label: string): Promise<ScriptValidation> {
  const base = validateFileBase(file, limits, label);
  if (!base.ok) return base;
  const text = await readBlobText(file);
  if (text.length > maxChars) {
    return { ok: false, message: `超出字数上限：${tooLong}` };
  }
  return { ...base, charCount: text.length };
}

function validateText(text: string, minChars: number, maxChars: number, label: string, tooLong: string): ScriptValidation {
  const trimmed = text.trim();
  if (trimmed.length < minChars) {
    return { ok: false, message: `文本太短：请粘贴至少 ${minChars} 字的${label}内容` };
  }
  if (trimmed.length > maxChars) {
    return { ok: false, message: `超出字数上限：${tooLong}` };
  }
  return {
    ok: true,
    fileName: '粘贴文本',
    sizeBytes: new TextEncoder().encode(trimmed).length,
    charCount: trimmed.length,
  };
}

const SCRIPT_LIMITS: FileLimits = { allowedExts: ALLOWED_SCRIPT_EXTS, maxBytes: SCRIPT_MAX_BYTES };
const NOVEL_LIMITS: FileLimits = { allowedExts: ALLOWED_NOVEL_EXTS, maxBytes: NOVEL_MAX_BYTES };

export function validateScriptFile(file: File): ScriptValidation {
  return validateFileBase(file, SCRIPT_LIMITS, 'txt / md ');
}

export function validateScriptFileContent(file: File): Promise<ScriptValidation> {
  return validateFileContent(file, SCRIPT_MAX_CHARS, '剧本不超过 30 万字', SCRIPT_LIMITS, 'txt / md ');
}

export function validateScriptText(text: string): ScriptValidation {
  return validateText(text, SCRIPT_MIN_CHARS, SCRIPT_MAX_CHARS, '剧本', '剧本不超过 30 万字');
}

export function validateNovelFile(file: File): ScriptValidation {
  return validateFileBase(file, NOVEL_LIMITS, 'txt / md ');
}

export function validateNovelFileContent(file: File): Promise<ScriptValidation> {
  return validateFileContent(file, NOVEL_MAX_CHARS, '小说不超过 10 万字', NOVEL_LIMITS, 'txt / md ');
}

export function validateNovelText(text: string): ScriptValidation {
  return validateText(text, NOVEL_MIN_CHARS, NOVEL_MAX_CHARS, '小说', '小说不超过 10 万字');
}
