import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { TransaktionTyp } from '../entity/transaktion.entity';

export class TransaktionDTO {
    @ApiProperty({
        description: 'Betrag der Transaktion',
        example: 10,
    })
    readonly betrag!: number;

    @IsOptional()
    @ApiProperty({ description: 'ID des Empfängers', example: '00000000' })
    readonly empfaenger?: string;

    @IsOptional()
    @ApiProperty({
        description: 'ID des Absenders',
        example: '00000000',
    })
    readonly absender?: string;

    @ApiProperty({
        description: 'Art der Transaktion',
        example: 'ZAHLUNG',
    })
    @IsIn(['EINZAHLUNG', 'AUSZAHLUNG', 'ÜBERWEISUNG'])
    @ApiProperty({ description: 'Art der Transaktion' })
    readonly transaktionsTyp!: TransaktionTyp;
}
