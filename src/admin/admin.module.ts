import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller.js';
import { PrometheusController } from './prometheus.controller.js';

@Module({
    imports: [TerminusModule, HttpModule],
    controllers: [HealthController, PrometheusController],
})
export class AdminModule {}
