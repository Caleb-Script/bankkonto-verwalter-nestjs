CREATE ROLE bankkonto LOGIN PASSWORD 'p';

CREATE DATABASE bankkonto;

GRANT ALL ON DATABASE bankkonto TO bankkonto;

CREATE TABLESPACE bankkontospace OWNER bankkonto LOCATION '/var/lib/postgresql/tablespace/bankkonto';
