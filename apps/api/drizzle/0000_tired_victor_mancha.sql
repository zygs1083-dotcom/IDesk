CREATE TABLE `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text DEFAULT 'other' NOT NULL,
	`host` text DEFAULT '' NOT NULL,
	`capabilities` text DEFAULT '[]' NOT NULL,
	`presence` text DEFAULT 'offline' NOT NULL,
	`load` integer,
	`api_key_hash` text NOT NULL,
	`api_key_prefix` text NOT NULL,
	`webhook_url` text,
	`webhook_secret` text,
	`max_concurrent` integer DEFAULT 1 NOT NULL,
	`disabled` integer DEFAULT false NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`last_seen_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agents_name_idx` ON `agents` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `agents_key_hash_idx` ON `agents` (`api_key_hash`);--> statement-breakpoint
CREATE TABLE `automation_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`connector_id` text NOT NULL,
	`external_id` text NOT NULL,
	`name` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`external_url` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`last_run_status` text,
	`last_run_started_at` integer,
	`last_run_finished_at` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`connector_id`) REFERENCES `connectors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `automation_jobs_ext_idx` ON `automation_jobs` (`connector_id`,`external_id`);--> statement-breakpoint
CREATE TABLE `automation_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`external_id` text NOT NULL,
	`status` text NOT NULL,
	`trigger` text,
	`started_at` integer,
	`finished_at` integer,
	`external_url` text,
	`error` text,
	`fetched_at` integer NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `automation_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `automation_runs_ext_idx` ON `automation_runs` (`job_id`,`external_id`);--> statement-breakpoint
CREATE INDEX `automation_runs_started_idx` ON `automation_runs` (`job_id`,`started_at`);--> statement-breakpoint
CREATE TABLE `connectors` (
	`id` text PRIMARY KEY NOT NULL,
	`plugin_id` text NOT NULL,
	`name` text NOT NULL,
	`config` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`poll_interval_seconds` integer DEFAULT 60 NOT NULL,
	`cursor` text,
	`last_polled_at` integer,
	`last_success_at` integer,
	`last_error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ts` integer NOT NULL,
	`type` text NOT NULL,
	`task_id` text,
	`agent_id` text,
	`actor_kind` text NOT NULL,
	`actor_id` text,
	`payload` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `events_task_idx` ON `events` (`task_id`);--> statement-breakpoint
CREATE INDEX `events_type_idx` ON `events` (`type`);--> statement-breakpoint
CREATE TABLE `relay_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text DEFAULT 'note' NOT NULL,
	`task_id` text,
	`from_kind` text NOT NULL,
	`from_agent_id` text,
	`to_agent_id` text,
	`to_capability` text,
	`subject` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`artifacts` text DEFAULT '[]' NOT NULL,
	`reply_to` text,
	`read_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`from_agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`to_agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `relay_to_agent_idx` ON `relay_messages` (`to_agent_id`);--> statement-breakpoint
CREATE INDEX `relay_task_idx` ON `relay_messages` (`task_id`);--> statement-breakpoint
CREATE INDEX `relay_created_idx` ON `relay_messages` (`created_at`);--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`cron` text NOT NULL,
	`timezone` text DEFAULT 'Asia/Shanghai' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`action` text NOT NULL,
	`last_run_at` integer,
	`next_run_at` integer,
	`last_error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `task_assignments` (
	`task_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`role` text DEFAULT 'owner' NOT NULL,
	`joined_at` integer NOT NULL,
	PRIMARY KEY(`task_id`, `agent_id`),
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `assignments_agent_idx` ON `task_assignments` (`agent_id`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status` text NOT NULL,
	`outcome` text,
	`priority` integer DEFAULT 1 NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`required_capabilities` text DEFAULT '[]' NOT NULL,
	`min_agents` integer DEFAULT 1 NOT NULL,
	`publisher_kind` text NOT NULL,
	`publisher_id` text,
	`payload` text,
	`result` text,
	`summary` text,
	`deadline` integer,
	`lease_ttl_seconds` integer DEFAULT 600 NOT NULL,
	`lease_expires_at` integer,
	`parent_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
CREATE INDEX `tasks_status_idx` ON `tasks` (`status`);--> statement-breakpoint
CREATE INDEX `tasks_updated_idx` ON `tasks` (`updated_at`);