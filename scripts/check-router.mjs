// Runs scripts/check-router.entry.ts (D* Lite vs the A* reference) -- see
// scripts/README.md. Bundles the TypeScript with esbuild (a Vite
// dependency) in memory, then runs it.
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const out = await build({
  entryPoints: [resolve(here, 'check-router.entry.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
  logLevel: 'error',
  define: {
    // The router reads the Longdo key from Vite's env; the check needs none.
    'import.meta.env': '{}',
    __REPO_ROOT__: JSON.stringify(resolve(here, '..')),
  },
})
await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`)
