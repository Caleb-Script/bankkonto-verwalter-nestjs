// eslint-disable-next-line @eslint-community/eslint-comments/disable-enable-pair
/* eslint-disable max-lines */
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { HttpStatus } from '@nestjs/common';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { type BankkontoDTO } from '../../src/bankkonto/model/dto/bankkonto.dto.js';
import { type TransaktionDTO } from '../../src/bankkonto/model/dto/transaktion.dto.js';
import { BankkontoReadService } from '../../src/bankkonto/service/bankkonto-read.service.js';
import {
    host,
    httpsAgent,
    port,
    shutdownServer,
    startServer,
} from '../testserver.js';
import { tokenRest } from '../token.js';
const UEBERWEISUNG = 'UEBERWEISUNG';
// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const neuesBankkonto: BankkontoDTO = {
    besitztTransaktionLimit: true,
    transaktionLimit: 100,
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
const neueEinzahlung: TransaktionDTO = {
    transaktionTyp: 'EINZAHLUNG',
    betrag: 100,
    absender: 1,
    empfaenger: 2,
};
const neueAuszahlung: TransaktionDTO = {
    transaktionTyp: 'AUSZAHLUNG',
    betrag: 100,
    absender: 1,
    empfaenger: 2,
};
const neueÜberweisung: TransaktionDTO = {
    transaktionTyp: UEBERWEISUNG,
    betrag: 300,
    absender: 1,
    empfaenger: 2,
};
const neueÜberweisungNichtGenügendSaldo: TransaktionDTO = {
    transaktionTyp: UEBERWEISUNG,
    betrag: 1000,
    absender: 1,
    empfaenger: 2,
};
const neueÜberweisungÜberLimit: TransaktionDTO = {
    transaktionTyp: UEBERWEISUNG,
    betrag: 600,
    absender: 1,
    empfaenger: 2,
};
const TRANSAKTION_PFAD = 'rest/transaktion';

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

    test('100 € in bankkonto 1 einzahlen', async () => {
        const token = await tokenRest(client);
        headers.Authorization = `Bearer ${token}`;
        headers['If-Match'] = '"0"';

        // when
        const response: AxiosResponse<string> = await client.post(
            TRANSAKTION_PFAD,
            neueEinzahlung,
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

    test('100 € von bankkonto 1 auf bankkonto 2 überweisen', async () => {
        const token = await tokenRest(client);
        headers.Authorization = `Bearer ${token}`;

        // when
        const response: AxiosResponse<string> = await client.post(
            TRANSAKTION_PFAD,
            neueÜberweisung,
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

    test('100 € in bankkonto 1 auszahlen', async () => {
        const token = await tokenRest(client);
        headers.Authorization = `Bearer ${token}`;

        // when
        const response: AxiosResponse<string> = await client.post(
            TRANSAKTION_PFAD,
            neueAuszahlung,
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

    test('600 € von bankkonto 1 auf bankkonto 2 überweisen (über Limit)', async () => {
        const token = await tokenRest(client);
        headers.Authorization = `Bearer ${token}`;

        // Überweisung über dem Limit
        const response: AxiosResponse<{ message: string; statusCode: number }> =
            await client.post(TRANSAKTION_PFAD, neueÜberweisungÜberLimit, {
                headers,
            });

        expect(response.status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(response.data.message).toContain(
            'Das Transaktionslimit von 500 wurde erreicht.',
        );
    });

    test('1000 € aus bankkonto 1 auszahlen (nicht genügend Mittel)', async () => {
        const token = await tokenRest(client);
        headers.Authorization = `Bearer ${token}`;

        // Auszahlung ohne ausreichend Saldo
        const response: AxiosResponse<{ message: string; statusCode: number }> =
            await client.post(
                TRANSAKTION_PFAD,
                neueÜberweisungNichtGenügendSaldo,
                { headers },
            );

        expect(response.status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(response.data.message).toContain(
            'Nicht genügend Geld auf dem Konto. Verfügbar: 600, benötigt: 1000.',
        );
    });

    // test.todo('Abgelaufener Token');
});
