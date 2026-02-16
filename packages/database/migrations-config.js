require('dotenv').config({ path: '../../.env' });

module.exports = {
  database: process.env.DATABASE_URL || 'postgresql://postgres:postgres_dev_password@localhost:5432/plan_together_db',
  migrationsTable: 'pgmigrations',
  dir: 'migrations',
  direction: 'up',
  schema: 'public',
  decamelize: true,
  checkOrder: true,
  verbose: true,
  timestamp: true
};