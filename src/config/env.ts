/**
 * Das Modul enthält Objekte mit Daten aus Umgebungsvariablen.
 * @packageDocumentation
 */

import dotenv from 'dotenv';
import process from 'node:process';

// Umgebungsvariable aus .env einlesen
dotenv.config();

const { NODE_ENV, CLIENT_SECRET, LOG_LEVEL, START_DB_SERVER } = process.env; // eslint-disable-line n/no-process-env

// "as const" fuer readonly
// https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html#const-assertions

/* eslint-disable @typescript-eslint/naming-convention */
/**
 * Umgebungsvariable zur Konfiguration
 */
export const env = {
    // Umgebungsvariable `NODE_ENV` als gleichnamige Konstante, die i.a. einen der
    // folgenden Werte enthält:
    // - `production`, z.B. in einer Cloud,
    // - `development` oder
    // - `test`
    NODE_ENV,
    CLIENT_SECRET,
    LOG_LEVEL,
    START_DB_SERVER,
} as const;
/* eslint-enable @typescript-eslint/naming-convention */

console.debug('NODE_ENV = %s', NODE_ENV);
