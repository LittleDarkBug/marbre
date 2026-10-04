#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const tsx = join(here, '..', 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx')
const r = spawnSync(tsx, [join(here, 'marbre.ts'), ...process.argv.slice(2)], { stdio: 'inherit', shell: process.platform === 'win32' })
process.exit(r.status ?? 1)
