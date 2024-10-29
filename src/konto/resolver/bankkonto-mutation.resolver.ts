import { UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { IsInt, IsNumberString, Min } from 'class-validator';
import { AuthGuard, Roles } from 'nest-keycloak-connect';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
import { BankkontoDTO } from '../model/dto/bankkonto.dto.js';
import { type Transaktion } from '../model/entity/transaktion.entity.js';
import { type Bankkonto } from '../model/entity/bankkonto.entity.js';
import { type Kunde } from '../model/entity/kunde.entity.js';
import { BankkontoWriteService } from '../service/bankkonto-write.service.js';
import { type IdInput } from './bankkonto-query.resolver.js';
import { HttpExceptionFilter } from './http-exception.filter.js';
import { TransaktionDTO } from '../model/dto/transaktion.dto.js';

export type CreatePayload = {
    readonly kontoId: number;
};

export type UpdatePayload = {
    readonly version: number;
};

export class BankkontoUpdateDTO extends BankkontoDTO {
    @IsNumberString()
    readonly kontoId!: string;

    @IsInt()
    @Min(0)
    readonly version!: number;
}
@Resolver('Bankkonto')
// alternativ: globale Aktivierung der Guards https://docs.nestjs.com/security/authorization#basic-rbac-implementation
@UseGuards(AuthGuard)
@UseFilters(HttpExceptionFilter)
@UseInterceptors(ResponseTimeInterceptor)
export class BankkontoMutationResolver {
    readonly #service: BankkontoWriteService;

    readonly #logger = getLogger(BankkontoMutationResolver.name);

    constructor(service: BankkontoWriteService) {
        this.#service = service;
    }

    @Mutation()
    @Roles({ roles: ['admin', 'user'] })
    async create(@Args('input') bankkontoDTO: BankkontoDTO) {
        this.#logger.debug('create: bankkontoDTO=%o', bankkontoDTO);

        const bankkonto = this.#bankkontoDtoToBankkonto(bankkontoDTO);
        const kontoId = await this.#service.create(bankkonto);
        this.#logger.debug('createBankkonto: kontoId=%d', kontoId);
        const payload: CreatePayload = { kontoId };
        return payload;
    }

    @Mutation()
    @Roles({ roles: ['admin', 'user'] })
    async update(@Args('input') bankkontoDTO: BankkontoUpdateDTO) {
        this.#logger.debug('update: bankkonto=%o', bankkontoDTO);

        const bankkonto = this.#kontoUpdateDtoToKonto(bankkontoDTO);
        const versionStr = `"${bankkontoDTO.version.toString()}"`;

        const versionResult = await this.#service.update({
            bankkontoId: Number.parseInt(bankkontoDTO.kontoId, 10),
            bankkonto,
            version: versionStr,
        });
        // TODO BadUserInputError
        this.#logger.debug('updateBuch: versionResult=%d', versionResult);
        const payload: UpdatePayload = { version: versionResult };
        return payload;
    }

    @Mutation()
    @Roles({ roles: ['admin'] })
    async delete(@Args() kontoId: IdInput) {
        const idStr = kontoId.kontoId;
        this.#logger.debug('delete: kontoId=%s', idStr);
        const deletePerformed = await this.#service.delete(idStr);
        this.#logger.debug('deleteBankkonto: deletePerformed=%s', deletePerformed);
        return deletePerformed;
    }

    #bankkontoDtoToBankkonto(bankkontoDTO: BankkontoDTO): Bankkonto {
        const kundeDTO = bankkontoDTO.kunde;
        const kunde: Kunde = {
            kundeId: undefined,
            name: kundeDTO.name,
            vorname: kundeDTO.vorname,
            email: kundeDTO.email,
            bankkonto: undefined,
        };
        // "Optional Chaining" ab ES2020
        const transaktionen = bankkontoDTO.transaktionen?.map((transaktionDTO: TransaktionDTO) => {
            const transaktion: Transaktion = {
                transaktionId: undefined,
                transaktionDatum: undefined,
                betrag: transaktionDTO.betrag,
                empfaenger: transaktionDTO.empfaenger,
                absender: transaktionDTO.absender,
                transaktionTyp: undefined,
                bankkonto: undefined,
            };
            return transaktion;
        });
        const bankkonto: Bankkonto = {
            bankkontoId: undefined,
            version: undefined,
            saldo: bankkontoDTO.saldo,
            transaktionLimit: bankkontoDTO.transaktionsLimit,
            erstelltAm: undefined,
            aktualisiertAm: undefined,
            kunde,
            transaktionen,
        };

        // Rueckwaertsverweis
        bankkonto.kunde!.bankkonto = bankkonto;
        return bankkonto;
    }

    #kontoUpdateDtoToKonto(bankkontoDTO: BankkontoUpdateDTO): Bankkonto {
        return {
            bankkontoId: undefined,
            version: undefined,
            saldo: bankkontoDTO.saldo,
            transaktionLimit: bankkontoDTO.transaktionsLimit,
            aktualisiertAm: undefined,
            erstelltAm: undefined,
            kunde: undefined,
            transaktionen: undefined,
        };
    }

    // #errorMsgCreateBuch(err: CreateError) {
    //     switch (err.type) {
    //         case 'IsbnExists': {
    //             return `Die ISBN ${err.isbn} existiert bereits`;
    //         }
    //         default: {
    //             return 'Unbekannter Fehler';
    //         }
    //     }
    // }

    // #errorMsgUpdateBuch(err: UpdateError) {
    //     switch (err.type) {
    //         case 'BuchNotExists': {
    //             return `Es gibt kein Buch mit der ID ${err.id}`;
    //         }
    //         case 'VersionInvalid': {
    //             return `"${err.version}" ist keine gueltige Versionsnummer`;
    //         }
    //         case 'VersionOutdated': {
    //             return `Die Versionsnummer "${err.version}" ist nicht mehr aktuell`;
    //         }
    //         default: {
    //             return 'Unbekannter Fehler';
    //         }
    //     }
    // }
}
