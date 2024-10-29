/**
 * Das Modul besteht aus der Controller-Klasse für Lesen an der REST-Schnittstelle.
 * @packageDocumentation
 */

/* eslint-disable max-lines */
// eslint-disable-next-line max-classes-per-file
import {
    Controller,
    Get,
    Headers,
    HttpStatus,
    NotFoundException,
    Param,
    Query,
    Req,
    Res,
    UseInterceptors,
} from '@nestjs/common';
import {
    ApiHeader,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiProperty,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Public } from 'nest-keycloak-connect';
import { paths } from '../../config/paths.js';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
import { type Kunde } from '../model/entity/kunde.entity.js';
import { type Suchkriterien } from '../service/suchkriterien.js';
import { getBaseUri } from './getBaseUri.js';
import { Bankkonto } from '../model/entity/bankkonto.entity';
import { TransaktionTyp } from '../model/entity/transaktion.entity';
import { BankkontoReadService } from '../service/bankkonto-read.service.js';

/** href-Link für HATEOAS */
export type Link = {
    /** href-Link für HATEOAS-Links */
    readonly href: string;
};

/** Links für HATEOAS */
export type Links = {
    /** self-Link */
    readonly self: Link;
    /** Optionaler Linke für list */
    readonly list?: Link;
    /** Optionaler Linke für add */
    readonly add?: Link;
    /** Optionaler Linke für update */
    readonly update?: Link;
    /** Optionaler Linke für remove */
    readonly remove?: Link;
};

/** Typedefinition für ein Kunde-Objekt ohne Rückwärtsverweis zum Bankkonto */
export type KundeModel = Omit<Kunde, 'kundeId' | 'bankkonto' | 'bankkontoId'>;

/** Bankkonto-Objekt mit HATEOAS-Links */
export type BankkontoModel = Omit<
    Bankkonto,
    | 'kunde'
    | 'transaktionen'
    | 'aktualisiertAm'
    | 'erstelltAm'
    | 'bankkontoId'
    | 'saldo'
    | 'transktionLimit'
    | 'version'
> & {
    kunde: KundeModel;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    _links: Links;
};

/** Bankkonto-Objekte mit HATEOAS-Links in einem JSON-Array. */
export type BankkontenModel = {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    _embedded: {
        bankkonten: BankkontoModel[];
    };
};

/**
 * Klasse für `BankkontoGetController`, um Queries in _OpenAPI_ bzw. Swagger zu
 * formulieren. `BankkontoController` hat dieselben Properties wie die Basisklasse
 * `Bankkonto`
 */
export class BankkontoQuery implements Suchkriterien {
    @ApiProperty({ required: false })
    declare readonly transaktionen: string;

    @ApiProperty({ required: false })
    declare readonly kundeId: string;

    @ApiProperty({ required: false })
    declare readonly transaktionTyp: TransaktionTyp;

    @ApiProperty({ required: false })
    declare readonly absender: string;

    @ApiProperty({ required: false })
    declare readonly empfaenger: string;

    @ApiProperty({ required: false })
    declare readonly email: string;
}

const APPLICATION_HAL_JSON = 'application/hal+json';

/**
 * Die Controller-Klasse für die Verwaltung von Bankkonten.
 */
@Controller(paths.rest)
@UseInterceptors(ResponseTimeInterceptor)
@ApiTags('Bankkonto REST-API')
// @ApiBearerAuth()
// Klassen ab ES 2015
export class BankkontoGetController {
    // readonly in TypeScript, vgl. C#
    // private ab ES 2019
    readonly #service: BankkontoReadService;

    readonly #logger = getLogger(BankkontoGetController.name);

    // Dependency Injection (DI) bzw. Constructor Injection
    // constructor(private readonly service: BankkontoReadService) {}
    // https://github.com/tc39/proposal-type-annotations#omitted-typescript-specific-features-that-generate-code
    constructor(service: BankkontoReadService) {
        this.#service = service;
    }

