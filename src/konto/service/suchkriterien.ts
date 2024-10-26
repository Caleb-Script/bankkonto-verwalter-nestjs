/**
 * Das Modul besteht aus der Klasse {@linkcode Suchkriterien}.
 * @packageDocumentation
 */

import { type TransaktionTyp } from '../model/entity/transaktion.entity.js';

/**
 * Typdefinition für `find` in `buch-read.service` und `QueryBuilder.build()`.
 */
export type Suchkriterien = {
    readonly transaktionen?: string;
    readonly kundeId?: string;
    readonly transaktionTyp?: TransaktionTyp;
    readonly absender?: string;
    readonly empfaenger?: string;
    readonly email?: string;
};
