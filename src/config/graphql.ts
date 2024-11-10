import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import path from 'node:path';
import { BASEDIR } from './app.js';

const schemaGraphQL = path.join(
    BASEDIR,
    'config',
    'resources',
    'graphql',
    'schema.graphql',
);
console.debug('schemaGraphQL = %s', schemaGraphQL);

/**
 * Das Konfigurationsobjekt für GraphQL (siehe src\app.module.ts).
 */
export const graphQlModuleOptions: ApolloDriverConfig = {
    typePaths: [schemaGraphQL],
    // alternativ: Mercurius (statt Apollo) fuer Fastify (statt Express)
    driver: ApolloDriver,
    playground: false,
};
