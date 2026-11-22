export const REQUIRED_ENV = [
	'DATABASE_URL',
	'APP_URL',
	'TOKEN_ENCRYPTION_KEY',
	'HCA_CLIENT_ID',
	'HCA_CLIENT_SECRET',
	'HACKATIME_CLIENT_ID',
	'HACKATIME_CLIENT_SECRET',
	'GITHUB_TOKEN',
	'GITHUB_CLIENT_ID',
	'GITHUB_CLIENT_SECRET',
	'SLACK_BOT_TOKEN',
	'UNIFIED_AIRTABLE_TOKEN',
	'UNIFIED_BASE_ID',
	'UNIFIED_TABLE_ID',
	'S3_ENDPOINT',
	'S3_BUCKET',
	'S3_ACCESS_KEY_ID',
	'S3_SECRET_ACCESS_KEY'
] as const;

export function startupProblems(env: Record<string, string | undefined>): string[] {
	return REQUIRED_ENV.filter((name) => !env[name]?.trim());
}
