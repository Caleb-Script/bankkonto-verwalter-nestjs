/**
 * Das Modul besteht aus der Klasse {@linkcode KontoWriteService} für die
 * Schreiboperationen im Anwendungskern.
 * @packageDocumentation
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type DeleteResult, Repository } from 'typeorm';
import { getLogger } from '../../logger/logger.js';
import { MailService } from '../../mail/mail.service.js';
import { Abbildung } from '../entity/abbildung.entity.js';
import { Konto } from '../entity/bankkonto.entity.js';
import { Titel } from '../entity/titel.entity.js';
import { KontoReadService } from './konto-read.service.js';
import {
    IsbnExistsException,
    VersionInvalidException,
    VersionOutdatedException,
} from './exceptions.js';

/** Typdefinitionen zum Aktualisieren eines Kontos mit `update`. */
export type UpdateParams = {
    /** ID des zu aktualisierenden Kontos. */
    readonly id: number | undefined;
    /** Konto-Objekt mit den aktualisierten Werten. */
    readonly konto: Konto;
    /** Versionsnummer für die aktualisierenden Werte. */
    readonly version: string;
};

// TODO Transaktionen, wenn mehr als 1 TypeORM-Schreibmethode involviert ist
// https://docs.nestjs.com/techniques/database#typeorm-transactions
// https://papooch.github.io/nestjs-cls/plugins/available-plugins/transactional
// https://betterprogramming.pub/handling-transactions-in-typeorm-and-nest-js-with-ease-3a417e6ab5
// https://bytesmith.dev/blog/20240320-nestjs-transactions

/**
 * Die Klasse `KontoWriteService` implementiert den Anwendungskern für das
 * Schreiben von Bücher und greift mit _TypeORM_ auf die DB zu.
 */
@Injectable()
export class KontoWriteService {
    private static readonly VERSION_PATTERN = /^"\d{1,3}"/u;

    readonly #repo: Repository<Konto>;

    readonly #readService: KontoReadService;

    readonly #mailService: MailService;

    readonly #logger = getLogger(KontoWriteService.name);

    constructor(
        @InjectRepository(Konto) repo: Repository<Konto>,
        readService: KontoReadService,
        mailService: MailService,
    ) {
        this.#repo = repo;
        this.#readService = readService;
        this.#mailService = mailService;
    }

    /**
     * Ein neues Konto soll angelegt werden.
     * @param konto Das neu abzulegende Konto
     * @returns Die ID des neu angelegten Kontos
     * @throws IsbnExists falls die ISBN-Nummer bereits existiert
     */
    async create(konto: Konto): Promise<number> {
        this.#logger.debug('create: konto=%o', konto);
        await this.#validateCreate(konto);

        const kontoDb = await this.#repo.save(konto); // implizite Transaktion
        this.#logger.debug('create: kontoDb=%o', kontoDb);

        await this.#sendmail(kontoDb);

        return kontoDb.id!;
    }

    /**
     * Ein vorhandenes Konto soll aktualisiert werden. "Destructured" Argument
     * mit id (ID des zu aktualisierenden Kontos), konto (zu aktualisierendes Konto)
     * und version (Versionsnummer für optimistische Synchronisation).
     * @returns Die neue Versionsnummer gemäß optimistischer Synchronisation
     * @throws NotFoundException falls kein Konto zur ID vorhanden ist
     * @throws VersionInvalidException falls die Versionsnummer ungültig ist
     * @throws VersionOutdatedException falls die Versionsnummer veraltet ist
     */
    // https://2ality.com/2015/01/es6-destructuring.html#simulating-named-parameters-in-javascript
    async update({ id, konto, version }: UpdateParams): Promise<number> {
        this.#logger.debug(
            'update: id=%d, konto=%o, version=%s',
            id,
            konto,
            version,
        );
        if (id === undefined) {
            this.#logger.debug('update: Keine gueltige ID');
            throw new NotFoundException(`Es gibt kein Konto mit der ID ${id}.`);
        }

        const validateResult = await this.#validateUpdate(konto, id, version);
        this.#logger.debug('update: validateResult=%o', validateResult);
        if (!(validateResult instanceof Konto)) {
            return validateResult;
        }

        const kontoNeu = validateResult;
        const merged = this.#repo.merge(kontoNeu, konto);
        this.#logger.debug('update: merged=%o', merged);
        const updated = await this.#repo.save(merged); // implizite Transaktion
        this.#logger.debug('update: updated=%o', updated);

        return updated.version!;
    }

    /**
     * Ein Konto wird asynchron anhand seiner ID gelöscht.
     *
     * @param id ID des zu löschenden Kontos
     * @returns true, falls das Konto vorhanden war und gelöscht wurde. Sonst false.
     */
    async delete(id: number) {
        this.#logger.debug('delete: id=%d', id);
        const konto = await this.#readService.findById({
            id,
            mitAbbildungen: true,
        });

        let deleteResult: DeleteResult | undefined;
        await this.#repo.manager.transaction(async (transactionalMgr) => {
            // Das Konto zur gegebenen ID mit Titel und Abb. asynchron loeschen

            // TODO "cascade" funktioniert nicht beim Loeschen
            const titelId = konto.titel?.id;
            if (titelId !== undefined) {
                await transactionalMgr.delete(Titel, titelId);
            }
            // "Nullish Coalescing" ab ES2020
            const abbildungen = konto.abbildungen ?? [];
            for (const abbildung of abbildungen) {
                await transactionalMgr.delete(Abbildung, abbildung.id);
            }

            deleteResult = await transactionalMgr.delete(Konto, id);
            this.#logger.debug('delete: deleteResult=%o', deleteResult);
        });

        return (
            deleteResult?.affected !== undefined &&
            deleteResult.affected !== null &&
            deleteResult.affected > 0
        );
    }

    async #validateCreate({ isbn }: Konto): Promise<undefined> {
        this.#logger.debug('#validateCreate: isbn=%s', isbn);
        if (await this.#repo.existsBy({ isbn })) {
            throw new IsbnExistsException(isbn);
        }
    }

    async #sendmail(konto: Konto) {
        const subject = `Neues Konto ${konto.id}`;
        const titel = konto.titel?.titel ?? 'N/A';
        const body = `Das Konto mit dem Titel <strong>${titel}</strong> ist angelegt`;
        await this.#mailService.sendmail({ subject, body });
    }

    async #validateUpdate(
        konto: Konto,
        id: number,
        versionStr: string,
    ): Promise<Konto> {
        this.#logger.debug(
            '#validateUpdate: konto=%o, id=%s, versionStr=%s',
            konto,
            id,
            versionStr,
        );
        if (!KontoWriteService.VERSION_PATTERN.test(versionStr)) {
            throw new VersionInvalidException(versionStr);
        }

        const version = Number.parseInt(versionStr.slice(1, -1), 10);
        this.#logger.debug(
            '#validateUpdate: konto=%o, version=%d',
            konto,
            version,
        );

        const kontoDb = await this.#readService.findById({ id });

        // nullish coalescing
        const versionDb = kontoDb.version!;
        if (version < versionDb) {
            this.#logger.debug('#validateUpdate: versionDb=%d', version);
            throw new VersionOutdatedException(version);
        }
        this.#logger.debug('#validateUpdate: kontoDb=%o', kontoDb);
        return kontoDb;
    }
}