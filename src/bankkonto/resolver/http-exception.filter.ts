/**
 * Das Modul besteht aus der Klasse {@linkcode HttpExceptionFilter}.
 * @packageDocumentation
 */
import {
    type ArgumentsHost,
    Catch,
    type ExceptionFilter,
    HttpException,
} from '@nestjs/common';
import { BadUserInputError } from './errors.js';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: HttpException, _host: ArgumentsHost) {
        const response = exception.getResponse();
        if (typeof response === 'string') {
            throw new BadUserInputError(response, exception);
        }

        // Typ "object", default: mit den Properties statusCode und message
        const { message } = response as { message: string };
        throw new BadUserInputError(message, exception);
    }
}
