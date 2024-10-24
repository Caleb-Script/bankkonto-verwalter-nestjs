/**
 * Das Modul besteht aus der Klasse {@linkcode BankkontoWriteService} für die
 * Schreiboperationen im Anwendungskern.
 * @packageDocumentation
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type DeleteResult, Repository } from 'typeorm';
import { getLogger } from '../../logger/logger.js';
import { MailService } from '../../mail/mail.service.js';
import { Transaktion } from '../model/entity/transaktion.entity.js';
import { Bankkonto } from '../model/entity/bankkonto.entity.js';
import { BankkontoReadService } from './bankkonto-read.service.js';
import {
    KontoIdExistsException,
    VersionInvalidException,
    VersionOutdatedException,
} from './exceptions.js';

/** Typdefinitionen zum Aktualisieren eines Bankkontos mit `update`. */
export type UpdateParams = {
    /** ID des zu aktualisierenden Bankkontos. */
    readonly id: number | undefined;
    /** Bankkonto-Objekt mit den aktualisierten Werten. */
    readonly bankkonto: Bankkonto;
    /** Versionsnummer für die aktualisierenden Werte. */
    readonly version: string;
};

// TODO Transaktionen, wenn mehr als 1 TypeORM-Schreibmethode involviert ist
// https://docs.nestjs.com/techniques/database#typeorm-transactions
// https://papooch.github.io/nestjs-cls/plugins/available-plugins/transactional
// https://betterprogramming.pub/handling-transactions-in-typeorm-and-nest-js-with-ease-3a417e6ab5
// https://bytesmith.dev/blog/20240320-nestjs-transactions

/**
 * Die Klasse `BankkontoWriteService` implementiert den Anwendungskern für das
 * Schreiben von Bücher und greift mit _TypeORM_ auf die DB zu.
 */
@Injectable()
export class BankkontoWriteService {
    private static readonly VERSION_PATTERN = /^"\d{1,3}"/u;

    readonly #repo: Repository<Bankkonto>;

    readonly #readService: BankkontoReadService;

    readonly #mailService: MailService;

    readonly #logger = getLogger(BankkontoWriteService.name);

    constructor(
        @InjectRepository(Bankkonto) repo: Repository<Bankkonto>,
        readService: BankkontoReadService,
        mailService: MailService,
    ) {
        this.#repo = repo;
        this.#readService = readService;
        this.#mailService = mailService;
    }

    /**
     * Ein neues Bankkonto soll angelegt werden.
     * @param bankkonto Das neu abzulegende Bankkonto
     * @returns Die ID des neu angelegten Bankkontos
     * @throws KontoIdExists falls die Konto-Id bereits existiert
     */
    async create(bankkonto: Bankkonto): Promise<number> {
        this.#logger.debug('create: bankkonto=%o', bankkonto);
        await this.#validateCreate(bankkonto);

        const bankkontoDb = await this.#repo.save(bankkonto); // implizite Transaktion
        this.#logger.debug('create: bankkontoDb=%o', bankkontoDb);

        await this.#sendmail(bankkontoDb);

        return bankkontoDb.id!;
    }

    /**
     * Ein vorhandenes Bankkonto soll aktualisiert werden. "Destructured" Argument
     * mit id (ID des zu aktualisierenden Bankkontos), bankkonto (zu aktualisierendes Bankkonto)
     * und version (Versionsnummer für optimistische Synchronisation).
     * @returns Die neue Versionsnummer gemäß optimistischer Synchronisation
     * @throws NotFoundException falls kein Bankkonto zur ID vorhanden ist
     * @throws VersionInvalidException falls die Versionsnummer ungültig ist
     * @throws VersionOutdatedException falls die Versionsnummer veraltet ist
     */
    // https://2ality.com/2015/01/es6-destructuring.html#simulating-named-parameters-in-javascript
    async update({ id, bankkonto, version }: UpdateParams): Promise<number> {
        this.#logger.debug(
            'update: id=%d, bankkonto=%o, version=%s',
            id,
            bankkonto,
            version,
        );
        if (id === undefined) {
            this.#logger.debug('update: Keine gueltige ID');
            throw new NotFoundException(`Es gibt kein Bankkonto mit der ID ${id}.`);
        }

        const validateResult = await this.#validateUpdate(bankkonto, id, version);
        this.#logger.debug('update: validateResult=%o', validateResult);
        if (!(validateResult instanceof Bankkonto)) {
            return validateResult;
        }

        const bankkontoNeu = validateResult;
        const merged = this.#repo.merge(bankkontoNeu, bankkonto);
        this.#logger.debug('update: merged=%o', merged);
        const updated = await this.#repo.save(merged); // implizite Transaktion
        this.#logger.debug('update: updated=%o', updated);

        return updated.version!;
    }

    /**
     * Ein Bankkonto wird asynchron anhand seiner ID gelöscht.
     *
     * @param id ID des zu löschenden Bankkontos
     * @returns true, falls das Bankkonto vorhanden war und gelöscht wurde. Sonst false.
     */
    async delete(id: number) {
        this.#logger.debug('delete: id=%d', id);
        const bankkonto = await this.#readService.findById({
            id,
            mitTransaktionen: true,
        });

        let deleteResult: DeleteResult | undefined;
        await this.#repo.manager.transaction(async (transactionalMgr) => {
            // Das Bankkonto zur gegebenen ID mit Transaktionen asynchron loeschen

            // TODO "cascade" funktioniert nicht beim Loeschen
            // "Nullish Coalescing" ab ES2020
            const transaktionen = bankkonto.transaktionen ?? [];
            for (const transaktion of transaktionen) {
                await transactionalMgr.delete(Transaktion, transaktion.id);
            }

            deleteResult = await transactionalMgr.delete(Bankkonto, id);
            this.#logger.debug('delete: deleteResult=%o', deleteResult);
        });

        return (
            deleteResult?.affected !== undefined &&
            deleteResult.affected !== null &&
            deleteResult.affected > 0
        );
    }

    async #validateCreate({ kontoId }: Bankkonto): Promise<undefined> {
        this.#logger.debug('#validateCreate: kontoId=%s', kontoId);
        if (await this.#repo.existsBy({ kontoId })) {
            throw new KontoIdExistsException(kontoId);
        }
    }

    async #sendmail(bankkonto: Bankkonto) {
        const subject = `Neues Bankkonto ${bankkonto.kontoId}`;
        const body = `Das Bankkonto ist angelegt`;
        await this.#mailService.sendmail({ subject, body });
    }

    async #validateUpdate(
        bankkonto: Bankkonto,
        id: number,
        versionStr: string,
    ): Promise<Bankkonto> {
        this.#logger.debug(
            '#validateUpdate: bankkonto=%o, id=%s, versionStr=%s',
            bankkonto,
            id,
            versionStr,
        );
        if (!BankkontoWriteService.VERSION_PATTERN.test(versionStr)) {
            throw new VersionInvalidException(versionStr);
        }

        const version = Number.parseInt(versionStr.slice(1, -1), 10);
        this.#logger.debug(
            '#validateUpdate: bankkonto=%o, version=%d',
            bankkonto,
            version,
        );

        const bankkontoDb = await this.#readService.findById({ id });

        // nullish coalescing
        const versionDb = bankkontoDb.version!;
        if (version < versionDb) {
            this.#logger.debug('#validateUpdate: versionDb=%d', version);
            throw new VersionOutdatedException(version);
        }
        this.#logger.debug('#validateUpdate: bankkontoDb=%o', bankkontoDb);
        return bankkontoDb;
    }
}