import { ApiProperty } from '@nestjs/swagger';
import {
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    VersionColumn,
} from 'typeorm';
import { BankkontoDokument } from './bankkonto-dokument.entity.js';
import { DecimalTransformer } from './decimal-transformer.js';
import { Kunde } from './kunde.entity.js';
import { Transaktion } from './transaktion.entity.js';

@Entity()
export class Bankkonto {
    @PrimaryGeneratedColumn()
    bankkontoId: number | undefined;

    @VersionColumn()
    readonly version: number | undefined;

    @Column('decimal', {
        precision: 8,
        scale: 2,
        transformer: new DecimalTransformer(),
    })
    @ApiProperty({ example: 1, type: Number })
    readonly saldo!: number;

    @Column('decimal')
    @ApiProperty({ example: true, type: Boolean })
    readonly besitztTransaktionLimit: boolean | undefined;

    @Column('decimal', {
        precision: 8,
        scale: 2,
        transformer: new DecimalTransformer(),
        nullable: true,
    })
    @ApiProperty({ example: 1, type: Number })
    readonly transaktionLimit: number | undefined;

    @OneToOne(() => Kunde, (kunde: Kunde) => kunde.bankkonto, {
        cascade: ['insert', 'remove'],
    })
    readonly kunde: Kunde | undefined;

    @OneToMany(() => Transaktion, (transaktion) => transaktion.bankkonto, {
        cascade: ['insert', 'remove'],
    })
    readonly transaktionen: Transaktion[] | undefined;

    @Column('simple-array')
    waehrungen: string[] | null | undefined;

    @OneToMany(() => BankkontoDokument, (dokument) => dokument.bankkonto, {
        cascade: ['insert', 'remove'],
    })
    readonly dokumente: BankkontoDokument[] | undefined;

    @CreateDateColumn({ type: 'timestamp' })
    readonly erstelltAm: Date | undefined;

    @UpdateDateColumn({ type: 'timestamp' })
    readonly aktualisiertAm: Date | undefined;

    toString = (): string =>
        JSON.stringify({
            bankkontoId: this.bankkontoId,
            saldo: this.saldo,
            transaktionLimit: this.transaktionLimit,
            erstelltAm: this.erstelltAm,
            aktualisiertAm: this.aktualisiertAm,
        });
}
