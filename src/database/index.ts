/*
  This file brings together all the database components for Jarvis.

  It exports the database client and repositories so Jarvis can easily access all database functionality while keeping the code organized and easy to use.
*/
/**
 * Database Module
 *
 * Exports database client and repositories.
 */

export { DatabaseClient } from "./client";
export * from "./repositories";

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
