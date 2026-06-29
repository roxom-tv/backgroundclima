import { sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { z } from 'zod/v4';

export const TransitionEffectSchema = z.enum(['tv_static', 'fade', 'slide', 'none']);
export type TransitionEffect = z.infer<typeof TransitionEffectSchema>;

export const GlobalSettingsSchema = z.object({
    show_sponsors: z.boolean(),
    show_live_indicator: z.boolean(),
    transition_effect: TransitionEffectSchema,
    default_duration_seconds: z.number().int().positive(),
});
export type GlobalSettings = z.infer<typeof GlobalSettingsSchema>;

export function parseGlobalSettings(raw: string): GlobalSettings {
    return GlobalSettingsSchema.parse(JSON.parse(raw));
}

export function stringifyGlobalSettings(value: GlobalSettings): string {
    return JSON.stringify(value);
}

export const settingsTable = sqliteTable(
    'settings',
    {
        id: text('id')
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        key: text('key').notNull(),
        value: text('value').notNull().default('{}'),
        updated_at: text('updated_at')
            .$defaultFn(() => new Date().toISOString())
            .$onUpdate(() => new Date().toISOString()),
    },
    (table) => [uniqueIndex('settings_key_unique').on(table.key)],
);

export type SettingsRow = InferSelectModel<typeof settingsTable>;
export type NewSettingsRow = InferInsertModel<typeof settingsTable>;
