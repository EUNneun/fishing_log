CREATE TABLE `fishing_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`trip_date` text NOT NULL,
	`location` text NOT NULL,
	`boat_name` text NOT NULL,
	`fee` integer NOT NULL,
	`species` text NOT NULL,
	`rig` text NOT NULL,
	`weather` text NOT NULL,
	`catch_count` integer NOT NULL,
	`max_size` real,
	`memo` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
