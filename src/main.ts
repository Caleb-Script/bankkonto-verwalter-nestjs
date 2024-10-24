import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
    DocumentBuilder,
    type SwaggerCustomOptions,
    SwaggerModule,
} from '@nestjs/swagger';
import compression from 'compression';
import { AppModule } from './app.module.js';
import { corsOptions } from './config/cors.js';
import { nodeConfig } from './config/node.js';
import { paths } from './config/paths.js';
import { helmetHandlers } from './security/http/helmet.handler.js';

const { httpsOptions, port } = nodeConfig;

const setupSwagger = (app: INestApplication) => {
    const config = new DocumentBuilder()
        .setTitle('Bank-Konto')
        .setDescription('Appserver zum verwalten von Bank Konten')
        .setVersion('2024.10.1')
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, config);
    const options: SwaggerCustomOptions = { customSiteTitle: 'SWE 24/25' };
    SwaggerModule.setup(paths.swagger, app, document, options);
};

const bootstrap = async () => {
    const app = await NestFactory.create(AppModule, { httpsOptions });
    app.use(helmetHandlers, compression());
    app.useGlobalPipes(new ValidationPipe());
    setupSwagger(app);
    app.enableCors(corsOptions);
    await app.listen(port);
};

await bootstrap();
