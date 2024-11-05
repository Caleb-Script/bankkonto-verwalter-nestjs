import { UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthGuard, Roles } from 'nest-keycloak-connect';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
import { BankkontoUpdateDTO } from '../model/dto/bankkonto-update.dto.js';
import { BankkontoDTO } from '../model/dto/bankkonto.dto.js';
import { type Bankkonto } from '../model/entity/bankkonto.entity.js';
import { type Kunde } from '../model/entity/kunde.entity.js';
import { BankkontoWriteService } from '../service/bankkonto-write.service.js';
import { type IdInput } from './bankkonto-query.resolver.js';
import { HttpExceptionFilter } from './http-exception.filter.js';

export type CreatePayload = {
    readonly bankkontoId: number;
};

export type UpdatePayload = {
    readonly version: number;
};

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
        const bankkontoId = await this.#service.create(bankkonto);
        this.#logger.debug('createBankkonto: kontoId=%d', bankkontoId);
        const payload: CreatePayload = { bankkontoId };
        return payload;
    }

    @Mutation()
    @Roles({ roles: ['admin', 'user'] })
    async update(@Args('input') bankkontoDTO: BankkontoUpdateDTO) {
        this.#logger.debug('update: bankkonto=%o', bankkontoDTO);

        const bankkonto = this.#kontoUpdateDtoToKonto(bankkontoDTO);
        const versionStr = `"${bankkontoDTO.version.toString()}"`;

        const versionResult = await this.#service.update({
            bankkontoId: bankkontoDTO.bankkontoId,
            bankkonto,
            version: versionStr,
        });
        // TODO BadUserInputError
        this.#logger.debug('updateKonto: versionResult=%d', versionResult);
        const payload: UpdatePayload = { version: versionResult };
        return payload;
    }

    @Mutation()
    @Roles({ roles: ['admin'] })
    async delete(@Args() bankkontoId: IdInput) {
        const idStr = bankkontoId.bankkontoId;
        this.#logger.debug('delete: kontoId=%s', idStr);
        const deletePerformed = await this.#service.delete(idStr);
        this.#logger.debug(
            'deleteBankkonto: deletePerformed=%s',
            deletePerformed,
        );
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

        const bankkonto: Bankkonto = {
            bankkontoId: undefined,
            version: undefined,
            saldo: 0,
            besitztTransaktionLimit: false,
            transaktionLimit: bankkontoDTO.transaktionsLimit,
            waehrungen: bankkontoDTO.waehrungen,
            erstelltAm: undefined,
            aktualisiertAm: undefined,
            kunde,
            transaktionen: undefined,
            dokumente: undefined,
        };

        // Rueckwaertsverweis
        bankkonto.kunde!.bankkonto = bankkonto;
        return bankkonto;
    }

    #kontoUpdateDtoToKonto(bankkontoDTO: BankkontoUpdateDTO): Bankkonto {
        return {
            bankkontoId: undefined,
            version: undefined,
            saldo: 0,
            besitztTransaktionLimit: bankkontoDTO.besitztTransaktionLimit,
            transaktionLimit: bankkontoDTO.transaktionsLimit,
            aktualisiertAm: undefined,
            erstelltAm: undefined,
            kunde: undefined,
            transaktionen: undefined,
            waehrungen: bankkontoDTO.waehrungen,
            dokumente: undefined,
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
