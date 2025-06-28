import { Pool } from 'pg';
import config from './config.js';

const pool = new Pool(config.database);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;