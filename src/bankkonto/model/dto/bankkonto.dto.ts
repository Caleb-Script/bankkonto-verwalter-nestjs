/* eslint-disable max-classes-per-file */
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayUnique,
    IsBoolean,
    IsOptional,
    Min,
    ValidateNested,
} from 'class-validator';
import { KundeDTO } from './kunde.dto.js';

export class BankkontoDtoOhneReferenz {
    @IsBoolean()
    @IsOptional()
    @ApiProperty({ example: true, type: Boolean })
    readonly besitztTransaktionLimit: boolean | undefined;

    @ApiProperty({ example: 100, description: 'Tägliches Transaktionslimit' })
    @IsOptional()
    @Min(0)
    readonly transaktionLimit!: number;

    @IsOptional()
    @ArrayUnique()
    @ApiProperty({ example: ['EUR', 'GBP', 'USD', 'JPY', 'CHE'] })
    readonly waehrungen?: string[];
}
export class BankkontoDTO extends BankkontoDtoOhneReferenz {
    @ValidateNested()
    @Type(() => KundeDTO)
    @ApiProperty({ type: KundeDTO })
    readonly kunde!: KundeDTO; // NOSONAR

    // @IsOptional()
    // @IsArray()
    // @ValidateNested({ each: true })
    // @Type(() => TransaktionDTO)
    // @ApiProperty({
    //     type: [TransaktionDTO],
    //     description: 'Transaktionen des Kontos',
    // })
    // readonly transaktionen!: TransaktionDTO[];
}

/* eslint-enable max-classes-per-file */
