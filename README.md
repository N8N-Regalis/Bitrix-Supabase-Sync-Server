# Bitrix24 to Supabase Sync Service

A production-ready synchronization service that downloads CRM data from Bitrix24 Cloud and stores it in Supabase. This service serves as the data warehouse foundation for CRM analytics.

## Architecture

```
Bitrix24 Cloud
      ↓
Node.js Sync Service
      ↓
Supabase (PostgreSQL)
      ↓
React Dashboard (Future Phase)
```

## Tech Stack

- **Node.js** - Runtime environment
- **Express** - Web framework
- **Axios** - HTTP client for Bitrix24 API
- **@supabase/supabase-js** - Supabase client
- **dotenv** - Environment variable management
- **node-cron** - Task scheduling
- **Winston** - Logging

## Features

- **Automatic Pagination**: Handles Bitrix24 pagination automatically to retrieve all deals
- **Data Normalization**: Transforms Bitrix24 data to match database schema
- **Upsert Operations**: Prevents duplicate records, only updates changed data
- **Error Handling**: Retry logic for failed requests, rate limiting handling
- **Scheduled Sync**: Configurable cron-based synchronization (default: every 15 minutes)
- **Comprehensive Logging**: Winston-based logging with file rotation
- **REST API**: Manual sync triggers and health check endpoints
- **Graceful Shutdown**: Proper cleanup on termination signals

## Project Structure

```
sync-service/
├── src/
│   ├── config/
│   │   ├── bitrix.js          # Bitrix24 API configuration
│   │   └── supabase.js        # Supabase client configuration
│   ├── services/
│   │   ├── dealService.js     # Deal sync business logic
│   │   ├── contactService.js  # (Future) Contact sync
│   │   ├── companyService.js  # (Future) Company sync
│   │   └── userService.js     # (Future) User sync
│   ├── repositories/
│   │   └── dealRepository.js  # Deal database operations
│   ├── routes/
│   │   └── syncRoutes.js      # REST API endpoints
│   ├── jobs/
│   │   └── scheduler.js       # Cron job scheduler
│   ├── utils/
│   │   └── logger.js          # Winston logger configuration
│   ├── app.js                 # Express app configuration
│   └── server.js              # Server entry point
├── migrations/
│   └── 001_create_deals_table.sql  # Database migration
├── package.json
├── .env.example
└── README.md
```

## Installation

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn
- Supabase account
- Bitrix24 account with webhook access

### Steps

1. **Clone or navigate to the project directory**
   ```bash
   cd "d:/Regalis Files/Bitrix Supabase Server"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` with your actual values (see Configuration section).

## Creating Supabase Project

### Step 1: Create a New Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Choose a name (e.g., "bitrix-crm-analytics")
5. Choose a database password (save it securely)
6. Select a region closest to your users
7. Click "Create new project"
8. Wait for the project to be provisioned (2-3 minutes)

### Step 2: Get Credentials

1. Navigate to your project dashboard
2. Go to **Settings** → **API**
3. Copy the following values:
   - **Project URL** (SUPABASE_URL)
   - **service_role** key (SUPABASE_SERVICE_ROLE_KEY)
   - **anon** key (not used in this service, but note it for future)

### Step 3: Run Migrations

1. Navigate to the **SQL Editor** in your Supabase dashboard
2. Click "New Query"
3. Copy the contents of `migrations/001_create_deals_table.sql`
4. Paste into the SQL Editor
5. Click "Run" to execute the migration
6. Verify the `deals` table was created in the **Table Editor**

### Step 4: Configure Row Level Security (Optional)

For production, you may want to enable RLS. Since this service uses the service role key, it bypasses RLS. If you plan to query from a client application:

```sql
-- Enable RLS
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

-- Create a policy for read access (adjust as needed)
CREATE POLICY "Allow read access" ON deals
  FOR SELECT
  TO authenticated
  USING (true);
```

## Configuration

Create a `.env` file in the project root with the following variables:

