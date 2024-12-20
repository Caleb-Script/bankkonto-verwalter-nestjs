// eslint-disable-next-line @eslint-community/eslint-comments/disable-enable-pair
/* eslint-disable max-lines */
import {
    Body,
    Controller,
    Delete,
    Headers,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Put,
    Req,
    Res,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiHeader,
    ApiNoContentResponse,
    ApiOperation,
    ApiPreconditionFailedResponse,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthGuard, Roles } from 'nest-keycloak-connect';
import { paths } from '../../config/paths.js';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
import {
    BankkontoDTO,
    BankkontoDtoOhneReferenz,
} from '../model/dto/bankkonto.dto.js';
import { TransaktionDTO } from '../model/dto/transaktion.dto.js';
import { type Bankkonto } from '../model/entity/bankkonto.entity.js';
import { type Kunde } from '../model/entity/kunde.entity.js';
import { BankkontoWriteService } from '../service/bankkonto-write.service.js';
import { getBaseUri } from './getBaseUri.js';

const MSG_FORBIDDEN = 'Kein Token mit ausreichender Berechtigung vorhanden';
const HEADER_IF_MATCH = 'Header "If-Match" fehlt';
const FEHLERHAFTE_BANKKONTODATEN = 'Fehlerhafte Bankkontodaten';
/**
 * Die Controller-Klasse für die Verwaltung von Bankkonten.
 */
@Controller(paths.rest)
@UseGuards(AuthGuard)
@UseInterceptors(ResponseTimeInterceptor)
@ApiTags('Bankkonto REST-API')
@ApiBearerAuth()
export class BankkontoWriteController {
    readonly #service: BankkontoWriteService;

    readonly #logger = getLogger(BankkontoWriteController.name);

    constructor(service: BankkontoWriteService) {
        this.#service = service;
    }

