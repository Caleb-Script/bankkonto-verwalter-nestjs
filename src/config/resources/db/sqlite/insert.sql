-- Beispiel-Daten für die bankkonto-Tabelle einfügen
INSERT INTO bankkonto (bankkontoId, version, saldo, transaktionLimit, erstelltAm, aktualisiertAm) VALUES
    (1, 0, 1000.00, 500.00, '2023-01-01 10:00:00', '2023-01-01 10:00:00'),
    (2, 0, 1500.00, 1000.00, '2023-01-02 11:00:00', '2023-01-02 11:00:00'),
    (3, 0, 2000.00, 1500.00, '2023-01-03 12:00:00', '2023-01-03 12:00:00'),
    (4, 0, 2500.00, 2000.00, '2023-01-04 13:00:00', '2023-01-04 13:00:00'),
    (5, 0, 3000.00, 2500.00, '2023-01-05 14:00:00', '2023-01-05 14:00:00');

-- Beispiel-Daten für die kunde-Tabelle einfügen
INSERT INTO kunde (kundeId, name, vorname, email, bankkonto_bankkontoId) VALUES
    (1, 'Mustermann', 'Max', 'max.mustermann@example.com', 1),
    (2, 'Musterfrau', 'Erika', 'erika.musterfrau@example.com', 2),
    (3, 'Schmidt', 'Hans', 'hans.schmidt@example.com', 3),
    (4, 'Meier', 'Anna', 'anna.meier@example.com', 4),
    (5, 'Fischer', 'Peter', 'peter.fischer@example.com', 5);

-- Beispiel-Daten für die transaktion-Tabelle einfügen
INSERT INTO transaktion (transaktionId, transaktionTyp, betrag, absender, empfaenger, transaktionDatum, bankkonto_bankkontoId) VALUES
    (1, 'Überweisung Gehalt', 1500.00, 1, 2, '2023-01-05 09:30:00', 1),  -- Max überweist an Erika
    (2, 'Überweisung für Dienstleistung', 300.00, 2, 3, '2023-01-09 11:00:00', 2),  -- Erika überweist an Hans
    (3, 'Geschenk', 100.00, 3, 4, '2023-01-10 15:00:00', 3),  -- Hans überweist an Anna
    (4, 'Überweisung für Miete', 500.00, 4, 5, '2023-01-11 12:30:00', 4),  -- Anna überweist an Peter
    (5, 'Überweisung für Einkauf', 250.00, 5, 1, '2023-01-12 14:45:00', 5);  -- Peter überweist an Max