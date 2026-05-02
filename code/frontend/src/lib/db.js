import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load variables from the root .env file
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const pool = new Pool({
  host: 'floodmanagement.czk28osu0tg7.ap-southeast-2.rds.amazonaws.com',
  port: 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync(path.resolve(process.cwd(), '../../global-bundle.pem')).toString()
  }
});

export default pool;
