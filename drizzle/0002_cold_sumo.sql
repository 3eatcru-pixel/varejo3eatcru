CREATE TABLE `client_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`company_id` text NOT NULL,
	`type` text NOT NULL,
	`amount` real NOT NULL,
	`balance_after` real NOT NULL,
	`reason` text NOT NULL,
	`created_by` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`document` text,
	`email` text,
	`phone` text,
	`balance` real DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `financial_records` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`type` text NOT NULL,
	`description` text NOT NULL,
	`amount` real NOT NULL,
	`due_date` text NOT NULL,
	`category` text NOT NULL,
	`entity_name` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`payment_date` text,
	`notes` text,
	`created_by` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `platform_admins` (
	`id` text PRIMARY KEY NOT NULL,
	`granted_at` text NOT NULL,
	FOREIGN KEY (`id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `platform_companies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`plan` text DEFAULT 'FREE' NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `platform_error_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`message` text NOT NULL,
	`level` text DEFAULT 'ERROR' NOT NULL,
	`timestamp` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `platform_invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`subscription_id` text NOT NULL,
	`amount` real NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `platform_releases` (
	`id` text PRIMARY KEY NOT NULL,
	`version` text NOT NULL,
	`notes` text,
	`published_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `platform_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`current_period_end` text NOT NULL,
	`cancel_at_period_end` integer DEFAULT false,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `platform_tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`priority` text NOT NULL,
	`company_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `platform_webhooks` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`events` text NOT NULL,
	`active` integer DEFAULT true
);
--> statement-breakpoint
CREATE TABLE `user_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`invited_by` text NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invited_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`device_info` text,
	`ip_address` text,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `sales` ADD `idempotency_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `sales_company_id_idempotency_key_unique` ON `sales` (`company_id`,`idempotency_key`);