import { Optional } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import {
    IsBoolean,
    IsInt,
    IsNumberString,
    IsOptional,
    Min,
} from 'class-validator';
import { BankkontoDTO } from './bankkonto.dto.js';

export class BankkontoUpdateDTO extends BankkontoDTO {
    @IsNumberString()
    readonly bankkontoId!: number;

    @IsInt()
    @Min(0)
    readonly version!: number;

    @Min(0)
    @IsInt()
    @ApiProperty({ example: `100`, description: `Betrag` })
    readonly betrag!: number;

    @IsBoolean()
    @IsOptional()
    @ApiProperty({ example: true, type: Boolean })
    readonly besitztTransaktionLimit: boolean | undefined;

    @ApiProperty({
        example: `100`,
        description: `Täglicher Transaktions limit`,
    })
    @Optional()
    readonly transaktionLimit?: number;
}
