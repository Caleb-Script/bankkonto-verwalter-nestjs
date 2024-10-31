import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Bankkonto } from './bankkonto.entity.js';

@Entity()
export class BankkontoDokument {
    @PrimaryGeneratedColumn()
    dokumentId: number | undefined;

    @Column('varchar')
    filename: string | undefined;

    @Column({
        type: 'bytea',
    })
    data: Uint8Array | undefined;

    @Column('varchar')
    dokumentTyp: string | undefined; // z.B. "Vertrag", "Rechnung", etc.

    @ManyToOne(() => Bankkonto, (bankkonto) => bankkonto.dokumente, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'bankkonto_id' })
    bankkonto: Bankkonto | undefined;

    public toString = (): string =>
        JSON.stringify({
            dokumentId: this.dokumentId,
            filename: this.filename,
            dokumentTyp: this.dokumentTyp,
        });
}
