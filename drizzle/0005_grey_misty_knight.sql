CREATE TABLE `student_links` (
	`id` text PRIMARY KEY NOT NULL,
	`holder_user_id` text NOT NULL,
	`student_user_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`responded_at` integer,
	FOREIGN KEY (`holder_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `student_links_holder_student` ON `student_links` (`holder_user_id`,`student_user_id`);