// Hands in Lanternfall for make.fun's best-game-01 (Node 22, standard library only).
//
// The game is this directory's game/ folder: plain static files a desktop browser loads offline.
// This program copies game/ and screenshots/ to /output (MAKEFUN_OUTPUT_DIR stands in outside the
// grader) and writes /output/dossier.json, the summary the judge reads, with the vendored library.
// It reads no clock and no random source, so both runs write the same bytes.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//   node serve.ts        # to play it: http://localhost:8080

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

if (!existsSync(join(here, 'game', 'index.html'))) {
  process.stderr.write('lanternfall: game/index.html is missing\n');
  process.exit(1);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps: the text cap shapes the dossier's bytes, the rest refuse an entry the scorer would refuse.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

process.stdout.write('lanternfall: wrote game/, screenshots/ and dossier.json\n');
