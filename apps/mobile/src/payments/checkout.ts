import { orderSchema, type Order } from '@nano/contracts';
import type { SessionManager } from '../auth/session';

/** Creates (or, on retry with the same key, returns) the server order; payment then starts on PAY-01. */
export async function createOrder(session: SessionManager, body: object, idempotencyKey: string): Promise<Order> {
  const res = await session.authed('/v1/orders', { method: 'POST', body: { ...body, idempotencyKey } });
  return orderSchema.parse(res.body);
}