```env
# Bitrix24 Configuration
BITRIX_WEBHOOK_URL=https://your-bitrix24-domain.bitrix24.com/rest/1/your-webhook-code/

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Server Configuration
PORT=3000

# Scheduler Configuration
# Set to 'false' to disable automatic synchronization
ENABLE_SCHEDULER=true
# Cron expression for sync schedule (default: every 15 minutes)
SYNC_SCHEDULE=*/15 * * * *
```

### Getting Bitrix24 Webhook URL

1. Log in to your Bitrix24 account
2. Go to **CRM** → **Settings** → **Other** → **Inbound Webhook**
3. Click "Add Webhook"
4. Select "CRM" as the module
5. Select the entities you want to sync (at minimum: "Deal")
6. Copy the generated webhook URL
7. The URL format is: `https://your-domain.bitrix24.com/rest/1/your-webhook-code/`

### Cron Schedule Examples

- Every 15 minutes: `*/15 * * * *` (default)
- Every hour: `0 * * * *`
- Every 6 hours: `0 */6 * * *`
- Daily at midnight: `0 0 * * *`
- Every Monday at 9 AM: `0 9 * * 1`

## Running the Service

### Development Mode

```bash
npm start
```

The service will start on port 3000 (or the port specified in `.env`).

### Production Mode

Set the `NODE_ENV` environment variable:

```bash
NODE_ENV=production npm start
```

### Using PM2 (Recommended for Production)

1. Install PM2 globally:
   ```bash
   npm install -g pm2
   ```

2. Start the service:
   ```bash
   pm2 start src/server.js --name bitrix-sync
   ```

3. View logs:
   ```bash
   pm2 logs bitrix-sync
   ```

4. Monitor status:
   ```bash
   pm2 status
   ```

5. Restart the service:
   ```bash
   pm2 restart bitrix-sync
   ```

6. Save PM2 configuration:
   ```bash
   pm2 save
   pm2 startup
   ```

## API Endpoints

### GET /

Returns service status and version information.

**Response:**
```json
{
  "service": "Bitrix24 to Supabase Sync Service",
  "version": "1.0.0",
  "status": "running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### GET /health

Returns health check status including sync information.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "sync": {
    "total_deals": 150,
    "last_updated": "2024-01-01T00:00:00.000Z",
    "bitrix_webhook_url": "https://your-domain.bitrix24.com/rest/1/..."
  }
}
```

### POST /sync/deals

Triggers manual deal synchronization.

**Response (Success):**
```json
{
  "success": true,
  "message": "Deal synchronization completed successfully",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "duration": "5234ms",
  "stats": {
    "downloaded": 150,
    "inserted": 150,
    "updated": 0,
    "errors": 0
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Deal synchronization failed",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "duration": "1234ms",
  "error": "Error message here"
}
```

### GET /sync/status

Returns current synchronization status.

**Response:**
```json
{
  "success": true,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "status": {
    "total_deals": 150,
    "last_updated": "2024-01-01T00:00:00.000Z",
    "bitrix_webhook_url": "https://your-domain.bitrix24.com/rest/1/..."
  }
}
```

## Database Schema

### deals Table

| Column | Type | Description |
|--------|------|-------------|
| deal_id | INTEGER | Primary key from Bitrix24 |
| title | VARCHAR(500) | Deal title |
| stage_id | VARCHAR(50) | Deal stage ID |
| category_id | INTEGER | Deal category ID |
| assigned_by_id | INTEGER | Assigned user ID |
| company_id | INTEGER | Associated company ID |
| contact_id | INTEGER | Primary contact ID |
| opportunity | NUMERIC(18,2) | Deal monetary value |
| currency_id | VARCHAR(10) | Currency code |
| created_at | TIMESTAMP | Creation timestamp from Bitrix24 |
| updated_at | TIMESTAMP | Last update timestamp from Bitrix24 |
| closed_at | TIMESTAMP | Closing timestamp |
| is_closed | BOOLEAN | Whether deal is closed |
| is_won | BOOLEAN | Whether deal was won |
| raw_json | JSONB | Complete raw data from Bitrix24 |
| created_on_sync | TIMESTAMP | First sync timestamp |
| updated_on_sync | TIMESTAMP | Last sync timestamp |

### Indexes

