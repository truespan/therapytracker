# TheraP Track Backend

Express.js backend API with PostgreSQL database.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Create database:**
   ```bash
   psql -U postgres -c "CREATE DATABASE therapy_tracker;"
   ```

4. **Run schema:**
   ```bash
   psql -U postgres -d therapy_tracker -f database/schema.sql
   ```

5. **Optional - Load sample data:**
   ```bash
   psql -U postgres -d therapy_tracker -f database/seed.sql
   ```

6. **Start server:**
   ```bash
   npm start
   ```

   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

## Environment Variables

Create a `.env` file with:

```
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/therapy_tracker
JWT_SECRET=your_secret_key_here
NODE_ENV=development
```

**Important:** 
- Set `NODE_ENV=production` in production environments
- Payment bypass is ONLY enabled when `NODE_ENV=development` or `NODE_ENV=test`
- In production (`NODE_ENV=production`), Razorpay payment is ALWAYS required for bookings with fees, regardless of whether you use test or live Razorpay keys

## API Endpoints

See main README.md for complete API documentation.

Base URL: `http://localhost:5000/api`

### Test the API

```bash
# Health check
curl http://localhost:5000/api/health

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john.doe@email.com","password":"password123"}'
```

## Database Schema

The database includes:
- `organizations` - Therapy organizations
- `partners` - Therapists
- `users` - Patients/clients
- `auth_credentials` - Authentication data
- `profile_fields` - Assessment fields (default + custom)
- `sessions` - Therapy sessions
- `user_profiles` - User ratings per session
- `user_partner_assignments` - User-therapist relationships

## Project Structure

```
backend/
├── database/
│   ├── schema.sql       # Database schema
│   └── seed.sql         # Sample data
├── src/
│   ├── config/
│   │   └── database.js  # DB connection
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Auth & role checking
│   ├── models/          # Database queries
│   ├── routes/          # API routes
│   └── server.js        # Express app
└── package.json
```

