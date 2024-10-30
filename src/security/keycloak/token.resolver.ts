import { UseInterceptors } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Public } from 'nest-keycloak-connect';
import { BadUserInputError } from '../../bankkonto/resolver/errors.js';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
import { KeycloakService } from './keycloak.service.js';

// @nestjs/graphql fasst die Input-Daten zu einem Typ zusammen
/** Typdefinition für Token-Daten bei GraphQL */
export type TokenInput = {
    /** Benutzername */
    readonly username: string;
    /** Passwort */
    readonly password: string;
};

/** Typdefinition für Refresh-Daten bei GraphQL */
export type RefreshInput = {
    /** Refresh Token */
    readonly refresh_token: string; // eslint-disable-line @typescript-eslint/naming-convention
};

@Resolver()
@UseInterceptors(ResponseTimeInterceptor)
export class TokenResolver {
    readonly #keycloakService: KeycloakService;

    readonly #logger = getLogger(TokenResolver.name);

    constructor(keycloakService: KeycloakService) {
        this.#keycloakService = keycloakService;
    }

    @Mutation()
    @Public()
    async token(@Args() { username, password }: TokenInput) {
        this.#logger.debug('token: username=%s', username);

        const result = await this.#keycloakService.token({
            username,
            password,
        });
        if (result === undefined) {
            throw new BadUserInputError(
                'Falscher Benutzername oder falsches Passwort',
            );
        }

        this.#logger.debug('token: result=%o', result);
        return result;
    }

    @Mutation()
    @Public()
    async refresh(@Args() input: RefreshInput) {
        this.#logger.debug('refresh: input=%o', input);
        // eslint-disable-next-line camelcase, @typescript-eslint/naming-convention
        const { refresh_token } = input;

        const result = await this.#keycloakService.refresh(refresh_token);
        if (result === undefined) {
            throw new BadUserInputError('Falscher Token');
        }

        this.#logger.debug('refresh: result=%o', result);
        return result;
    }
}
