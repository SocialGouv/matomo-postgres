# Matomo PostgreSQL ETL Tool - Context Documentation

## Project Overview

**@socialgouv/matomo-postgres** is a Node.js/TypeScript ETL (Extract, Transform, Load) tool that synchronizes visitor analytics data from Matomo (formerly Piwik) into a PostgreSQL database. This tool is designed for organizations that need to centralize their web analytics data for further analysis, reporting, or integration with other systems.

### Core Functionality

- Extracts visitor events and session data from Matomo's `Live.getLastVisitsDetails` API
- Transforms the data into a structured format suitable for PostgreSQL storage
- Loads the data into a configurable PostgreSQL table with automatic schema management
- Supports incremental data synchronization with intelligent date range detection
- Handles pagination for large datasets and provides resumable imports

## Technical Stack

### Core Technologies

- **Runtime**: Node.js with TypeScript (ES modules)
- **Database ORM**: Kysely (type-safe SQL query builder)
- **Database**: PostgreSQL with timezone-aware timestamps
- **HTTP Client**: Custom implementation using Node.js built-in `http`/`https` modules
- **Date Handling**: `date-fns` library for robust date operations
- **Concurrency**: `p-all` for controlled parallel processing

### Development Tools

- **Testing**: Jest with snapshot testing
- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier
- **Build**: TypeScript compiler
- **Development Environment**: Docker Compose for local PostgreSQL

## Environment Configuration

### Required Environment Variables

```bash
MATOMO_KEY=your_matomo_api_token          # Matomo API authentication token
MATOMO_SITE=your_site_id                  # Numeric site ID in Matomo
MATOMO_URL=https://your-matomo-instance/  # Base URL of your Matomo installation
PGDATABASE=postgresql://connection_string # PostgreSQL connection string
```

### Optional Environment Variables

```bash
DESTINATION_TABLE=matomo                  # Target table name (default: 'matomo')
STARTDATE=2023-01-01                     # Override start date for initial import
RESULTPERPAGE=500                        # API pagination size (default: 500)
INITIAL_OFFSET=3                         # Days to look back on first run (default: 3)
```

## Code Architecture

### File Organization

```txt
src/
├── index.ts              # Main entry point and orchestration logic
├── config.ts             # Environment variable configuration
├── db.ts                 # Database connection and Kysely setup
├── PiwikClient.ts        # Custom Matomo API client
├── importDate.ts         # Date-based import coordination
├── importEvent.ts        # Individual event processing and insertion
├── migrate-latest.ts     # Database migration runner
├── migrate-down.ts       # Migration rollback utility
├── migrations/           # Kysely database migrations
│   ├── 20230301-01-initial.ts
│   ├── 20230301-02-indexes.ts
│   ├── 20250425-01-add-resolution.ts
│   ├── 20250715-01-weekly-partitioning.ts
│   └── 20250908-01-convention-analysis-index.ts
└── __tests__/           # Jest test files with snapshots
```

### Data Flow

1. **Initialization**: Determine import date range based on priority:
   - Explicit date parameter
   - Last event timestamp in database
   - `STARTDATE` environment variable
   - Default offset from current date

2. **Date Processing**: For each date in range:
   - Check existing records to determine pagination offset
   - Fetch visitor data from Matomo API in paginated chunks
   - Transform visits into individual events
   - Insert events into PostgreSQL with conflict resolution

3. **Concurrency Control**:
   - Sequential date processing (one day at a time)
   - Parallel event insertion (configurable concurrency)
   - Automatic pagination handling for large datasets

### Key Classes and Functions

#### `PiwikClient` Class

- Custom HTTP client for Matomo API communication
- Handles both HTTP and HTTPS protocols
- Implements POST-based authentication (token in request body)
- Provides promise-based API with error handling

#### `run()` Function (Main Entry Point)

- Orchestrates the entire import process
- Implements intelligent date range detection
- Provides detailed console logging for monitoring
- Returns summary statistics of imported data

#### `importDate()` Function

