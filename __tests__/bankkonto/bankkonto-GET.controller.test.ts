/* eslint-disable no-underscore-dangle */

import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { HttpStatus } from '@nestjs/common';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { type BankkontenModel } from '../../src/bankkonto/controller/bankkonto-get.controller.js';
import {
    host,
    httpsAgent,
    port,
    shutdownServer,
    startServer,
} from '../testserver.js';
import { type ErrorResponse } from './error-response.js';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const emailVorhanden = 'a';
const emailNichtVorhanden = 'xx';
const waehrungenVorhanden = 'EUR';
const waehrungenNichtVorhanden = 'EUS';

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
// eslint-disable-next-line max-lines-per-function
describe('GET /rest', () => {
    let baseURL: string;
    let client: AxiosInstance;

    beforeAll(async () => {
        await startServer();
        baseURL = `https://${host}:${port}/rest`;
        client = axios.create({
            baseURL,
            httpsAgent,
            validateStatus: () => true,
        });
    });

    afterAll(async () => {
        await shutdownServer();
    });

    test('Alle Bankkonten', async () => {
        // given

        // when
        const { status, headers, data }: AxiosResponse<BankkontenModel> =
            await client.get('/');

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu); // eslint-disable-line sonarjs/no-duplicate-string
        expect(data).toBeDefined();

        const { bankkonten } = data._embedded;

        bankkonten
            .map((bankkonto) => bankkonto._links.self.href)
            .forEach((selfLink) => {
                // eslint-disable-next-line security/detect-non-literal-regexp, security-node/non-literal-reg-expr
                expect(selfLink).toMatch(new RegExp(`^${baseURL}`, 'iu'));
            });
    });

    test('Bankkonten mit einer Teil-Email suchen', async () => {
        // given
        const params = { email: emailVorhanden };

        // when
        const { status, headers, data }: AxiosResponse<BankkontenModel> =
            await client.get('/', { params });

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data).toBeDefined();

        const { bankkonten } = data._embedded;

        // Jedes Bankkonto hat einen Titel mit dem Teilstring 'a'
        bankkonten
            .map((bankkonto) => bankkonto.kunde.email)
            .forEach((email) =>
                expect(email?.toLowerCase()).toEqual(
                    expect.stringContaining(emailVorhanden),
                ),
            );
    });

    test('Bankkonten zu einem nicht vorhandenen Teil-Email suchen', async () => {
        // given
        const params = { email: emailNichtVorhanden };

        // when
        const { status, data }: AxiosResponse<ErrorResponse> = await client.get(
            '/',
            { params },
        );

        // then
        expect(status).toBe(HttpStatus.NOT_FOUND);

        const { error, statusCode } = data;

        expect(error).toBe('Not Found');
        expect(statusCode).toBe(HttpStatus.NOT_FOUND);
    });

    test('Mind. 1 Bankkonto mit vorhandenem Währung', async () => {
        // given
        const params = { waehrungen: waehrungenVorhanden };

        // when
        const { status, headers, data }: AxiosResponse<BankkontenModel> =
            await client.get('/', { params });

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        // JSON-Array mit mind. 1 JSON-Objekt
        expect(data).toBeDefined();

        const { bankkonten } = data._embedded;

        // Jedes Bankkonto hat im Array der Schlagwoerter z.B. "javascript"
        bankkonten
            .map((bankkonto) => bankkonto.waehrungen)
            .forEach((schlagwoerter) =>
                expect(schlagwoerter).toEqual(
                    expect.arrayContaining([waehrungenVorhanden.toUpperCase()]),
                ),
            );
    });

    test('Keine Bankkonten zu einem nicht vorhandenen Schlagwort', async () => {
        // given
        const params = { [waehrungenNichtVorhanden]: 'true' };

        // when
        const { status, data }: AxiosResponse<ErrorResponse> = await client.get(
            '/',
            { params },
        );

        // then
        expect(status).toBe(HttpStatus.NOT_FOUND);

        const { error, statusCode } = data;

        expect(error).toBe('Not Found');
        expect(statusCode).toBe(HttpStatus.NOT_FOUND);
    });

    test('Keine Bankkonten zu einer nicht-vorhandenen Property', async () => {
        // given
        const params = { foo: 'bar' };

        // when
        const { status, data }: AxiosResponse<ErrorResponse> = await client.get(
            '/',
            { params },
        );

        // then
        expect(status).toBe(HttpStatus.NOT_FOUND);

        const { error, statusCode } = data;

        expect(error).toBe('Not Found');
        expect(statusCode).toBe(HttpStatus.NOT_FOUND);
    });
});
/* eslint-enable no-underscore-dangle */
