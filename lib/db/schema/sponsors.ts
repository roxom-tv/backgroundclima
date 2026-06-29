import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { z } from 'zod/v4';

export const sponsorsTable = sqliteTable('sponsors', {
    id: text('id')
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    logo_url: text('logo_url'),
    website_url: text('website_url'),
    is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    order_index: integer('order_index').notNull().default(0),
    created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
    updated_at: text('updated_at')
        .$defaultFn(() => new Date().toISOString())
        .$onUpdate(() => new Date().toISOString()),
});

export type Sponsor = InferSelectModel<typeof sponsorsTable>;
export type NewSponsor = InferInsertModel<typeof sponsorsTable>;

export const SponsorSchema = z.object({
    id: z.string(),
    name: z.string(),
    logo_url: z.string().nullable(),
    website_url: z.string().nullable(),
    is_active: z.boolean(),
    order_index: z.number().int(),
    created_at: z.string().nullable(),
    updated_at: z.string().nullable(),
});
