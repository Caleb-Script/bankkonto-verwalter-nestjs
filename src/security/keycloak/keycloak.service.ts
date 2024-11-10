/* eslint-disable camelcase, @typescript-eslint/naming-convention */

import { Injectable } from '@nestjs/common';
import axios, {
    type AxiosInstance,
    type AxiosResponse,
    type RawAxiosRequestHeaders,
} from 'axios';
import {
    type KeycloakConnectOptions,
    type KeycloakConnectOptionsFactory,
} from 'nest-keycloak-connect';
import { keycloakConnectOptions, paths } from '../../config/keycloak.js';
import { getLogger } from '../../logger/logger.js';

const { authServerUrl, clientId, secret } = keycloakConnectOptions;

/** Typdefinition für Eingabedaten zu einem Token. */
export type TokenData = {
    readonly username: string | undefined;
    readonly password: string | undefined;
};

@Injectable()
export class KeycloakService implements KeycloakConnectOptionsFactory {
    readonly #headers: RawAxiosRequestHeaders;
    readonly #headersAuthorization: RawAxiosRequestHeaders;

    readonly #keycloakClient: AxiosInstance;

    readonly #logger = getLogger(KeycloakService.name);

    constructor() {
        this.#headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };

        const encoded = btoa(`${clientId}:${secret}`);
        this.#headersAuthorization = {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${encoded}`,
        };

        this.#keycloakClient = axios.create({
            baseURL: authServerUrl!,
            // ggf. httpsAgent fuer HTTPS bei selbst-signiertem Zertifikat
        });
        this.#logger.debug('keycloakClient=%o', this.#keycloakClient.defaults);
    }

    createKeycloakConnectOptions(): KeycloakConnectOptions {
        return keycloakConnectOptions;
    }

    async token({ username, password }: TokenData) {
        this.#logger.debug('token: username=%s', username);
        if (username === undefined || password === undefined) {
            return;
        }

        const body = `username=${username}&password=${password}&grant_type=password&client_id=${clientId}&client_secret=${secret}`;
        let response: AxiosResponse<Record<string, number | string>>;
        try {
            response = await this.#keycloakClient.post(
                paths.accessToken,
                body,
                { headers: this.#headers },
            );
        } catch {
            this.#logger.warn('token: Fehler bei %s', paths.accessToken);
            return;
        }

        this.#logPayload(response);
        this.#logger.debug('token: response.data=%o', response.data);
        return response.data;
    }

    async refresh(refresh_token: string | undefined) {
        this.#logger.debug('refresh: refresh_token=%s', refresh_token);
        if (refresh_token === undefined) {
            return;
        }

        // https://stackoverflow.com/questions/51386337/refresh-access-token-via-refresh-token-in-keycloak
        const body = `refresh_token=${refresh_token}&grant_type=refresh_token`;
        let response: AxiosResponse<Record<string, number | string>>;
        try {
            response = await this.#keycloakClient.post(
                paths.accessToken,
                body,
                { headers: this.#headersAuthorization },
                // { headers: this.#headersBasic },
            );
        } catch (err) {
            this.#logger.warn('err=%o', err);
            this.#logger.warn(
                'refresh: Fehler bei POST-Request: path=%s, body=%o',
                paths.accessToken,
                body,
            );
            return;
        }
        this.#logger.debug('refresh: response.data=%o', response.data);
        return response.data;
    }

    // Extraktion der Rollen: wird auf Client-Seite benoetigt
    // { ..., "azp": "nest-client", "exp": ..., "resource_access": { "nest-client": { "roles": ["admin"] } ...}
    // azp = authorized party
    #logPayload(response: AxiosResponse<Record<string, string | number>>) {
        // https://www.keycloak.org/docs-api/23.0.6/rest-api/index.html#ClientInitialAccessCreatePresentation
        const { access_token } = response.data;
        // Payload ist der mittlere Teil zwischen 2 Punkten und mit Base64 codiert
        const [, payloadStr] = (access_token as string).split('.');

        // Base64 decodieren
        if (payloadStr === undefined) {
            return;
        }
        const payloadDecoded = atob(payloadStr);

        // JSON-Objekt fuer Payload aus dem decodierten String herstellen

        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        const payload = JSON.parse(payloadDecoded);
        const { azp, exp, resource_access } = payload;
        this.#logger.debug('#logPayload: exp=%s', exp);
        const { roles } = resource_access[azp]; // eslint-disable-line security/detect-object-injection
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */

        this.#logger.debug('#logPayload: roles=%o', roles);
    }
}
/* eslint-enable camelcase, @typescript-eslint/naming-convention */
