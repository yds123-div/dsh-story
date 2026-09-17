#!/usr/bin/env node
// 场记看板原型 — 从 monitor JSONL + Umami 抓数据，内联进模板生成双击即开的 dashboard.html
// 用法：node build-dashboard.mjs   （需 Umami 栈在跑：cd umami && docker compose up -d）
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const UMAMI = process.env.UMAMI_URL || 'http://127.0.0.1:3000'
const WEBSITE_ID = '2d2df428-1c24-41b9-a6d7-ba83b98be3ed'

// 原型已知的两份 JSONL：headless 链路测试 + web 实例
const JSONL_FILES = [
  'D:/Shenlan/ohstory-chain-test/monitor-proto/monitor-prototype.jsonl',
  'C:/Users/18307/.dsh/monitor-prototype/monitor-prototype.jsonl',
]

const records = []
for (const f of JSONL_FILES) {
  try {
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      const t = line.trim()
      if (t) records.push(JSON.parse(t))
    }
  } catch (e) {
    console.warn(`[warn] 跳过 ${f}: ${e.message}`)
  }
}

async function main() {
  // --- Umami：登录拿 token，拉 stats / pageviews / events（近 30 天） ---
  let umami = null
  try {
    const login = await fetch(`${UMAMI}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'umami' }),
    })
    const { token } = await login.json()
    const auth = { Authorization: `Bearer ${token}` }
    const endAt = Date.now()
    const startAt = endAt - 30 * 864e5
    const [stats, pv, ev] = await Promise.all([
      fetch(`${UMAMI}/api/websites/${WEBSITE_ID}/stats?startAt=${startAt}&endAt=${endAt}`, { headers: auth }).then(r => r.json()),
      fetch(`${UMAMI}/api/websites/${WEBSITE_ID}/pageviews?startAt=${startAt}&endAt=${endAt}&unit=day`, { headers: auth }).then(r => r.json()),
      fetch(`${UMAMI}/api/websites/${WEBSITE_ID}/events?startAt=${startAt}&endAt=${endAt}`, { headers: auth }).then(r => r.json()),
    ])
    const daily = (pv.pageviews || []).map((p, i) => ({
      x: p.x.slice(0, 10),
      pageviews: p.y,
      sessions: pv.sessions?.[i]?.y ?? 0,
    }))
    const events = (ev.data || []).map(e => ({
      ts: Date.parse(e.createdAt),
      name: e.eventName || 'pageview',
      eventType: e.eventType,
      url: e.urlPath,
      device: e.device,
      browser: e.browser,
      os: e.os,
      title: e.pageTitle,
    }))
    umami = { websiteId: WEBSITE_ID, url: UMAMI, stats, daily, events }
    console.log(`Umami: ${stats.pageviews} PV / ${stats.visitors} 访客 / ${events.length} 事件（近 30 天）`)
  } catch (e) {
    console.warn(`[warn] Umami 不可达（${UMAMI}）：${e.message}，看板将只有自建数据`)
  }

  const data = {
    generatedAt: new Date().toISOString(),
    sources: { jsonl: JSONL_FILES, umami: umami ? `${UMAMI} (${WEBSITE_ID})` : null },
    records: records.sort((a, b) => a.ts - b.ts),
    umami,
  }

  const tpl = readFileSync(join(HERE, 'dashboard.template.html'), 'utf8')
  writeFileSync(join(HERE, 'dashboard.html'), tpl.replace('/*__DATA__*/null', JSON.stringify(data)))
  console.log(`dashboard.html 生成完毕：${records.length} 条自建记录已内联`)
}

main()
