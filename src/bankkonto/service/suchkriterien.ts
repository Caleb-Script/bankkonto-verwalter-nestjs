import type { TransaktionTyp } from '../model/entity/transaktion.entity';

/**
 * Typdefinition für `find` in `bankkontoRead.service` und `QueryBuilder.build()`.
 */
export type Suchkriterien = {
    readonly saldo?: string;
    readonly beitztTransaktionLimit?: boolean;
    readonly transaktionsLimit?: number;
    readonly datum?: string;
    readonly transaktionTyp?: TransaktionTyp;
    readonly absender?: string;
    readonly empfaenger?: string;
    readonly waehrungen?: string;
    readonly email?: string;
};
