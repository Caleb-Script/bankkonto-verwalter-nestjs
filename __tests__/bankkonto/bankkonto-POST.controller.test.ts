import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { HttpStatus } from '@nestjs/common';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { type BankkontoDTO } from '../../src/bankkonto/model/dto/bankkonto.dto.js';
import { BankkontoReadService } from '../../src/bankkonto/service/bankkonto-read.service.js';
import {
    host,
    httpsAgent,
    port,
    shutdownServer,
    startServer,
} from '../testserver.js';
import { tokenRest } from '../token.js';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const neuesBankkonto: BankkontoDTO = {
    transaktionsLimit: 100,
    waehrungen: ['EUR', 'USD'],
    kunde: {
        name: 'Jefferson',
        vorname: 'Rolly',
        email: 'JR@ok.de',
    },
};
// const neuesBankkontoKundeExistiert: BankkontoDTO = {
//     transaktionsLimit: 10,
//     waehrungen: ['EUR'],
//     kunde: {
//         name: 'Jefferson',
//         vorname: 'Rolly',
//         email: 'JR@ok.de',
//     },
// };
const neuesBankkontoInvalid: Record<string, unknown> = {
    transaktionsLimit: -1,
    waehrungen: ['FAKE'],
    kunde: {
        name: '',
        vorname: '',
        email: 'invalidEmail',
    },
};

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
// eslint-disable-next-line max-lines-per-function
describe('POST /rest', () => {
    let client: AxiosInstance;
    const headers: Record<string, string> = {
        'Content-Type': 'application/json', // eslint-disable-line @typescript-eslint/naming-convention
    };

    // Testserver starten und dabei mit der DB verbinden
    beforeAll(async () => {
        await startServer();
        const baseURL = `https://${host}:${port}`;
        client = axios.create({
            baseURL,
            httpsAgent,
            validateStatus: (status) => status < 500, // eslint-disable-line @typescript-eslint/no-magic-numbers
        });
    });

    afterAll(async () => {
        await shutdownServer();
    });

    test('Neues Bankkonto', async () => {
        // given
        const token = await tokenRest(client);
        headers.Authorization = `Bearer ${token}`;

        // when
        const response: AxiosResponse<string> = await client.post(
            '/rest',
            neuesBankkonto,
            { headers },
        );

        // then
        const { status, data } = response;

        expect(status).toBe(HttpStatus.CREATED);

        const { location } = response.headers as { location: string };

        expect(location).toBeDefined();

        // ID nach dem letzten "/"
        const indexLastSlash: number = location.lastIndexOf('/');

        expect(indexLastSlash).not.toBe(-1);

        const idStr = location.slice(indexLastSlash + 1);

        expect(idStr).toBeDefined();
        expect(BankkontoReadService.ID_PATTERN.test(idStr)).toBe(true);

        expect(data).toBe('');
    });

    test('Neues Bankkonto mit ungueltigen Daten', async () => {
        // given
        const token = await tokenRest(client);
        headers.Authorization = `Bearer ${token}`;
        const expectedMsg = [
            // expect.stringMatching(/^transaktionsLimit /u),
            // expect.stringMatching(/^waehrungen /u),
            expect.stringMatching(/^kunde.name /u),
            expect.stringMatching(/^kunde.vorname /u),
            expect.stringMatching(/^kunde.email /u),
        ];

        // when
        const response: AxiosResponse<Record<string, any>> = await client.post(
            '/rest',
            neuesBankkontoInvalid,
            { headers },
        );

        // then
        const { status, data } = response;

        expect(status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const messages: string[] = data.message;

        expect(messages).toBeDefined();
        expect(messages).toHaveLength(expectedMsg.length);
        expect(messages).toEqual(expect.arrayContaining(expectedMsg));
    });

    // TODO duplicate ERROR implementieren
    // test('Neues Bankkonto, aber der Kunde existiert bereits', async () => {
    //     // given
    //     const token = await tokenRest(client);
    //     headers.Authorization = `Bearer ${token}`;

    //     // when
    //     const response: AxiosResponse<ErrorResponse> = await client.post(
    //         '/rest',
    //         neuesBankkontoKundeExistiert,
    //         { headers },
    //     );

    //     // then
    //     const { data } = response;

    //     const { message, statusCode } = data;

    //     expect(message).toEqual(expect.stringContaining('kunde'));
    //     expect(statusCode).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    // });

    test('Neues Bankkonto, aber ohne Token', async () => {
        // when
        const response: AxiosResponse<Record<string, any>> = await client.post(
            '/rest',
            neuesBankkonto,
        );

        // then
        expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    test('Neues Bankkonto, aber mit falschem Token', async () => {
        // given
        const token = 'FALSCH';
        headers.Authorization = `Bearer ${token}`;

        // when
        const response: AxiosResponse<Record<string, any>> = await client.post(
            '/rest',
            neuesBankkonto,
            { headers },
        );

        // then
        expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    test.todo('Abgelaufener Token');
});
