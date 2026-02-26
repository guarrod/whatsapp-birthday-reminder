const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const initialData = [
  { date: '13-01', name: 'Cristian' }
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
    const [day, month] = entry.date.split('-');
    stmt.run(entry.name, parseInt(day, 10), parseInt(month, 10));
  }

  stmt.finalize();
  console.log('Database seeded successfully.');
});

db.close();
