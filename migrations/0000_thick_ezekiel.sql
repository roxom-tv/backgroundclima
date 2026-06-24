CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`image_url` text,
	`start_date` text NOT NULL,
	`end_date` text,
	`start_time` text,
	`end_time` text,
	`is_active` integer DEFAULT true NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`color` text DEFAULT '#3B82F6' NOT NULL,
	`title_font` text DEFAULT 'Inter',
	`title_size` text DEFAULT 'large',
	`title_color` text DEFAULT '#FFFFFF',
	`text_color` text DEFAULT '#F3F4F6',
	`overlay_opacity` integer DEFAULT 50,
	`show_date_badge` integer DEFAULT true NOT NULL,
	`location` text,
	`schedule_times` text,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `oauth_states` (
	`state` text PRIMARY KEY NOT NULL,
	`payload` text,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`tracking` text,
	`id_token` text,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`okta_sub` text,
	`full_name` text,
	`display_name` text,
	`avatar_url` text,
	`member_id` text,
	`country` text,
	`timezone` text,
	`home_view` text DEFAULT 'standard',
	`onboarding_completed` integer DEFAULT 0,
	`btc_price_alerts` integer DEFAULT 0,
	`breaking_news_opt_in` integer DEFAULT 0,
	`daily_summary_opt_in` integer DEFAULT 0,
	`custom_chyron_enabled` integer DEFAULT 0,
	`is_active` integer DEFAULT 1,
	`created_at` integer NOT NULL,
	`last_sign_in_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_okta_sub_unique` ON `users` (`okta_sub`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_member_id_unique` ON `users` (`member_id`);--> statement-breakpoint
CREATE TABLE `sponsors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`logo_url` text,
	`website_url` text,
	`is_active` integer DEFAULT true NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`value` text DEFAULT '{}' NOT NULL,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_key_unique` ON `settings` (`key`);--> statement-breakpoint
CREATE TABLE `slides` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text DEFAULT 'youtube' NOT NULL,
	`name` text NOT NULL,
	`country` text,
	`youtube_url` text,
	`weather_query` text,
	`timezone` text,
	`duration_seconds` integer DEFAULT 25 NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`show_weather` integer DEFAULT true NOT NULL,
	`show_sponsor` integer DEFAULT true NOT NULL,
	`description` text,
	`image_url` text,
	`start_date` text,
	`end_date` text,
	`start_time` text,
	`end_time` text,
	`color` text,
	`sponsor_id` text,
	`sponsor_top_left` text,
	`sponsor_top_right` text,
	`sponsor_bottom_left` text,
	`sponsor_bottom_right` text,
	`host_name` text,
	`show_days` text,
	`schedule_times` text,
	`selected_event_ids` text,
	`layout_orientation` text DEFAULT 'horizontal',
	`event_slide_style` text DEFAULT 'classic',
	`event_slide_title` text,
	`headline` text,
	`source` text,
	`video_url` text,
	`loop_count` integer,
	`active_days` text,
	`active_time_start` text,
	`active_time_end` text,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`sponsor_id`) REFERENCES `sponsors`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`sponsor_top_left`) REFERENCES `sponsors`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`sponsor_top_right`) REFERENCES `sponsors`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`sponsor_bottom_left`) REFERENCES `sponsors`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`sponsor_bottom_right`) REFERENCES `sponsors`(`id`) ON UPDATE no action ON DELETE set null
);
