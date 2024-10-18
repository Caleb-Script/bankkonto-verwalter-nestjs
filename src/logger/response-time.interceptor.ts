import { Temporal } from '@js-temporal/polyfill';
import {
    type CallHandler,
    type ExecutionContext,
    Injectable,
    type NestInterceptor,
} from '@nestjs/common';
import { type Response } from 'express';
import { type Observable } from 'rxjs';
import { type TapObserver } from 'rxjs/internal/operators/tap';
import { tap } from 'rxjs/operators';
import { getLogger } from './logger.js';

/**
 * `ResponseTimeInterceptor` protokolliert die Antwortzeit und den Statuscode
 * Alternative zu morgan (von Express) http://expressjs.com/en/resources/middleware/morgan.html,
 * aber mit konformem Log-Layout.
 */
@Injectable()
export class ResponseTimeInterceptor implements NestInterceptor {
    readonly #logger = getLogger(ResponseTimeInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const start = Temporal.Now.instant().epochMilliseconds;
        const responseTimeObserver: TapObserver<unknown> = {
            subscribe: this.#empty,
            unsubscribe: this.#empty,
            finalize: () => {
                const response = context.switchToHttp().getResponse<Response>();
                const { statusCode, statusMessage } = response;
                const responseTime =
                    Temporal.Now.instant().epochMilliseconds - start;
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                if (statusMessage === undefined) {
                    // GraphQL
                    this.#logger.debug('Response time: %d ms', responseTime);
                    return;
                }
                this.#logger.debug(
                    'Response time: %d ms, %d %s',
                    responseTime,
                    statusCode,
                    statusMessage,
                );
            },
            next: this.#empty,
            error: this.#empty,
            complete: this.#empty,
        };
        // tap() ist ein Operator fuer Seiteneffekte
        return next.handle().pipe(tap(responseTimeObserver));
    }

    readonly #empty = () => {
        /* do nothing */
    };
}
