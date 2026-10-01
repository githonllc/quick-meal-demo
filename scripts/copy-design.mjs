// Keep one source of truth: copy docs/design.html into public/ so the Worker serves it.
import { copyFileSync } from 'node:fs'

copyFileSync('docs/design.html', 'public/design.html')
