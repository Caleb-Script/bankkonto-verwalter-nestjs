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
import { Kunde } from './kunde.entity.js';
import { Transaktion } from './transaktion.entity.js';

@Entity()
export class Bankkonto {
    @PrimaryGeneratedColumn()
    bankkontoId: string | undefined;

    @VersionColumn()
    readonly version: number | undefined;

    @Column('decimal', { precision: 10, scale: 2 })
    readonly saldo: number | undefined;

    @Column({ type: 'int', nullable: true })
    readonly transaktionLimit: number | undefined;

    @OneToOne(() => Kunde, (kunde: Kunde) => kunde.bankkonto, {
        cascade: ['insert', 'remove'],
    })
    readonly kunde: Kunde | undefined;

    @OneToMany(() => Transaktion, (transaktion) => transaktion.bankkonto, {
        cascade: ['insert', 'remove'],
    })
    readonly transaktionen: Transaktion[] | undefined;

    @CreateDateColumn({ type: 'timestamp' })
    readonly erstelltAm: Date | undefined;

    @UpdateDateColumn({ type: 'timestamp' })
    readonly aktualisiertAm: Date | undefined;

    toString = (): string =>
        JSON.stringify({
            kontoId: this.bankkontoId,
            saldo: this.saldo,
            transaktionLimit: this.transaktionLimit,
            erstelltAm: this.erstelltAm,
            aktualisiertAm: this.aktualisiertAm,
        });
}
