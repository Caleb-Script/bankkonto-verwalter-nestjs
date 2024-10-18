DROP INDEX IF EXISTS abbildung_buch_id_idx;
DROP INDEX IF EXISTS buch_isbn_idx;

-- https://www.sqlite.org/lang_droptable.html
DROP TABLE IF EXISTS abbildung;
DROP TABLE IF EXISTS titel;
DROP TABLE IF EXISTS buch;
