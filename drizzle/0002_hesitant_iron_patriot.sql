CREATE TABLE `fishing_settings` (
	`owner_email` text PRIMARY KEY NOT NULL,
	`region` text DEFAULT '서해' NOT NULL,
	`preferred_tides` text DEFAULT '3,4,5,10,11' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
