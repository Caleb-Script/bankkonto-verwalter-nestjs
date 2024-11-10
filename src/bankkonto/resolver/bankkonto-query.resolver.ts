import { UseFilters, UseInterceptors } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Public } from 'nest-keycloak-connect';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
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
    async findByBankkontoId(@Args() { bankkontoId }: IdInput) {
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
}