- `idx_deals_stage_id` - For filtering by stage
- `idx_deals_assigned_by_id` - For filtering by assigned user
- `idx_deals_created_at` - For time-based queries
- `idx_deals_updated_at` - For time-based queries
- `idx_deals_company_id` - For company relationships
- `idx_deals_contact_id` - For contact relationships
- `idx_deals_category_id` - For category filtering
- `idx_deals_is_closed` - For status filtering
- `idx_deals_is_won` - For won deal filtering
- `idx_deals_raw_json` - GIN index for JSON queries

## Logging

Logs are stored in the `logs/` directory:

- `combined.log` - All log entries
- `error.log` - Error-level logs only

Log files are rotated automatically when they reach 5MB, keeping up to 5 files per log type.

### Log Levels

- `error` - Errors that need attention
- `warn` - Warning messages
- `info` - General information (sync start/complete)
- `debug` - Detailed debugging information

Set the log level via environment variable:
```env
LOG_LEVEL=info
```

## Error Handling

The service implements comprehensive error handling:

1. **Bitrix API Retries**: Failed requests are retried up to 3 times with exponential backoff
2. **Rate Limiting**: Small delays between API calls to avoid rate limits
3. **Batch Failures**: If a batch upsert fails, individual records are attempted
4. **Graceful Continuation**: Errors during pagination don't stop the entire sync
5. **Logging**: All errors are logged with context for debugging

## Deployment

### Deploy to VPS (e.g., DigitalOcean, AWS EC2)

1. **Set up the server**
   ```bash
   # SSH into your server
   ssh user@your-server-ip
   
   # Install Node.js (if not installed)
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2
   sudo npm install -g pm2
   ```

2. **Deploy the code**
   ```bash
   # Clone or upload your project
   git clone <your-repo-url> /var/www/bitrix-sync
   cd /var/www/bitrix-sync
   
   # Install dependencies
   npm install --production
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   nano .env
   # Add your production values
   ```

4. **Start the service**
   ```bash
   pm2 start src/server.js --name bitrix-sync
   pm2 save
   pm2 startup
   ```

5. **Set up reverse proxy (optional but recommended)**
   
   Using Nginx:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Deploy to Docker (Optional)

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "src/server.js"]
```

Build and run:
```bash
docker build -t bitrix-sync .
docker run -d -p 3000:3000 --env-file .env bitrix-sync
```

## Troubleshooting

### Service won't start

- Check that all environment variables are set in `.env`
- Verify Node.js version is 18.0.0 or higher: `node --version`
- Check logs in `logs/error.log`

### Supabase connection fails

- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct
- Ensure the migration has been run in Supabase SQL Editor
- Check that the deals table exists in Supabase Table Editor

### Bitrix24 API errors

- Verify `BITRIX_WEBHOOK_URL` is correct and accessible
- Check that the webhook has proper permissions for CRM entities
- Review Bitrix24 API rate limits (typically 50 requests per second)
- Check logs for specific error messages

### Scheduler not running

- Verify `ENABLE_SCHEDULER=true` in `.env`
- Check that the cron expression is valid
- Review logs for scheduler startup messages

### Sync is slow

- Large datasets will take longer to sync
- Check network latency to Bitrix24 and Supabase
- Consider reducing batch size in `dealService.js` if needed
- Monitor logs for progress during sync

## Future Enhancements

This is Phase 1 of the CRM Analytics platform. Planned future features:

- **Contact Synchronization**: Sync contacts from Bitrix24
- **Company Synchronization**: Sync companies from Bitrix24
- **User Synchronization**: Sync users from Bitrix24
- **Incremental Sync**: Only sync changed records since last sync
- **Webhook Triggers**: Real-time sync when data changes in Bitrix24
- **Data Validation**: Validate data integrity before storage
- **Metrics Dashboard**: API endpoints for analytics metrics
- **Retry Queue**: Persistent queue for failed sync operations

## Support

For issues or questions:

1. Check the logs in `logs/` directory
2. Review this README's troubleshooting section
3. Verify all configuration values are correct
4. Test API endpoints manually using curl or Postman

## License

MIT

## Version

1.0.0 - Initial release with Deal synchronization
