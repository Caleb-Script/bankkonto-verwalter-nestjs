DROP INDEX IF EXISTS abbildung_buch_id_idx;
DROP INDEX IF EXISTS titel_buch_id_idx;
DROP INDEX IF EXISTS titel_titel_idx;
DROP INDEX IF EXISTS buch_isbn_idx;

-- https://docs.oracle.com/en/database/oracle/oracle-database/23/sqlrf/DROP-TABLE.html
DROP TABLE IF EXISTS abbildung;
DROP TABLE IF EXISTS titel;
DROP TABLE IF EXISTS buch;
