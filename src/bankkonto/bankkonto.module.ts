import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailModule } from '../mail/mail.module.js';
import { KeycloakModule } from '../security/keycloak/keycloak.module.js';
import { BankkontoGetController } from './controller/bankkonto-get.controller.js';
import { BankkontoWriteController } from './controller/bankkonto-write.controller.js';
import { entities } from './model/entity/entities.entity.js';
import { BankkontoMutationResolver } from './resolver/bankkonto-mutation.resolver.js';
import { BankkontoQueryResolver } from './resolver/bankkonto-query.resolver.js';
import { BankkontoReadService } from './service/bankkonto-read.service.js';
import { BankkontoWriteService } from './service/bankkonto-write.service.js';
import { QueryBuilder } from './service/query-builder.js';

/**
 * Das Modul besteht aus Controller- und Service-Klassen für die Verwaltung von
 * Bankkonten.
 * @packageDocumentation
 */

/**
 * Die dekorierte Modul-Klasse mit Controller- und Service-Klassen sowie der
 * Funktionalität für TypeORM.
 */
@Module({
    imports: [KeycloakModule, MailModule, TypeOrmModule.forFeature(entities)],
    controllers: [BankkontoGetController, BankkontoWriteController],
    providers: [
        BankkontoReadService,
        BankkontoWriteService,
        BankkontoQueryResolver,
        BankkontoMutationResolver,
        QueryBuilder,
    ],
    // Export der Provider fuer DI in anderen Modulen
    exports: [BankkontoReadService, BankkontoWriteService],
})
export class BankkontoModule {}
