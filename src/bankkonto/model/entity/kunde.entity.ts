import { ApiProperty } from '@nestjs/swagger';
import {
    Column,
    Entity,
    JoinColumn,
    OneToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Bankkonto } from './bankkonto.entity.js';

@Entity()
export class Kunde {
    @PrimaryGeneratedColumn()
    kundeId: number | undefined;

    @Column({ type: 'varchar', length: 255 })
    @ApiProperty({ example: 'Jefferson', type: String })
    readonly name: string | undefined;

    @Column({ type: 'varchar', length: 255 })
    @ApiProperty({ example: 'Rolly', type: String })
    readonly vorname: string | undefined;

    @Column({ type: 'varchar', length: 255 })
    @ApiProperty({ example: 'JR@ok.de', type: String })
    readonly email: string | undefined;

    @OneToOne(() => Bankkonto, (bankkonto) => bankkonto.kunde)
    @JoinColumn({ name: 'bankkonto_id' })
    bankkonto: Bankkonto | undefined;

    toString = (): string =>
        JSON.stringify({
            kundeId: this.kundeId,
            name: this.name,
            vorname: this.vorname,
            email: this.email,
        });
}
