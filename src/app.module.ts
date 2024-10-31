import { type ApolloDriverConfig } from '@nestjs/apollo';
import {
    type MiddlewareConsumer,
    Module,
    type NestModule,
} from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from './admin/admin.module.js';
import { KontoModule } from './bankkonto/bankkonto.module.js';
import { DevModule } from './config/dev/dev.module.js';
import { graphQlModuleOptions } from './config/graphql.js';
import { typeOrmModuleOptions } from './config/typeormOptions.js';
import { LoggerModule } from './logger/logger.module.js';
import { RequestLoggerMiddleware } from './logger/request-logger.middleware.js';
import { KeycloakModule } from './security/keycloak/keycloak.module.js';
@Module({
    imports: [
        AdminModule,
        KontoModule,
        DevModule,
        GraphQLModule.forRoot<ApolloDriverConfig>(graphQlModuleOptions),
        LoggerModule,
        KeycloakModule,
        TypeOrmModule.forRoot(typeOrmModuleOptions),
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(RequestLoggerMiddleware).forRoutes('auth', 'graphql');
    }
}
