/**
 * Das Modul enthält die Konfiguration für das DB-System.
 * @packageDocumentation
 */
import { config } from './app.js';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const dbConfig = config.db;
console.debug('dbConfig: %o', dbConfig);

type DbType = 'postgres' | 'mysql' | 'oracle' | 'sqlite';

// "Optional Chaining" ab ES2020
const type: DbType | undefined = dbConfig?.type; // eslint-disable-line @typescript-eslint/no-unsafe-assignment

// 'better-sqlite3' erfordert node-gyp, wenn das Docker-Image gebaut wird
export const dbType =
    type === 'postgres' ||
    type === 'mysql' ||
    type === 'oracle' ||
    type === 'sqlite'
        ? type
        : 'postgres';
