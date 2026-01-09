# Authentication & Security

The Notification Service uses a secure API Key mechanism to authorize requests and ensure tenant isolation.

## 🔑 API Keys

Each tenant can manage multiple API keys through the Tenant Portal. Each key consists of:

- **Display Name**: Friendly name for identification.
- **Key Prefix**: First few characters visible for reference.
- **Full Secret**: The actual key (only shown once at creation).

> [!WARNING]
> Full secrets are hashed using SHA-256 before storage. If you lose a key, you must revoke it and create a new one.

## 🛡️ Scopes

API Keys are restricted by scopes to implement the principle of least privilege.

| Scope         | Permission                                                     |
| :------------ | :------------------------------------------------------------- |
| `event:write` | Permission to trigger events via `/notify`.                    |
| `inbox:read`  | Permission to fetch user notifications.                        |
| `inbox:write` | Permission to update notification status (e.g., mark as read). |

## 🌐 IP Allowlisting

You can restrict API Key usage to specific IP addresses or CIDR ranges.

1. **API Key Level**: Specific range for a single key.
2. **Tenant Level**: Global range for all keys under a tenant.
3. **Internal Policy**: Precedence is given to the API Key level policy if defined.

## 📉 Rate Limiting

Rate limits are applied at the Tenant level to prevent service abuse.

- **Points**: Total allowed requests (e.g., 100).
- **Duration**: Window in seconds (e.g., 900 seconds).

If exceeded, the API returns a `429 Too Many Requests` status with a `Retry-After` header.

## 🧪 Example Header

```http
x-api-key: nt_live_550e8400e29b41d4a716446655440000
```
