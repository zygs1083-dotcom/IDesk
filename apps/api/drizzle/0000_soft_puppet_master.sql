CREATE TABLE `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`host` text NOT NULL,
	`capabilities` text DEFAULT '[]' NOT NULL,
	`api_key_hash` text NOT NULL,
	`webhook_url` text,
	`last_seen_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agents_api_key_hash_unique` ON `agents` (`api_key_hash`);--> statement-breakpoint
CREATE TABLE `automation_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`connector_id` text NOT NULL,
	`external_id` text NOT NULL,
	`name` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`url` text,
	`last_run_status` text,
	`last_run_at` integer,
	FOREIGN KEY (`connector_id`) REFERENCES `connectors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `automation_jobs_connector_external_unique` ON `automation_jobs` (`connector_id`,`external_id`);--> statement-breakpoint
CREATE TABLE `automation_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`external_id` text NOT NULL,
	`status` text NOT NULL,
	`started_at` integer,
	`finished_at` integer,
	`url` text,
	`error` text,
	FOREIGN KEY (`job_id`) REFERENCES `automation_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `automation_runs_job_external_unique` ON `automation_runs` (`job_id`,`external_id`);--> statement-breakpoint
CREATE TABLE `connectors` (
	`id` text PRIMARY KEY NOT NULL,
	`plugin_id` text NOT NULL,
	`name` text NOT NULL,
	`config` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`poll_interval_sec` integer DEFAULT 60 NOT NULL,
	`last_polled_at` integer,
	`last_error` text
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`ts` integer NOT NULL,
	`type` text NOT NULL,
	`task_id` text,
	`agent_id` text,
	`payload` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `events_task_id_idx` ON `events` (`task_id`);--> statement-breakpoint
CREATE INDEX `events_ts_idx` ON `events` (`ts`);--> statement-breakpoint
CREATE TABLE `plugin_state` (
	`plugin_id` text PRIMARY KEY NOT NULL,
	`enabled` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`cron` text NOT NULL,
	`timezone` text DEFAULT 'Asia/Shanghai' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`action` text NOT NULL,
	`last_run_at` integer,
	`last_status` text,
	`next_run_at` integer
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`capabilities` text DEFAULT '[]' NOT NULL,
	`publisher_id` text NOT NULL,
	`assignee_id` text,
	`recruit` text,
	`handoff` text,
	`lease_expires_at` integer,
	`result` text,
	`due_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
CREATE INDEX `tasks_status_idx` ON `tasks` (`status`);