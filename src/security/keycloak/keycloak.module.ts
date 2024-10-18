// eslint-disable-next-line max-classes-per-file
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import {
    AuthGuard,
    KeycloakConnectModule,
    RoleGuard,
} from 'nest-keycloak-connect';
import { KeycloakService } from './keycloak.service.js';
import { TokenController } from './token.controller.js';
import { TokenResolver } from './token.resolver.js';

@Module({
    providers: [KeycloakService],
    exports: [KeycloakService],
})
class ConfigModule {}

@Module({
    imports: [
        KeycloakConnectModule.registerAsync({
            useExisting: KeycloakService,
            imports: [ConfigModule],
        }),
    ],
    controllers: [TokenController],
    providers: [
        KeycloakService,
        TokenResolver,
        {
            // fuer @UseGuards(AuthGuard)
            provide: APP_GUARD,
            useClass: AuthGuard,
        },
        {
            // fuer @Roles({ roles: ['admin'] }) einschl. @Public() und @AllowAnyRole()
            provide: APP_GUARD,
            useClass: RoleGuard,
        },
    ],
    exports: [KeycloakConnectModule],
})
export class KeycloakModule {}
