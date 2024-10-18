import { Injectable, type NestMiddleware } from '@nestjs/common';
import { type NextFunction, type Request, type Response } from 'express';
import { getLogger } from './logger.js';

/**
 * Die Middleware (-Funktion) wird vor dem "Route Handler" aufgerufen.
 * `RequestLoggerMiddleware` protokolliert die HTTP-Methode, die aufgerufene
 * URL und den Request-Header.
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
    readonly #logger = getLogger(RequestLoggerMiddleware.name);

    /**
     * @param req Request-Objekt von Express
     * @param _res Nicht-verwendetes Response-Objekt von Express
     * @param next Funktion der als nächstes aufzurufenden Middleware
     */
    use(req: Request, _res: Response, next: NextFunction) {
        const { method, originalUrl, headers } = req;
        this.#logger.debug(
            'method=%s, url=%s, header=%o',
            method,
            originalUrl,
            headers,
        );
        next();
    }
}
