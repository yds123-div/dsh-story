/** Pack the self-contained Oh Story release tarball from the split packages. */

import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { build } from "esbuild"

const require = createRequire(import.meta.url)
const packageRoot = dirname(fileURLToPath(import.meta.url))
const root = resolve(packageRoot, "../../..")
const stage = resolve(packageRoot, ".release-stage")
const outputDir = resolve(packageRoot, "release")

async function packageDir(name) {
  return dirname(require.resolve(`${name}/package.json`))
}

await rm(stage, { recursive: true, force: true })
await mkdir(resolve(stage, "lib"), { recursive: true })
await mkdir(outputDir, { recursive: true })

// One self-contained host bundle: esbuild inlines the @oh-story/* workspace deps.
await build({
  entryPoints: [resolve(packageRoot, "src/index.ts")],
  outfile: resolve(stage, "lib/index.js"),
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node24",
  sourcemap: true,
  treeShaking: true,
  packages: "bundle",
  external: ["@deepseek-ai/*"],
})

// Client bundle from the UI package's build output.
const uiDir = await packageDir("@oh-story/ui")
// The prebuilt client registers itself as "@oh-story/ui", but the self-contained
// tarball is loaded under the aggregator name "@oh-story/dsh" — without this
// rewrite the browser rejects it ("loaded without registering").
const clientJs = await readFile(resolve(uiDir, "lib/client.js"), "utf8")
const clientPatched = clientJs.replace('"@oh-story/ui"', '"@oh-story/dsh"')
if (clientPatched === clientJs) throw new Error('client.js: registration string "@oh-story/ui" not found')
await writeFile(resolve(stage, "lib/client.js"), clientPatched)
await cp(resolve(uiDir, "lib/client.js.map"), resolve(stage, "lib/client.js.map"))

// Knowledge assets at the paths the bundled resolvers expect.
const skillsDir = await packageDir("@oh-story/skills")
const rolesDir = await packageDir("@oh-story/roles")
const knowledgeFilter = (source) => !source.includes("/__pycache__/")
  && !source.endsWith("/__pycache__")
  && !source.endsWith(".pyc")
  && !source.endsWith("/.DS_Store")
for (const [from, to] of [
  [resolve(skillsDir, "lib/oh-story/skills"), "oh-story/skills"],
  [resolve(skillsDir, "lib/oh-story/LICENSE.upstream"), "oh-story/LICENSE.upstream"],
  [resolve(skillsDir, "lib/oh-story/manifest.json"), "oh-story/manifest.json"],
  [resolve(skillsDir, "lib/drama/skills"), "drama/skills"],
  [resolve(skillsDir, "lib/drama/LICENSE.upstream"), "drama/LICENSE.upstream"],
  [resolve(skillsDir, "lib/drama/manifest.json"), "drama/manifest.json"],
  [resolve(rolesDir, "lib/oh-story/roles"), "oh-story/roles"],
]) {
  await cp(from, resolve(stage, `lib/${to}`), { recursive: true, filter: knowledgeFilter })
}

const uiManifest = JSON.parse(await readFile(resolve(uiDir, "package.json"), "utf8"))
const bundleManifest = JSON.parse(await readFile(resolve(packageRoot, "package.json"), "utf8"))
const manifest = {
  name: bundleManifest.name,
  version: bundleManifest.version,
  license: bundleManifest.license,
  private: true,
  type: "module",
  exports: {
    ".": { types: "./lib/types/index.d.ts", default: "./lib/index.js" },
    "./client": { types: "./lib/types/client/index.d.ts", default: "./lib/client.js" },
    "./package.json": "./package.json",
  },
  peerDependencies: {
    ...JSON.parse(await readFile(resolve(await packageDir("@oh-story/roles"), "package.json"), "utf8")).peerDependencies,
    ...JSON.parse(await readFile(resolve(await packageDir("@oh-story/workspace"), "package.json"), "utf8")).peerDependencies,
    ...uiManifest.peerDependencies,
    "@deepseek-ai/dsh-skill": "workspace:^",
  },
  dsh: {
    bundle: { patch: "./cordis.patch.yml" },
    client: uiManifest.dsh.client,
  },
}
await writeFile(resolve(stage, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`)
await writeFile(resolve(stage, "cordis.patch.yml"), `- insert:\n    - id: oh-story\n      name: '@oh-story/dsh'\n`)

const { execFileSync } = await import("node:child_process")
if (process.platform === "win32") {
  execFileSync("cmd.exe", ["/c", "npm", "pack", "--json", stage], { cwd: outputDir, stdio: "inherit" })
} else {
  execFileSync("npm", ["pack", "--json", stage], { cwd: outputDir, stdio: "inherit" })
}
console.log(`packed: release/ (version ${manifest.version})`)
await rm(stage, { recursive: true, force: true })
