import dotenv from 'dotenv';
dotenv.config();

console.log('Environment variables:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
console.log('DB_HOST:', process.env.DB_HOST || 'Not set');
console.log('NODE_ENV:', process.env.NODE_ENV || 'Not set');

const config = {
  database: process.env.DATABASE_URL ? {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  } : {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'robotum_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  }
};

console.log('Database config:', {
  usingConnectionString: !!process.env.DATABASE_URL,
  ssl: config.database.ssl
});

export default config; 