DROP INDEX IF EXISTS transaktion_bankkonto_bankkontoId_idx;
DROP INDEX IF EXISTS bankkonto_bankkontoId_idx;

-- https://www.sqlite.org/lang_droptable.html
DROP TABLE IF EXISTS transaktion;
DROP TABLE IF EXISTS kunde;
DROP TABLE IF EXISTS bankkonto;
