import { Module } from '@nestjs/common';
import { MailService } from './mail.service.js';

/**
 * Das Modul besteht aus Services für Mail.
 * @packageDocumentation
 */

/**
 * Die dekorierte Modul-Klasse mit den Service-Klassen.
 */
@Module({
    providers: [MailService],
    exports: [MailService],
})
export class MailModule {}
