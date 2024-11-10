/**
 * Das Modul enthält die Konfiguration für den Zugriff auf die DB.
 * @packageDocumentation
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { type DataSourceOptions } from 'typeorm';
import { Bankkonto } from '../bankkonto/model/entity/bankkonto.entity.js';
import { entities } from '../bankkonto/model/entity/entities.entity.js';
import { BASEDIR, config } from './app.js';
import { dbType } from './db.js';
import { logLevel } from './logger.js';
import { nodeConfig } from './node.js';
import {
    OracleNamingStrategy,
    SnakeNamingStrategy,
} from './typeormNamingStrategy.js';

const { db } = config;

// "Optional Chaining" und "Nullish Coalescing" ab ES2020
const database =
    (db?.name as string | undefined) ?? Bankkonto.name.toLowerCase();

const host = (db?.host as string | undefined) ?? 'localhost';
const username =
    (db?.username as string | undefined) ?? Bankkonto.name.toLowerCase();
const pass = (db?.password as string | undefined) ?? 'p';
const passAdmin = (db?.passwordAdmin as string | undefined) ?? 'p';
const namingStrategy =
    dbType === 'oracle'
        ? new OracleNamingStrategy()
        : new SnakeNamingStrategy();

// logging bei TypeORM durch console.log()
const logging =
    (nodeConfig.nodeEnv === 'development' || nodeConfig.nodeEnv === 'test') &&
    logLevel === 'debug';
const logger = 'advanced-console';

export const dbResourcesDir = path.resolve(
    nodeConfig.resourcesDir,
    'db',
    dbType,
);
console.debug('dbResourcesDir = %s', dbResourcesDir);

// https://github.com/tc39/proposal-record-tuple
let dataSourceOptions: DataSourceOptions;
switch (dbType) {
    case 'postgres': {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        const cert = readFileSync(
            path.resolve(dbResourcesDir, 'certificate.cer'), // eslint-disable-line sonarjs/no-duplicate-string
        );
        dataSourceOptions = {
            type: 'postgres',
            host,
            port: 5432,
            username,
            password: pass,
            database,
            schema: username,
            poolSize: 10,
            entities,
            namingStrategy,
            logging,
            logger,
            ssl: { cert },
            extra: { ssl: { rejectUnauthorized: false } },
        };
        break;
    }
    case 'mysql': {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        const cert = readFileSync(
            path.resolve(dbResourcesDir, 'certificate.cer'),
        );
        dataSourceOptions = {
            type: 'mysql',
            host,
            port: 3306,
            username,
            password: pass,
            database,
            poolSize: 10,
            entities,
            namingStrategy,
            supportBigNumbers: true,
            logging,
            logger,
            ssl: { cert },
            extra: { ssl: { rejectUnauthorized: false } },
        };
        break;
    }
    case 'oracle': {
        dataSourceOptions = {
            type: 'oracle',
            host,
            port: 1521,
            username,
            password: pass,
            database: 'FREEPDB1',
            serviceName: 'freepdb1',
            schema: username.toUpperCase(),
            poolSize: 10,
            entities,
            namingStrategy,
            logging,
            logger,
        };
        break;
    }
    // 'better-sqlite3' erfordert Python zum Uebersetzen, wenn das Docker-Image gebaut wird
    case 'sqlite': {
        const sqliteDatabase = path.resolve(
            BASEDIR,
            'config',
            'resources',
            'db',
            'sqlite',
            `${database}.sqlite`,
        );
        dataSourceOptions = {
            type: 'better-sqlite3',
            database: sqliteDatabase,
            entities,
            namingStrategy,
            logging,
            logger,
        };
        break;
    }
}
Object.freeze(dataSourceOptions);
export const typeOrmModuleOptions = dataSourceOptions;

if (logLevel === 'debug') {
    // "rest properties" ab ES 2018: https://github.com/tc39/proposal-object-rest-spread
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { password, ssl, ...typeOrmModuleOptionsLog } =
        typeOrmModuleOptions as any;
    console.debug('typeOrmModuleOptions = %o', typeOrmModuleOptionsLog);
}

export const dbPopulate = db?.populate === true;
let adminDataSourceOptionsTemp: DataSourceOptions | undefined;
if (dbType === 'postgres') {
    const cert = readFileSync(path.resolve(dbResourcesDir, 'certificate.cer')); // eslint-disable-line security/detect-non-literal-fs-filename
    adminDataSourceOptionsTemp = {
        type: 'postgres',
        host,
        port: 5432,
        username: 'postgres',
        password: passAdmin,
        database,
        schema: database,
        namingStrategy,
        logging,
        logger,
        ssl: { cert },
        extra: { ssl: { rejectUnauthorized: false } },
    };
} else if (dbType === 'mysql') {
    const cert = readFileSync(path.resolve(dbResourcesDir, 'certificate.cer')); // eslint-disable-line security/detect-non-literal-fs-filename
    adminDataSourceOptionsTemp = {
        type: 'mysql',
        host,
        port: 3306,
        username: 'root',
        password: passAdmin,
        database,
        namingStrategy,
        supportBigNumbers: true,
        logging,
        logger,
        ssl: { cert },
        extra: { ssl: { rejectUnauthorized: false } },
    };
}
export const adminDataSourceOptions = adminDataSourceOptionsTemp;
