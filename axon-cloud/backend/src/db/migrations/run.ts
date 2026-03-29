/**
 * Axon Cloud — Migration Runner
 *
 * Applies the baseline schema and any incremental migration files.
 * Run with:  npm run migrate
 */

import 'dotenv/config';
import { db, SCHEMA_SQL } from '../schema';
import { logger } from '../../core/logger';

const BASELINE_VERSION = '0001_baseline';

async function run(): Promise<void> {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // Apply baseline schema (idempotent — uses IF NOT EXISTS throughout)
    logger.info('Applying baseline schema…');
    await client.query(SCHEMA_SQL);

    // Record baseline migration if not already present
    await client.query(
      `INSERT INTO schema_migrations (version)
       VALUES ($1)
       ON CONFLICT (version) DO NOTHING`,
      [BASELINE_VERSION]
    );

    await client.query('COMMIT');
    logger.info('Migrations applied successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Migration failed — rolled back.', { error: (err as Error).message });
    process.exit(1);
  } finally {
    client.release();
    await db.end();
  }
}

run();
