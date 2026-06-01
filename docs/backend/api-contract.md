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

## Payroll Periods

Payroll periods are optional custom ranges for users who do not track finance by
calendar month. Existing `month=YYYY-MM` queries remain supported for backward
compatibility.

### GET /periods

Auth: required.

Response `200`:

```json
{
  "data": [
    {
      "id": "6650f8e9b9f1f1a001234580",
      "name": "Gajian Juni",
      "label": "29 Mei, 00.00 - 29 Jun 2026, 12.00",
      "startDate": "2026-05-28T17:00:00.000Z",
      "endDate": "2026-06-29T05:00:00.000Z",
      "isCurrent": true
    }
  ],
  "meta": {},
  "error": null
}
```

Behavior: if the user has no custom periods yet, backend creates a default
period for the current calendar month so existing users can continue normally.

### POST /periods

Auth: required.

Request:

```json
{
  "name": "Gajian Juni",
  "startDate": "2026-05-28T17:00:00.000Z",
  "endDate": "2026-06-29T05:00:00.000Z"
}
```

Response `201`: period object.

Behavior: `startDate` is inclusive and `endDate` is exclusive. A transaction is
inside a period when `occurredAt >= startDate` and `occurredAt < endDate`.
Use ISO datetime to preserve hour boundaries, for example a period can end on
`1 Jun 12:00` and the next period can start on `1 Jun 14:00`.

### PATCH /periods/:periodId

Auth: required.

Request: same fields as `POST /periods`, all optional.

Response `200`: period object.

### DELETE /periods/:periodId

Auth: required.

Response `204`: empty body.

Behavior: period is archived. Transactions remain untouched.

## Dashboard

### GET /dashboard/summary

Auth: required.

Query:

```text
month=2024-05&periodId=6650f8e9b9f1f1a001234580&walletId=all
```

Query params:

- `month`: optional, `YYYY-MM`. Defaults to current month.
- `periodId`: optional. When present, `income`, `expense`, `chart`, and
  `budgetLimit` use that custom payroll period range. `month` stays supported
  as fallback for legacy calendar-month views.
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
    "availablePeriod": {
      "minMonth": "2026-05",
      "maxMonth": "2026-05"
    },
    "activePeriod": {
      "id": "6650f8e9b9f1f1a001234580",
      "label": "29 Mei 2026 - 29 Jun 2026",
      "startDate": "2026-05-29T00:00:00.000Z",
      "endDate": "2026-06-29T00:00:00.000Z"
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
    "month": "2024-05",
    "periodId": "6650f8e9b9f1f1a001234580"
  },
  "error": null
}
```

Behavior:

- `latestTransactions` returns at most 4 items.
- `availablePeriod.minMonth` is based on the user's first transaction month, or
  the user's creation month when they do not have transactions yet.
- `availablePeriod.maxMonth` is the current month.
- `income` and `expense` are calculated from transactions in `periodId` range
  when provided, otherwise from the selected calendar month.
- `balance` is total active wallet balance when `walletId=all`.
- `budgetLimit` is calculated from the monthly budget document. For specific
  wallet views it currently returns zeroed budget summary.

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
  "name": "BCA Gaji",
  "type": "BANK",
  "icon": "account_balance",
  "color": "#4EA8DE",
  "balance": 2450000
}
```

All fields are optional, but at least one field should be sent.

Response `200`: updated wallet object.

### DELETE /wallets/:walletId

Auth: required.

Response `204`: empty body.

Behavior: wallet document is hard deleted. Existing transaction history keeps a
snapshot of the wallet label, so history can still show where the transaction
came from after the wallet is removed.

Validation:

- Active wallet names must be unique per user.

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

Behavior:

- Default categories are global (`userId=null`) and available for all users.
- Custom categories are stored with the current `userId`, so only that user can
  see and use them.
- Transaction and budget limit category choices come from this same category
  source of truth.

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
month=2024-05&periodId=6650f8e9b9f1f1a001234580&type=EXPENSE&walletId=6650f8e9b9f1f1a001234570&page=1&limit=20
```

Query params:

- `month`: optional, `YYYY-MM`.
- `periodId`: optional. When present, transaction date filtering uses the
  custom payroll period range instead of calendar month.
- `type`: optional, `INCOME`, `EXPENSE`, or `TRANSFER`.
- `walletId`: optional. Backend translates the active wallet ID to its wallet
  label, then matches `walletName`, `fromWalletName`, or `toWalletName`.
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
- Wallet IDs are used to validate and update balances when the transaction is
  created. Transactions store wallet label snapshots only:
  `walletName`, `fromWalletName`, and `toWalletName`.
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
month=2024-05&periodId=6650f8e9b9f1f1a001234580
```

Query params:

- `month`: optional, `YYYY-MM`. Defaults to current month.
- `periodId`: optional. When present, backend stores/loads the budget document
  with internal key `period:<periodId>` and calculates usage from that range.

