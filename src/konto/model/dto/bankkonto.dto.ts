/* eslint-disable max-classes-per-file */
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsArray,
    IsInt,
    IsOptional,
    Min,
    ValidateNested,
} from 'class-validator';
import { TransaktionDTO } from './transaktion.dto';

export class KontoDtoOhneReferenz {
    @Min(0)
    @IsInt()
    @IsOptional()
    @ApiProperty({ example: 100, description: 'Aktueller Kontostand' })
    readonly saldo!: number;

    @ApiProperty({ example: 100, description: 'Tägliches Transaktionslimit' })
    @IsOptional()
    readonly transaktionsLimit!: number;

    @IsOptional()
    readonly absender?: string;

    @IsOptional()
    readonly empfaenger?: string;

    @ApiProperty({
        example: '00000000-0000-0000-0000-000000000001',
        description: 'Die Kunden-ID ist erforderlich',
    })
    readonly kundenId!: string;
}

export class KontoDTO extends KontoDtoOhneReferenz {
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TransaktionDTO)
    @ApiProperty({
        type: [TransaktionDTO],
        description: 'Transaktionen des Kontos',
    })
    readonly transaktionen!: TransaktionDTO[];
}

/* eslint-enable max-classes-per-file */
