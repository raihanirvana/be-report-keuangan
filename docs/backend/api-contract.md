# Kawaii Wallet Backend Contract

Target backend: NestJS REST API, MongoDB, JWT auth.

Base URL:

```text
https://api.example.com/v1
```

Common headers:

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

Common response envelope:

```json
{
  "data": {},
  "meta": {},
  "error": null
}
```

Common error envelope:

```json
{
  "data": null,
  "meta": {},
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload",
    "details": []
  }
}
```

## Auth

## Health

### GET /health

Response `200`:

```json
{
  "data": {
    "name": "be-keuangan",
    "status": "ok",
    "timestamp": "2026-05-10T12:00:00.000Z",
    "uptime": 12.3
  },
  "meta": {},
  "error": null
}
```

Used as the first smoke-test endpoint for deployment and mobile API checks.

### POST /auth/register

No OTP is required. A successful register response should let the mobile app
store tokens and go straight to the dashboard.

Request:

```json
{
  "name": "Caca Cute",
  "email": "test@mail.com",
  "password": "password"
}
```

Response `201`:

```json
{
  "data": {
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token",
    "user": {
      "id": "usr_123",
      "name": "Caca Cute",
      "email": "test@mail.com",
      "avatarUrl": null
    }
  },
  "meta": {},
  "error": null
}
```

### POST /auth/login

Request:

```json
{
  "email": "test@mail.com",
  "password": "password"
}
```

Response `200`: same shape as register.

### POST /auth/refresh

Request:

```json
{
  "refreshToken": "jwt-refresh-token"
}
```

Response `200`:

```json
{
  "data": {
    "accessToken": "new-jwt-access-token",
    "refreshToken": "new-jwt-refresh-token"
  },
  "meta": {},
  "error": null
}
```

### POST /auth/logout

Request:

```json
{
  "refreshToken": "jwt-refresh-token"
}
```

Response `204`: empty body.

## User

### GET /me

Response `200`:

```json
{
  "data": {
    "id": "usr_123",
    "name": "Caca Cute",
    "email": "test@mail.com",
    "avatarUrl": null
  },
  "meta": {},
  "error": null
}
```

## Dashboard

### GET /dashboard/summary

Query:

```text
month=2024-05&walletId=all
```

`month` follows `YYYY-MM`. `walletId` can be `all` or a wallet id.

Response `200`:

```json
{
  "data": {
    "user": {
      "name": "Caca Cute",
      "avatarUrl": null
    },
    "selectedWallet": {
      "id": "all",
      "name": "Total Asset Saya"
    },
    "balance": {
      "amount": 5250000,
      "formatted": "Rp 5.250.000"
    },
    "income": {
      "amount": 2100000,
      "formatted": "Rp 2.100k"
    },
    "expense": {
      "amount": 850000,
      "formatted": "Rp 850k"
    },
    "chart": {
      "expenseTotal": 850000,
      "categories": [
        {
          "categoryId": "cat_food",
          "name": "Makanan",
          "color": "#EE2B6C",
          "amount": 255000,
          "percentage": 30
        }
      ]
    },
    "budgetLimit": {
      "usedAmount": 3000000,
      "limitAmount": 5000000,
      "percentage": 60
    },
    "latestTransactions": []
  },
  "meta": {
    "month": "2024-05"
  },
  "error": null
}
```

`latestTransactions` should return at most 4 items for the dashboard preview.
Use `GET /transactions` for the full history bottom sheet.

## Wallets

### GET /wallets

Response `200`:

```json
{
  "data": [
    {
      "id": "wlt_bca",
      "name": "ATM BCA",
      "type": "BANK",
      "icon": "bank",
      "color": "#4EA8DE",
      "balance": 5250000,
      "formattedBalance": "Rp 5.250k"
    }
  ],
  "meta": {},
  "error": null
}
```

If the user has not created any wallet yet, return an empty array:

```json
{
  "data": [],
  "meta": {},
  "error": null
}
```

### POST /wallets

Request:

```json
{
  "name": "BCA Saya",
  "type": "BANK",
  "icon": "qr_code",
  "color": "#EE2B6C",
  "initialBalance": 1120000
}
```

