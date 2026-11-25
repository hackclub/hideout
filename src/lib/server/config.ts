if (!process.env.DATABASE_URL) {
	try {
		process.loadEnvFile();
	} catch {}
}

function list(name: string): string[] {
	return (process.env[name] ?? '')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
}

export const config = {
	databaseUrl: process.env.DATABASE_URL ?? '',
	appUrl: (process.env.APP_URL ?? '').replace(/\/$/, ''),
	encryptionKey: process.env.TOKEN_ENCRYPTION_KEY ?? '',
	hca: {
		issuer: (process.env.HCA_ISSUER ?? 'https://auth.hackclub.com').replace(/\/$/, ''),
		clientId: process.env.HCA_CLIENT_ID ?? '',
		clientSecret: process.env.HCA_CLIENT_SECRET ?? ''
	},
	hackatime: {
		baseUrl: (process.env.HACKATIME_BASE_URL ?? 'https://hackatime.hackclub.com').replace(
			/\/$/,
			''
		),
		clientId: process.env.HACKATIME_CLIENT_ID ?? '',
		clientSecret: process.env.HACKATIME_CLIENT_SECRET ?? ''
	},
	kairos: {
		baseUrl: (process.env.KAIROS_BASE_URL || 'https://kairos.hackclub.com').replace(/\/$/, ''),
		apiKey: process.env.KAIROS_API_KEY ?? ''
	},
	github: {
		token: process.env.GITHUB_TOKEN ?? '',
		webhookSecret: process.env.GITHUB_WEBHOOK_SECRET ?? '',
		clientId: process.env.GITHUB_CLIENT_ID ?? '',
		clientSecret: process.env.GITHUB_CLIENT_SECRET ?? ''
	},
	slack: {
		botToken: process.env.SLACK_BOT_TOKEN ?? '',
		signupChannels: list('SLACK_SIGNUP_CHANNELS')
	},
	unified: {
		token: process.env.UNIFIED_AIRTABLE_TOKEN ?? '',
		baseId: process.env.UNIFIED_BASE_ID ?? '',
		tableId: process.env.UNIFIED_TABLE_ID ?? ''
	},
	s3: {
		endpoint: (process.env.S3_ENDPOINT ?? '').replace(/\/$/, ''),
		region: process.env.S3_REGION || 'auto',
		bucket: process.env.S3_BUCKET ?? '',
		accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
		secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? ''
	},
	adminSlackIds: list('ADMIN_SLACK_IDS'),
	adminEmails: list('ADMIN_EMAILS')
};
