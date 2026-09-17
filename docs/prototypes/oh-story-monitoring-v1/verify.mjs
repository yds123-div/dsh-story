// PROTOTYPE — 对账脚本（../spec.md §9 第 4 条）
// 读 monitor 插件落的 JSONL + harness 会话日志（多帧 zstd），核对 token 口径一致。
// 用法：node --import file:///D:/Shenlan/deepblue-harness/node_modules/tsx/dist/esm/index.mjs verify.mjs <sessionDir> <monitorJsonl>
import { readFileSync } from 'node:fs'
import { zstdDecompress } from 'node:zlib'
import { promisify } from 'node:util'
import { scanZstdFrames } from 'file:///D:/Shenlan/deepblue-harness/packages/session/session-persistence-jsonl/src/zstd.ts'

const zstdDecompressAsync = promisify(zstdDecompress)

const sessionDir = process.argv[2]
const monitorFile = process.argv[3]

// 1) harness 会话日志：多帧 zstd → 拼出完整 JSONL
const raw = readFileSync(`${sessionDir}/session.v2.jsonl.zstd`)
const { frames } = scanZstdFrames(raw)
let text = ''
for (const f of frames) {
  text += (await zstdDecompressAsync(raw.subarray(f.start, f.end))).toString('utf8')
}
const logUsage = []
const logTurns = []
for (const line of text.trim().split('\n')) {
  const e = JSON.parse(line)
  if (e.type === 'assistant/message') logUsage.push(e.data.usage)
  if (e.type === 'turn/end') logTurns.push(e.data.reason?.kind)
}

// 2) monitor 插件记录
const recs = readFileSync(monitorFile, 'utf8').trim().split('\n').map(l => JSON.parse(l))
const monBehavior = recs.filter(r => r.kind === 'llm_call' && r.purpose === 'behavior' && r.usage)
const monSystem = recs.filter(r => r.kind === 'llm_call' && r.purpose !== 'behavior' && r.usage)
const monTurns = recs.filter(r => r.kind === 'turn_end').map(r => r.reason?.kind)

const sum = us => us.reduce((a, u) => ({
  inputTokens: a.inputTokens + (u.inputTokens ?? 0),
  outputTokens: a.outputTokens + (u.outputTokens ?? 0),
}), { inputTokens: 0, outputTokens: 0 })

console.log('=== 对账：monitor 插件 vs harness 会话日志 ===')
console.log('会话日志 assistant/message 次数:', logUsage.length, '| turn_end:', JSON.stringify(logTurns))
console.log('monitor llm_call(purpose=behavior):', monBehavior.length, '| turn_end:', JSON.stringify(monTurns))
console.log('monitor llm_call(purpose=system, C3):', monSystem.length,
  '(会话日志不含这些 —— C3 只走 llm/stream，符合设计)')
console.log('')
console.log('五桶合计（会话日志 vs monitor behavior）:')
console.log(JSON.stringify(sum(logUsage)), 'vs', JSON.stringify(sum(monBehavior.map(r => r.usage))))
const a = sum(logUsage), b = sum(monBehavior.map(r => r.usage))
const ok = a.inputTokens === b.inputTokens && a.outputTokens === b.outputTokens && logUsage.length === monBehavior.length
console.log(ok ? '✓ 对账一致' : '✗ 存在差异，需排查')
