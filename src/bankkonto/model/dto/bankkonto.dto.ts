/* eslint-disable max-classes-per-file */
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayUnique,
    IsArray,
    IsInt,
    IsOptional,
    Min,
    ValidateNested,
} from 'class-validator';
import { KundeDTO } from './kunde.dto.js';
import { TransaktionDTO } from './transaktion.dto.js';

export class BankkontoDtoOhneReferenz {
    @Min(0)
    @IsInt()
    @IsOptional()
    readonly saldo!: number;

    @ApiProperty({ example: 100, description: 'Tägliches Transaktionslimit' })
    @IsOptional()
    readonly transaktionsLimit!: number;

    @IsOptional()
    @ArrayUnique()
    @ApiProperty({ example: ['EUR', 'GBP', 'USD', 'JPY', 'CHE'] })
    readonly waehrungen: string[] | undefined;
}
export class BankkontoDTO extends BankkontoDtoOhneReferenz {
    @ValidateNested()
    @Type(() => KundeDTO)
    @ApiProperty({ type: KundeDTO })
    readonly kunde!: KundeDTO; // NOSONAR

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
