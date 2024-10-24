/**
 * Das Modul besteht aus der Klasse {@linkcode BuchReadService}.
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
    // https://2ality.com/2015/01/es6-destructuring.html#simulating-named-parameters-in-javascript
    async findById({ id }: FindByIdParams) {
        this.#logger.debug('findById: id=%d', id);

        // https://typeorm.io/working-with-repository
        // Das Resultat ist undefined, falls kein Datensatz gefunden
        // Lesen: Keine Transaktion erforderlich
        const bankkonto = await this.#queryBuilder
            .buildId({ id })
            .getOne();
        if (bankkonto === null) {
            throw new NotFoundException(`Es gibt kein Bankkonto mit der ID ${id}.`);
        }
        if (bankkonto.schlagwoerter === null) {
            bankkonto.schlagwoerter = [];
        }

        if (this.#logger.isLevelEnabled('debug')) {
            this.#logger.debug(
                'findById: bankkonto=%s, kundenId=%o',
                bankkonto.toString(),
                bankkonto.kundenId,
            );
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
        const bankkonten = await this.#queryBuilder.build(suchkriterien).getMany();
        if (bankkonten.length === 0) {
            this.#logger.debug('find: Keine Bankkonten gefunden');
            throw new NotFoundException(
                `Keine Bankkonten gefunden: ${JSON.stringify(suchkriterien)}`,
            );
        }
        // bankkonten.forEach((bankkonto : Bankkonto): void => {
        //     if (bankkonto.schlagwoerter === null) {
        //      bankkonto.schlagwoerter = [];
        //     }
        // });
        this.#logger.debug('find: buecher=%o', bankkonten);
        return bankkonten;
    }

    #checkKeys(keys: string[]) {
        // Ist jedes Suchkriterium auch eine Property von Konto oder "schlagwoerter"?
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
