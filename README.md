# Robotum App

A Node.js web application for educational management.

## Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```
   # For local PostgreSQL
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=robotum_db
   DB_USER=postgres
   DB_PASSWORD=your_password_here
   
   # OR for Supabase (recommended for production)
   DATABASE_URL=postgresql://username:password@host:port/database
   
   SESSION_SECRET=your_session_secret_here
   NODE_ENV=development
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Database Setup with Supabase

### Setting up Supabase Database

1. **Create a Supabase project:**
   - Go to [Supabase](https://supabase.com/) and sign up/login
   - Click "New Project"
   - Choose your organization and enter project details
   - Wait for the database to be created

2. **Get your connection string:**
   - In your Supabase dashboard, go to Settings → Database
   - Find the "Connection string" section
   - Copy the "URI" connection string
   - It will look like: `postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres`

3. **Set up your database schema:**
   - Go to the SQL Editor in your Supabase dashboard
   - Create your tables and initial data
   - You can run SQL commands to set up your database structure

### Important Notes for Supabase
- **SSL Required:** Supabase requires SSL connections even in development
- **Connection String:** Use the full connection string from Supabase dashboard
- **Password:** Make sure to replace `[YOUR-PASSWORD]` with your actual database password

## Deployment on Render

### Prerequisites
- A Supabase database (recommended) or PostgreSQL database
- A Render account

### Steps to Deploy

1. **Connect your GitHub repository to Render:**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" and select "Web Service"
   - Connect your GitHub repository

2. **Configure the Web Service:**
   - **Name:** robotum-app (or your preferred name)
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free (or your preferred plan)

3. **Set Environment Variables:**
   In the Render dashboard, go to your service's "Environment" tab and add:
   ```
   NODE_ENV=production
   SESSION_SECRET=your_secure_session_secret
   
   # For Supabase (recommended)
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   
   # OR for other PostgreSQL databases
   DB_HOST=your_postgres_host
   DB_PORT=5432
   DB_NAME=your_database_name
   DB_USER=your_database_user
   DB_PASSWORD=your_database_password
   ```

4. **Deploy:**
   - Click "Create Web Service"
   - Render will automatically build and deploy your application

### Troubleshooting

**SSL Connection Error:**
- If you get "SSL connection is required" error, make sure you're using the `DATABASE_URL` from Supabase
- The application automatically configures SSL for Supabase connections
- For local PostgreSQL, SSL is only enabled in production mode

### Important Notes

- The application uses ES modules (`"type": "module"` in package.json)
- Supabase provides a free tier with generous limits
- The `DATABASE_URL` environment variable takes precedence over individual database parameters
- Make sure your Supabase database is properly configured and accessible
- The `render.yaml` file is provided for automated deployment configuration
- Environment variables are used for configuration to keep sensitive data secure

## Features

- User authentication and session management
- Admin dashboard for course and user management
- Teacher and student portals
- Assignment management system
- PostgreSQL database integration (Supabase compatible) 