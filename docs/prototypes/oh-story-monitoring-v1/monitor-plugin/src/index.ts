/**
 * PROTOTYPE — throwaway monitoring collection probe. NOT production code.
 *
 * Question it answers (../spec.md §9): without touching harness source, can a
 * plain cordis plugin capture —
 *   (a) per-model-call five-bucket token usage (llm/stream waterfall),
 *   (b) turn-attributed session events (session/event firehose),
 *   (c) an Umami script tag injected into the served index.html
 *       (webserver/index-inject), plus expose the creator id to the page.
 *
 * Output: JSONL at $MONITOR_PROTO_OUT (default ~/.dsh/monitor-prototype/),
 * one line per record with a `kind` discriminator. Wipe freely.
 *
 * Env knobs (no rebuild needed):
 *   MONITOR_PROTO_OUT   output directory
 *   UMAMI_SCRIPT_SRC     e.g. http://127.0.0.1:3000/script.js
 *   UMAMI_WEBSITE_ID     Umami website id for the injected tag
 */

import { appendFileSync, mkdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const name = 'oh-story-monitor-prototype'

// No `inject` on purpose: llm/session events are global, and the webServer
// service is absent in some profiles — the index-inject listener simply never
// fires there instead of blocking plugin startup.

const OUT_DIR = process.env.MONITOR_PROTO_OUT ?? join(homedir(), '.dsh', 'monitor-prototype')
const OUT_FILE = join(OUT_DIR, 'monitor-prototype.jsonl')

/** harness-home anonymous user id, read straight from the file (no deps). */
function creatorId(): string {
  const home = process.env.DSH_HOME ?? join(homedir(), '.dsh')
  try {
    return readFileSync(join(home, '.anonymous-user-id'), 'utf8').trim()
  } catch {
    return 'unknown-creator'
  }
}

function record(kind: string, data: Record<string, unknown>): void {
  const line = JSON.stringify({ kind, ts: Date.now(), creator: creatorId(), ...data })
  try {
    appendFileSync(OUT_FILE, line + '\n')
  } catch (err) {
    console.error(`[monitor-prototype] write failed: ${String(err)}`)
  }
}

export async function apply(ctx: any): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true })
  console.log(`[monitor-prototype] writing to ${OUT_FILE}`)

  // (a) every model call, incl. compaction/title auxiliaries (purpose distinguishes C3)
  ctx.on('llm/stream', (options: any, next: () => AsyncIterable<any>) => {
    const startedAt = Date.now()
    return (async function* () {
      let usage: any
      let finish: any
      let failure: any
      try {
        for await (const chunk of next()) {
          if (chunk?.type === 'usage') usage = chunk.usage
          else if (chunk?.type === 'finish') finish = chunk.reason
          yield chunk
        }
      } catch (err: any) {
        failure = { message: String(err?.message ?? err), code: err?.failure?.code ?? err?.code }
        throw err
      } finally {
        record('llm_call', {
          provider: options?.provider,
          model: options?.model,
          purpose: options?.purpose ?? 'behavior',
          sessionId: options?.sessionId,
          latencyMs: Date.now() - startedAt,
          usage,   // five buckets: inputTokens/outputTokens/cacheReadTokens/cacheWriteTokens/reasoningTokens
          finish,
          failure,
        })
      }
    })()
  })

  // (b) turn-attributed session events
  ctx.on('session/event', (session: any, event: any) => {
    const sessionId = session?.header?.id
    if (event.type === 'assistant/message') {
      record('assistant_message', {
        sessionId,
        turn: event.data.turn,
        step: event.data.step,
        usage: event.data.usage,
        model: event.data.message?.source,
        interrupted: event.data.interrupted === true,
      })
    } else if (event.type === 'turn/end') {
      record('turn_end', { sessionId, turn: event.data.turn, reason: event.data.reason })
    } else if (event.type === 'tool/call') {
      record('tool_call', { sessionId, turn: event.data.turn, step: event.data.step, tool: event.data.name })
    }
  })

  // login proxy: session creation = a creator got in and started
  ctx.on('session/created', (session: any) => {
    record('session_created', { sessionId: session?.header?.id })
  })

  // (c) Umami injection probe: raw script tag + creator id for the page
  ctx.on('webserver/index-inject', (table: any[]) => {
    const src = process.env.UMAMI_SCRIPT_SRC
    const websiteId = process.env.UMAMI_WEBSITE_ID
    if (src && websiteId) {
      table.push({ kind: 'html', placement: 'head', html: `<script defer src="${src}" data-website-id="${websiteId}"></script>` })
    }
    table.push({ kind: 'global', name: '__OH_STORY_CREATOR_ID__', value: creatorId() })
  })
}

export default { name, apply }
