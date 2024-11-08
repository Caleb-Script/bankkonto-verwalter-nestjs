-- docker compose exec mysql sh
-- mysql --user=root --password=p < /sql/log.sql

-- https://dev.mysql.com/doc/refman/8.4/en/log-file-maintenance.html
-- /var/lib/mysql/mysql.log
SET GLOBAL general_log = 'ON';
SET GLOBAL slow_query_log = 'ON';
