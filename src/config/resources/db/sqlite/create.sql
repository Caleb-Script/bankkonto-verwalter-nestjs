CREATE TABLE IF NOT EXISTS buch (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    version        INTEGER NOT NULL DEFAULT 0,
    isbn           TEXT NOT NULL UNIQUE,
    rating         INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 5),
    art            TEXT,
    preis          REAL,
    rabatt         REAL,
    lieferbar      INTEGER NOT NULL CHECK (lieferbar = 0 OR lieferbar = 1) DEFAULT 0,
    datum          TEXT,
    homepage       TEXT,
    schlagwoerter  TEXT,
    erzeugt        TEXT NOT NULL,
    aktualisiert   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS buch_isbn_idx ON buch(isbn);

CREATE TABLE IF NOT EXISTS titel (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    titel       TEXT NOT NULL,
    untertitel  TEXT,
    buch_id     INTEGER NOT NULL UNIQUE REFERENCES buch
);


CREATE TABLE IF NOT EXISTS abbildung (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    beschriftung    TEXT NOT NULL,
    content_type    TEXT NOT NULL,
    buch_id         INTEGER NOT NULL REFERENCES buch
);
CREATE INDEX IF NOT EXISTS abbildung_buch_id_idx ON abbildung(buch_id);
