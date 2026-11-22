import { and, eq, sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { now } from '../clock.js';
import { logAudit } from '../audit.js';
import { notify } from '../notify.js';
import { balance, lockUser } from './season.js';
import { GameError } from './ships.js';
import type { SessionUser } from '../session.js';

export async function placeOrder(
	user: SessionUser,
	itemId: number,
	quantity: number,
	note: string
) {
	if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10)
		throw new GameError('Pick a quantity from 1 to 10.');
	return db.transaction(async (tx) => {
		await lockUser(tx, user.id);
		const [item] = await tx
			.select()
			.from(schema.items)
			.where(eq(schema.items.id, itemId))
			.for('update');
		if (!item || !item.active) throw new GameError('That item is not in the shop right now.');
		if (item.category === 'physical' && !user.address)
			throw new GameError('Add your address on Hack Club Auth, then refresh it in settings.');
		if (item.stock !== null && item.stock < quantity)
			throw new GameError('Not enough left in stock.');
		if (item.maxPerUser !== null) {
			const [{ owned }] = await tx
				.select({ owned: sql<number>`coalesce(sum(${schema.orders.quantity}), 0)::int` })
				.from(schema.orders)
				.where(
					and(
						eq(schema.orders.userId, user.id),
						eq(schema.orders.itemId, itemId),
						sql`${schema.orders.status} not in ('rejected', 'cancelled')`
					)
				);
			if (owned + quantity > item.maxPerUser)
				throw new GameError(`You can get at most ${item.maxPerUser} of these.`);
		}
		const total = item.price * quantity;
		const have = await balance(user.id, tx);
		if (have < total)
			throw new GameError(`You need ${total} acorns, you have ${Math.floor(have)}.`);

		const [order] = await tx
			.insert(schema.orders)
			.values({
				userId: user.id,
				itemId,
				quantity,
				total,
				address: item.category === 'physical' ? user.address : null,
				note: note.trim().slice(0, 500) || null,
				createdAt: now()
			})
			.returning();
		await tx.insert(schema.ledger).values({
			userId: user.id,
			amount: -total,
			reason: 'purchase',
			refType: 'order',
			refId: order.id
		});
		if (item.stock !== null)
			await tx
				.update(schema.items)
				.set({ stock: item.stock - quantity })
				.where(eq(schema.items.id, itemId));
		await logAudit(
			user.id,
			'order.placed',
			{ type: 'order', id: order.id },
			{ itemId, quantity, total },
			tx
		);
		return order;
	});
}

type OrderStatus = 'pending' | 'approved' | 'fulfilled' | 'rejected' | 'cancelled';

export async function setOrderStatus(
	actor: SessionUser,
	orderId: number,
	status: OrderStatus,
	extra: { staffNote?: string; tracking?: string } = {}
) {
	await db.transaction(async (tx) => {
		const [order] = await tx
			.select()
			.from(schema.orders)
			.where(eq(schema.orders.id, orderId))
			.for('update');
		if (!order) throw new GameError('Order not found.');
		const own = order.userId === actor.id;
		if (status === 'cancelled' && !(own && order.status === 'pending'))
			throw new GameError('Only pending orders can be cancelled.');
		if (status !== 'cancelled' && actor.role !== 'admin')
			throw new GameError('Only admins can change orders.');
		if (['rejected', 'cancelled'].includes(order.status))
			throw new GameError('This order is already closed.');
		if (status === 'rejected' && order.status === 'fulfilled')
			throw new GameError('This order was already sent, so it cannot be refunded.');

		await tx
			.update(schema.orders)
			.set({
				status,
				staffNote: extra.staffNote ?? order.staffNote,
				tracking: extra.tracking ?? order.tracking,
				handledBy: own ? order.handledBy : actor.id,
				updatedAt: now()
			})
			.where(eq(schema.orders.id, orderId));

		if (status === 'rejected' || status === 'cancelled') {
			await tx.insert(schema.ledger).values({
				userId: order.userId,
				amount: order.total,
				reason: 'refund',
				refType: 'order',
				refId: order.id,
				actorId: actor.id
			});
			const [item] = await tx.select().from(schema.items).where(eq(schema.items.id, order.itemId));
			if (item?.stock !== null && item)
				await tx
					.update(schema.items)
					.set({ stock: item.stock + order.quantity })
					.where(eq(schema.items.id, item.id));
		}
		if (!own) {
			await notify(
				order.userId,
				{
					kind: `order.${status}`,
					title: `Order #${order.id} is ${status}`,
					body: extra.staffNote ?? (extra.tracking ? `Tracking: ${extra.tracking}` : ''),
					link: '/shop/orders'
				},
				tx
			);
		}
		await logAudit(actor.id, `order.${status}`, { type: 'order', id: orderId }, extra, tx);
	});
}
