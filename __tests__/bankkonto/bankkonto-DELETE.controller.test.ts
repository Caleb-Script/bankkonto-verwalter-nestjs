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
import { tokenRest } from '../token.js';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const id = '5';

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
// eslint-disable-next-line max-lines-per-function
describe('DELETE /rest/bankkonten', () => {
    let client: AxiosInstance;

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

    test('Vorhandenes Bankkonto loeschen', async () => {
        // given
        const url = `/rest/${id}`;
        const token = await tokenRest(client);
        const headers: Record<string, string> = {
            Authorization: `Bearer ${token}`, // eslint-disable-line @typescript-eslint/naming-convention
        };

        // when
        const { status, data }: AxiosResponse<string> = await client.delete(
            url,
            { headers },
        );

        // then
        expect(status).toBe(HttpStatus.NO_CONTENT);
        expect(data).toBeDefined();
    });

    test('Bankkonto loeschen, aber ohne Token', async () => {
        // given
        const url = `/rest/${id}`;

        // when
        const response: AxiosResponse<Record<string, any>> =
            await client.delete(url);

        // then
        expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    test('Bankkonto loeschen, aber mit falschem Token', async () => {
        // given
        const url = `/rest/${id}`;
        const token = 'FALSCH';
        const headers: Record<string, string> = {
            Authorization: `Bearer ${token}`, // eslint-disable-line @typescript-eslint/naming-convention
        };

        // when
        const response: AxiosResponse<Record<string, any>> =
            await client.delete(url, { headers });

        // then
        expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    test('Vorhandenes Bankkonto als "user" loeschen', async () => {
        // given
        const url = `/rest/60`;
        const token = await tokenRest(client, 'user', 'p');
        const headers: Record<string, string> = {
            Authorization: `Bearer ${token}`, // eslint-disable-line @typescript-eslint/naming-convention
        };

        // when
        const response: AxiosResponse<string> = await client.delete(url, {
            headers,
        });

        // then
        expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });
});
