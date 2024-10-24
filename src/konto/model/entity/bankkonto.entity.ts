import {
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    VersionColumn,
} from 'typeorm';
import { Transaktion } from './transaktion.entity';

@Entity()
export class Bankkonto {
    @PrimaryGeneratedColumn('uuid')
    kontoId: string | undefined;

    @VersionColumn()
    readonly version: number | undefined;

    @Column('decimal', { precision: 10, scale: 2 })
    saldo: number | undefined;

    @Column({ nullable: true })
    transaktionsLimit: number | undefined;

    @OneToMany(() => Transaktion, (transaktion) => transaktion.konto, {
        cascade: ['insert', 'remove'],
    })
    transaktionen: Transaktion[] | undefined;

    @CreateDateColumn({ type: 'timestamp' })
    erstelltAm: Date | undefined;

    @UpdateDateColumn({ type: 'timestamp' })
    aktualisiertAm: Date | undefined;

    @Column({ nullable: true })
    kundenId: string | undefined;

    toString = (): string =>
        JSON.stringify({
            kontoId: this.kontoId,
            saldo: this.saldo,
            transaktionsLimit: this.transaktionsLimit,
            erstelltAm: this.erstelltAm,
            aktualisiertAm: this.aktualisiertAm,
            kundenId: this.kundenId,
        });
}
