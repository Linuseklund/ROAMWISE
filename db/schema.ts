import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const trips = sqliteTable('trips', {
  owner: text('owner').primaryKey(),
  state: text('state').notNull(),
  revision: integer('revision').notNull().default(1),
  updatedAt: integer('updated_at').notNull(),
});
