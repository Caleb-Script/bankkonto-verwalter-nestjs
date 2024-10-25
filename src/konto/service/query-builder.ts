/**
 * Das Modul besteht aus der Klasse {@linkcode QueryBuilder}.
 * @packageDocumentation
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Kunde } from '../model/entity/bankkonto.entity.js';
import { getLogger } from '../../logger/logger.js';
import { Transaktion } from '../model/entity/transaktion.entity.js';
import { Bankkonto } from '../model/entity/bankkonto.entity.js';
import { type Suchkriterien } from './suchkriterien.js';

/** Typdefinitionen für die Suche mit der Bankkonto-ID. */
export type BuildIdParams = {
    /** ID des gesuchten Bankkontos. */
    readonly id: number;
};
/**
 * Die Klasse `QueryBuilder` implementiert das Lesen für Bankkonten und greift
 * mit _TypeORM_ auf eine relationale DB zu.
 */
@Injectable()
export class QueryBuilder {
    readonly #bankkontoAlias = `${Bankkonto.name
        .charAt(0)
        .toLowerCase()}${Bankkonto.name.slice(1)}`;
        
    readonly #kundeAlias = `${Kunde.name
    .charAt(0)
    .toLowerCase()}${Kunde.name.slice(1)}`;

readonly #transaktionAlias = `${Transaktion.name
    .charAt(0)
    .toLowerCase()}${Transaktion.name.slice(1)}`;

    readonly #repo: Repository<Bankkonto>;

    readonly #logger = getLogger(QueryBuilder.name);

    constructor(@InjectRepository(Bankkonto) repo: Repository<Bankkonto>) {
        this.#repo = repo;
    }

    /**
     * Ein Bankkonto mit der ID suchen.
     * @param id ID des gesuchten Bankkontos
     * @returns QueryBuilder
     */
    buildId({ id }: BuildIdParams, mitTransaktionen: boolean = false) {
        // QueryBuilder "bankkonto" fuer Repository<Bankkonto>
        const queryBuilder = this.#repo.createQueryBuilder(this.#bankkontoAlias);

        // Fetch-Join: aus QueryBuilder "bankkonto" die Property "kunde" ->  Tabelle "kunde"
        queryBuilder.innerJoinAndSelect(
            `${this.#bankkontoAlias}.kunde`,
            this.#kundeAlias,
        );

        if (mitTransaktionen) {
            // Fetch-Join: aus QueryBuilder "bankkonto" die Property "transaktionen" -> Tabelle "transaktion"
            queryBuilder.leftJoinAndSelect(
                `${this.#bankkontoAlias}.transaktion`,
                this.#transaktionAlias,
            );
        }

        queryBuilder.where(`${this.#bankkontoAlias}.id = :id`, { id: id }); // eslint-disable-line object-shorthand
        return queryBuilder;
    }

    /**
     * Bankkonten asynchron suchen.
     * @param suchkriterien JSON-Objekt mit Suchkriterien
     * @returns QueryBuilder
     */
    // "rest properties" fuer anfaengliche WHERE-Klausel: ab ES 2018 https://github.com/tc39/proposal-object-rest-spread
    // eslint-disable-next-line max-lines-per-function, sonarjs/cognitive-complexity
    build({...props}: Suchkriterien) {
        this.#logger.debug('build: props=%o',props
        );

        let queryBuilder = this.#repo.createQueryBuilder(this.#bankkontoAlias);
        queryBuilder.innerJoinAndSelect(`${this.#bankkontoAlias}.kunde`, 'kunde');

        let useWhere = true;

        // Kunde in der Query: Teilstring des Kunden und "case insensitive"
        // CAVEAT: MySQL hat keinen Vergleich mit "case insensitive"
        // type-coverage:ignore-next-line
        // if (Kunde !== undefined && typeof Kunde === 'string') {
        //     const ilike =
        //         typeOrmModuleOptions.type === 'postgres' ? 'ilike' : 'like';
        //     queryBuilder = queryBuilder.where(
        //         `${this.#kundeAlias}.kunde ${ilike} :kunde`,
        //         { kunde: `%${Kunde}%` },
        //     );
        //     useWhere = false;
        // }

        // Restliche Properties als Key-Value-Paare: Vergleiche auf Gleichheit
        Object.keys(props).forEach((key) => {
            const param: Record<string, any> = {};
            param[key] = (props as Record<string, any>)[key]; // eslint-disable-line @typescript-eslint/no-unsafe-assignment, security/detect-object-injection
            queryBuilder = useWhere
                ? queryBuilder.where(
                      `${this.#bankkontoAlias}.${key} = :${key}`,
                      param,
                  )
                : queryBuilder.andWhere(
                      `${this.#bankkontoAlias}.${key} = :${key}`,
                      param,
                  );
            useWhere = false;
        });

        this.#logger.debug('build: sql=%s', queryBuilder.getSql());
        return queryBuilder;
    }
}
