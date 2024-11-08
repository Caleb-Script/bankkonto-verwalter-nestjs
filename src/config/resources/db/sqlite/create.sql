CREATE TABLE IF NOT EXISTS bankkonto (
    bankkontoId    INTEGER PRIMARY KEY AUTOINCREMENT,
    version        INTEGER NOT NULL DEFAULT 0,
    saldo          REAL NOT NULL,
    transaktionLimit REAL NOT NULL CHECK (transaktionLimit >= 0),
    erstelltAm     TEXT NOT NULL,
    aktualisiertAm TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS bankkonto_bankkontoId_idx ON bankkonto(bankkontoId);

CREATE TABLE IF NOT EXISTS kunde (
    kundeId        INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT NOT NULL,
    vorname        TEXT NOT NULL,
    email          TEXT NOT NULL,
    bankkonto_bankkontoId INTEGER NOT NULL REFERENCES bankkonto
);

CREATE TABLE IF NOT EXISTS transaktion (
    transaktionId   INTEGER PRIMARY KEY AUTOINCREMENT,
    transaktionTyp  TEXT NOT NULL,
    betrag          REAL NOT NULL CHECK (betrag >= 0),
    absender        INTEGER NOT NULL REFERENCES kunde(kundeId),  -- Ändert den Typ auf INTEGER
    empfaenger      INTEGER NOT NULL REFERENCES kunde(kundeId),  -- Ändert den Typ auf INTEGER
    transaktionDatum TEXT NOT NULL,
    bankkonto_bankkontoId INTEGER NOT NULL REFERENCES bankkonto
);
CREATE INDEX IF NOT EXISTS transaktion_bankkonto_bankkontoId_idx ON transaktion(bankkonto_bankkontoId);