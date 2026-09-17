// src/index.ts
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
var name = "oh-story-monitor-prototype";
var OUT_DIR = process.env.MONITOR_PROTO_OUT ?? join(homedir(), ".dsh", "monitor-prototype");
var OUT_FILE = join(OUT_DIR, "monitor-prototype.jsonl");
function creatorId() {
  const home = process.env.DSH_HOME ?? join(homedir(), ".dsh");
  try {
    return readFileSync(join(home, ".anonymous-user-id"), "utf8").trim();
  } catch {
    return "unknown-creator";
  }
}
function record(kind, data) {
  const line = JSON.stringify({ kind, ts: Date.now(), creator: creatorId(), ...data });
  try {
    appendFileSync(OUT_FILE, line + "\n");
  } catch (err) {
    console.error(`[monitor-prototype] write failed: ${String(err)}`);
  }
}
async function apply(ctx) {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`[monitor-prototype] writing to ${OUT_FILE}`);
  ctx.on("llm/stream", (options, next) => {
    const startedAt = Date.now();
    return (async function* () {
      let usage;
      let finish;
      let failure;
      try {
        for await (const chunk of next()) {
          if (chunk?.type === "usage") usage = chunk.usage;
          else if (chunk?.type === "finish") finish = chunk.reason;
          yield chunk;
        }
      } catch (err) {
        failure = { message: String(err?.message ?? err), code: err?.failure?.code ?? err?.code };
        throw err;
      } finally {
        record("llm_call", {
          provider: options?.provider,
          model: options?.model,
          purpose: options?.purpose ?? "behavior",
          sessionId: options?.sessionId,
          latencyMs: Date.now() - startedAt,
          usage,
          // five buckets: inputTokens/outputTokens/cacheReadTokens/cacheWriteTokens/reasoningTokens
          finish,
          failure
        });
      }
    })();
  });
  ctx.on("session/event", (session, event) => {
    const sessionId = session?.header?.id;
    if (event.type === "assistant/message") {
      record("assistant_message", {
        sessionId,
        turn: event.data.turn,
        step: event.data.step,
        usage: event.data.usage,
        model: event.data.message?.source,
        interrupted: event.data.interrupted === true
      });
    } else if (event.type === "turn/end") {
      record("turn_end", { sessionId, turn: event.data.turn, reason: event.data.reason });
    } else if (event.type === "tool/call") {
      record("tool_call", { sessionId, turn: event.data.turn, step: event.data.step, tool: event.data.name });
    }
  });
  ctx.on("session/created", (session) => {
    record("session_created", { sessionId: session?.header?.id });
  });
  ctx.on("webserver/index-inject", (table) => {
    const src = process.env.UMAMI_SCRIPT_SRC;
    const websiteId = process.env.UMAMI_WEBSITE_ID;
    if (src && websiteId) {
      table.push({ kind: "html", placement: "head", html: `<script defer src="${src}" data-website-id="${websiteId}"></script>` });
    }
    table.push({ kind: "global", name: "__OH_STORY_CREATOR_ID__", value: creatorId() });
  });
}
var index_default = { name, apply };
export {
  apply,
  index_default as default,
  name
};
