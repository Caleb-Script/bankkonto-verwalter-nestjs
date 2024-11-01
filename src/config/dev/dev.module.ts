import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bankkonto } from '../../bankkonto/model/entity/bankkonto.entity.js';
import { KeycloakModule } from '../../security/keycloak/keycloak.module.js';
import { DbPopulateService } from './db-populate.service.js';
import { DevController } from './dev.controller.js';

@Module({
    imports: [KeycloakModule, TypeOrmModule.forFeature([Bankkonto])],
    controllers: [DevController],
    providers: [DbPopulateService],
    exports: [DbPopulateService],
})
export class DevModule {}