- Handles data import for a specific date
- Implements pagination and offset management
- Recursively processes all pages for a given date
- Filters and validates events before insertion

## Database Schema

### Primary Table Structure (`matomo` table)

The tool creates a comprehensive table capturing visitor sessions and individual actions:

#### Visitor/Session Columns

- `idsite`, `idvisit`, `visitorid` - Matomo identifiers
- `country`, `region`, `city` - Geographic information
- `operatingsystemname`, `devicemodel`, `devicebrand` - Device details
- `visitduration`, `dayssincefirstvisit`, `visitortype` - Session metrics
- `userid` - Custom user identifier (if available)
- `resolution` - Screen resolution

#### Action/Event Columns

- `action_id` - Unique action identifier (primary key)
- `action_type` - Type of action (pageview, event, etc.)
- `action_eventcategory`, `action_eventaction`, `action_eventname` - Event taxonomy
- `action_eventvalue` - Numeric event value
- `action_timespent` - Time spent on action
- `action_timestamp` - Timezone-aware timestamp (UTC)
- `action_url`, `action_title` - Page information

#### Custom Dimensions

- `dimension1` through `dimension10` - Custom dimension values
- `usercustomproperties`, `usercustomdimensions` - JSON fields for flexible data

#### Migration Strategy

- Uses Kysely migrations for schema evolution
- Automatic migration execution on startup
- Supports both forward and rollback migrations
- Includes performance optimizations (indexes, partitioning)

## API Integration Patterns

### Matomo API Usage

- **Endpoint**: `Live.getLastVisitsDetails`
- **Authentication**: Token-based (POST body for security)
- **Pagination**: `filter_limit` and `filter_offset` parameters
- **Date Filtering**: ISO date format (`YYYY-MM-DD`)
- **Sorting**: Ascending by timestamp for consistent processing

### Error Handling

- API errors are captured and logged
- Network timeouts and connection issues are handled gracefully
- Invalid JSON responses trigger appropriate error callbacks
- Database constraint violations are managed with upsert patterns

### Rate Limiting Considerations

- Sequential date processing prevents API overload
- Configurable page size (`RESULTPERPAGE`) for API calls
- Built-in retry logic through recursive pagination

## Development Workflow

### Local Development Setup

```bash
# Start local PostgreSQL
docker-compose up

# Set environment variables
export MATOMO_URL=https://your-matomo-instance/
export MATOMO_SITE=your_site_id
export MATOMO_KEY=your_api_token
export PGDATABASE=postgres://postgres:postgres@127.0.0.1:5455/postgres

# Run the application
pnpm start
```

### Testing Strategy

- **Unit Tests**: Jest-based testing with TypeScript support
- **Snapshot Testing**: Captures expected data transformations
- **Integration Tests**: Tests against sample Matomo API responses
- **Test Data**: `src/__tests__/visit.json` contains realistic test data

### Build and Deployment

- **Build**: `pnpm build` compiles TypeScript to `dist/`
- **CLI Usage**: `npx @socialgouv/matomo-postgres` for global installation
- **Migration**: Automatic on startup via `pnpm migrate`

## Key Patterns & Conventions

### Code Style

- **ES Modules**: Uses `import`/`export` syntax throughout
- **TypeScript**: Strict typing with comprehensive type definitions
- **Async/Await**: Consistent promise handling patterns
- **Functional Programming**: Preference for pure functions and immutable operations

### Error Handling

- **Graceful Degradation**: Continues processing on individual record failures
- **Detailed Logging**: Console output with progress indicators and debug information
- **Debug Module**: Uses `debug` package for detailed troubleshooting

### Data Integrity

- **Unique Constraints**: `action_id` serves as natural primary key
- **Timezone Handling**: All timestamps stored as UTC with timezone awareness
- **Conflict Resolution**: Upsert patterns prevent duplicate data insertion

### Performance Optimizations

- **Controlled Concurrency**: Limits parallel operations to prevent resource exhaustion
- **Pagination**: Processes large datasets in manageable chunks
- **Incremental Sync**: Only processes new data based on last import timestamp
