import { UseFilters, UseInterceptors } from '@nestjs/common';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { Public } from 'nest-keycloak-connect';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
import { Bankkonto } from '../model/entity/bankkonto.entity.js';
import { BankkontoReadService } from '../service/bankkonto-read.service.js';
import { type Suchkriterien } from '../service/suchkriterien.js';
import { HttpExceptionFilter } from './http-exception.filter.js';

export type IdInput = {
    readonly bankkontoId: number;
};

export type SuchkriterienInput = {
    readonly suchkriterien: Suchkriterien;
};

@Resolver('Bankkonto')
@UseFilters(HttpExceptionFilter)
@UseInterceptors(ResponseTimeInterceptor)
export class BankkontoQueryResolver {
    readonly #service: BankkontoReadService;

    readonly #logger = getLogger(BankkontoQueryResolver.name);

    constructor(service: BankkontoReadService) {
        this.#service = service;
    }

    @Query('bankkonto')
    @Public()
    async findById(@Args() { bankkontoId }: IdInput) {
        this.#logger.debug('findByBankkontoId: bankkontoId=%d', bankkontoId);

        const bankkonto = await this.#service.findByBankkontoId({
            bankkontoId,
        });

        if (this.#logger.isLevelEnabled('debug')) {
            this.#logger.debug(
                'findByBankkontoId: bankkonto=%s, kunde=%o',
                bankkonto.toString(),
                bankkonto.kunde,
            );
        }
        return bankkonto;
    }

    @Query('bankkonten')
    @Public()
    async find(@Args() input: SuchkriterienInput | undefined) {
        this.#logger.debug('find: input=%o', input);
        const bankkonten = await this.#service.find(input?.suchkriterien);
        this.#logger.debug('find: bankkonten=%o', bankkonten);
        return bankkonten;
    }

    @ResolveField('saldo')
    saldo(@Parent() bankkonto: Bankkonto, waehrung: boolean | undefined) {
        if (this.#logger.isLevelEnabled('debug')) {
            this.#logger.debug(
                'saldo: bankkonto=%s, waehrung=%s',
                bankkonto.toString(),
                waehrung,
            );
        }

        // Standardwert für den Saldo, falls nicht definiert
        const saldo = bankkonto.saldo ?? 0;
        const unit = waehrung === false ? '' : '€';

        // Formatierter Saldo als String mit Währungseinheit, falls angegeben
        return `${saldo.toFixed(2)} ${unit}`.trim();
    }
}
