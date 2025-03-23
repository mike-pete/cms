import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import dbConfig from "../../../drizzle.config";
import * as schema from "./schema";

const pool = new Pool({
  ...dbConfig.dbCredentials,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool, { schema });
