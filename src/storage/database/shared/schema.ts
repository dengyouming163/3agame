import { pgTable, serial, timestamp, unique, varchar, date, text, foreignKey, integer } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const games = pgTable("games", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 255 }).notNull(),
	genre: varchar({ length: 100 }),
	platform: varchar({ length: 100 }),
	releaseDate: date("release_date"),
	description: text(),
	coverImageKey: varchar("cover_image_key", { length: 500 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("games_slug_key").on(table.slug),
]);

export const articles = pgTable("articles", {
	id: serial().primaryKey().notNull(),
	gameId: integer("game_id"),
	title: varchar({ length: 500 }).notNull(),
	slug: varchar({ length: 500 }).notNull(),
	content: text().notNull(),
	summary: text(),
	coverImageKey: varchar("cover_image_key", { length: 500 }),
	status: varchar({ length: 50 }).default('draft'),
	language: varchar({ length: 10 }).default('en'),
	metaTitle: varchar("meta_title", { length: 500 }),
	metaDescription: text("meta_description"),
	keywords: text().array(),
	author: varchar({ length: 100 }).default('AI Editor'),
	publishedAt: timestamp("published_at", { mode: 'string' }),
	scheduledAt: timestamp("scheduled_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.gameId],
			foreignColumns: [games.id],
			name: "articles_game_id_fkey"
		}).onDelete("set null"),
	unique("articles_slug_key").on(table.slug),
]);

export const publishQueue = pgTable("publish_queue", {
	id: serial().primaryKey().notNull(),
	articleId: integer("article_id"),
	scheduledAt: timestamp("scheduled_at", { mode: 'string' }).notNull(),
	status: varchar({ length: 50 }).default('pending'),
	attempts: integer().default(0),
	lastAttemptAt: timestamp("last_attempt_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.articleId],
			foreignColumns: [articles.id],
			name: "publish_queue_article_id_fkey"
		}).onDelete("cascade"),
]);

export const generationLogs = pgTable("generation_logs", {
	id: serial().primaryKey().notNull(),
	articleId: integer("article_id"),
	gameId: integer("game_id"),
	prompt: text(),
	model: varchar({ length: 100 }),
	tokensUsed: integer("tokens_used"),
	generatedAt: timestamp("generated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.articleId],
			foreignColumns: [articles.id],
			name: "generation_logs_article_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.gameId],
			foreignColumns: [games.id],
			name: "generation_logs_game_id_fkey"
		}).onDelete("set null"),
]);
