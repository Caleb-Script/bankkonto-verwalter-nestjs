/* eslint-disable @typescript-eslint/no-magic-numbers */

/**
 * Das Modul besteht aus der Entity-Klasse.
 * @packageDocumentation
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, Matches, MaxLength } from 'class-validator';

/**
 * Entity-Klasse für Kunde ohne TypeORM.
 */
export class KundeDTO {
    @Matches(String.raw`^\w.*`)
    @MaxLength(40)
    @ApiProperty({ example: 'Jefferson', type: String })
    readonly name!: string;

    @Matches(String.raw`^\w.*`)
    @MaxLength(40)
    @ApiProperty({ example: 'Rolly', type: String })
    readonly vorname!: string;

    @IsEmail()
    @ApiProperty({ example: 'JR@ok.de', type: String })
    readonly email: string | undefined;
}
/* eslint-enable @typescript-eslint/no-magic-numbers */
