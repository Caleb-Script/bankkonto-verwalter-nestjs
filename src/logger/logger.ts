/**
 * Das Modul besteht aus der Funktion {@linkcode getLogger} für einen Logger auf
 * der Basis von Pino: https://getpino.io. Pino wird auch von Fastify genutzt.
 * Alternativen: Winston, log4js, Bunyan
 * @packageDocumentation
 */

import type pino from 'pino';
import { parentLogger } from '../config/logger.js';

/**
 * Eine-Klasse, um ein Logger-Objekt von `Pino` zu erzeugen, so dass ein
 * _Kontext_ definiert wird, der bei jeder Log-Methode verwendet wird und i.a.
 * der Name einer eigenen Klasse ist.
 * @param context Der Kontext
 * @param kind i.a. `class`
 */
export const getLogger: (
    context: string,
    kind?: string,
) => pino.Logger<string> = (context: string, kind = 'class') => {
    const bindings: Record<string, string> = {};
    // "indexed access" auf eine Property, deren Name als Wert im Argument "kind" uebergeben wird
    // eslint-disable-next-line security/detect-object-injection
    bindings[kind] = context;
    // https://getpino.io/#/docs/child-loggers
    return parentLogger.child(bindings);
};