Response `200`:

```json
{
  "data": {
    "documentId": "6650f8e9b9f1f1a001234574",
    "month": "2024-05",
    "summary": {
      "usedAmount": 3000000,
      "limitAmount": 5000000,
      "percentage": 60
    },
    "items": [
      {
        "id": "6650f8e9b9f1f1a001234575",
        "documentId": "6650f8e9b9f1f1a001234574",
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
    "documentId": null,
    "month": "2024-05",
    "summary": {
      "usedAmount": 0,
      "limitAmount": 0,
      "percentage": 0
    },
    "items": [],
    "previousMonth": {
      "month": "2024-04",
      "periodId": "6650f8e9b9f1f1a001234579",
      "available": true
    },
    "period": {
      "id": "6650f8e9b9f1f1a001234580",
      "label": "29 Mei 2026 - 29 Jun 2026",
      "startDate": "2026-05-29T00:00:00.000Z",
      "endDate": "2026-06-29T00:00:00.000Z"
    }
  },
  "meta": {
    "month": "2024-05"
  },
  "error": null
}
```

Behavior:

- Budgets are stored as 1 document per user per calendar month or custom
  payroll period.
- Each budget item references an existing `EXPENSE` category.
- `usedAmount` is calculated from `EXPENSE` transactions in the selected month
  or custom payroll period.
- Transactions do not mutate the budget document. They only affect `usedAmount`
  because usage is calculated by matching transaction `categoryId`.
- If a category is not included in the monthly budget document, transactions for
  that category are still valid and simply do not appear in limit detail.
- `statusLabel` is always percentage text, including `100%`.

### POST /budgets

Auth: required.

Adds or updates one budget item in the monthly budget document.

```json
{
  "categoryId": "6650f8e9b9f1f1a001234571",
  "limitAmount": 1500000,
  "month": "2024-05",
  "periodId": "6650f8e9b9f1f1a001234580"
}
```

Response `201`: budget item object.

Behavior:

- `month` is optional and defaults to current month.
- `periodId` is optional and takes precedence over `month`.
- `categoryId` must be an available `EXPENSE` category for the user.
- If the monthly budget document does not exist, backend creates it.
- If the category already exists in that month's `items`, backend updates its
  `limitAmount`.
- New custom categories are created via `POST /categories`, not via budgets.

### POST /budgets/copy-previous-month

Auth: required.

Used by FE action `Pakai Batas Bulan Kemarin`.

Request:

```json
{
  "sourceMonth": "2024-04",
  "targetMonth": "2024-05",
  "sourcePeriodId": "6650f8e9b9f1f1a001234579",
  "targetPeriodId": "6650f8e9b9f1f1a001234580"
}
```

Response `201`:

```json
{
  "data": {
    "documentId": "6650f8e9b9f1f1a001234574",
    "month": "2024-05",
    "summary": {
      "usedAmount": 0,
      "limitAmount": 5000000,
      "percentage": 0
    },
    "items": [
      {
        "id": "6650f8e9b9f1f1a001234571",
        "documentId": "6650f8e9b9f1f1a001234574",
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
    "targetMonth": "2024-05",
    "sourcePeriodId": "6650f8e9b9f1f1a001234579",
    "targetPeriodId": "6650f8e9b9f1f1a001234580"
  },
  "error": null
}
```

Behavior:

- Copies category links and `limitAmount`.
- Copies budget `items` from the source document into the target document.
- Does not copy `usedAmount` or transactions.
- If target month already has a budget document, backend replaces its `items`
  with the previous month's items.

### PATCH /budgets/:categoryId

Auth: required.

Request:

```json
{
  "limitAmount": 2000000,
  "month": "2024-05",
  "periodId": "6650f8e9b9f1f1a001234580"
}
```

Response `200`: budget item object.

Behavior: updates one item in the budget document. `periodId` is optional and
takes precedence over `month`.

### DELETE /budgets/:categoryId

Auth: required.

Query params:

- `month`: optional, `YYYY-MM`. Defaults to current month.
- `periodId`: optional. Takes precedence over `month`.

Response `204`: empty body.

Behavior: removes that category item from the monthly budget document. The
monthly document remains available for other category limits.

## Validation Summary

- `amount`, `initialBalance`, and `limitAmount` are integer rupiah values.
- `amount` and `limitAmount` must be greater than `0`.
- `initialBalance` must be at least `0`.
- `color` must be a hex color string.
- `occurredAt` must be an ISO 8601 string.
- `month`, `sourceMonth`, and `targetMonth` use `YYYY-MM`.
- `periodId`, `sourcePeriodId`, and `targetPeriodId` use MongoDB ObjectId.
- `Category.type`: `INCOME`, `EXPENSE`.
- `Transaction.type`: `INCOME`, `EXPENSE`, `TRANSFER`.
- `Wallet.type`: `BANK`, `EWALLET`, `CASH`, `SAVINGS`, `OTHER`.
