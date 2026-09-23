/**
 * Infrastructure boundary: stands in for the real database client (Prisma, Drizzle, ...).
 * Server actions import `db` from here and tests replace it with jest.mock('@/lib/db').
 */
export type Subscriber = { id: string; email: string };

function notConfigured(): never {
  throw new Error('Database not configured: export your real client from src/lib/db.ts.');
}

export const db = {
  subscriber: {
    async findByEmail(_email: string): Promise<Subscriber | null> {
      return notConfigured();
    },
    async create(_data: { email: string }): Promise<Subscriber> {
      return notConfigured();
    },
  },
};
