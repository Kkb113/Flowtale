# Fable API Server

Server-side API for Fable, an interactive demo product platform. This repository contains the backend services that power demo creation, management, analytics, and integrations.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Development](#development)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Third-Party Integrations](#third-party-integrations)
- [Support](#support)
- [License](#license)

## Features

- **Interactive Demo Management**: Create, edit, and manage interactive product demos (tours and screens)
- **Demo Hubs**: Organize multiple demos into customizable demo hubs
- **Analytics & Insights**: Track user engagement, activity logs, and lead analytics
- **Media Processing**: Video transcoding, audio processing, and image resizing
- **Custom Domains**: Support for vanity domains with custom SSL certificates
- **Multi-Tenant Architecture**: Organization-based access control and resource isolation
- **Third-Party Integrations**: Native integrations with HubSpot, Slack, Chargebee, Zapier, and more
- **Subscription Management**: Flexible subscription plans with credit-based billing
- **LLM Operations**: Credit tracking for AI-powered features
- **Dataset Management**: Create and manage reusable datasets for demos
- **API Key Authentication**: Support for programmatic access via API keys
- **Webhook Support**: Event-driven integrations via webhooks

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Applications                       │
│                    (Web App, Mobile, API Clients)               │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Spring Boot API Server                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Controllers  │  │  Services    │  │  Security Layer      │  │
│  │   (REST)     │──│   (Business) │──│  (OAuth2/Auth0)      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└───────────┬─────────────────┬────────────────────┬──────────────┘
            │                 │                    │
            ▼                 ▼                    ▼
  ┌──────────────────┐  ┌──────────────┐  ┌─────────────────┐
  │   MySQL Database │  │  PostgreSQL  │  │   AWS Services  │
  │   (Main Data)    │  │ (Analytics)  │  │  - S3 (Assets)  │
  └──────────────────┘  └──────────────┘  │  - SQS (Queue)  │
                                           │  - Kinesis      │
                                           │  - Amplify      │
                                           └─────────────────┘
```

### Technology Stack

- **Framework**: Spring Boot 3.0.8
- **Language**: Java 17
- **Build Tool**: Maven 3.6+
- **Databases**:
  - MySQL 8+ (Primary data store)
  - PostgreSQL 16 (Analytics data)
- **Authentication**: OAuth2 Resource Server (Auth0)
- **Cloud Services**:
  - AWS S3 (Asset storage)
  - AWS SQS (Message queuing)
  - AWS Kinesis Firehose (Event streaming)
  - AWS Amplify (Deployment of custom domain)
- **Integrations**:
  - Chargebee (Payment & subscription management)
  - HubSpot (CRM integration)
  - Cobalt (Platform integrations vendor)
  - Slack (Notifications)
  - Zapier (Workflow automation)
  - Sentry (Error tracking)

### Key Components

- **API Layer**: RESTful endpoints for all operations (see Routes.java)
- **Security Layer**: OAuth2-based authentication with Auth0 integration
- **Data Layer**: Dual database architecture (MySQL for main data, PostgreSQL for analytics)
- **Service Layer**: Business logic for tours, screens, analytics, subscriptions, etc.
- **Integration Layer**: Connectors for third-party services
- **Media Processing**: Asynchronous media transcoding and processing
- **Queue Processing**: SQS-based background job processing

## Prerequisites

Before you begin, ensure you have the following installed:

- **Java 17** or higher
- **Maven 3.6+**
- **Docker** and **Docker Compose** (>= 1.28.0)
- **MySQL 8+** (or use Docker Compose)
- **PostgreSQL 16** (or use Docker Compose)
- **AWS Account** with access to:
  - S3 (for asset storage)
  - SQS (for message queuing)
  - Kinesis Firehose (for event streaming)
- **Auth0 Account** (for authentication)
- **Chargebee Account** (optional, for payment processing)

### Optional Requirements

- **IntelliJ IDEA** (recommended IDE)
- **Sentry Account** (for error tracking)
- **ngrok** or similar (for local webhook testing)

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/fable-api.git
cd fable-api
```

### 2. Set Up Environment Files

Create environment-specific configuration files. The application supports three environments: `dev`, `staging`, and `prod`.

For local development, create `env.dev`:

```bash
cp env.sample env.dev
```

Edit `env.dev` and fill in your configuration values (see [Configuration](#configuration) section).

### 3. Generate Environment Files for Tools

Generate IDE-compatible environment files: (check Makefile for details)

```bash
# For development
make env dev=1

# For staging
make env staging=1
```

This creates:
- `env.now`: Active environment file used by Makefile
- `env.idea`: IntelliJ IDEA-compatible format (without `export` prefix)

### 4. Start Dependencies with Docker

Start MySQL and PostgreSQL databases:

```bash
make setup
```

This will:
- Start MySQL container on port 3306
- Start PostgreSQL container on port 5432
- Create necessary volumes for data persistence

### 5. Run Database Migrations

Apply database schema migrations:

```bash
make db-schema-migrate
```

This runs Flyway migrations for both:
- API database (MySQL)
- Analytics database (PostgreSQL)

### 6. Build the Application

```bash
make build
```

### 7. Run the Application

```bash
make run
```

The server will start on `http://localhost:8080`.

## Configuration

### Environment Variables

The application requires several environment variables. Create an environment file (`env.dev`, `env.staging`, or `env.prod`) with the following variables:

#### Required Variables

Check env.sample file for details.

#### Optional Variables

```bash
# Sentry (Error Tracking)
export SENTRY_DSN=your-sentry-dsn

# For local development with webhooks
export PUBLIC_ENDPOINT=https://your-ngrok-url.ngrok-free.app
```

### Database Configuration

The application uses two separate databases:

1. **MySQL** (Main Database): Stores core application data (demos, screens, organizations, users, subscriptions)
2. **PostgreSQL** (Analytics Database): Stores analytics events and metrics

Both databases are automatically created when using Docker Compose. For production, you'll need to provision these databases separately.

### Auth0 Configuration

Configure OAuth2 authentication in `src/main/resources/application-{env}.properties`:

```properties
auth0.audiences=backend
spring.security.oauth2.resourceserver.jwt.issuer-uri=https://your-tenant.auth0.com/
```

## Running the Application

Check Makefile for details.

### Available Makefile Commands

| Command | Description |
|---------|-------------|
| `make env dev=1` | Generate environment files for development |
| `make env staging=1` | Generate environment files for staging |
| `make setup` | Start Docker dependencies (MySQL, PostgreSQL) |
| `make teardown` | Stop Docker dependencies |
| `make db-schema-migrate` | Run Flyway database migrations |
| `make build` | Build the application |
| `make run` | Run the application |
| `make gen` | Generate TypeScript API contract definitions |
| `make containerize v=X.X.X` | Build and push Docker image to ECR |
| `make container-run` | Run application in Docker container |
| `make clean-data` | Remove Docker volumes and containers |

## Development

### IDE Setup (IntelliJ IDEA)

1. **Install Prerequisites**:
   - Java 17
   - Maven 3.6+
   - IntelliJ IDEA (Ultimate recommended)

2. **Install Plugins**:
   - **EnvFile Plugin**: Load environment variables from `env.idea`
   - **Lombok Plugin**: Support for Lombok annotations

3. **Import Project**:
   - Open IntelliJ IDEA
   - File → Open → Select `pom.xml`
   - Import as Maven project

4. **Configure Environment**:
   - Generate `env.idea` file: `make env dev=1`
   - Run/Debug Configurations → Edit Configurations
   - Enable EnvFile plugin and point to `env.idea`

5. **Enable Hot Reload**:
   - Settings → Build, Execution, Deployment → Compiler
   - Check "Build project automatically"
   - Settings → Advanced Settings
   - Check "Allow auto-make to start even if developed application is currently running"

### Project Structure

```
api/
├── src/
│   ├── main/
│   │   ├── java/com/sharefable/
│   │   │   ├── Main.java                    # Application entry point
│   │   │   ├── Routes.java                  # Route definitions
│   │   │   ├── ApiDataSourceConfig.java     # MySQL datasource config
│   │   │   ├── AnalyticsDataSourceConfig.java # PostgreSQL datasource config
│   │   │   ├── api/
│   │   │   │   ├── auth/                    # Authentication & authorization
│   │   │   │   ├── common/                  # Common utilities & DTOs
│   │   │   │   ├── config/                  # Application configuration
│   │   │   │   ├── controller/              # REST controllers
│   │   │   │   ├── entity/                  # JPA entities
│   │   │   │   ├── repo/                    # JPA repositories
│   │   │   │   ├── service/                 # Business logic
│   │   │   │   └── transport/               # API request/response models
│   │   │   └── analytics/                   # Analytics module
│   │   │       ├── controller/
│   │   │       ├── entity/
│   │   │       ├── repo/
│   │   │       └── transport/
│   │   └── resources/
│   │       ├── application.properties       # Base configuration
│   │       ├── application-dev.properties   # Dev environment config
│   │       ├── application-staging.properties
│   │       └── application-prod.properties
│   └── test/                                # Test files
├── schema/
│   ├── api/                                 # MySQL migration scripts
│   └── analytics/                           # PostgreSQL migration scripts
├── dev/
│   └── *.http                               # HTTP request examples
├── docker-compose.yml                       # Docker services definition
├── Dockerfile                               # Container build definition
├── Makefile                                 # Build & deployment commands
└── pom.xml                                  # Maven dependencies
```

### TypeScript API Contract Generation

The project automatically generates TypeScript definitions for API contracts:

```bash
make gen
```

This generates `gen/api-contract.d.ts` from Java transport objects annotated with `@GenerateTSDef`. Make sure app and
api project roots are in the same directory, then this command will copy the generated contract in app as well.

### Testing with HTTP Files

Use IntelliJ IDEA's HTTP Client with the provided `.http` files in the `dev/` directory:

```
dev/
├── tours.http
├── screens.http
├── analytics.http
└── ...
```

These files contain example API requests you can execute directly from IntelliJ.

## API Documentation

### Authentication

The API uses OAuth2 Bearer token authentication. Most endpoints require a valid JWT token from Auth0.

#### Authenticated Requests

Include the Authorization header:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:8080/f/org
```

#### API Key Authentication

Some endpoints support API key authentication:

```bash
curl -H "X-API-Key: YOUR_API_KEY" \
     http://localhost:8080/via/ak/tours
```

### API Versioning

The API uses version prefixes in the URL:

- `/v1/*` - Version 1 endpoints (current)

### Core Endpoints

#### Public Endpoints (No Authentication)

- `GET /health` - Health check
- `GET /tour` - Get tour configuration
- `GET /screen` - Get screen configuration
- `GET /dh` - Get demo hub configuration
- `POST /new/log` - Log user events

#### Authenticated Endpoints

All authenticated endpoints are prefixed with `/f/`:

**Organization Management**
- `GET /f/org` - Get current organization
- `POST /f/neworg` - Create new organization
- `PUT /f/updtorgprops` - Update organization properties

**Tour Management**
- `GET /f/tours` - List all tours
- `POST /f/newtour` - Create new tour
- `PUT /f/updtrprop` - Update tour properties
- `DELETE /f/deltour` - Delete tour
- `POST /f/tpub` - Publish tour
- `POST /f/duptour` - Duplicate tour

**Screen Management**
- `GET /f/screens` - List all screens
- `POST /f/newscreen` - Create new screen
- `PUT /f/updatescreenproperty` - Update screen properties
- `POST /f/copyscreen` - Copy screen

**Demo Hub Management**
- `GET /f/dhs` - List all demo hubs
- `POST /f/demohub` - Create demo hub
- `PUT /f/updtdhprops` - Update demo hub properties
- `POST /f/pubdh` - Publish demo hub
- `DELETE /f/deldh` - Delete demo hub

**Analytics**
- `GET /f/entity_metrics` - Get entity metrics
- `GET /f/leads` - Get leads
- `GET /f/entity_metrics_daily` - Get daily metrics
- `GET /f/activity_data/{entityRid}/{aid}` - Get activity details

**Media Processing**
- `POST /f/vdt` - Transcode video
- `POST /f/audt` - Transcode audio
- `POST /f/rzeimg` - Resize image

**Subscriptions**
- `GET /f/subs` - Get subscription details
- `POST /f/checkout` - Create checkout session
- `POST /f/genchckouturl` - Generate checkout URL

For detailed API documentation, refer to the HTTP request files in `dev/*.http`.

## Deployment

### Building for Production

```bash
make containerize v=X.X.X
```

This creates a JAR file in `target/api-{version}.jar` and upload to ECR, you can then deploy the image to ECS.

### AWS ECR Deployment

1. **Create ECR Repository** (one-time setup):

```bash
cd infra
terraform init
terraform workspace select staging  # or prod
terraform apply
```

2. **Build and Push to ECR**:

```bash
make containerize v=1.0.0
```

This will:
- Build the Docker image
- Tag it with the ECR repository URL
- Authenticate with ECR
- Push the image to ECR

3. **Deploy to AWS**:

Update your ECS deployment to use the new image version.

### Environment-Specific Deployment

- **Development**: Local machine or development server
- **Staging**: AWS staging environment
- **Production**: AWS production environment with high availability

Each environment uses its own:
- Database instances
- S3 buckets
- Auth0 tenant
- Environment variables

## Third-Party Integrations

### Supported Integrations

1. **Chargebee** - Subscription and payment management
   - Configure: `CB_SITE_NAME`, `CB_API_KEY`
   - Webhook: `POST /wh/cb`

2. **HubSpot** - CRM integration
   - Configure: `HUBSPOT_CLIENT_SECRET`
   - Endpoints: `/vr/hs/*`

3. **Cobalt** - Platform integration framework
   - Configure: `COBALT_API_KEY`
   - Endpoints: `/vr/ct/*`

4. **Slack** - Team notifications
   - Managed via tenant integrations
   - Configure through API: `POST /f/tenant_integration`

5. **Zapier** - Workflow automation
   - Webhook registration: `POST /vr/zp/reghook`
   - Webhook unregistration: `POST /vr/zp/unreghook`
   - Sample data: `GET /vr/zp/sample_data`

6. **AppSumo** - Partner integration
   - Webhook: `POST /vr/as/whk`
   - Redirect: `GET /vr/as/redir`

7. **Sentry** - Error tracking and monitoring
   - Configure: `SENTRY_DSN`

## Support

If you encounter any issues or have questions:

- **Issues**: [Open an issue on GitHub](https://github.com/your-org/fable-api/issues)

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

---

**Note**: This is the server-side API component of Fable. For the frontend application, see the [fable-app repository](https://github.com/sharefable/app).