    /**
     * Ein neues Bankkonto wird asynchron angelegt. Wenn es keine
     * Verletzungen von Constraints gibt, wird der Statuscode `201` (`Created`)
     * gesetzt und im Response-Header wird `Location` auf die URI so gesetzt,
     * dass damit das neu angelegte Bankkonto abgerufen werden kann.
     *
     * Falls Constraints verletzt sind, wird der Statuscode `400` (`Bad Request`)
     * gesetzt
     *
     * @param bankkontoDTO JSON-Daten für ein Bankkonto im Request-Body.
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    @Post()
    @Roles({ roles: ['admin', 'user'] })
    @ApiOperation({ summary: 'Ein neues Bankkonto anlegen' })
    @ApiCreatedResponse({ description: 'Erfolgreich neu angelegt' })
    @ApiBadRequestResponse({ description: FEHLERHAFTE_BANKKONTODATEN })
    @ApiForbiddenResponse({ description: MSG_FORBIDDEN })
    async post(
        @Body() bankkontoDTO: BankkontoDTO,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<Response> {
        this.#logger.debug('post: bankkontoDTO=%o', bankkontoDTO);

        const bankkonto = this.#bankkontoDTOToBankkonto(bankkontoDTO);
        const bankkontoId = await this.#service.create(bankkonto);

        const location = `${getBaseUri(req)}/${bankkontoId}`;
        this.#logger.debug('post: location=%s', location);
        return res.location(location).send();
    }

    /**
     * Ein vorhandenes Bankkonto wird asynchron aktualisiert.
     * Bei erfolgreicher Aktualisierung wird der Statuscode `204` (`No Content`)
     * gesetzt und im Header auch `ETag` mit der neuen Version mitgeliefert.
     *
     * Falls die Versionsnummer fehlt, wird der Statuscode `428` (`Precondition
     * required`) gesetzt; und falls sie nicht korrekt ist, der Statuscode `412`
     * (`Precondition failed`). Falls Constraints verletzt sind, wird der
     * Statuscode `400` (`Bad Request`) gesetzt.
     *
     * @param bankkontoDTO Bankkontodaten im Body des Request-Objekts.
     * @param bankkontoId Pfad-Paramater für die Bankonto-ID.
     * @param version Versionsnummer aus dem Header _If-Match_.
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    // eslint-disable-next-line max-params
    @Put(':bankkontoId')
    @Roles({ roles: ['admin', 'user'] })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Ein vorhandenes Bankkonto aktualisieren',
        tags: ['Aktualisieren'],
    })
    @ApiHeader({
        name: 'If-Match',
        description: 'Header für optimistische Synchronisation',
        required: false,
    })
    @ApiNoContentResponse({ description: 'Erfolgreich aktualisiert' })
    @ApiBadRequestResponse({ description: FEHLERHAFTE_BANKKONTODATEN })
    @ApiPreconditionFailedResponse({
        description: 'Falsche Version im Header "If-Match"',
    })
    @ApiResponse({
        status: HttpStatus.PRECONDITION_REQUIRED,
        description: HEADER_IF_MATCH,
    })
    @ApiForbiddenResponse({ description: MSG_FORBIDDEN })
    async put(
        @Body() bankkontoDTO: BankkontoDtoOhneReferenz,
        @Param('bankkontoId') bankkontoId: number,
        @Headers('If-Match') version: string | undefined,
        @Res() res: Response,
    ): Promise<Response> {
        this.#logger.debug(
            'put: bankkontoId=%s, bankkontoDTO=%o, version=%s',
            bankkontoId,
            bankkontoDTO,
            version,
        );

        if (version === undefined) {
            const msg = HEADER_IF_MATCH;
            this.#logger.debug('put: msg=%s', msg);
            return res
                .status(HttpStatus.PRECONDITION_REQUIRED)
                .set('Content-Type', 'application/json')
                .send(msg);
        }

        const bankkonto =
            this.#bankkontoDtoOhneReferenzToBankkonto(bankkontoDTO);
        const neueVersion = await this.#service.update({
            bankkontoId,
            bankkonto,
            version,
        });
        this.#logger.debug('put: version=%d', neueVersion);
        return res.header('ETag', `"${neueVersion}"`).send();
    }

    /**
     * Ein Bankkonto wird anhand seiner Bankkonto-ID-gelöscht, die als Pfad-Parameter angegeben
     * ist. Der zurückgelieferte Statuscode ist `204` (`No Content`).
     *
     * @param bankkontoId Pfad-Paramater für die Bankkonto-ID.
     * @returns Leeres Promise-Objekt.
     */
    @Delete(':bankkontoId')
    @Roles({ roles: ['admin'] })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Bankkonto mit der Bankkonto-ID löschen' })
    @ApiNoContentResponse({
        description: 'Das Bankkonto wurde gelöscht oder war nicht vorhanden',
    })
    @ApiForbiddenResponse({ description: MSG_FORBIDDEN })
    async delete(@Param('bankkontoId') bankkontoId: number) {
        this.#logger.debug('delete: bankkontoId=%s', bankkontoId);
        await this.#service.delete(bankkontoId);
    }

