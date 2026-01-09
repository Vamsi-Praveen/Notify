# API Reference

The Notification Service provides a RESTful API for triggering notifications and managing user inboxes.

## 📍 Base URL

```bash
http://localhost:3000/api/v1
```

## 🔐 Authentication

All API requests MUST include the `x-api-key` header.

| Header      | Description         | Required |
| :---------- | :------------------ | :------- |
| `x-api-key` | Your tenant API Key | Yes      |

---

## 🚀 Dispatch Notification

Trigger a notification workflow by sending an event.

### `POST /notify`

**Scope required**: `event:write`

#### Request Body

| Field   | Type   | Description                                                                         |
| :------ | :----- | :---------------------------------------------------------------------------------- |
| `event` | String | Unique identifier for the trigger (e.g., `user.signup`)                             |
| `user`  | Object | Target user details (must include channel-specific fields like `email` or `mobile`) |
| `data`  | Object | Dynamic variables required by the template (can include `attachments` array)        |

#### Example Request

```json
{
  "event": "order.shipped",
  "user": {
    "id": "user_123",
    "email": "customer@example.com",
    "name": "John Doe"
  },
  "data": {
    "orderId": "ORD-789",
    "trackingUrl": "https://ship.it/ORD-789",
    "attachments": [
      {
        "filename": "invoice.pdf",
        "path": "https://minio.example.com/files/invoice.pdf"
      }
    ]
  }
}
```

#### Response Scopes & status Codes

| Status                  | Description                               |
| :---------------------- | :---------------------------------------- |
| `202 Accepted`          | Event received and queued for processing. |
| `400 Bad Request`       | Validation failed (missing fields).       |
| `401 Unauthorized`      | Missing or invalid API Key.               |
| `403 Forbidden`         | Insufficient scope or IP denied.          |
| `429 Too Many Requests` | Rate limit exceeded.                      |

---

## 📂 File Management

Upload files to use as attachments in notifications.

### `POST /files/upload`

**Scope required**: `files:upload`

#### Request Body

**Content-Type**: `multipart/form-data`

| Field  | Type | Description        |
| :----- | :--- | :----------------- |
| `file` | File | The file to upload |

#### Example Response

```json
{
  "success": true,
  "url": "http://localhost:9000/notify-files/1735950000000-invoice.pdf?..."
}
```

---

## 📥 Inbox Management

Fetch and update notifications for the in-app inbox.

### `GET /inbox/:userId`

Fetch recent notifications for a specific user.

**Scope required**: `inbox:read`

#### Example Response

```json
[
  {
    "_id": "64f1...",
    "eventName": "order.shipped",
    "status": "DELIVERED",
    "createdAt": "2023-09-01T12:00:00Z"
  }
]
```

### `PATCH /inbox/:messageId/read`

Mark a notification as read.

**Scope required**: `inbox:write`

---

## 📈 Rate Limiting

The service enforces per-tenant rate limits. Check the following headers in the response:

- `X-RateLimit-Remaining`: Number of requests remaining in the current window.
- `X-RateLimit-Reset`: Time when the rate limit window resets.
