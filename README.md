# Notification Service

A robust, multi-tenant notification microservice built with Node.js, Express, MongoDB, and BullMQ. Designed for high scalability and reliable message delivery across multiple channels.

## 🚀 Overview

The Notification Service acts as a centralized hub for dispatching events to users via different channels (Email, SMS, Push, etc.). It supports:

- **Multi-tenancy**: Isolated configurations for different tenants.
- **Dynamic Workflows**: Trigger-based notification routing.
- **Tiered Integrations**: Flexible channel configuration (Global vs. Tenant-specific).
- **Rate Limiting & Security**: API key-based authentication with scope management and IP allowlisting.
- **Asynchronous Processing**: Reliable delivery using Redis-backed job queues.

## 📚 Documentation

Detailed documentation is available in the `docs/` directory:

- [**System Architecture**](./docs/architecture.md): Technical design, data flow, and diagrams.
- [**API Reference**](./docs/api-reference.md): Detailed endpoint specifications and payload examples.
- [**Authentication Guide**](./docs/authentication.md): API Key management, scopes, and security.
- [**Getting Started**](./docs/getting-started.md): Installation and local development guide.

## 🛠️ Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Queue**: BullMQ (Powered by Redis)
- **Templating**: EJS (for Admin/Tenant Portals)
- **Logging**: Bunyan / Pino (via custom logger)

## 🚦 Quick Links

- [Admin Portal](http://localhost:3000/admin)
- [Health Check](http://localhost:3000/health)
