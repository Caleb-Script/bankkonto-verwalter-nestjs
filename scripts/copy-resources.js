import fs from 'node:fs';
import path from 'node:path';

const { cpSync, existsSync, mkdirSync } = fs;
const { join } = path

// BEACHTE: "assets" innerhalb von nest-cli.json werden bei "--watch" NICHT beruecksichtigt
// https://docs.nestjs.com/cli/monorepo#global-compiler-options

const src = 'src';
const dist = 'dist';
if (!existsSync(dist)) {
    mkdirSync(dist);
}

// DB-Skripte, PEM-Dateien fuer TLS und GraphQL-Schema kopieren
const resourcesSrc = join(src, 'config', 'resources');
const resourcesDist = join(dist, src, 'config', 'resources');
mkdirSync(resourcesDist, { recursive: true });
cpSync(resourcesSrc, resourcesDist, { recursive: true });
