CREATE TABLE `staff_audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`occurred_at` integer NOT NULL,
	`subject` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`reason` text,
	`result` text NOT NULL,
	`request_id` text,
	`before_json` text,
	`after_json` text
);
--> statement-breakpoint
CREATE TABLE `staff_users` (
	`subject` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'read_only' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
