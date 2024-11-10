/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { type GraphQLRequest } from '@apollo/server';
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { HttpStatus } from '@nestjs/common';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { type GraphQLFormattedError } from 'graphql';
import { type Bankkonto } from '../../src/bankkonto/model/entity/bankkonto.entity.js';
import {
    host,
    httpsAgent,
    port,
    shutdownServer,
    startServer,
} from '../testserver.js';

export type GraphQLResponseBody = {
    data?: Record<string, any> | null;
    errors?: readonly [GraphQLFormattedError];
};

type BankkontoDTO = Omit<
    Bankkonto,
    'transaktionen' | 'aktualisiert' | 'erzeugt' | 'saldo'
> & {
    saldo: string;
};

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const bankkontoIdVorhanden = '1';

const emailVorhanden = 'max@example.com';
const teilEmailVorhanden = 'a';
const teilEmailNichtVorhanden = 'ZZZ';

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
// eslint-disable-next-line max-lines-per-function
describe('GraphQL Queries', () => {
    let client: AxiosInstance;
    const graphqlPath = 'graphql';

    // Testserver starten und dabei mit der DB verbinden
    beforeAll(async () => {
        await startServer();
        const baseURL = `https://${host}:${port}/`;
        client = axios.create({
            baseURL,
            httpsAgent,
            // auch Statuscode 400 als gueltigen Request akzeptieren, wenn z.B.
            // ein Enum mit einem falschen String getestest wird
            validateStatus: () => true,
        });
    });

    afterAll(async () => {
        await shutdownServer();
    });

    test('Bankkonto zu vorhandener ID', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    bankkonto(bankkontoId: "${bankkontoIdVorhanden}") {
                    version
                    saldo
                    transaktionLimit
                    waehrungen
                    erstelltAm
                    aktualisiertAm
                    kunde {
                        kundeId
                        name
                        vorname
                        email
                        }
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu); // eslint-disable-line sonarjs/no-duplicate-string
        expect(data.errors).toBeUndefined();
        expect(data.data).toBeDefined();

        const { bankkonto } = data.data!;
        const result: BankkontoDTO = bankkonto;

        expect(result.kunde?.name).toMatch(/^\w/u);
        expect(result.version).toBeGreaterThan(-1);
        expect(result.bankkontoId).toBeUndefined();
    });

    test('Bankkonto zu nicht-vorhandener ID', async () => {
        // given
        const bankkontoId = '999';
        const body: GraphQLRequest = {
            query: `
                {
                    bankkonto(bankkontoId: "999") {
                    bankkontoId
                    version
                    saldo
                    transaktionLimit
                    waehrungen
                    erstelltAm
                    aktualisiertAm
                    kunde {
                        kundeId
                        name
                        vorname
                        email
                        }
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.data!.bankkonto).toBeNull();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;
        const { message, path, extensions } = error;

        expect(message).toBe(
            `Es gibt kein Bankkonto mit der ID ${bankkontoId}.`,
        );
        expect(path).toBeDefined();
        expect(path![0]).toBe('bankkonto');
        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('BAD_USER_INPUT');
    });

    test('Bankkonto zu vorhandener Email', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    bankkonten(suchkriterien: { email: "${emailVorhanden}" }) {
                        bankkontoId
                        version
                        saldo
                        transaktionLimit
                        waehrungen
                        erstelltAm
                        aktualisiertAm
                        kunde {
                            kundeId
                            name
                            vorname
                            email
                        }
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.errors).toBeUndefined();

        expect(data.data).toBeDefined();

        const { bankkonten } = data.data!;

        expect(bankkonten).not.toHaveLength(0);

        const bankkontenArray: BankkontoDTO[] = bankkonten;

        expect(bankkontenArray).toHaveLength(1);

        const [bankkonto] = bankkontenArray;

        expect(bankkonto!.kunde?.email).toBe(emailVorhanden);
    });

    test('Bankkonto zu vorhandenem Teil-Email', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    bankkonten(suchkriterien: { email: "${teilEmailVorhanden}" }) {
                        bankkontoId
                        version
                        saldo
                        transaktionLimit
                        waehrungen
                        erstelltAm
                        aktualisiertAm
                        kunde {
                            kundeId
                            name
                            vorname
                            email
                        }
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.errors).toBeUndefined();
        expect(data.data).toBeDefined();

        const { bankkonten } = data.data!;

        expect(bankkonten).not.toHaveLength(0);

        const bankkontenArray: BankkontoDTO[] = bankkonten;
        bankkontenArray
            .map((bankkonto) => bankkonto.kunde)
            .forEach((kunde) =>
                expect(kunde?.email).toEqual(
                    expect.stringContaining(teilEmailVorhanden.toLowerCase()),
                ),
            );
    });

    test('Bankkonto zu nicht vorhandener Email Adresse', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    bankkonten(suchkriterien: { email: "${teilEmailNichtVorhanden}" }) {
                        bankkontoId
                        version
                        saldo
                        transaktionLimit
                        waehrungen
                        erstelltAm
                        aktualisiertAm
                        kunde {
                            kundeId
                            name
                            vorname
                            email
                        }
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.data!.bankkonten).toBeNull();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;
        const { message, path, extensions } = error;

        expect(message).toMatch(/^Keine Bankkonten gefunden:/u);
        expect(path).toBeDefined();
        expect(path![0]).toBe('bankkonten');
        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('BAD_USER_INPUT');
    });

    // test('Bankkonto zu vorhandenem TransaktionsLimit', async () => {
    //     // given
    //     const body: GraphQLRequest = {
    //         query: `
    //             {
    //                 bankkonten(suchkriterien: {
    //                     transaktionsLimit: "${transaktionLimitVorhanden}"
    //                 }) {
    //                     kunde {
    //                         kundeId
    //                     }
    //                 }
    //             }
    //         `,
    //     };

    //     // when
    //     const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
    //         await client.post(graphqlPath, body);

    //     // then
    //     expect(status).toBe(HttpStatus.OK);
    //     expect(headers['content-type']).toMatch(/json/iu);
    //     expect(data.errors).toBeUndefined();

    //     expect(data.data).toBeDefined();

    //     const { bankkonten } = data.data!;

    //     expect(bankkonten).not.toHaveLength(0);

    //     const bankkontenArray: BankkontoDTO[] = bankkonten;

    //     expect(bankkontenArray).toHaveLength(1);

    //     const [bankkonto] = bankkontenArray;
    //     const { kunde } = bankkonto!;

    //     // expect(isbn).toBe(isbnVorhanden);
    //     expect(kunde?.kundeId).toBeDefined();
    // });

    // test('Bankkonten mit besitztTransaktionsLimit=true', async () => {
    //     // given
    //     const body: GraphQLRequest = {
    //         query: `
    //             {
    //                 bankkonten(suchkriterien: { besitztTransaktionsLimit: true }) {
    //                     bankkontoId
    //                     version
    //                     saldo
    //                     transaktionLimit
    //                     waehrungen
    //                     erstelltAm
    //                     aktualisiertAm
    //                     kunde {
    //                         kundeId
    //                         name
    //                         vorname
    //                         email
    //                     }
    //                 }
    //             }
    //         `,
    //     };

    //     // when
    //     const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
    //         await client.post(graphqlPath, body);

    //     // then
    //     expect(status).toBe(HttpStatus.OK);
    //     expect(headers['content-type']).toMatch(/json/iu);
    //     expect(data.errors).toBeUndefined();

    //     expect(data.data).toBeDefined();

    //     const { bankkonten } = data.data!;

    //     expect(bankkonten).not.toHaveLength(0);

    //     const bankkontenArray: BankkontoDTO[] = bankkonten;

    //     bankkontenArray.forEach((bankkonto) => {
    //         const { besitztTransaktionLimit, kunde } = bankkonto;

    //         expect(besitztTransaktionLimit).toBe(true);
    //         expect(kunde?.kundeId).toBeDefined();
    //     });
    // });
});

/* eslint-enable @typescript-eslint/no-unsafe-assignment */
/* eslint-enable max-lines */