    /**
     * Ein Bankkonto wird asynchron anhand seiner ID als Pfadparameter gesucht.
     *
     * Falls es ein solches Bankkonto gibt und `If-None-Match` im Request-Header
     * auf die aktuelle Version des Bankkontos gesetzt war, wird der Statuscode
     * `304` (`Not Modified`) zurückgeliefert. Falls `If-None-Match` nicht
     * gesetzt ist oder eine veraltete Version enthält, wird das gefundene
     * Bankkonto im Rumpf des Response als JSON-Datensatz mit Atom-Links für HATEOAS
     * und dem Statuscode `200` (`OK`) zurückgeliefert.
     *
     * Falls es kein Bankkonto zur angegebenen ID gibt, wird der Statuscode `404`
     * (`Not Found`) zurückgeliefert.
     *
     * @param idStr Pfad-Parameter `id`
     * @param req Request-Objekt von Express mit Pfadparameter, Query-String,
     *            Request-Header und Request-Body.
     * @param version Versionsnummer im Request-Header bei `If-None-Match`
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    // eslint-disable-next-line max-params
    @Get(':bankkontoId')
    @Public()
    @ApiOperation({ summary: 'Suche mit der Bankkonto-ID' })
    @ApiParam({
        name: 'bankkontoId',
        description: 'Z.B. 1',
    })
    @ApiHeader({
        name: 'If-None-Match',
        description: 'Header für bedingte GET-Requests, z.B. "0"',
        required: false,
    })
    @ApiOkResponse({ description: 'Das Bankkonto wurde gefunden' })
    @ApiNotFoundResponse({ description: 'Kein Bankkonto zur ID gefunden' })
    @ApiResponse({
        status: HttpStatus.NOT_MODIFIED,
        description: 'Das Bankkonto wurde bereits angelegt',
    })
    async getByBankkontoId(
        @Param('bankkontoId') idStr: string,
        @Req() req: Request,
        @Headers('If-None-Match') version: string | undefined,
        @Res() res: Response,
    ): Promise<Response<BankkontoModel | undefined>> {
        this.#logger.debug('getByBankkontoId: idStr=%s, version=%s', idStr, version);
        const bankkontoId = Number(idStr);
        if (!Number.isInteger(bankkontoId)) {
            this.#logger.debug('getByBankkontoId: not isInteger()');
            throw new NotFoundException(`Die Bankkonto-ID ${idStr} ist ungueltig.`);
        }

        if (req.accepts([APPLICATION_HAL_JSON, 'json', 'html']) === false) {
            this.#logger.debug('getByBankkontoId: accepted=%o', req.accepted);
            return res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
        }

        const bankkonto = await this.#service.findByBankkontoId({ bankkontoId });
        if (this.#logger.isLevelEnabled('debug')) {
            this.#logger.debug('getByBankkontoId(): bankkonto=%s', bankkonto.toString());
            this.#logger.debug('getByBankkontoId(): kunde=%o', bankkonto.kunde);
        }

        // ETags
        const versionDb = bankkonto.version;
        if (version === `"${versionDb}"`) {
            this.#logger.debug('getByBankkontoId: NOT_MODIFIED');
            return res.sendStatus(HttpStatus.NOT_MODIFIED);
        }
        this.#logger.debug('getByBankkontoId: versionDb=%s', versionDb);
        res.header('ETag', `"${versionDb}"`);

        // HATEOAS mit Atom Links und HAL (= Hypertext Application Language)
        const bankkontoModel = this.#toModel(bankkonto, req);
        this.#logger.debug('getByBankkontoId: bankkontoModel=%o', bankkontoModel);
        return res.contentType(APPLICATION_HAL_JSON).json(bankkontoModel);
    }

    /**
     * Bankkonten werden mit Query-Parametern asynchron gesucht. Falls es mindestens
     * ein solches Bankkonto gibt, wird der Statuscode `200` (`OK`) gesetzt. Im Rumpf
     * des Response ist das JSON-Array mit den gefundenen Bankkonten, die jeweils
     * um Atom-Links für HATEOAS ergänzt sind.
     *
     * Falls es kein Bankkonto zu den Suchkriterien gibt, wird der Statuscode `404`
     * (`Not Found`) gesetzt.
     *
     * Falls es keine Query-Parameter gibt, werden alle Bankkonten ermittelt.
     *
     * @param query Query-Parameter von Express.
     * @param req Request-Objekt von Express.
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    @Get()
    @Public()
    @ApiOperation({ summary: 'Suche mit Suchkriterien' })
    @ApiOkResponse({ description: 'Eine evtl. leere Liste mit Bankkonten' })
    async get(
        @Query() query: BankkontoQuery,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<Response<BankkontenModel | undefined>> {
        this.#logger.debug('get: query=%o', query);

        if (req.accepts([APPLICATION_HAL_JSON, 'json', 'html']) === false) {
            this.#logger.debug('get: accepted=%o', req.accepted);
            return res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
        }

        const bankkonten = await this.#service.find(query);
        this.#logger.debug('get: %o', bankkonten);

        // HATEOAS: Atom Links je Bankkonto
        const bankkontenModel = bankkonten.map((bankkonto :Bankkonto) =>
            this.#toModel(bankkonto, req, false),
        );
        this.#logger.debug('get: bankkontenModel=%o', bankkontenModel);

        const result: BankkontenModel = { _embedded: { bankkonten: bankkontenModel } };
        return res.contentType(APPLICATION_HAL_JSON).json(result).send();
    }

    #toModel(bankkonto: Bankkonto, req: Request, all = true) {
        const baseUri = getBaseUri(req);
        this.#logger.debug('#toModel: baseUri=%s', baseUri);
        const { bankkontoId } = bankkonto;
        const links = all
            ? {
                  self: { href: `${baseUri}/${bankkontoId}` },
                  list: { href: `${baseUri}` },
                  add: { href: `${baseUri}` },
                  update: { href: `${baseUri}/${bankkontoId}` },
                  remove: { href: `${baseUri}/${bankkontoId}` },
              }
            : { self: { href: `${baseUri}/${bankkontoId}` } };

        this.#logger.debug('#toModel: bankkonto=%o, links=%o', bankkonto, links);
        const kundeModel: KundeModel = {
            // "Optional Chaining" und "Nullish Coalescing" ab ES2020
            name: bankkonto.kunde?.name ?? 'N/A',
            vorname: bankkonto.kunde?.vorname ?? 'N/A',
            email: bankkonto.kunde?.email ?? 'N/A',
        };
        const bankkontoModel: BankkontoModel = {
            transaktionLimit: bankkonto.transaktionLimit,
            kunde: kundeModel,
            _links: links,
        };

        return bankkontoModel;
    }
}
/* eslint-enable max-lines */
