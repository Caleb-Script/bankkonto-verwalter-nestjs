/**
 * Das Modul besteht aus der Controller-Klasse für Prometheus-Requests.
 * @packageDocumentation
 */

import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { Public } from 'nest-keycloak-connect';
import client from 'prom-client';

/**
 * Die Controller-Klasse für Metrik-Requests durch Prometheus.
 * https://github.com/siimon/prom-client
 */
@Controller('metrics')
@Public()
export class PrometheusController {
    readonly #register: client.Registry;
    readonly #contentType: string;

    constructor() {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { Registry } = client;
        this.#register = new Registry();
        this.#contentType = this.#register.contentType;

        const { collectDefaultMetrics } = client;
        client.collectDefaultMetrics({
            // !!!app: 'node-application-monitoring-app',
            prefix: 'node_',
            // !!!timeout: 10_000,
            gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5], // eslint-disable-line @typescript-eslint/no-magic-numbers
            register: this.#register,
        });
        collectDefaultMetrics({ register: this.#register });
    }

    @Get('')
    async metrics(@Res() res: Response<string>) {
        // https://grafana.com/grafana/dashboards/11159-nodejs-application-dashboard
        // https://docs.micrometer.io/micrometer/reference/concepts.html
        const metrics = await this.#register.metrics();
        return res.contentType(this.#contentType).send(metrics);
    }
}