    /**
     * Ein Bankkonto wird anhand seiner Bankkonto-ID-gelöscht, die als Pfad-Parameter angegeben
     * ist. Der zurückgelieferte Statuscode ist `204` (`No Content`).
     *
     * @returns Leeres Promise-Objekt.
     */
    // eslint-disable-next-line max-params
    @Post('transaktion')
    @Roles({ roles: ['admin', 'user'] })
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Ein vorhandenes Bankkonto aktualisieren',
        tags: ['Aktualisieren'],
    })
    @ApiHeader({
        name: 'If-Match',
        description: 'Header für optimistische Synchronisation',
        required: false,
    })
    @ApiNoContentResponse({ description: 'Erfolgreich aktualisiert' })
    @ApiBadRequestResponse({ description: FEHLERHAFTE_BANKKONTODATEN })
    @ApiPreconditionFailedResponse({
        description: 'Falsche Version im Header "If-Match"',
    })
    @ApiResponse({
        status: HttpStatus.PRECONDITION_REQUIRED,
        description: HEADER_IF_MATCH,
    })
    @ApiForbiddenResponse({ description: MSG_FORBIDDEN })
    async transaktion(
        @Body() transaktionDTO: TransaktionDTO,
        @Headers('If-Match') version: string | undefined,
        @Res() res: Response,
        @Req() req: Request,
    ): Promise<Response> {
        this.#logger.debug(
            'transaktion: transaktionDTO=%o, version=%s',
            transaktionDTO,
            version,
        );

        if (version === undefined) {
            const msg = HEADER_IF_MATCH;
            this.#logger.debug('put: msg=%s', msg);
            return res
                .status(HttpStatus.PRECONDITION_REQUIRED)
                .set('Content-Type', 'application/json')
                .send(msg);
        }

        const neueTransaktion =
            await this.#service.createTransaktion(transaktionDTO);
        const { transaktionID, saldo, bankkontoNeueVersion } = neueTransaktion;
        this.#logger.debug(
            'transaktion: transaktionId=%s, saldo=%d, version=%s',
            transaktionID,
            saldo,
            bankkontoNeueVersion,
        );
        const location = `${getBaseUri(req)}/${transaktionID}`;
        res.header('ETag', `"${bankkontoNeueVersion}"`);
        res.location(location);
        return res.send();
    }

    // #transaktionDTOToTransaktion(transaktionDTO: TransaktionDTO): TransaktionDTO {
    //     const transaktionen = bankkontoDTO.transaktionen.map(
    //         (transaktionDTO) => {
    //             const transaktion: Transaktion = {
    //                 transaktionId: undefined,
    //                 transaktionTyp: transaktionDTO.transaktionTyp,
    //                 betrag: transaktionDTO.betrag,
    //                 absender: transaktionDTO.absender,
    //                 empfaenger: transaktionDTO.empfaenger,
    //                 transaktionDatum: new Date(),
    //                 bankkonto: undefined,
    //             };
    //             return transaktion;
    //         },
    //     );
    //     bankkonto.transaktionen.forEach((transaktion) => {
    //         transaktion.bankkonto = bankkonto;
    //     });
    // }

    #bankkontoDTOToBankkonto(bankkontoDTO: BankkontoDTO): Bankkonto {
        const kundeDTO = bankkontoDTO.kunde;
        const kunde: Kunde = {
            kundeId: undefined,
            name: kundeDTO.name,
            vorname: kundeDTO.vorname,
            email: kundeDTO.vorname,
            bankkonto: undefined,
        };
        const bankkonto = {
            bankkontoId: undefined,
            version: undefined,
            saldo: 0,
            besitztTransaktionLimit: bankkontoDTO.besitztTransaktionLimit,
            transaktionLimit: bankkontoDTO.transaktionLimit,
            kunde,
            transaktionen: undefined,
            waehrungen: bankkontoDTO.waehrungen,
            dokumente: undefined,
            erstelltAm: new Date(),
            aktualisiertAm: new Date(),
        };

        // Rueckwaertsverweise
        bankkonto.kunde.bankkonto = bankkonto;
        return bankkonto;
    }

    #bankkontoDtoOhneReferenzToBankkonto(
        bankkontoDTO: BankkontoDtoOhneReferenz,
    ): Bankkonto {
        return {
            bankkontoId: undefined,
            version: undefined,
            saldo: undefined,
            besitztTransaktionLimit: bankkontoDTO.besitztTransaktionLimit,
            transaktionLimit: bankkontoDTO.transaktionLimit,
            kunde: undefined,
            transaktionen: undefined,
            dokumente: undefined,
            waehrungen: undefined,
            erstelltAm: undefined,
            aktualisiertAm: new Date(),
        };
    }
}
