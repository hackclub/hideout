import {
	pgTable,
	pgEnum,
	text,
	integer,
	boolean,
	timestamp,
	date,
	jsonb,
	numeric,
	serial,
	uniqueIndex,
	index
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

const created = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const ts = (name: string) => timestamp(name, { withTimezone: true });

export const role = pgEnum('role', ['user', 'reviewer', 'admin']);

export type Address = {
	name: string;
	line1: string;
	line2?: string;
	city: string;
	state?: string;
	postcode: string;
	country: string;
	phone?: string;
};

export const users = pgTable(
	'users',
	{
		id: serial('id').primaryKey(),
		hcaId: text('hca_id').notNull().unique(),
		slackId: text('slack_id'),
		email: text('email').notNull(),
		name: text('name').notNull(),
		firstName: text('first_name'),
		lastName: text('last_name'),
		birthday: date('birthday'),
		avatarUrl: text('avatar_url'),
		role: role('role').notNull().default('user'),
		verification: text('verification').notNull().default('unknown'),
		githubLogin: text('github_login'),
		hackatimeUserId: text('hackatime_user_id'),
		hackatimeToken: text('hackatime_token'),
		address: jsonb('address').$type<Address>(),
		banned: boolean('banned').notNull().default(false),
		bannedReason: text('banned_reason'),
		createdAt: created(),
		lastSeenAt: ts('last_seen_at')
	},
	(t) => [
		uniqueIndex('users_hackatime_user_id')
			.on(t.hackatimeUserId)
			.where(sql`hackatime_user_id is not null`),
		uniqueIndex('users_github_login')
			.on(sql`lower(github_login)`)
			.where(sql`github_login is not null`)
	]
);

export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: ts('expires_at').notNull(),
	createdAt: created()
});

export type SeasonConfig = {
	baseAcornsPerHour: number;
	poolAcornsPerHour: number;
	acornCents: number;
	capMultiplier: number;
	targetsPerRaccoon: number;
	responseHours: number;
	scoringHours: number;
	fixPoints: [number, number, number];
	findValue: [number, number, number];
	tierStake: [number, number, number];
	maxPairPrsPerRound: number;
	unbreakableMultiplier: number;
	checkRates: [number, number, number];
	shipMinHours: number[];
};

export const DEFAULT_SEASON_CONFIG: SeasonConfig = {
	baseAcornsPerHour: 10,
	poolAcornsPerHour: 10,
	acornCents: 25,
	capMultiplier: 3,
	targetsPerRaccoon: 3,
	responseHours: 24,
	scoringHours: 24,
	fixPoints: [5, 15, 40],
	findValue: [2, 6, 16],
	tierStake: [0, 20, 40],
	maxPairPrsPerRound: 3,
	unbreakableMultiplier: 1.5,
	checkRates: [0.1, 0.3, 1],
	shipMinHours: [5, 8, 15]
};

export const seasons = pgTable('seasons', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	startsAt: ts('starts_at').notNull(),
	config: jsonb('config').$type<SeasonConfig>().notNull(),
	prizePool: numeric('prize_pool', { precision: 14, scale: 2, mode: 'number' })
		.notNull()
		.default(0),
	createdAt: created()
});

export const roundStatus = pgEnum('round_status', ['open', 'closed']);

export const rounds = pgTable(
	'rounds',
	{
		id: serial('id').primaryKey(),
		seasonId: integer('season_id')
			.notNull()
			.references(() => seasons.id),
		number: integer('number').notNull(),
		buildStartsAt: ts('build_starts_at').notNull(),
		breakStartsAt: ts('break_starts_at').notNull(),
		breakEndsAt: ts('break_ends_at').notNull(),
		status: roundStatus('status').notNull().default('open'),
		assignedAt: ts('assigned_at'),
		closedAt: ts('closed_at'),
		rolloverIn: numeric('rollover_in', { precision: 14, scale: 2, mode: 'number' })
			.notNull()
			.default(0),
		rolloverOut: numeric('rollover_out', { precision: 14, scale: 2, mode: 'number' }),
		pool: numeric('pool', { precision: 14, scale: 2, mode: 'number' }),
		pointValue: numeric('point_value', { precision: 14, scale: 4, mode: 'number' })
	},
	(t) => [uniqueIndex('rounds_season_number').on(t.seasonId, t.number)]
);

export const projects = pgTable('projects', {
	id: serial('id').primaryKey(),
	ownerId: integer('owner_id')
		.notNull()
		.references(() => users.id),
	name: text('name').notNull(),
	description: text('description').notNull().default(''),
	repoUrl: text('repo_url'),
	demoUrl: text('demo_url'),
	runSteps: text('run_steps'),
	updateDescription: text('update_description'),
	hackatimeProjects: jsonb('hackatime_projects').$type<string[]>().notNull().default([]),
	kairosProjects: jsonb('kairos_projects').$type<string[]>().notNull().default([]),
	screenshots: jsonb('screenshots').$type<string[]>().notNull().default([]),
	createdAt: created(),
	updatedAt: ts('updated_at').notNull().defaultNow()
});

