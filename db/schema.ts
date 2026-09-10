import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const fishingLogs = sqliteTable("fishing_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tripDate: text("trip_date").notNull(),
  location: text("location").notNull(),
  boatName: text("boat_name").notNull(),
  fee: integer("fee").notNull(),
  species: text("species").notNull(),
  rig: text("rig").notNull(),
  weather: text("weather").notNull(),
  catchCount: integer("catch_count").notNull(),
  maxSize: real("max_size"),
  memo: text("memo").notNull().default(""),
  ownerEmail: text("owner_email"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_fishing_logs_owner_email").on(table.ownerEmail),
]);
