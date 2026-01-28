# @socialgouv/matomo-postgres

![header](./header.png)

A robust Node.js/TypeScript ETL (Extract, Transform, Load) tool that synchronizes visitor analytics data from Matomo (formerly Piwik) into a PostgreSQL database. Designed for organizations that need to centralize their web analytics data for advanced analysis, reporting, or integration with other systems.

## ✨ Features

- **🔄 Incremental Synchronization** - Smart date range detection with automatic resume capability
- **📊 Complete Data Extraction** - Captures visitor sessions, events, custom dimensions, and device information
- **🗄️ Automatic Schema Management** - Kysely-based migrations with performance optimizations
- **⚡ High Performance** - Controlled concurrency, pagination, and weekly table partitioning
- **🛡️ Type Safety** - Full TypeScript implementation with comprehensive type definitions
- **🔍 Detailed Logging** - Progress tracking and debug information for monitoring
- **📱 Device Analytics** - Screen resolution, device model, and operating system data
- **🌍 Geographic Data** - Country, region, and city information from visitor sessions

## 🚀 Quick Start

### Global Installation

```bash
npx @socialgouv/matomo-postgres
```

### Local Installation

```bash
npm install @socialgouv/matomo-postgres
# or
pnpm add @socialgouv/matomo-postgres
```

## ⚙️ Configuration

### Required Environment Variables

| Variable      | Description                          | Example                               |
| ------------- | ------------------------------------ | ------------------------------------- |
| `MATOMO_KEY`  | Matomo API authentication token      | `your_api_token_here`                 |
| `MATOMO_SITE` | Numeric site ID in Matomo            | `1`                                   |
| `MATOMO_URL`  | Base URL of your Matomo installation | `https://analytics.example.com/`      |
| `PGDATABASE`  | PostgreSQL connection string         | `postgresql://user:pass@host:5432/db` |

### Optional Environment Variables

| Variable                        | Default              | Description                                                         |
| ------------------------------- | -------------------- | ------------------------------------------------------------------- |
| `DESTINATION_TABLE`             | `matomo`             | Selects which table to write to (normal or partitioned)             |
| `MATOMO_TABLE_NAME`             | `matomo`             | Name for the standard table                                         |
| `PARTITIONED_MATOMO_TABLE_NAME` | `matomo_partitioned` | Name for the partitioned table                                      |
| `STARTDATE`                     | Auto-detected        | Override start date for initial import (YYYY-MM-DD)                 |
| `FORCE_STARTDATE`               | `false`              | When `true`, skip database lookup and use STARTDATE unconditionally |
| `RESULTPERPAGE`                 | `500`                | API pagination size (max results per request)                       |
| `INITIAL_OFFSET`                | `3`                  | Days to look back on first run                                      |

## 🗂️ Table Architecture

The tool implements a dual table system to optimize performance for different use cases:

### Standard vs Partitioned Tables

The application creates both a **standard table** and a **partitioned table**:

- **Standard Table** (`MATOMO_TABLE_NAME`): Traditional PostgreSQL table, suitable for smaller datasets or simpler deployments
- **Partitioned Table** (`PARTITIONED_MATOMO_TABLE_NAME`): Weekly partitioned table optimized for large datasets and improved query performance

### Table Selection

Use the `DESTINATION_TABLE` environment variable to specify which table receives the imported data:

```bash
# Write to standard table
export DESTINATION_TABLE=matomo

# Write to partitioned table
export DESTINATION_TABLE=matomo_partitioned

# Write to custom table name
export DESTINATION_TABLE=my_custom_analytics_table
```

### When to Use Partitioned Tables

Consider using partitioned tables when:

- **Large Data Volumes**: Importing months or years of analytics data
- **Query Performance**: Need faster queries on specific date ranges
- **Maintenance Operations**: Easier to manage large datasets with partition pruning
- **Storage Optimization**: Better compression and maintenance of historical data

