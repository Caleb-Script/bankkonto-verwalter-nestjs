import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumberString, Min } from 'class-validator';
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
}
