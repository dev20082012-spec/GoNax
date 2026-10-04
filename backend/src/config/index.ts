import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/gonax_db',
    driver: process.env.DATABASE_DRIVER || 'auto',
    sqlitePath: path.resolve(__dirname, '../../data/gonax_local.json')
  },
  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.LLM_MODEL || 'gemini-1.5-flash'
  }
};
