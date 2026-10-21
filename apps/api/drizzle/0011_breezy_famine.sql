CREATE TABLE `assistant_sessions` (
	`channel` text NOT NULL,
	`chat_id` text NOT NULL,
	`person_id` text NOT NULL,
	`history` text DEFAULT '[]' NOT NULL,
	`draft` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assistant_sessions_channel_chat_person_unique` ON `assistant_sessions` (`channel`,`chat_id`,`person_id`);--> statement-breakpoint
CREATE TABLE `assistant_settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`protocol` text NOT NULL,
	`base_url` text NOT NULL,
	`api_key` text NOT NULL,
	`model` text NOT NULL,
	`enabled` integer NOT NULL,
	CONSTRAINT "assistant_settings_singleton" CHECK("assistant_settings"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `people_name_unique` ON `people` (`name`);--> statement-breakpoint
CREATE TABLE `person_bindings` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`channel` text NOT NULL,
	`external_id` text NOT NULL,
	`display_name` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `person_bindings_channel_external_unique` ON `person_bindings` (`channel`,`external_id`);--> statement-breakpoint
CREATE TABLE `task_origins` (
	`task_id` text PRIMARY KEY NOT NULL,
	`channel` text NOT NULL,
	`chat_id` text NOT NULL,
	`person_id` text NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade
);
