import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import dbConfig from "../../../drizzle.config";
import * as schema from "./schema";

const pool = new Pool({
  ...dbConfig.dbCredentials,
  max: 20,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 20_000,
});

export const db = drizzle(pool, { schema });
