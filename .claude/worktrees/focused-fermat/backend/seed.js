const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const initialData = [
  { day: 13, month: 1, name: 'Cristian' },
  { day: 2, month: 2, name: 'Cristian' },
  { day: 3, month: 2, name: 'Nestor' },
  { day: 6, month: 2, name: 'Fer' },
  { day: 28, month: 2, name: 'Luigia' },
  { day: 7, month: 3, name: 'Victor' },
  { day: 8, month: 3, name: 'Charlie' },
  { day: 11, month: 3, name: 'Sami' },
  { day: 20, month: 3, name: 'Gabriel' },
  { day: 4, month: 4, name: 'Bryancito' },
  { day: 4, month: 4, name: 'Walter' },
  { day: 7, month: 4, name: 'Cesar' },
  { day: 14, month: 4, name: 'JuanPa' },
  { day: 14, month: 4, name: 'Marquito' },
  { day: 15, month: 4, name: 'José Espinoza' },
  { day: 16, month: 4, name: 'Vale' },
  { day: 16, month: 4, name: 'Eli' },
  { day: 16, month: 4, name: 'Jenny' },
  { day: 27, month: 4, name: 'César Carlier' },
  { day: 28, month: 4, name: 'Carlitos' },
  { day: 28, month: 4, name: 'Ariel Cedeño' },
  { day: 29, month: 4, name: 'Stephano' },
  { day: 1, month: 5, name: 'Jerelyn' },
  { day: 7, month: 5, name: 'Kevin' },
  { day: 9, month: 5, name: 'Manu' },
  { day: 14, month: 5, name: 'Carlos Sánchez' },
  { day: 16, month: 5, name: 'Raquel Vargas' },
  { day: 28, month: 5, name: 'Marci' },
  { day: 1, month: 6, name: 'Xiomy' },
  { day: 8, month: 6, name: 'Luis Zambrano' },
  { day: 19, month: 6, name: 'Vanessa Gutierrez' },
  { day: 29, month: 6, name: 'Cesar Castro' },
  { day: 3, month: 7, name: 'Lili Pineda' },
  { day: 6, month: 7, name: 'Jonathan Chavez' },
  { day: 12, month: 7, name: 'Michael Reyes' },
  { day: 19, month: 7, name: 'William Jacome Choez' },
  { day: 19, month: 7, name: 'Javier Quintana' },
  { day: 30, month: 7, name: 'Andre Chalen' },
  { day: 4, month: 8, name: 'Jeremy' },
  { day: 4, month: 8, name: 'Jorge Boero' },
  { day: 8, month: 8, name: 'Daniel' }
];

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS birthdays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      day INTEGER NOT NULL,
      month INTEGER NOT NULL
    )
  `);

  db.run('DELETE FROM birthdays'); // Clear existing data for a fresh seed

  const stmt = db.prepare('INSERT INTO birthdays (name, day, month) VALUES (?, ?, ?)');

  for (const entry of initialData) {
    stmt.run(entry.name, entry.day, entry.month);
  }

  stmt.finalize();
  console.log('Database seeded successfully.');
});

db.close();
