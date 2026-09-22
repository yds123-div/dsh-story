import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export interface SavedFile {
  /** 相对数据目录的 POSIX 风格路径，存入数据库作为文件引用 */
  relPath: string;
  sizeBytes: number;
}

export interface LocalStorage {
  root: string;
  saveSourceInput(projectId: string, fileName: string, content: string): SavedFile;
  saveGenerated(projectId: string, runId: string, fileName: string, content: string): SavedFile;
  checkWritable(): boolean;
}

/**
 * 本地文件目录：source-input/ 存原始输入，generated/ 存生成文件。
 * 首期不做对象存储；后续可在不改变业务产物引用（POSIX 相对路径）的前提下替换实现。
 */
export function createLocalStorage(root: string): LocalStorage {
  mkdirSync(path.join(root, 'source-input'), { recursive: true });
  mkdirSync(path.join(root, 'generated'), { recursive: true });

  return {
    root,
    saveSourceInput(projectId, fileName, content) {
      const dir = path.join(root, 'source-input', projectId);
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, fileName), content, 'utf8');
      return {
        relPath: `source-input/${projectId}/${fileName}`,
        sizeBytes: Buffer.byteLength(content, 'utf8'),
      };
    },
    saveGenerated(projectId, runId, fileName, content) {
      const dir = path.join(root, 'generated', projectId, runId);
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, fileName), content, 'utf8');
      return {
        relPath: `generated/${projectId}/${runId}/${fileName}`,
        sizeBytes: Buffer.byteLength(content, 'utf8'),
      };
    },
    checkWritable() {
      const probe = path.join(root, '.health-probe');
      try {
        writeFileSync(probe, 'ok', 'utf8');
        rmSync(probe, { force: true });
        return true;
      } catch {
        return false;
      }
    },
  };
}
