/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/**
 * Das Modul besteht aus der Klasse {@linkcode QueryBuilder}.
 * @packageDocumentation
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

        queryBuilder.innerJoinAndSelect(
            `${this.#bankkontoAlias}.kunde`,
            this.#kundeAlias,
        );

        if (mitTransaktionen) {
            queryBuilder.leftJoinAndSelect(
                `${this.#bankkontoAlias}.transaktionen`,
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
    // eslint-disable-next-line max-lines-per-function
    build({
        transaktionTyp,
        absender,
        empfaenger,
        email,
        waehrungen,
        ...props
    }: Suchkriterien) {
        this.#logger.debug(
            'build: transaktionTyp=%s, absender=%s, empfaenger=%s, email=%s waehrungen=%s props=%s',
            transaktionTyp,
            absender,
            empfaenger,
            email,
            waehrungen,
            props,
        );

        const queryBuilder = this.#repo
            .createQueryBuilder(this.#bankkontoAlias)
            .innerJoinAndSelect(`${this.#bankkontoAlias}.kunde`, 'kunde')
            .leftJoinAndSelect(
                `${this.#bankkontoAlias}.transaktionen`,
                this.#transaktionAlias,
            );

        const ilikeOperator = 'ilike';

        const addCondition = (
            condition: string,
            parameters: Record<string, any>,
        ) => {
            if (queryBuilder.expressionMap.wheres.length === 0) {
                queryBuilder.where(condition, parameters);
            } else {
                queryBuilder.andWhere(condition, parameters);
            }
        };

        if (
            typeof transaktionTyp === 'string' &&
            transaktionTyp.trim() !== ''
        ) {
            addCondition(
                `${this.#transaktionAlias}.transaktion_typ = :transaktionTyp`,
                { transaktionTyp },
            );
        }

        if (typeof absender === 'string' && absender.trim() !== '') {
            addCondition(`${this.#transaktionAlias}.absender = :absender`, {
                absender,
            });
        }

        if (typeof empfaenger === 'string' && empfaenger.trim() !== '') {
            addCondition(`${this.#transaktionAlias}.empfaenger = :empfaenger`, {
                empfaenger,
            });
        }
        if (typeof email === 'string' && email.trim() !== '') {
            addCondition(`${this.#kundeAlias}.email ${ilikeOperator} :email`, {
                email: `%${email}%`,
            });
        }

        if (typeof waehrungen === 'string' && waehrungen.trim() !== '') {
            const waehrungenArray = waehrungen.split(',').map((w) => w.trim());
            const conditions = waehrungenArray
                .map(
                    (_, index) =>
                        `${this.#bankkontoAlias}.waehrungen ${ilikeOperator} :waehrungPattern${index}`,
                )
                .join(' AND ');

            const parameters: Record<string, any> = {};
            waehrungenArray.forEach((waehrung, index) => {
                parameters[`waehrungPattern${index}`] = `%${waehrung}%`;
            });

            addCondition(conditions, parameters);
        }

        Object.entries(props).forEach(([key, value]) => {
            if (typeof value === 'string' && value.trim() !== '') {
                addCondition(`${this.#bankkontoAlias}.${key} = :${key}`, {
                    [key]: value,
                });
            }
        });

        this.#logger.debug('build: sql=%s', queryBuilder.getSql());
        return queryBuilder;
    }
}
