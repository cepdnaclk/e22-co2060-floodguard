import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load variables from the root .env file
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
const dbName = process.env.DB_NAME || 'mydb';
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || '';

const config = {
  host: dbHost,
  port: dbPort,
  database: dbName,
  user: dbUser,
  password: dbPassword,
};

// Only enable SSL if configured (useful for production/cloud databases)
if (process.env.DB_SSL === 'true') {
  try {
    const certPath = path.resolve(process.cwd(), '../../global-bundle.pem');
    if (fs.existsSync(certPath)) {
      config.ssl = {
        rejectUnauthorized: true,
        ca: fs.readFileSync(certPath).toString()
      };
    }
  } catch (err) {
    console.warn('DB SSL enabled but CA certificate file could not be read:', err.message);
  }
}

const pool = new Pool(config);

export default pool;
