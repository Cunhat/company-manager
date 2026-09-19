import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Use the database package's Drizzle instance without importing runtime credentials.
export const createTestDb = () => drizzle.mock({ schema });
export { getTableConfig } from "drizzle-orm/pg-core";
