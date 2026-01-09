# Getting Started

Follow this guide to get the Notification Service up and running in your local development environment.

## 📋 Prerequisites

- **Node.js**: v18 or higher
- **MongoDB**: v5.0 or higher
- **Redis**: v6.0 or higher (for BullMQ)

## ⚙️ Installation

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd NotificationService
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory based on the following template:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/notification-service
   REDIS_HOST=localhost
   REDIS_PORT=6379
   SESSION_SECRET=your-secret-key
   NODE_ENV=development
   ```

## 🚀 Running the Service

The service consists of two parts: the API server and the Worker process.

1. **Start the API Server**:

   ```bash
   npm start
   ```

2. **Start the Worker Process** (in a separate terminal):
   ```bash
   npm run worker
   ```

## 🧪 Quick Test

To verify everything is working, trigger a test notification using cURL:

```bash
curl -X POST http://localhost:3000/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key_here" \
  -d '{
    "event": "test.event",
    "user": { "email": "test@example.com" },
    "data": { "message": "Hello World!" }
  }'
```

Refer to the [API Reference](./api-reference.md) for more details.
