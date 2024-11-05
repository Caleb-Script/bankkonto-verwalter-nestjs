// eslint-disable-next-line @eslint-community/eslint-comments/disable-enable-pair
/* eslint-disable max-lines */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type DeleteResult, Repository } from 'typeorm';
import { getLogger } from '../../logger/logger.js';
import { MailService } from '../../mail/mail.service.js';
import { TransaktionDTO } from '../model/dto/transaktion.dto.js';
import { Bankkonto } from '../model/entity/bankkonto.entity.js';
import { Kunde } from '../model/entity/kunde.entity.js';
import {
    Transaktion,
    TransaktionTyp,
} from '../model/entity/transaktion.entity.js';
import { BankkontoReadService } from './bankkonto-read.service.js';
import {
    InsufficientFundsException,
    LimitReachedException,
    VersionInvalidException,
    VersionOutdatedException,
} from './exceptions.js';

/** Typdefinitionen zum Aktualisieren eines Bankkontos mit `update`. */
export type UpdateParams = {
    /** ID des zu aktualisierenden Bankkontos. */
    readonly bankkontoId: number | undefined;
    /** Bankkonto-Objekt mit den aktualisierten Werten. */
    readonly bankkonto: Bankkonto;
    /** Versionsnummer für die aktualisierenden Werte. */
    readonly version: string;
};

/**
 * Die Klasse `BankkontoWriteService` implementiert den Anwendungskern für das
 * Schreiben von Bankkonten und greift mit TypeORM auf die DB zu.
 */
@Injectable()
export class BankkontoWriteService {
    private static readonly VERSION_PATTERN = /^"\d{1,3}"/u;

    readonly #repo: Repository<Bankkonto>;
    readonly #transaktionRepo: Repository<Transaktion>;
    readonly #readService: BankkontoReadService;
    readonly #mailService: MailService;
    readonly #logger = getLogger(BankkontoWriteService.name);

    // eslint-disable-next-line max-params
    constructor(
        @InjectRepository(Bankkonto) repo: Repository<Bankkonto>,
        @InjectRepository(Transaktion) transaktionRepo: Repository<Transaktion>,
        readService: BankkontoReadService,
        mailService: MailService,
    ) {
        this.#repo = repo;
        this.#readService = readService;
        this.#mailService = mailService;
        this.#transaktionRepo = transaktionRepo;
    }

    async create(bankkonto: Bankkonto): Promise<number> {
        this.#logger.debug('create: bankkonto=%o', bankkonto);
        const bankkontoDb = await this.#repo.save(bankkonto); // implizite Transaktion
        this.#logger.debug('create: bankkontoDb=%o', bankkontoDb);
        await this.#sendmail(bankkontoDb);
        return bankkontoDb.bankkontoId!;
    }

    async update({
        bankkontoId,
        bankkonto,
        version,
    }: UpdateParams): Promise<number> {
        this.#logger.debug(
            'update: bankkontoId=%d, bankkonto=%o, version=%s',
            bankkontoId,
            bankkonto,
            version,
        );

        if (bankkontoId === undefined) {
            this.#logger.debug('update: Keine gueltige ID');
            throw new NotFoundException(
                `Es gibt kein Bankkonto mit der ID ${bankkontoId}.`,
            );
        }

