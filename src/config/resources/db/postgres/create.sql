CREATE SCHEMA IF NOT EXISTS AUTHORIZATION buch;

ALTER ROLE buch SET search_path = 'buch';

-- https://www.postgresql.org/docs/current/sql-createtype.html
-- https://www.postgresql.org/docs/current/datatype-enum.html
CREATE TYPE buchart AS ENUM ('EPUB', 'HARDCOVER', 'PAPERBACK');

-- https://www.postgresql.org/docs/current/sql-createtable.html
-- https://www.postgresql.org/docs/current/datatype.html
CREATE TABLE IF NOT EXISTS buch (
                  -- https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-INT
                  -- https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-PRIMARY-KEYS
                  -- impliziter Index fuer Primary Key
                  -- "GENERATED ALWAYS AS IDENTITY" gemaess SQL-Standard
                  -- entspricht SERIAL mit generierter Sequenz buch_id_seq
    id            integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY USING INDEX TABLESPACE buchspace,
                  -- https://www.postgresql.org/docs/current/ddl-constraints.html#id-1.5.4.6.6
    version       integer NOT NULL DEFAULT 0,
                  -- impliziter Index als B-Baum durch UNIQUE
                  -- https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS
    isbn          text NOT NULL UNIQUE USING INDEX TABLESPACE buchspace,
                  -- https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-CHECK-CONSTRAINTS
                  -- https://www.postgresql.org/docs/current/functions-matching.html#FUNCTIONS-POSIX-REGEXP
    rating        integer NOT NULL CHECK (rating >= 0 AND rating <= 5),
    art           buchart,
                  -- https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-NUMERIC-DECIMAL
                  -- 10 Stellen, davon 2 Nachkommastellen
    preis         decimal(8,2) NOT NULL,
    rabatt        decimal(4,3) NOT NULL,
                  -- https://www.postgresql.org/docs/current/datatype-boolean.html
    lieferbar     boolean NOT NULL DEFAULT FALSE,
                  -- https://www.postgresql.org/docs/current/datatype-datetime.html
    datum         date,
    homepage      text,
    -- schlagwoerter json,
    schlagwoerter text,
                  -- https://www.postgresql.org/docs/current/datatype-datetime.html
    erzeugt       timestamp NOT NULL DEFAULT NOW(),
    aktualisiert  timestamp NOT NULL DEFAULT NOW()
) TABLESPACE buchspace;

CREATE TABLE IF NOT EXISTS titel (
    id          integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY USING INDEX TABLESPACE buchspace,
    titel       text NOT NULL,
    untertitel  text,
    buch_id     integer NOT NULL UNIQUE USING INDEX TABLESPACE buchspace REFERENCES buch
) TABLESPACE buchspace;


CREATE TABLE IF NOT EXISTS abbildung (
    id              integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY USING INDEX TABLESPACE buchspace,
    beschriftung    text NOT NULL,
    content_type    text NOT NULL,
    buch_id         integer NOT NULL REFERENCES buch
) TABLESPACE buchspace;
CREATE INDEX IF NOT EXISTS abbildung_buch_id_idx ON abbildung(buch_id) TABLESPACE buchspace;

CREATE TABLE IF NOT EXISTS buch_file (
    id              integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY USING INDEX TABLESPACE buchspace,
    data            bytea NOT NULL,
    filename        text NOT NULL,
    buch_id         integer NOT NULL REFERENCES buch
) TABLESPACE buchspace;
CREATE INDEX IF NOT EXISTS buch_file_buch_id_idx ON buch_file(buch_id) TABLESPACE buchspace;