export const shipStatus = pgEnum('ship_status', ['pending', 'approved', 'changes', 'rejected']);

export const verdict = pgEnum('unbreakable_verdict', [
	'attacked',
	'not_attacked',
	'unrunnable',
	'too_simple'
]);

export const ships = pgTable(
	'ships',
	{
		id: serial('id').primaryKey(),
		projectId: integer('project_id')
			.notNull()
			.references(() => projects.id),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id),
		roundId: integer('round_id')
			.notNull()
			.references(() => rounds.id),
		repoUrl: text('repo_url').notNull(),
		demoUrl: text('demo_url'),
		runSteps: text('run_steps'),
		commitSha: text('commit_sha').notNull(),
		screenshots: jsonb('screenshots').$type<string[]>().notNull().default([]),
		hackatimeProjects: jsonb('hackatime_projects').$type<string[]>().notNull(),
		kairosProjects: jsonb('kairos_projects').$type<string[]>().notNull().default([]),
		claimedHours: numeric('claimed_hours', { precision: 8, scale: 2, mode: 'number' }).notNull(),
		status: shipStatus('status').notNull().default('pending'),
		tier: integer('tier'),
		approvedHours: numeric('approved_hours', { precision: 8, scale: 2, mode: 'number' }),
		reviewerId: integer('reviewer_id').references(() => users.id),
		reviewNote: text('review_note'),
		reviewedAt: ts('reviewed_at'),
		verdict: verdict('verdict'),
		verdictBy: integer('verdict_by').references(() => users.id),
		createdAt: created()
	},
	(t) => [
		index('ships_round').on(t.roundId),
		index('ships_user').on(t.userId),
		uniqueIndex('ships_project').on(t.projectId)
	]
);

export const assignmentStatus = pgEnum('assignment_status', ['active', 'void']);
export const hoursStatus = pgEnum('hours_status', ['none', 'pending', 'approved', 'rejected']);

export const assignments = pgTable(
	'assignments',
	{
		id: serial('id').primaryKey(),
		roundId: integer('round_id')
			.notNull()
			.references(() => rounds.id),
		raccoonId: integer('raccoon_id')
			.notNull()
			.references(() => users.id),
		shipId: integer('ship_id')
			.notNull()
			.references(() => ships.id),
		status: assignmentStatus('status').notNull().default('active'),
		forkUrl: text('fork_url'),
		forkDemoUrl: text('fork_demo_url'),
		forkScreenshotUrl: text('fork_screenshot_url'),
		hackatimeProject: text('hackatime_project'),
		kairosProject: text('kairos_project'),
		note: text('note'),
		claimedHours: numeric('claimed_hours', { precision: 8, scale: 2, mode: 'number' }),
		approvedHours: numeric('approved_hours', { precision: 8, scale: 2, mode: 'number' }),
		hoursStatus: hoursStatus('hours_status').notNull().default('none'),
		hoursReviewerId: integer('hours_reviewer_id').references(() => users.id),
		hoursNote: text('hours_note'),
		hoursReviewedAt: ts('hours_reviewed_at'),
		createdAt: created()
	},
	(t) => [uniqueIndex('assignments_unique').on(t.roundId, t.raccoonId, t.shipId)]
);

export const severity = pgEnum('severity', ['minor', 'major', 'critical']);
export const bugStatus = pgEnum('bug_status', [
	'waiting',
	'accepted',
	'disputed',
	'merged',
	'invalid',
	'duplicate',
	'withdrawn'
]);

export const bugs = pgTable(
	'bugs',
	{
		id: serial('id').primaryKey(),
		roundId: integer('round_id')
			.notNull()
			.references(() => rounds.id),
		shipId: integer('ship_id')
			.notNull()
			.references(() => ships.id),
		assignmentId: integer('assignment_id')
			.notNull()
			.references(() => assignments.id),
		raccoonId: integer('raccoon_id')
			.notNull()
			.references(() => users.id),
		prUrl: text('pr_url').notNull().unique(),
		prNumber: integer('pr_number').notNull(),
		prTitle: text('pr_title').notNull(),
		proposedSeverity: severity('proposed_severity').notNull(),
		severity: severity('severity').notNull(),
		note: text('note'),
		status: bugStatus('status').notNull().default('waiting'),
		respondBy: ts('respond_by').notNull(),
		autoAccepted: boolean('auto_accepted').notNull().default(false),
		disputeReason: text('dispute_reason'),
		disputeKind: text('dispute_kind'),
		resolvedBy: integer('resolved_by').references(() => users.id),
		resolutionNote: text('resolution_note'),
		resolvedAt: ts('resolved_at'),
		mergedAt: ts('merged_at'),
		mergedBy: text('merged_by'),
		overturned: boolean('overturned').notNull().default(false),
		needsCheck: boolean('needs_check').notNull().default(false),
		checkedBy: integer('checked_by').references(() => users.id),
		checkedAt: ts('checked_at'),
		checkResult: text('check_result'),
		unmergedReviewed: boolean('unmerged_reviewed').notNull().default(false),
		riskyFiles: jsonb('risky_files').$type<string[]>(),
		createdAt: created()
	},
	(t) => [index('bugs_ship').on(t.shipId), index('bugs_raccoon').on(t.raccoonId)]
);

