import { BankkontoDokument } from './bankkonto-dokument.entity.js';
import { Bankkonto } from './bankkonto.entity.js';
import { Kunde } from './kunde.entity.js';
import { Transaktion } from './transaktion.entity.js';

export const entities = [Bankkonto, Transaktion, Kunde, BankkontoDokument];
