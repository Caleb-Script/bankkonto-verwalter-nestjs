/**
 * Das Modul besteht aus der Controller-Klasse für Health-Checks.
 * @packageDocumentation
 */

import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
    HealthCheck,
    HealthCheckService,
    TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { Public } from 'nest-keycloak-connect';

/**
 * Die Controller-Klasse für Health-Checks.
 */
@Controller('health')
@Public()
@ApiTags('Health')
export class HealthController {
    readonly #health: HealthCheckService;

    readonly #typeorm: TypeOrmHealthIndicator;

    constructor(health: HealthCheckService, typeorm: TypeOrmHealthIndicator) {
        this.#health = health;
        this.#typeorm = typeorm;
    }

    @Get('liveness')
    @HealthCheck()
    @ApiOperation({ summary: 'Liveness überprüfen' })
    live() {
        return this.#health.check([
            () => ({
                appserver: {
                    status: 'up',
                },
            }),
        ]);
    }

    @Get('readiness')
    @HealthCheck()
    @ApiOperation({ summary: 'Readiness überprüfen' })
    ready() {
        return this.#health.check([() => this.#typeorm.pingCheck('db')]);
    }
}
