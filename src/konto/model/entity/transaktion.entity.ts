import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Bankkonto } from './bankkonto.entity';

export type TransaktionsTyp =
    | 'EINZAHLUNG'
    | 'AUSZAHLUNG'
    | 'ÜBERWEISUNG'
    | 'EINKOMMEN'
    | 'ZAHLUNG';

@Entity()
export class Transaktion {
    @PrimaryGeneratedColumn('uuid')
    transaktionId: string | undefined;

    @Column()
    transaktionsTyp: TransaktionsTyp | undefined;

    @Column('decimal', { precision: 10, scale: 2 })
    betrag: number | undefined;

    @Column({ nullable: true })
    absender: string | undefined;

    @Column({ nullable: true })
    empfaenger: string | undefined;

    @CreateDateColumn({ type: 'timestamp' })
    transaktionsDatum: Date | undefined;

    @ManyToOne(() => Bankkonto, (konto) => konto.transaktionen, {
        eager: true,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'konto_id' })
    konto: Bankkonto | undefined;

    toString = (): string =>
        JSON.stringify({
            transaktionId: this.transaktionId,
            transaktionsTyp: this.transaktionsTyp,
            betrag: this.betrag,
            absender: this.absender,
            empfaenger: this.empfaenger,
            transaktionsDatum: this.transaktionsDatum,
            kontoId: this.konto?.kontoId,
        });
}