Allowed `type`: `BANK`, `EWALLET`, `CASH`, `SAVINGS`, `OTHER`.

Response `201`: wallet object.

### PATCH /wallets/:walletId

Request:

```json
{
  "name": "BCA Saya",
  "color": "#4EA8DE",
  "icon": "bank"
}
```

Response `200`: wallet object.

### DELETE /wallets/:walletId

Behavior: archive wallet if it has transactions.

Response `204`: empty body.

## Categories

### GET /categories

Query:

```text
type=EXPENSE&includeArchived=false
```

Response `200`:

```json
{
  "data": [
    {
      "id": "cat_food",
      "name": "Makanan",
      "type": "EXPENSE",
      "icon": "restaurant",
      "color": "#EE2B6C",
      "isDefault": true
    }
  ],
  "meta": {},
  "error": null
}
```

### POST /categories

Request:

```json
{
  "name": "Skincare",
  "type": "EXPENSE",
  "icon": "face",
  "color": "#A29BFE"
}
```

Response `201`: category object.

### PATCH /categories/:categoryId

Request:

```json
{
  "name": "Transport",
  "icon": "two_wheeler",
  "color": "#4EA8DE"
}
```

Response `200`: category object.

### DELETE /categories/:categoryId

Behavior: archive category if it has transactions or budgets.

Response `204`: empty body.

## Transactions

### GET /transactions

Query:

```text
month=2024-05&type=EXPENSE&walletId=wlt_bca&page=1&limit=20
```

All query params are optional except `page` and `limit` if pagination is used.
Allowed `type`: `INCOME`, `EXPENSE`, `TRANSFER`.

Response `200`:

```json
{
  "data": [
    {
      "id": "trx_123",
      "type": "EXPENSE",
      "title": "Mixue Boba",
      "amount": 16000,
      "formattedAmount": "- Rp 16.000",
      "note": null,
      "occurredAt": "2024-05-24T14:20:00.000Z",
      "wallet": {
        "id": "wlt_bca",
        "name": "BCA"
      },
      "category": {
        "id": "cat_food",
        "name": "Makanan",
        "icon": "icecream",
        "color": "#EE2B6C"
      },
      "fromWallet": null,
      "toWallet": null
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42
  },
  "error": null
}
```

### POST /transactions

For income or expense:

```json
{
  "type": "EXPENSE",
  "title": "Sushi Yay!",
  "amount": 85000,
  "walletId": "wlt_bca",
  "categoryId": "cat_food",
  "note": "Dinner",
  "occurredAt": "2024-05-24T12:30:00.000Z"
}
```

For transfer:

```json
{
  "type": "TRANSFER",
  "title": "Monthly saving",
  "amount": 250000,
  "fromWalletId": "wlt_bca",
  "toWalletId": "wlt_savings",
  "note": "Tabungan bulanan",
  "occurredAt": "2024-05-24T12:30:00.000Z"
}
```

Response `201`:

```json
{
  "data": {
    "id": "trx_123",
    "type": "EXPENSE",
    "title": "Sushi Yay!",
    "amount": 85000,
    "occurredAt": "2024-05-24T12:30:00.000Z"
  },
  "meta": {},
  "error": null
}
```

Transfer response objects should include `fromWallet` and `toWallet` instead
of `wallet` and `category`:

```json
{
  "data": {
    "id": "trx_transfer",
    "type": "TRANSFER",
    "title": "Monthly saving",
    "amount": 250000,
    "formattedAmount": "Rp 250.000",
    "occurredAt": "2024-05-24T12:30:00.000Z",
    "fromWallet": {
      "id": "wlt_bca",
      "name": "BCA"
    },
    "toWallet": {
      "id": "wlt_savings",
      "name": "Savings"
    }
  },
  "meta": {},
  "error": null
}
```

### PATCH /transactions/:transactionId

Request: same fields as `POST /transactions`, all optional except valid transaction relation rules.

Response `200`: transaction object.

### DELETE /transactions/:transactionId

Response `204`: empty body.

## Budgets

### GET /budgets

Query:

```text
month=2024-05
```

Response `200`:

