/**
 * Das Modul besteht aus der Klasse {@linkcode BankkontoReadService}.
 * @packageDocumentation
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { getLogger } from '../../logger/logger.js';
import { Bankkonto } from '../model/entity/bankkonto.entity.js';
import { QueryBuilder } from './query-builder.js';
import { type Suchkriterien } from './suchkriterien.js';
/**
 * Typdefinition für `findByBankkontoId`
 */
export type FindByBankkontoIdParams = {
    /** ID des gesuchten Bankkontos */
    readonly bankkontoId: number;
    /** Sollen die Transaktionen mitgeladen werden? */
    readonly mitTransaktionen?: boolean;
};

export type FindParams = {
    readonly searchCriteriaInput?: Suchkriterien;
    readonly ignoreNull?: boolean;
};

/**
 * Die Klasse `BankkontoReadService` implementiert das Lesen für Bankkonten und greift
 * mit _TypeORM_ auf eine relationale DB zu.
 */
@Injectable()
export class BankkontoReadService {
    static readonly ID_PATTERN = /^[1-9]\d{0,10}$/u;

    readonly #bankkontoProps: string[];
    readonly #queryBuilder: QueryBuilder;
    readonly #logger = getLogger(BankkontoReadService.name);

    constructor(queryBuilder: QueryBuilder) {
        const bankkontoDummy = new Bankkonto();
        this.#bankkontoProps = Object.getOwnPropertyNames(bankkontoDummy);
        this.#queryBuilder = queryBuilder;
    }

    /**
     * Ein Bankkonto asynchron anhand seiner ID suchen
     * @param bankkontoId ID des gesuchten Kontos
     * @returns Das gefundene Bankkonto in einem Promise aus ES2015.
     * @throws NotFoundException falls kein Bankkonto mit der ID existiert
     */
    async findByBankkontoId({
        bankkontoId,
        mitTransaktionen = false,
    }: FindByBankkontoIdParams) {
        this.#logger.debug('findByBankkontoId: bankkontoId=%d', bankkontoId);

        const bankkonto = await this.#queryBuilder
            .buildId({ bankkontoId, mitTransaktionen: true })
            .getOne();
        if (bankkonto === null) {
            throw new NotFoundException(
                `Es gibt kein Bankkonto mit der ID ${bankkontoId}.`,
            );
        }
        if (bankkonto.waehrungen === null) {
            bankkonto.waehrungen = [];
        }

        if (this.#logger.isLevelEnabled('debug')) {
            this.#logger.debug(
                'findByBankkontoId: bankkonto=%s, kundenId=%o',
                bankkonto.toString(),
                bankkonto.kunde,
            );
            if (mitTransaktionen) {
                this.#logger.debug(
                    'findByBankkontoId: transaktionen=%o',
                    bankkonto.transaktionen,
                );
            }
        }
        return bankkonto;
    }

    /**
     * Bankkonten asynchron suchen.
     * @param suchkriterien JSON-Objekt mit Suchkriterien
     * @returns Ein JSON-Array mit den gefundenen Bankkonten.
     * @throws NotFoundException falls keine Bücher gefunden wurden.
     */
    async find(suchkriterien?: Suchkriterien) {
        this.#logger.debug('find: suchkriterien=%o', suchkriterien);

        // Keine Suchkriterien?
        if (suchkriterien === undefined) {
            return this.#queryBuilder.build({}).getMany();
        }

        const keys = Object.keys(suchkriterien);
        if (keys.length === 0) {
            return this.#queryBuilder.build(suchkriterien).getMany();
        }

        // Falsche Namen fuer Suchkriterien?
        if (!this.#checkKeys(keys)) {
            throw new NotFoundException('Ungueltige Suchkriterien');
        }

        if (typeof suchkriterien.waehrungen === 'object') {
            const waehrungenArray = Object.keys(
                suchkriterien.waehrungen,
            ).filter(
                (key) =>
                    Array.isArray(suchkriterien.waehrungen) &&
                    suchkriterien.waehrungen.includes(key),
            );

            // Füge eine Bedingung für die Währungen hinzu, z. B.
            if (waehrungenArray.length > 0) {
                // Hier kannst du die Logik für die Währungsabfrage hinzufügen
                // z.B.: queryBuilder = queryBuilder.andWhere(...)
            }
        }

        // QueryBuilder
        const bankkonten = await this.#queryBuilder
            .build(suchkriterien)
            .getMany();

        if (bankkonten.length === 0) {
            this.#logger.debug('find: Keine Bankkonten gefunden');
            throw new NotFoundException(
                `Keine Bankkonten gefunden: ${JSON.stringify(suchkriterien)}`,
            );
        }

        bankkonten.forEach((bankkonto) => {
            if (bankkonto.waehrungen === null) {
                bankkonto.waehrungen = [];
            }
        });
        this.#logger.debug('find: bankkonten=%o', bankkonten);
        return bankkonten;
    }

    #checkKeys(keys: string[]) {
        // Ist jedes Suchkriterium auch eine Property von Konto?
        return keys.every((key) => {
            const isValidKey =
                this.#bankkontoProps.includes(key) ||
                key === 'waehrungen' || // Nur die Währungen akzeptieren
                key === 'email';

            if (!isValidKey) {
                this.#logger.debug(
                    '#checkKeys: ungueltiges Suchkriterium "%s"',
                    key,
                );
            }
            return isValidKey;
        });
    }
}
