/**
 * Infrastructure boundary: stands in for the real database client (Prisma, Drizzle, ...).
 * Server actions import `db` from here and tests replace it with jest.mock('@/examples/lib/db').
 */
export type Subscriber = { id: string; email: string };

type Database = {
  subscriber: {
    findByEmail(email: string): Promise<Subscriber | null>;
    create(data: { email: string }): Promise<Subscriber>;
  };
};

function notConfigured(): never {
  throw new Error('Database not configured: export your real client from here.');
}

export const db: Database = {
  subscriber: {
    findByEmail: async () => notConfigured(),
    create: async () => notConfigured(),
  },
};
