/**
 * Das Modul besteht aus der Klasse {@linkcode QueryBuilder}.
 * @packageDocumentation
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { typeOrmModuleOptions } from '../../config/typeormOptions.js';
import { getLogger } from '../../logger/logger.js';
import { Bankkonto } from '../model/entity/bankkonto.entity.js';
import { Kunde } from '../model/entity/kunde.entity.js';
import { Transaktion } from '../model/entity/transaktion.entity.js';
import { type Suchkriterien } from './suchkriterien.js';

/** Typdefinitionen für die Suche mit der Bankkonto-ID. */
export type BuildIdParams = {
    /** ID des gesuchten Bankkontos. */
    readonly bankkontoId: number;
    readonly mitTransaktionen: boolean;
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
    buildId({ bankkontoId, mitTransaktionen }: BuildIdParams) {
        const queryBuilder = this.#repo.createQueryBuilder(
            this.#bankkontoAlias,
        );

        if (mitTransaktionen) {
            queryBuilder.leftJoinAndSelect(
                `${this.#bankkontoAlias}.transactions`,
                this.#transaktionAlias,
            );
        }

        queryBuilder.where(
            `${this.#bankkontoAlias}.bankkontoId = :bankkontoId`,
            {
                bankkontoId,
            },
        );
        return queryBuilder;
    }

    /**
     * Bankkonten asynchron suchen.
     * @param suchkriterien JSON-Objekt mit Suchkriterien
     * @returns QueryBuilder
     */
    // "rest properties" fuer anfaengliche WHERE-Klausel: ab ES 2018 https://github.com/tc39/proposal-object-rest-spread
    // eslint-disable-next-line max-lines-per-function
    build({
        transaktionTyp,
        absender,
        empfaenger,
        email,
        ...props
    }: Suchkriterien) {
        this.#logger.debug(
            'build: transaktionTyp=%s, absender=%s, empfaenger=%s, email=%s props=%s,',
            transaktionTyp,
            absender,
            empfaenger,
            email,
            props,
        );

        let queryBuilder = this.#repo.createQueryBuilder(this.#bankkontoAlias);
        queryBuilder.innerJoinAndSelect(
            `${this.#bankkontoAlias}.kunde`,
            'kunde',
        );

        queryBuilder.leftJoinAndSelect(
            `${this.#bankkontoAlias}.transactions`,
            this.#transaktionAlias,
        );

        let useWhere = true;

        if (
            transaktionTyp !== undefined &&
            typeof transaktionTyp === 'string'
        ) {
            queryBuilder = queryBuilder.where(
                `${this.#transaktionAlias}.transaction_type = :transaktionTyp`,
                {
                    transaktionTyp: `${transaktionTyp}`,
                },
            );
            useWhere = false;
        }

        if (absender !== undefined && typeof absender === 'string') {
            queryBuilder = queryBuilder.where(
                `${this.#transaktionAlias}.absender = :absender`,
                {
                    absender: `${absender}`,
                },
            );
            useWhere = false;
        }

        if (empfaenger !== undefined && typeof empfaenger === 'string') {
            queryBuilder = queryBuilder.where(
                `${this.#transaktionAlias}.empfaenger = :empfaenger`,
                {
                    empfaenger: `${empfaenger}`,
                },
            );
            useWhere = false;
        }

        // Kunde in der Query: Teilstring des Kunden und "case insensitive"
        // CAVEAT: MySQL hat keinen Vergleich mit "case insensitive"
        // type-coverage:ignore-next-line
        if (email !== undefined && typeof email === 'string') {
            const ilike =
                typeOrmModuleOptions.type === 'postgres' ? 'ilike' : 'like';
            queryBuilder = queryBuilder.where(
                `${this.#kundeAlias}.email ${ilike} :email`,
                { email: `%${email}%` },
            );
            useWhere = false;
        }

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
