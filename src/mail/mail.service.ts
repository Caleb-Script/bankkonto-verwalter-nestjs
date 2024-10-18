/**
 * Das Modul besteht aus der Klasse {@linkcode MailService} für das
 * Verschicken von Emails.
 * @packageDocumentation
 */

import { Injectable } from '@nestjs/common';
import { type SendMailOptions } from 'nodemailer';
import { mailConfig } from '../config/mail.js';
import { getLogger } from '../logger/logger.js';

/** Typdefinition für das Senden einer Email. */
export type SendMailParams = {
    /** Subject für die Email. */
    readonly subject: string;
    /** Body für die Email. */
    readonly body: string;
};

@Injectable()
export class MailService {
    readonly #logger = getLogger(MailService.name);

    async sendmail({ subject, body }: SendMailParams) {
        if (!mailConfig.activated) {
            this.#logger.warn('#sendmail: Mail deaktiviert');
            return;
        }

        const from = '"Joe Doe" <Joe.Doe@acme.com>';
        const to = '"Foo Bar" <Foo.Bar@acme.com>';

        const data: SendMailOptions = { from, to, subject, html: body };
        this.#logger.debug('#sendMail: data=%o', data);

        try {
            const nodemailer = await import('nodemailer');
            await nodemailer.createTransport(mailConfig.options).sendMail(data);
        } catch (err) {
            this.#logger.warn('#sendmail: Fehler %o', err);
        }
    }
}
