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
 * Typdefinition für `findById`
 */
export type FindByIdParams = {
    /** ID des gesuchten Bankkontos */
    readonly id: number;
    /** Sollen die Transaktionen mitgeladen werden? */
    readonly mitTransaktionen?: boolean;
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
     * @param id ID des gesuchten Kontos
     * @returns Das gefundene Bankkonto in einem Promise aus ES2015.
     * @throws NotFoundException falls kein Bankkonto mit der ID existiert
     */
    async findById({ id, mitTransaktionen = false }: FindByIdParams) {
        this.#logger.debug('findById: id=%d', id);

        const bankkonto = await this.#queryBuilder
            .buildId({ id, mitTransaktionen })
            .getOne();
        if (bankkonto === null) {
            throw new NotFoundException(
                `Es gibt kein Bankkonto mit der ID ${id}.`,
            );
        }

        if (this.#logger.isLevelEnabled('debug')) {
            this.#logger.debug(
                'findById: bankkonto=%s, kundenId=%o',
                bankkonto.toString(),
                bankkonto.kunde,
            );
            if (mitTransaktionen) {
                this.#logger.debug(
                    'findById: transaktionen=%o',
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

        // QueryBuilder https://typeorm.io/select-query-builder
        // Das Resultat ist eine leere Liste, falls nichts gefunden
        // Lesen: Keine Transaktion erforderlich
        const bankkonten = await this.#queryBuilder
            .build(suchkriterien)
            .getMany();
        if (bankkonten.length === 0) {
            this.#logger.debug('find: Keine Bankkonten gefunden');
            throw new NotFoundException(
                `Keine Bankkonten gefunden: ${JSON.stringify(suchkriterien)}`,
            );
        }
        this.#logger.debug('find: buecher=%o', bankkonten);
        return bankkonten;
    }

    #checkKeys(keys: string[]) {
        // Ist jedes Suchkriterium auch eine Property von Konto?
        let validKeys = true;
        keys.forEach((key) => {
            if (
                !this.#bankkontoProps.includes(key) &&
                key !== 'javascript' &&
                key !== 'typescript'
            ) {
                this.#logger.debug(
                    '#checkKeys: ungueltiges Suchkriterium "%s"',
                    key,
                );
                validKeys = false;
            }
        });

        return validKeys;
    }
}