export const ledgerReason = pgEnum('ledger_reason', [
	'build_hours',
	'break_hours',
	'round_bonus',
	'season_prize',
	'purchase',
	'refund',
	'manual'
]);

export const ledger = pgTable(
	'ledger',
	{
		id: serial('id').primaryKey(),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id),
		amount: numeric('amount', { precision: 12, scale: 2, mode: 'number' }).notNull(),
		reason: ledgerReason('reason').notNull(),
		roundId: integer('round_id').references(() => rounds.id),
		refType: text('ref_type'),
		refId: integer('ref_id'),
		note: text('note'),
		actorId: integer('actor_id').references(() => users.id),
		createdAt: created()
	},
	(t) => [
		index('ledger_user').on(t.userId),
		uniqueIndex('ledger_ref').on(t.reason, t.refType, t.refId)
	]
);

export const roundScores = pgTable(
	'round_scores',
	{
		id: serial('id').primaryKey(),
		roundId: integer('round_id')
			.notNull()
			.references(() => rounds.id),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id),
		raccoonPoints: numeric('raccoon_points', { precision: 10, scale: 2, mode: 'number' }).notNull(),
		builderPoints: numeric('builder_points', { precision: 10, scale: 2, mode: 'number' }).notNull(),
		baseAcorns: numeric('base_acorns', { precision: 12, scale: 2, mode: 'number' }).notNull(),
		bonusAcorns: numeric('bonus_acorns', { precision: 12, scale: 2, mode: 'number' }).notNull(),
		cappedAcorns: numeric('capped_acorns', { precision: 12, scale: 2, mode: 'number' }).notNull(),
		createdAt: created()
	},
	(t) => [uniqueIndex('round_scores_unique').on(t.roundId, t.userId)]
);

export const itemCategory = pgEnum('item_category', ['grant', 'physical', 'digital']);

export const items = pgTable('items', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	blurb: text('blurb').notNull().default(''),
	category: itemCategory('category').notNull(),
	price: integer('price').notNull(),
	imageUrl: text('image_url'),
	stock: integer('stock'),
	maxPerUser: integer('max_per_user'),
	active: boolean('active').notNull().default(true),
	sort: integer('sort').notNull().default(0),
	createdAt: created()
});

export const orderStatus = pgEnum('order_status', [
	'pending',
	'approved',
	'fulfilled',
	'rejected',
	'cancelled'
]);

export const orders = pgTable(
	'orders',
	{
		id: serial('id').primaryKey(),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id),
		itemId: integer('item_id')
			.notNull()
			.references(() => items.id),
		quantity: integer('quantity').notNull().default(1),
		total: integer('total').notNull(),
		status: orderStatus('status').notNull().default('pending'),
		address: jsonb('address').$type<Address>(),
		note: text('note'),
		staffNote: text('staff_note'),
		tracking: text('tracking'),
		handledBy: integer('handled_by').references(() => users.id),
		createdAt: created(),
		updatedAt: ts('updated_at').notNull().defaultNow()
	},
	(t) => [index('orders_user').on(t.userId)]
);

export const notifications = pgTable(
	'notifications',
	{
		id: serial('id').primaryKey(),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id),
		kind: text('kind').notNull(),
		title: text('title').notNull(),
		body: text('body').notNull().default(''),
		link: text('link'),
		readAt: ts('read_at'),
		slackState: text('slack_state').notNull().default('queued'),
		dedupeKey: text('dedupe_key').unique(),
		createdAt: created()
	},
	(t) => [index('notifications_user').on(t.userId)]
);

export const audit = pgTable(
	'audit',
	{
		id: serial('id').primaryKey(),
		actorId: integer('actor_id').references(() => users.id),
		action: text('action').notNull(),
		targetType: text('target_type'),
		targetId: integer('target_id'),
		data: jsonb('data').$type<Record<string, unknown>>(),
		createdAt: created()
	},
	(t) => [index('audit_target').on(t.targetType, t.targetId)]
);

export const unifiedOutbox = pgTable('unified_outbox', {
	id: serial('id').primaryKey(),
	shipId: integer('ship_id')
		.unique()
		.references(() => ships.id),
	assignmentId: integer('assignment_id')
		.unique()
		.references(() => assignments.id),
	state: text('state').notNull().default('queued'),
	error: text('error'),
	sentAt: ts('sent_at'),
	createdAt: created()
});