```json
{
  "data": {
    "summary": {
      "usedAmount": 3000000,
      "limitAmount": 5000000,
      "percentage": 60
    },
    "items": [
      {
        "id": "bdg_internet",
        "name": "Internet/Kuota",
        "categoryId": "cat_internet",
        "icon": "wifi",
        "color": "#4EA8DE",
        "usedAmount": 750000,
        "limitAmount": 1000000,
        "percentage": 75,
        "statusLabel": "75%"
      },
      {
        "id": "bdg_rent",
        "name": "Kos/Rent",
        "categoryId": "cat_rent",
        "icon": "home",
        "color": "#EE2B6C",
        "usedAmount": 1200000,
        "limitAmount": 1200000,
        "percentage": 100,
        "statusLabel": "100%"
      }
    ]
  },
  "meta": {
    "month": "2024-05"
  },
  "error": null
}
```

Empty state response:

```json
{
  "data": {
    "summary": {
      "usedAmount": 0,
      "limitAmount": 0,
      "percentage": 0
    },
    "items": [],
    "previousMonth": {
      "month": "2024-04",
      "available": true
    }
  },
  "meta": {
    "month": "2024-05"
  },
  "error": null
}
```

### POST /budgets

Request:

```json
{
  "name": "Food",
  "categoryId": "cat_food",
  "period": "MONTHLY",
  "limitAmount": 1500000,
  "startsAt": "2024-05-01T00:00:00.000Z",
  "endsAt": "2024-05-31T23:59:59.999Z"
}
```

Response `201`: budget object.

For the mobile "Tambah Kategori Baru" flow in the limit detail sheet, the
backend can support a combined category + budget request:

```json
{
  "category": {
    "name": "Transport",
    "icon": "two_wheeler",
    "color": "#4EA8DE"
  },
  "period": "MONTHLY",
  "limitAmount": 500000,
  "startsAt": "2024-05-01T00:00:00.000Z",
  "endsAt": "2024-05-31T23:59:59.999Z"
}
```

If `category` is provided, backend creates an `EXPENSE` category and attaches
the budget to it in one transaction.

### POST /budgets/copy-previous-month

Used by the mobile empty state action `Pakai Aturan Bulan Kemarin`.

Request:

```json
{
  "sourceMonth": "2024-04",
  "targetMonth": "2024-05"
}
```

Response `201`:

```json
{
  "data": {
    "summary": {
      "usedAmount": 0,
      "limitAmount": 5000000,
      "percentage": 0
    },
    "items": [
      {
        "id": "bdg_food_may",
        "name": "Food",
        "categoryId": "cat_food",
        "icon": "lunch_dining",
        "color": "#FBCF33",
        "usedAmount": 0,
        "limitAmount": 1500000,
        "percentage": 0,
        "statusLabel": "0%"
      }
    ]
  },
  "meta": {
    "sourceMonth": "2024-04",
    "targetMonth": "2024-05"
  },
  "error": null
}
```

Behavior:

- Copy category links, names, period, and `limitAmount` from `sourceMonth`.
- Do not copy `usedAmount` or transactions.
- If a copied category budget already exists in `targetMonth`, keep one record
  and update its `limitAmount`.

### PATCH /budgets/:budgetId

Request:

```json
{
  "limitAmount": 2000000
}
```

Response `200`: budget object.

### DELETE /budgets/:budgetId

Response `204`: empty body.

## Backend Validation Rules

- Money is sent as integer rupiah amount, not formatted strings.
- `INCOME` requires `walletId`.
- `EXPENSE` requires `walletId` and `categoryId`.
- `TRANSFER` requires `fromWalletId` and `toWalletId`.
- `TRANSFER` cannot use the same wallet for source and destination.
- `Category.type` only supports `INCOME` and `EXPENSE`.
- `Budget.categoryId` should point to an `EXPENSE` category.
- Budget `statusLabel` should remain percentage text, including `100%`.
- `amount` must be greater than `0`.
- `occurredAt` must be ISO 8601.
- All resources are scoped by authenticated `userId`.
- Deleting wallet should archive it when transaction history exists.
- Deleting category should archive it when transaction or budget history exists.
- Balance updates should happen in a database transaction.
