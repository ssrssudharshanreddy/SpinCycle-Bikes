/**
 * SpinCycle Bikes – SQLite Database Connection and Schema Management
 *
 * Course: Backend Development Fundamentals (Group Assignment – 01)
 * Group: Group 03 (YG-CSE2E-G03)
 * Member 2: Shaik Irfan Basha (Reg. No: 252U1R1228)
 * Responsibility: Database
 *
 * This module manages the SQLite connection, enables foreign key constraints,
 * initializes the three normalized tables (riders, bikes, rentals), and provides
 * Promise-wrapped database helper functions (runQuery, getOne, getAll).
 */

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Store the SQLite database inside database/bikeStore.db
const DB_PATH = path.join(__dirname, 'bikeStore.db');

// Create and export a single SQLite database connection
let db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err.message);
  }
});

/**
 * Switch the active database connection to another file or connection (e.g. for test isolation).
 * @param {string|sqlite3.Database} target - Path to the database file or a sqlite3.Database instance.
 * @returns {Promise<sqlite3.Database>}
 */
function switchDatabase(target) {
  return new Promise((resolve, reject) => {
    const attachNew = () => {
      if (typeof target === 'string') {
        const newDb = new sqlite3.Database(target, (err) => {
          if (err) return reject(err);
          newDb.run('PRAGMA foreign_keys = ON', (pragmaErr) => {
            if (pragmaErr) return reject(pragmaErr);
            db = newDb;
            resolve(db);
          });
        });
      } else if (target && typeof target.run === 'function') {
        db = target;
        db.run('PRAGMA foreign_keys = ON', (pragmaErr) => {
          if (pragmaErr) return reject(pragmaErr);
          resolve(db);
        });
      } else {
        reject(new Error('Invalid database target'));
      }
    };

    if (db && typeof db.close === 'function') {
      db.close(() => {
        attachNew();
      });
    } else {
      attachNew();
    }
  });
}

function getDb() {
  return db;
}

/**
 * Execute a write query (INSERT, UPDATE, DELETE, PRAGMA, CREATE) using Promises.
 * @param {string} sql - Parameterized SQL statement.
 * @param {Array} params - Query parameter values.
 * @returns {Promise<{ lastID: number, changes: number }>}
 */
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        return reject(err);
      }
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

/**
 * Fetch a single row from the database.
 * @param {string} sql - Parameterized SELECT statement.
 * @param {Array} params - Query parameter values.
 * @returns {Promise<Object|undefined>}
 */
function getOne(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        return reject(err);
      }
      resolve(row);
    });
  });
}

/**
 * Fetch multiple rows from the database.
 * @param {string} sql - Parameterized SELECT statement.
 * @param {Array} params - Query parameter values.
 * @returns {Promise<Array<Object>>}
 */
function getAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        return reject(err);
      }
      resolve(rows);
    });
  });
}

/**
 * Seed sample campus data only if all tables are currently empty.
 * This keeps initialization idempotent across restarts.
 */
async function seedInitialData() {
  const riderCount = await getOne('SELECT COUNT(*) AS count FROM riders');
  if (riderCount.count === 0) {
    const sampleRiders = [
      ['Alice Perera', 'STU2026001', '0771234567'],
      ['Kasun Silva', 'STU2026002', '0772345678'],
      ['Nethmi Fernando', 'STU2026003', '0773456789'],
      ['Dineth Jayawardena', 'STU2026004', '0774567890'],
    ];

    for (const rider of sampleRiders) {
      await runQuery(
        'INSERT INTO riders (rider_name, student_id, phone) VALUES (?, ?, ?)',
        rider
      );
    }
    console.log('Seeded initial riders data (4 records).');
  }

  const bikeCount = await getOne('SELECT COUNT(*) AS count FROM bikes');
  if (bikeCount.count === 0) {
    const sampleBikes = [
      ['TrailBlazer X1', 'Mountain'],
      ['Summit Pro 29', 'Mountain'],
      ['Velocity Aero', 'Road'],
      ['Campus Cruiser', 'Hybrid'],
      ['Metro Glide', 'City'],
      ['RidgeRunner 500', 'Mountain'],
      ['Sprint Carbon', 'Road'],
      ['EcoCommute S2', 'Hybrid'],
    ];

    for (const bike of sampleBikes) {
      await runQuery(
        'INSERT INTO bikes (bike_name, bike_type) VALUES (?, ?)',
        bike
      );
    }
    console.log('Seeded initial bikes data (8 records).');
  }

  const rentalCount = await getOne('SELECT COUNT(*) AS count FROM rentals');
  if (rentalCount.count === 0) {
    const sampleRentals = [
      [1, 1, '2026-11-10 08:30:00', '2026-11-10 11:45:00', 'returned'],
      [2, 3, '2026-11-11 09:15:00', null, 'active'],
      [3, 4, '2026-11-11 14:00:00', '2026-11-11 16:20:00', 'returned'],
      [4, 2, '2026-11-12 08:00:00', null, 'active'],
    ];

    for (const rental of sampleRentals) {
      await runQuery(
        `INSERT INTO rentals (rider_id, bike_id, rental_date, return_date, rental_status)
         VALUES (?, ?, ?, ?, ?)`,
        rental
      );
    }
    console.log('Seeded initial rentals data (4 records).');
  }
}

/**
 * Enable foreign-key enforcement, create all three tables in order,
 * and populate initial seed records if the tables are empty.
 */
async function initializeDatabase() {
  // SQLite disables foreign-key constraints per connection by default
  await runQuery('PRAGMA foreign_keys = ON');

  await runQuery(`
    CREATE TABLE IF NOT EXISTS riders (
      rider_id INTEGER PRIMARY KEY AUTOINCREMENT,
      rider_name TEXT NOT NULL,
      student_id TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS bikes (
      bike_id INTEGER PRIMARY KEY AUTOINCREMENT,
      bike_name TEXT NOT NULL,
      bike_type TEXT NOT NULL
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS rentals (
      rental_id INTEGER PRIMARY KEY AUTOINCREMENT,
      rider_id INTEGER NOT NULL REFERENCES riders(rider_id),
      bike_id INTEGER NOT NULL REFERENCES bikes(bike_id),
      rental_date TEXT NOT NULL,
      return_date TEXT,
      rental_status TEXT NOT NULL
    )
  `);

  console.log('Database tables verified/created successfully in:', DB_PATH);
  await seedInitialData();
}

/**
 * Run standalone initialization and table verification when executed directly.
 */
async function runStandaloneInit() {
  try {
    await initializeDatabase();

    const tables = await getAll(
      "SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    );

    console.log('Verified tables in bikeStore.db:');
    for (const table of tables) {
      console.log(`- ${table.name}`);
    }
  } catch (err) {
    console.error('Database initialization failed:', err.message);
    process.exitCode = 1;
  } finally {
    db.close((closeErr) => {
      if (closeErr) {
        console.error('Error closing database connection:', closeErr.message);
      }
    });
  }
}

// Allow running `node database/database.js` directly to initialize and verify the DB
if (require.main === module) {
  runStandaloneInit();
}

module.exports = {
  db,
  DB_PATH,
  runQuery,
  getOne,
  getAll,
  initializeDatabase,
  switchDatabase,
  getDb,
};
