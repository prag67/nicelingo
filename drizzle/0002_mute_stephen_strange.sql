CREATE TABLE `stripe_events` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`user_id` text,
	`status` text DEFAULT 'processing' NOT NULL,
	`processed_at` integer,
	`last_error` text
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`user_id` text PRIMARY KEY NOT NULL,
	`stripe_customer_id` text,
	`stripe_subscription_id` text,
	`stripe_subscription_created` integer,
	`status` text DEFAULT 'none' NOT NULL,
	`current_period_end` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
