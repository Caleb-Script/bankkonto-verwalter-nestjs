/* eslint-disable max-classes-per-file */

import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Das Modul besteht aus den Klassen für die Fehlerbehandlung bei der Verwaltung
 * von Büchern, z.B. beim DB-Zugriff.
 * @packageDocumentation
 */

/**
 * Exception-Klasse für eine bereits existierende Kunden-Id.
 */
export class KundenIdExistsException extends HttpException {
    constructor(readonly kundenId: string) {
        super(
            `Die Konto-Id ${kundenId} existiert bereits.`,
            HttpStatus.UNPROCESSABLE_ENTITY,
        );
    }
}

/**
 * Exception-Klasse für eine ungültige Versionsnummer beim Ändern.
 */
export class VersionInvalidException extends HttpException {
    constructor(readonly version: string | undefined) {
        super(
            `Die Versionsnummer ${version} ist ungültig.`,
            HttpStatus.PRECONDITION_FAILED,
        );
    }
}

/**
 * Exception-Klasse für eine veraltete Versionsnummer beim Ändern.
 */
export class VersionOutdatedException extends HttpException {
    constructor(readonly version: number) {
        super(
            `Die Versionsnummer ${version} ist nicht aktuell.`,
            HttpStatus.PRECONDITION_FAILED,
        );
    }
}

/**
 * Exception-Klasse für das Erreichen des Transaktionslimits.
 */
export class LimitReachedException extends HttpException {
    constructor(readonly limit: number) {
        super(
            `Das Transaktionslimit von ${limit} wurde erreicht.`,
            HttpStatus.UNPROCESSABLE_ENTITY,
        );
        this.name = 'LimitReachedException';
    }
}

/**
 * Exception-Klasse für unzureichende Mittel auf dem Konto.
 */
export class InsufficientFundsException extends HttpException {
    constructor(
        readonly saldo: number,
        readonly betrag: number,
    ) {
        super(
            `Nicht genügend Geld auf dem Konto. Verfügbar: ${saldo}, benötigt: ${betrag}.`,
            HttpStatus.UNPROCESSABLE_ENTITY,
        );
        this.name = 'InsufficientFundsException';
    }
}

/* eslint-enable max-classes-per-file */
