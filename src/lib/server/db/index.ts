import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { config } from '../config.js';
import * as schema from './schema.js';

const client = postgres(config.databaseUrl, { max: 10 });

export const db = drizzle(client, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
export { schema };

export async function migrateDb() {
	await migrate(db, { migrationsFolder: 'drizzle' });
}

export async function closeDb() {
	await client.end({ timeout: 5 });
}

export function isUniqueViolation(e: unknown) {
	const err = e as { code?: string; cause?: { code?: string } } | null;
	return err?.code === '23505' || err?.cause?.code === '23505';
}