        const validateResult = await this.#validateUpdate(
            bankkonto,
            bankkontoId,
            version,
        );
        this.#logger.debug('update: validateResult=%o', validateResult);

        const bankkontoNeu = validateResult;
        const merged = this.#repo.merge(bankkontoNeu, bankkonto);
        this.#logger.debug('update: merged=%o', merged);
        const updated = await this.#repo.save(merged); // implizite Transaktion
        this.#logger.debug('update: updated=%o', updated);

        return updated.version!;
    }

    async delete(bankkontoId: number) {
        this.#logger.debug('delete: bankkontoId=%d', bankkontoId);
        const bankkonto = await this.#readService.findByBankkontoId({
            bankkontoId,
            mitTransaktionen: true,
        });

        let deleteResult: DeleteResult | undefined;
        await this.#repo.manager.transaction(async (transactionalMgr) => {
            const kundeId = bankkonto.kunde?.kundeId;
            if (kundeId !== undefined) {
                await transactionalMgr.delete(Kunde, kundeId);
            }

            const transaktionen = bankkonto.transaktionen ?? [];
            for (const transaktion of transaktionen) {
                await transactionalMgr.delete(
                    Transaktion,
                    transaktion.transaktionId,
                );
            }
            deleteResult = await transactionalMgr.delete(
                Bankkonto,
                bankkontoId,
            );
            this.#logger.debug('delete: deleteResult=%o', deleteResult);
        });

        return (
            deleteResult?.affected !== undefined &&
            deleteResult.affected !== null &&
            deleteResult.affected > 0
        );
    }

    async createTransaktion(transaktionDTO: TransaktionDTO) {
        this.#logger.debug(
            'createTransaktion: transaktionDTO=%o',
            transaktionDTO,
        );

        const { absender, empfaenger, betrag, transaktionTyp } = transaktionDTO;
        const bankkonto = await this.#findBankkontoByTransaktionTyp(
            transaktionTyp,
            absender,
            empfaenger,
        );
        const {
            bankkontoId,
            version,
            saldo,
            waehrungen,
            besitztTransaktionLimit,
            transaktionLimit,
        } = bankkonto;

        const updatedSaldo = this.#berechneNeuenSaldo(
            saldo,
            betrag,
            transaktionTyp,
        );

        this.#validateTransaktionLimit(bankkonto, betrag, transaktionTyp);

        const transaktion = await this.#newTransaktion(
            transaktionDTO,
            bankkonto,
        );
        this.#logger.debug('created transaktion: transaktion=%o', transaktion);
        // Convert DTO to Bankkonto format
        const updatedBankkonto = this.#bankkontoUpdateDTOToBankkonto({
            updatedSaldo,
            besitztTransaktionLimit: besitztTransaktionLimit!,
            transaktionLimit: transaktionLimit!,
            waehrungen: waehrungen!,
        });

        const bankkontoNeueVersion = await this.update({
            bankkontoId,
            version: `"${version}"`,
            bankkonto: updatedBankkonto,
        });
        return {
            transaktionID: transaktion.transaktionId,
            saldo: updatedBankkonto.saldo,
            bankkontoNeueVersion,
        };
    }

    async #findBankkontoByTransaktionTyp(
        transaktionTyp: TransaktionTyp,
        absender?: number,
        empfaenger?: number,
    ): Promise<Bankkonto> {
        return transaktionTyp === 'EINKOMMEN' || transaktionTyp === 'EINZAHLUNG'
            ? this.#readService.findByBankkontoId({ bankkontoId: empfaenger! })
            : this.#readService.findByBankkontoId({ bankkontoId: absender! });
    }

    #validateTransaktionLimit(
        bankkonto: Bankkonto,
        betrag: number,
        transaktionTyp: TransaktionTyp,
    ) {
        if (
            bankkonto.besitztTransaktionLimit === true &&
            bankkonto.transaktionLimit !== undefined &&
            (transaktionTyp === 'AUSZAHLUNG' ||
                transaktionTyp === 'ÜBERWEISUNG')
        ) {
            const heutigesDatum = new Date();
            heutigesDatum.setHours(0, 0, 0, 0);

            const heutigeTransaktionsSumme = (bankkonto.transaktionen ?? [])
                .filter(
                    (transaktion) =>
                        transaktion.transaktionTyp === transaktionTyp &&
                        (transaktion.transaktionTyp === 'AUSZAHLUNG' ||
                            transaktion.transaktionTyp === 'ÜBERWEISUNG') &&
                        transaktion.transaktionDatum &&
                        new Date(transaktion.transaktionDatum).setHours(
                            0,
                            0,
                            0,
                            0,
                        ) === heutigesDatum.getTime(),
                )
                .reduce(
                    (sum, transaktion) => sum + (transaktion.betrag ?? 0),
                    0,
                );

            const neueTransaktionsSumme = heutigeTransaktionsSumme + betrag;
            const restlichesLimit =
                bankkonto.transaktionLimit - heutigeTransaktionsSumme;
            this.#logger.debug(
                '#validateTransaktionLimit: restliches Limit heute=%d',
                restlichesLimit,
            );

            if (bankkonto.saldo < betrag) {
                throw new InsufficientFundsException(bankkonto.saldo, betrag);
            }

            if (neueTransaktionsSumme > bankkonto.transaktionLimit) {
                throw new LimitReachedException(bankkonto.transaktionLimit);
            }
        }
    }

    // Hilfsmethode, um zu prüfen, ob das Datum der Transaktion heute ist
    // #istHeutigesDatum(datum: Date): boolean {
    //     const heute = new Date();
    //     return (
    //         datum.getDate() === heute.getDate() &&
    //         datum.getMonth() === heute.getMonth() &&
    //         datum.getFullYear() === heute.getFullYear()
    //     );
    // }

    #berechneNeuenSaldo(
        saldo: number,
        betrag: number,
        transaktionTyp: string,
    ): number {
        const neuerSaldo: number =
            transaktionTyp === 'EINZAHLUNG' || transaktionTyp === 'EINKOMMEN'
                ? saldo + betrag
                : saldo - betrag;

        this.#logger.debug('berechneNeuenSaldo: neuerSaldo=%d', neuerSaldo);
        return neuerSaldo;
    }

    async #sendmail(bankkonto: Bankkonto) {
        const subject = `Neues Bankkonto`;
        const body = `Das Bankkonto ist angelegt für ${bankkonto.kunde?.vorname} ${bankkonto.kunde?.name}`;
        await this.#mailService.sendmail({ subject, body });
    }

    async #validateUpdate(
        bankkonto: Bankkonto,
        bankkontoId: number,
        versionStr: string,
    ): Promise<Bankkonto> {
        this.#logger.debug(
            '#validateUpdate: bankkonto=%o, bankkontoId=%s, versionStr=%s',
            bankkonto,
            bankkontoId,
            versionStr,
        );

        if (!BankkontoWriteService.VERSION_PATTERN.test(versionStr)) {
            throw new VersionInvalidException(versionStr);
        }

        const version = Number.parseInt(versionStr.slice(1, -1), 10);
        const bankkontoDb = await this.#readService.findByBankkontoId({
            bankkontoId,
        });

        if (version < bankkontoDb.version!) {
            throw new VersionOutdatedException(version);
        }

        return bankkontoDb;
    }

    async #newTransaktion(
        transaktionDTO: TransaktionDTO,
        bankkonto: Bankkonto,
    ): Promise<Transaktion> {
        const { absender, empfaenger, betrag, transaktionTyp } = transaktionDTO;
        const transaktion: Transaktion = await this.#transaktionRepo.save({
            bankkonto,
            transaktionTyp,
            betrag,
            absender,
            empfaenger,
            transactionDate: new Date(),
        });

        if (transaktionTyp === 'ÜBERWEISUNG') {
            await this.createTransaktion({
                absender,
                empfaenger,
                betrag,
                transaktionTyp: 'EINKOMMEN',
            });
        }
        return transaktion;
    }

    #bankkontoUpdateDTOToBankkonto({
        updatedSaldo,
        besitztTransaktionLimit,
        transaktionLimit,
        waehrungen,
    }: {
        updatedSaldo: number;
        besitztTransaktionLimit: boolean;
        transaktionLimit: number;
        waehrungen: string[];
    }): Bankkonto {
        return {
            bankkontoId: undefined,
            version: undefined,
            saldo: updatedSaldo,
            besitztTransaktionLimit,
            transaktionLimit,
            kunde: undefined,
            transaktionen: undefined,
            erstelltAm: undefined,
            aktualisiertAm: new Date(),
            dokumente: undefined,
            waehrungen,
        };
    }
}
