import { relations } from "drizzle-orm/relations";
import { games, articles, publishQueue, generationLogs } from "./schema";

export const articlesRelations = relations(articles, ({one, many}) => ({
	game: one(games, {
		fields: [articles.gameId],
		references: [games.id]
	}),
	publishQueues: many(publishQueue),
	generationLogs: many(generationLogs),
}));

export const gamesRelations = relations(games, ({many}) => ({
	articles: many(articles),
	generationLogs: many(generationLogs),
}));

export const publishQueueRelations = relations(publishQueue, ({one}) => ({
	article: one(articles, {
		fields: [publishQueue.articleId],
		references: [articles.id]
	}),
}));

export const generationLogsRelations = relations(generationLogs, ({one}) => ({
	article: one(articles, {
		fields: [generationLogs.articleId],
		references: [articles.id]
	}),
	game: one(games, {
		fields: [generationLogs.gameId],
		references: [games.id]
	}),
}));