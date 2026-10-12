CREATE TABLE `user_prefs` (
	`user_id` text PRIMARY KEY NOT NULL,
	`last_lang` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
