import type { ScriptStageHarness } from './types.js';
import { DshSdkScriptStageHarness, MockScriptStageHarness } from './dsh-sdk-adapter.js';
import type { AppConfig } from '../config.js';

/**
 * Harness 适配器工厂
 * 用于创建不同类型的 Harness 实现
 */
export class HarnessFactory {
  /**
   * 创建剧本阶段 Harness 适配器
   * @param config 应用配置
   * @param type Harness 类型，默认从环境变量 HARNESSTYPE 获取
   * @returns Harness 适配器实例
   */
  static createScriptStageHarness(config: AppConfig, type?: string): ScriptStageHarness {
    const harnessType = type || process.env.HARNESS_TYPE || 'dsh-sdk';

    switch (harnessType.toLowerCase()) {
      case 'dsh-sdk':
        return new DshSdkScriptStageHarness(config);
      case 'mock':
      case 'test':
        return new MockScriptStageHarness();
      default:
        throw new Error(`Unsupported harness type: ${harnessType}`);
    }
  }
}

// 导出类型
export * from './types.js';
export * from './dsh-sdk-adapter.js';