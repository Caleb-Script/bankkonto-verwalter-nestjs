CREATE TABLE IF NOT EXISTS buch (
    id            INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    version       INT NOT NULL DEFAULT 0,
    isbn          CHAR(17) UNIQUE NOT NULL,
    rating        INT NOT NULL CHECK (rating >= 0 AND rating <= 5),
    art           ENUM('EPUB', 'HARDCOVER', 'PAPERBACK'),
    preis         DECIMAL(8,2) NOT NULL,
    rabatt        DECIMAL(4,3) NOT NULL,
    lieferbar     BOOLEAN NOT NULL DEFAULT FALSE,
    datum         DATE,
    homepage      VARCHAR(40),
    schlagwoerter VARCHAR(128),
    erzeugt       DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    aktualisiert  DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP)
) TABLESPACE buchspace ROW_FORMAT=COMPACT;
ALTER TABLE buch AUTO_INCREMENT=1000;

CREATE TABLE IF NOT EXISTS titel (
    id          INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    titel       VARCHAR(40) NOT NULL,
    untertitel  VARCHAR(40),
    buch_id     CHAR(36) UNIQUE NOT NULL references buch(id)
) TABLESPACE buchspace ROW_FORMAT=COMPACT;
ALTER TABLE titel AUTO_INCREMENT=1000;

CREATE TABLE IF NOT EXISTS abbildung (
    id              INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    beschriftung    VARCHAR(32) NOT NULL,
    content_type    VARCHAR(16) NOT NULL,
    buch_id         CHAR(36) NOT NULL references buch(id),

    INDEX abbildung_buch_id_idx(buch_id)
) TABLESPACE buchspace ROW_FORMAT=COMPACT;
ALTER TABLE abbildung AUTO_INCREMENT=1000;
