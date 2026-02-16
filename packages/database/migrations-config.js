module.exports = {
  host: 'localhost',
  port: 5432,
  database: 'plan_together_db',
  user: 'postgres',
  password: 'postgres_dev_password',
  migrationsTable: 'pgmigrations',
  dir: 'migrations',
  direction: 'up',
  schema: 'public',
  decamelize: true,
  checkOrder: true,
  verbose: true,
  timestamp: true
};