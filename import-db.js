const { db } = require('./db');
const fs = require('fs');
const path = require('path');

// Import database from SQL dump
const inputFile = path.join(__dirname, 'database-export.sql');

if (!fs.existsSync(inputFile)) {
  console.error(`Error: ${inputFile} not found!`);
  console.log('Please run export-db.js first to create the export file.');
  process.exit(1);
}

console.log('Importing database from SQL file...');

const sqlDump = fs.readFileSync(inputFile, 'utf8');

// Split by semicolons and execute each statement
const statements = sqlDump
  .split(';')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--') && s.length > 0);

let imported = 0;
for (const statement of statements) {
  try {
    db.exec(statement);
    imported++;
  } catch (error) {
    // Ignore errors for duplicate keys, etc.
    if (!error.message.includes('UNIQUE constraint')) {
      console.warn(`Warning: ${error.message}`);
    }
  }
}

console.log(`Successfully imported ${imported} statements!`);
console.log('Database import complete!');

