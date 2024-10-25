-- Schema für Bankkonto und Transaktion erstellen
CREATE SCHEMA IF NOT EXISTS AUTHORIZATION bankkonto;

ALTER ROLE bankkonto SET search_path = 'bankkonto';

-- Enum für Transaktionstypen erstellen
CREATE TYPE transaktion_typ AS ENUM ('EINZAHLUNG', 'AUSZAHLUNG', 'ÜBERWEISUNG', 'EINKOMMEN', 'ZAHLUNG');

-- Tabelle für Bankkonto
CREATE TABLE IF NOT EXISTS bankkonto (
    bankkonto_id       integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY USING INDEX TABLESPACE bankkontospace,
    version            INTEGER NOT NULL DEFAULT 0,
    saldo              DECIMAL(10, 2) NOT NULL CHECK (saldo >= 0),
    transaktions_limit DECIMAL(10, 2),
    erstellt_am        TIMESTAMP NOT NULL DEFAULT NOW(),
    aktualisiert_am    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kunde (
    kunden_id    integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY USING INDEX TABLESPACE bankkontospace,
    name         VARCHAR(50) NOT NULL,
    vorname      VARCHAR(50) NOT NULL,
    email        VARCHAR(100) UNIQUE NOT NULL,
    bankkonto_id integer NOT NULL UNIQUE USING INDEX TABLESPACE bankkontospace REFERENCES bankkonto
) TABLESPACE bankkontospace;

-- Tabelle für Transaktion
CREATE TABLE IF NOT EXISTS transaktion (
    transaktion_id  integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY USING INDEX TABLESPACE bankkontospace,
    transaktion_typ transaktion_typ NOT NULL,
    betrag          DECIMAL(10, 2) NOT NULL CHECK (betrag > 0),
    absender        integer,
    empfaenger      integer,
    erstellt_am     TIMESTAMP NOT NULL DEFAULT NOW(),
    bankkonto_id    integer NOT NULL REFERENCES bankkonto
);

-- Index für schnellere Abfragen auf der Transaktion-Tabelle
CREATE INDEX IF NOT EXISTS idx_transaktion_typ_datum_konto ON transaktion (transaktion_typ, erstellt_am, bankkonto_id);


