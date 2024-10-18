/**
 * Das Modul enthält die Konfigurations-Information für Health.
 * @packageDocumentation
 */

import { config } from './app.js';
import { logLevel } from './logger.js';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const prettyPrint: string | undefined = config.health?.prettyPrint;

/**
 * Das Konfigurationsobjekt für Health.
 */
// "as const" fuer readonly
// https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html#const-assertions
export const healthConfig = {
    prettyPrint:
        prettyPrint !== undefined && prettyPrint.toLowerCase() === 'true',
} as const;

if (logLevel === 'debug') {
    console.debug('healthConfig: %o', healthConfig);
}
