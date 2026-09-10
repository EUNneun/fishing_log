ALTER TABLE `fishing_logs` ADD `owner_email` text;--> statement-breakpoint
CREATE INDEX `idx_fishing_logs_owner_email` ON `fishing_logs` (`owner_email`);