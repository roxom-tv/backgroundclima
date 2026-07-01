import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export const usersTable = sqliteTable('users', {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    okta_sub: text('okta_sub').unique(),
    full_name: text('full_name'),
    display_name: text('display_name'),
    avatar_url: text('avatar_url'),
    member_id: text('member_id').unique(),
    country: text('country'),
    timezone: text('timezone'),
    home_view: text('home_view').default('standard'),
    onboarding_completed: integer('onboarding_completed').default(0),
    btc_price_alerts: integer('btc_price_alerts').default(0),
    breaking_news_opt_in: integer('breaking_news_opt_in').default(0),
    daily_summary_opt_in: integer('daily_summary_opt_in').default(0),
    custom_chyron_enabled: integer('custom_chyron_enabled').default(0),
    is_active: integer('is_active').default(1),
    created_at: integer('created_at').notNull(),
    last_sign_in_at: integer('last_sign_in_at'),
});

export const sessionsTable = sqliteTable('sessions', {
    id: text('id').primaryKey(),
    user_id: text('user_id')
        .notNull()
        .references(() => usersTable.id, { onDelete: 'cascade' }),
    tracking: text('tracking'),
    // Stored to enable id_token_hint on Okta end-session logout.
    id_token: text('id_token'),
    created_at: integer('created_at').notNull(),
    expires_at: integer('expires_at').notNull(),
});

export const oauthStatesTable = sqliteTable('oauth_states', {
    state: text('state').primaryKey(),
    // JSON: { tracking?, codeVerifier, nonce } — never leaves the server.
    payload: text('payload'),
    expires_at: integer('expires_at').notNull(),
});

export type User = InferSelectModel<typeof usersTable>;
export type NewUser = InferInsertModel<typeof usersTable>;
export type Session = InferSelectModel<typeof sessionsTable>;
export type NewSession = InferInsertModel<typeof sessionsTable>;
export type OAuthState = InferSelectModel<typeof oauthStatesTable>;
