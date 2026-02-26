const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Ensure table exists
db.serialize(() => {
    db.run(`
    CREATE TABLE IF NOT EXISTS birthdays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      day INTEGER NOT NULL,
      month INTEGER NOT NULL
    )
  `);
});

const getBirthdays = () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM birthdays ORDER BY month ASC, day ASC', (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
};

const getBirthdayById = (id) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM birthdays WHERE id = ?', [id], (err, row) => {
            if (err) reject(err);
            resolve(row);
        });
    });
};

const addBirthday = (name, day, month) => {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO birthdays (name, day, month) VALUES (?, ?, ?)',
            [name, day, month],
            function (err) {
                if (err) reject(err);
                resolve({ id: this.lastID, name, day, month });
            }
        );
    });
};

const updateBirthday = (id, name, day, month) => {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE birthdays SET name = ?, day = ?, month = ? WHERE id = ?',
            [name, day, month, id],
            function (err) {
                if (err) reject(err);
                resolve({ id, name, day, month });
            }
        );
    });
};

const deleteBirthday = (id) => {
    return new Promise((resolve, reject) => {
        db.run('DELETE FROM birthdays WHERE id = ?', [id], function (err) {
            if (err) reject(err);
            resolve({ deleted: this.changes > 0 });
        });
    });
};

module.exports = {
    db,
    getBirthdays,
    getBirthdayById,
    addBirthday,
    updateBirthday,
    deleteBirthday
};
