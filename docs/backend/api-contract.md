# Kawaii Wallet Backend Contract

Target backend: NestJS REST API, MongoDB/Mongoose, JWT auth.

Base URL:

```text
https://api.example.com/v1
```

Local URL:

```text
http://localhost:<PORT>/v1
```

Common authenticated headers:

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

Notes:

- Money values are integer rupiah amounts.
- Formatted money strings are convenience fields for the current mobile UI.
- All protected resources are scoped by authenticated `userId`.
- Object ids are MongoDB ObjectId strings.
- Dates use ISO 8601 strings.

## Health

### GET /health

Auth: not required.

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

## Auth

### POST /auth/register

No OTP. The mobile app should store tokens and go straight to the dashboard.
On success, backend also creates default user categories.

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
      "id": "6650f8e9b9f1f1a001234567",
      "name": "Caca Cute",
      "email": "test@mail.com",
      "avatarUrl": null
    }
  },
  "meta": {},
  "error": null
}
```

Default categories created during register:

- Expense: `Makanan`, `Transport`, `Belanja`, `Main/Hobi`, `Internet/Kuota`, `Kos/Rent`, `Skincare`
- Income: `Gaji`, `Freelance`, `Hadiah`

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

Behavior: refresh token is rotated. The old refresh token is revoked.

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

Auth: required.

Response `200`:

```json
{
  "data": {
    "id": "6650f8e9b9f1f1a001234567",
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

Auth: required.

Query:

```text
month=2024-05&walletId=all
```

Query params:

- `month`: optional, `YYYY-MM`. Defaults to current month.
- `walletId`: optional. Use `all` or omit for total assets.

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
          "categoryId": "6650f8e9b9f1f1a001234568",
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
    "latestTransactions": [
      {
        "id": "6650f8e9b9f1f1a001234569",
        "type": "EXPENSE",
        "title": "Mixue Boba",
        "amount": 16000,
        "formattedAmount": "- Rp 16.000",
        "occurredAt": "2024-05-24T14:20:00.000Z"
      }
    ]
  },
  "meta": {
    "month": "2024-05"
  },
  "error": null
}
```

Behavior:

- `latestTransactions` returns at most 4 items.
- `income` and `expense` are calculated from transactions in the selected month.
- `balance` is total active wallet balance when `walletId=all`.
- `budgetLimit` is calculated from monthly budgets. For specific wallet views it currently returns zeroed budget summary.

## Wallets

### GET /wallets

Auth: required.

Response `200`:

```json
{
  "data": [
    {
      "id": "6650f8e9b9f1f1a001234570",
      "name": "ATM BCA",
      "type": "BANK",
      "icon": "account_balance",
      "color": "#4EA8DE",
      "balance": 5250000,
      "formattedBalance": "Rp 5.250k"
    }
  ],
  "meta": {},
  "error": null
}
```

Empty state:

```json
{
  "data": [],
  "meta": {},
  "error": null
}
```

### POST /wallets

Auth: required.

Request:

```json
{
  "name": "BCA Saya",
  "type": "BANK",
  "icon": "account_balance",
  "color": "#EE2B6C",
  "initialBalance": 1120000
}
```

Allowed `type`: `BANK`, `EWALLET`, `CASH`, `SAVINGS`, `OTHER`.

Response `201`: wallet object.

### PATCH /wallets/:walletId

Auth: required.

Request:

```json
{
  "name": "BCA Saya",
  "color": "#4EA8DE",
  "icon": "account_balance"
}
```

Response `200`: wallet object.

### DELETE /wallets/:walletId

Auth: required.

Response `204`: empty body.

Behavior: wallet is archived with `isArchived=true`.

## Categories

### GET /categories

Auth: required.

Query:

```text
type=EXPENSE&includeArchived=false
```

Query params:

- `type`: optional, `INCOME` or `EXPENSE`.
- `includeArchived`: optional boolean string. Defaults to `false`.

Response `200`:

```json
{
  "data": [
    {
      "id": "6650f8e9b9f1f1a001234571",
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

Auth: required.

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

Auth: required.

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

Auth: required.

Response `204`: empty body.

Behavior: user category is archived with `isArchived=true`.

## Transactions

### GET /transactions

Auth: required.

Query:

```text
month=2024-05&type=EXPENSE&walletId=6650f8e9b9f1f1a001234570&page=1&limit=20
```

Query params:

- `month`: optional, `YYYY-MM`.
- `type`: optional, `INCOME`, `EXPENSE`, or `TRANSFER`.
- `walletId`: optional. Matches `walletId`, `fromWalletId`, or `toWalletId`.
- `page`: optional, defaults to `1`.
- `limit`: optional, defaults to `20`.

Response `200`:

```json
{
  "data": [
    {
      "id": "6650f8e9b9f1f1a001234572",
      "type": "EXPENSE",
      "title": "Mixue Boba",
      "amount": 16000,
      "formattedAmount": "- Rp 16.000",
      "note": null,
      "occurredAt": "2024-05-24T14:20:00.000Z",
      "wallet": {
        "id": "6650f8e9b9f1f1a001234570",
        "name": "BCA"
      },
      "category": {
        "id": "6650f8e9b9f1f1a001234571",
        "name": "Makanan",
        "icon": "restaurant",
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

Auth: required.

For income or expense:

```json
{
  "type": "EXPENSE",
  "title": "Sushi Yay!",
  "amount": 85000,
  "walletId": "6650f8e9b9f1f1a001234570",
  "categoryId": "6650f8e9b9f1f1a001234571",
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
  "fromWalletId": "6650f8e9b9f1f1a001234570",
  "toWalletId": "6650f8e9b9f1f1a001234573",
  "note": "Tabungan bulanan",
  "occurredAt": "2024-05-24T12:30:00.000Z"
}
```

Response `201`: transaction object.

Behavior:

- `INCOME` requires `walletId` and `categoryId`.
- `EXPENSE` requires `walletId` and `categoryId`.
- `TRANSFER` requires `fromWalletId` and `toWalletId`.
- `TRANSFER` source and destination wallet must be different.
- `INCOME` category must have type `INCOME`.
- `EXPENSE` category must have type `EXPENSE`.
- `INCOME` increments wallet balance.
- `EXPENSE` decrements wallet balance.
- `TRANSFER` decrements source wallet and increments destination wallet.
- If `occurredAt` is omitted, backend uses current time.

### PATCH /transactions/:transactionId

Auth: required.

Request: same fields as `POST /transactions`, all optional.

Response `200`: transaction object.

Behavior: backend reverses the old transaction balance effect, stores the new values, then applies the new balance effect.

### DELETE /transactions/:transactionId

Auth: required.

Response `204`: empty body.

Behavior: backend reverses the transaction balance effect, then deletes the transaction.

## Budgets

### GET /budgets

Auth: required.

Query:

```text
month=2024-05
```

Query params:

- `month`: optional, `YYYY-MM`. Defaults to current month.

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
        "id": "6650f8e9b9f1f1a001234574",
        "name": "Internet/Kuota",
        "categoryId": "6650f8e9b9f1f1a001234575",
        "icon": "wifi",
        "color": "#4EA8DE",
        "usedAmount": 750000,
        "limitAmount": 1000000,
        "percentage": 75,
        "statusLabel": "75%"
      }
    ]
  },
  "meta": {
    "month": "2024-05"
  },
  "error": null
}
```

Empty state:

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

Behavior:

- `usedAmount` is calculated from `EXPENSE` transactions in the selected month.
- Budget categories must be `EXPENSE` categories.
- `statusLabel` is always percentage text, including `100%`.

### POST /budgets

Auth: required.

With existing category:

```json
{
  "name": "Food",
  "categoryId": "6650f8e9b9f1f1a001234571",
  "period": "MONTHLY",
  "limitAmount": 1500000,
  "startsAt": "2024-05-01T00:00:00.000Z",
  "endsAt": "2024-06-01T00:00:00.000Z"
}
```

With new category:

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
  "endsAt": "2024-06-01T00:00:00.000Z"
}
```

Allowed `period`: `MONTHLY`.

Response `201`: budget item object.

Behavior:

- If `category` is provided, backend creates an `EXPENSE` category.
- If a budget for the same category and same `startsAt` already exists, backend updates that budget.
- `startsAt` must be earlier than `endsAt`.

### POST /budgets/copy-previous-month

Auth: required.

Used by FE action `Pakai Batas Bulan Kemarin`.

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
        "id": "6650f8e9b9f1f1a001234576",
        "name": "Food",
        "categoryId": "6650f8e9b9f1f1a001234571",
        "icon": "restaurant",
        "color": "#EE2B6C",
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

- Copies category links, names, period, and `limitAmount`.
- Does not copy `usedAmount` or transactions.
- If target month already has a copied category budget, backend updates its `limitAmount`.

### PATCH /budgets/:budgetId

Auth: required.

Request:

```json
{
  "name": "Food",
  "limitAmount": 2000000
}
```

Response `200`: budget item object.

### DELETE /budgets/:budgetId

Auth: required.

Response `204`: empty body.

Behavior: budget is archived with `isArchived=true`.

## Validation Summary

- `amount`, `initialBalance`, and `limitAmount` are integer rupiah values.
- `amount` and `limitAmount` must be greater than `0`.
- `initialBalance` must be at least `0`.
- `color` must be a hex color string.
- `occurredAt`, `startsAt`, and `endsAt` must be ISO 8601 strings.
- `month`, `sourceMonth`, and `targetMonth` use `YYYY-MM`.
- `Category.type`: `INCOME`, `EXPENSE`.
- `Transaction.type`: `INCOME`, `EXPENSE`, `TRANSFER`.
- `Wallet.type`: `BANK`, `EWALLET`, `CASH`, `SAVINGS`, `OTHER`.
- `Budget.period`: `MONTHLY`.
