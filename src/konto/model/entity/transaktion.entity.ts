import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Bankkonto } from './bankkonto.entity.js';

export type TransaktionTyp =
    | 'EINZAHLUNG'
    | 'AUSZAHLUNG'
    | 'ÜBERWEISUNG'
    | 'EINKOMMEN'
    | 'ZAHLUNG';

@Entity()
@Index(['transaktionTyp', 'transaktionDatum', 'bankkonto']) // Index für Performance
export class Transaktion {
    @PrimaryGeneratedColumn()
    transaktionId: string | undefined;

    @Column('varchar')
    readonly transaktionTyp: TransaktionTyp | undefined;

    @Column('decimal', { precision: 10, scale: 2 })
    readonly betrag: number | undefined;

    @Column({ type: 'varchar', nullable: true })
    readonly absender: string | undefined;

    @Column({ type: 'varchar', nullable: true })
    readonly empfaenger: string | undefined;

    @CreateDateColumn({ type: 'timestamp' })
    readonly transaktionDatum: Date | undefined;

    @ManyToOne(() => Bankkonto, (konto) => konto.transaktionen, {
        eager: true,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'bankkonto_id' })
    bankkonto: Bankkonto | undefined;

    toString = (): string =>
        JSON.stringify({
            transaktionId: this.transaktionId,
            transaktionTyp: this.transaktionTyp,
            betrag: this.betrag,
            absender: this.absender,
            empfaenger: this.empfaenger,
            transaktionDatum: this.transaktionDatum,
            bankkontoId: this.bankkonto?.bankkontoId,
        });
}