Both tables share the same schema structure, ensuring compatibility regardless of your choice.

### Forcing Start Date Override

When you need to temporarily override the automatic date detection (e.g., to re-import specific data or recover from errors):

```bash
export FORCE_STARTDATE=true
export STARTDATE=2024-01-01
```

This configuration will:
- Skip checking the database for the last event
- Use the specified `STARTDATE` unconditionally
- Useful for one-time re-imports or data recovery scenarios

**Important:** Remember to unset `FORCE_STARTDATE` after your one-time import to restore normal automatic detection behavior.

**Cronjob Example:**

```bash
# Temporarily add to your cronjob environment variables:
FORCE_STARTDATE=true
STARTDATE=2024-10-15
MATOMO_URL=https://analytics.example.com/
MATOMO_SITE=1
MATOMO_KEY=your_api_token
PGDATABASE=postgresql://user:pass@host:5432/db

# After import completes, remove FORCE_STARTDATE to resume normal operation
```

## 🏗️ Architecture

The tool follows a systematic ETL process:

1. **📅 Date Range Detection** - Determines import range based on last sync or configuration
2. **📥 Data Extraction** - Fetches visitor data from Matomo's `Live.getLastVisitsDetails` API
3. **🔄 Data Transformation** - Converts visits into structured events with proper typing
4. **💾 Data Loading** - Inserts events into PostgreSQL with conflict resolution
5. **📈 Progress Tracking** - Provides detailed logging and resumable operations

### Database Schema

The tool creates a comprehensive table structure capturing:

- **Visitor Information**: IDs, geographic location, device details
- **Session Metrics**: Duration, visit count, visitor type
- **Event Data**: Actions, categories, values, timestamps (UTC)
- **Custom Dimensions**: Flexible JSON fields for custom tracking
- **Performance Data**: Screen resolution, time spent per action

## 🛠️ Development

### Local Setup

1. **Start PostgreSQL**:

   ```bash
   docker-compose up
   ```

2. **Set Environment Variables**:

   ```bash
   export MATOMO_URL=https://your-matomo-instance/
   export MATOMO_SITE=your_site_id
   export MATOMO_KEY=your_api_token
   export PGDATABASE=postgres://postgres:postgres@127.0.0.1:5455/postgres
   ```

3. **Run the Application**:

   ```bash
   pnpm start
   ```

### Development Commands

```bash
# Build TypeScript
pnpm build

# Run tests
pnpm test

# Update test snapshots
pnpm test -u

# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Run database migrations
pnpm migrate
```

## 🗄️ Database Migrations

Database schema is managed through Kysely migrations located in `./src/migrations/`:

Migrations run automatically on each `pnpm start` to ensure schema compatibility.

## 📊 Data Flow

1. **Initialization** - Determine import date range based on:
   - Explicit date parameter
   - Last event timestamp in database
   - `STARTDATE` environment variable
   - Default offset from current date

2. **Sequential Processing** - For each date:
   - Check existing records for pagination offset
   - Fetch visitor data in paginated chunks
   - Transform visits into individual events
   - Insert with conflict resolution

3. **Concurrency Control**:
   - Sequential date processing (one day at a time)
   - Parallel event insertion (configurable)
   - Automatic pagination for large datasets

## 🐛 Troubleshooting

### Common Issues

**API Authentication Errors**

- Verify `MATOMO_KEY` has sufficient permissions
- Ensure `MATOMO_SITE` ID is correct
- Check `MATOMO_URL` includes trailing slash

**Database Connection Issues**

- Verify PostgreSQL is running and accessible
- Check `PGDATABASE` connection string format
- Ensure database exists and user has write permissions

**Performance Issues**

- Adjust `RESULTPERPAGE` for optimal API performance
- Monitor database indexes and partitioning
- Consider running during off-peak hours for large imports

### Debug Mode

Enable detailed logging:

```bash
DEBUG=matomo-postgres* npx @socialgouv/matomo-postgres
```
