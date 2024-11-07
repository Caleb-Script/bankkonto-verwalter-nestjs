/* eslint-disable max-lines, @typescript-eslint/no-unsafe-assignment */

import { type GraphQLRequest } from '@apollo/server';
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { HttpStatus } from '@nestjs/common';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import {
    host,
    httpsAgent,
    port,
    shutdownServer,
    startServer,
} from '../testserver.js';
import { tokenGraphQL } from '../token.js';
import { type GraphQLResponseBody } from './bankkonto-query.resolver.test.js';

export type GraphQLQuery = Pick<GraphQLRequest, 'query'>;

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const idLoeschen = '6';

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
// eslint-disable-next-line max-lines-per-function
describe('GraphQL Mutations', () => {
    let client: AxiosInstance;
    const graphqlPath = 'graphql';

    // Testserver starten und dabei mit der DB verbinden
    beforeAll(async () => {
        await startServer();
        const baseURL = `https://${host}:${port}/`;
        client = axios.create({
            baseURL,
            httpsAgent,
        });
    });

    afterAll(async () => {
        await shutdownServer();
    });

    // -------------------------------------------------------------------------
    test('Neues Bankkonto', async () => {
        // given
        const token = await tokenGraphQL(client);
        const authorization = { Authorization: `Bearer ${token}` }; // eslint-disable-line @typescript-eslint/naming-convention
        const body: GraphQLQuery = {
            query: `
                mutation {
                    create(
                        input: {
                            saldo: 5.99,
                            transaktionLimit: 100.00,
                            kunde: {
                                name: "namecreatemutation",
                                vorname: "vornamecreatemutation"
                                email: "email@mutation.de",
                            },
                            transaktionen: [{
                                transaktionsTyp: EINZAHLUNG,
                                betrag: 50.49,
                                absender: "absendermutation",
                                empfaenger: "empaengermustation",
                                transaktionDatum: "2022-02-28",
                            }]
                        }
                    ) {
                        id
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body, { headers: authorization });

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu); // eslint-disable-line sonarjs/no-duplicate-string
        expect(data.data).toBeDefined();

        const { create } = data.data!;

        // Der Wert der Mutation ist die generierte ID
        expect(create).toBeDefined();
        expect(create.id).toBeGreaterThan(0);
    });

    // -------------------------------------------------------------------------
    test('Bankkonto mit ungueltigen Werten neu anlegen', async () => {
        // given
        const token = await tokenGraphQL(client);
        const authorization = { Authorization: `Bearer ${token}` }; // eslint-disable-line @typescript-eslint/naming-convention
        const body: GraphQLQuery = {
            query: `
                mutation {
                    create(
                        input: {
                            saldo: -5.000,
                            transaktionLimit: 0,
                            kunde: {
                                name: "???",
                                vorname: "!!!!"
                                email: "test123",
                            }
                        }
                    ) {
                        id
                    }
                }
            `,
        };
        const expectedMsg = [
            expect.stringMatching(/^saldo /u),
            expect.stringMatching(/^transaktionsLimit /u),
            expect.stringMatching(/^kunde.name /u),
            expect.stringMatching(/^kunde.vorname /u),
            expect.stringMatching(/^kunde.email /u),
        ];

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body, { headers: authorization });

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.data!.create).toBeNull();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;

        expect(error).toBeDefined();

        const { message } = error;
        const messages: string[] = message.split(',');

        expect(messages).toBeDefined();
        expect(messages).toHaveLength(expectedMsg.length);
        expect(messages).toEqual(expect.arrayContaining(expectedMsg));
    });

    // -------------------------------------------------------------------------
    test('Bankkonto aktualisieren', async () => {
        // given
        const token = await tokenGraphQL(client);
        const authorization = { Authorization: `Bearer ${token}` }; // eslint-disable-line @typescript-eslint/naming-convention
        const body: GraphQLQuery = {
            query: `
                mutation {
                    update(
                        input: {
                            id: "4",
                            version: 0,
                            saldo: 2000.00,
                            transaktionsLimit: 1000.00,
                        }
                    ) {
                        version
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body, { headers: authorization });

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.errors).toBeUndefined();

        const { update } = data.data!;

        // Der Wert der Mutation ist die neue Versionsnummer
        expect(update.version).toBe(1);
    });

    // -------------------------------------------------------------------------
    test('Bankkonto mit ungueltigen Werten aktualisieren', async () => {
        // given
        const token = await tokenGraphQL(client);
        const authorization = { Authorization: `Bearer ${token}` }; // eslint-disable-line @typescript-eslint/naming-convention
        const id = '4';
        const body: GraphQLQuery = {
            query: `
                mutation {
                    update(
                        input: {
                            id: "${id}",
                            version: 0,
                            saldo: -5.000,
                            transaktionLimit: 0,
                        }
                    ) {
                        version
                    }
                }
            `,
        };
        const expectedMsg = [
            expect.stringMatching(/^saldo /u),
            expect.stringMatching(/^transaktionsLimit /u),
        ];

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body, { headers: authorization });

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.data!.update).toBeNull();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;
        const { message } = error;
        const messages: string[] = message.split(',');

        expect(messages).toBeDefined();
        expect(messages).toHaveLength(expectedMsg.length);
        expect(messages).toEqual(expect.arrayContaining(expectedMsg));
    });

    // -------------------------------------------------------------------------
    test('Nicht-vorhandenes Bankkonto aktualisieren', async () => {
        // given
        const token = await tokenGraphQL(client);
        const authorization = { Authorization: `Bearer ${token}` }; // eslint-disable-line @typescript-eslint/naming-convention
        const id = '999999';
        const body: GraphQLQuery = {
            query: `
                mutation {
                    update(
                        input: {
                            id: "${id}",
                            version: 0,
                            saldo: 0.99,
                            transaktionsLimit: 10000000.00,
                        }
                    ) {
                        version
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body, { headers: authorization });

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.data!.update).toBeNull();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;

        expect(error).toBeDefined();

        const { message, path, extensions } = error;

        expect(message).toBe(
            `Es gibt kein Bankkonto mit der ID ${id.toLowerCase()}.`,
        );
        expect(path).toBeDefined();
        expect(path![0]).toBe('update');
        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('BAD_USER_INPUT');
    });

    // -------------------------------------------------------------------------
    test('Bankkonto loeschen', async () => {
        // given
        const token = await tokenGraphQL(client);
        const authorization = { Authorization: `Bearer ${token}` }; // eslint-disable-line @typescript-eslint/naming-convention
        const body: GraphQLQuery = {
            query: `
                mutation {
                    delete(id: "${idLoeschen}")
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body, { headers: authorization });

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.errors).toBeUndefined();

        const deleteMutation = data.data!.delete;

        // Der Wert der Mutation ist true (falls geloescht wurde) oder false
        expect(deleteMutation).toBe(true);
    });

    // -------------------------------------------------------------------------
    test('Bankkonto loeschen als "user"', async () => {
        // given
        const token = await tokenGraphQL(client, 'user', 'p');
        const authorization = { Authorization: `Bearer ${token}` }; // eslint-disable-line @typescript-eslint/naming-convention
        const body: GraphQLQuery = {
            query: `
                mutation {
                    delete(id: "6")
                }
            `,
        };

        // when
        const {
            status,
            headers,
            data,
        }: AxiosResponse<Record<'errors' | 'data', any>> = await client.post(
            graphqlPath,
            body,
            { headers: authorization },
        );

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);

        const { errors } = data;

        expect(errors[0].message).toBe('Forbidden resource');
        expect(errors[0].extensions.code).toBe('BAD_USER_INPUT');
        expect(data.data.delete).toBeNull();
    });
});
/* eslint-enable max-lines, @typescript-eslint/no-unsafe-assignment */
