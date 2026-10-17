ALTER TABLE `phrase_stats` ADD `review_step` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `phrase_stats` ADD `due_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `phrase_stats` ADD `recall_correct` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `phrase_stats` ADD `recall_with_help` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_prefs` ADD `script_display` text DEFAULT 'roman' NOT NULL;