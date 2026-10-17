CREATE TABLE `milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`lang` text NOT NULL,
	`level` integer NOT NULL,
	`unit` integer,
	`score` integer NOT NULL,
	`passed` integer NOT NULL,
	`via_test_out` integer NOT NULL,
	`completed_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `phrase_stats` (
	`user_id` text NOT NULL,
	`phrase_id` text NOT NULL,
	`lang` text NOT NULL,
	`attempts` integer NOT NULL,
	`correct` integer NOT NULL,
	`best_speak_score` integer,
	`last_seen_at` text NOT NULL,
	`weak` integer NOT NULL,
	`correct_streak` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
