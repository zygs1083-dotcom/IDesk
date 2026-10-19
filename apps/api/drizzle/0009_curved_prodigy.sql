CREATE TABLE `server_samples` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`server_id` text NOT NULL,
	`ts` integer NOT NULL,
	`cpu` real NOT NULL,
	`cores` text NOT NULL,
	`load1` real NOT NULL,
	`load5` real NOT NULL,
	`load15` real NOT NULL,
	`mem_used` integer NOT NULL,
	`mem_total` integer NOT NULL,
	`swap_used` integer NOT NULL,
	`swap_total` integer NOT NULL,
	`disk_used` integer NOT NULL,
	`disk_total` integer NOT NULL,
	`disks` text NOT NULL,
	`net_rx` real NOT NULL,
	`net_tx` real NOT NULL,
	`uptime` real NOT NULL
);
--> statement-breakpoint
CREATE INDEX `server_samples_server_ts_idx` ON `server_samples` (`server_id`,`ts`);--> statement-breakpoint
CREATE TABLE `servers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`token_hash` text NOT NULL,
	`info` text,
	`last_seen_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `servers_token_hash_unique` ON `servers` (`token_hash`);