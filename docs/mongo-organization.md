# MongoDB Organization

This backend is organized around these collections:

1. `users`
- Source model: `User`
- Purpose: account data, roles, gender selection, auth-related token fields.

2. `cars`
- Source model: `Car`
- Purpose: user garage vehicles.
- Relation: each car references one `users._id` via `user`.

3. `packages`
- Source model: `Package`
- Purpose: monthly wash plans shown in package cards.

4. `package_subscriptions`
- Source model: `PackageSubscription`
- Purpose: confirmed package subscriptions/orders created from checkout.
- Relation: each document references `users._id`.
- Legacy mapping: old `orders` records can be linked through `legacyOrderId`.
- API paths: `/order` (existing) and `/subscriptions` (alias).

5. `book_washes`
- Source model: `BookWash`
- Purpose: wash booking requests (date, time, location, selected vehicle/package).
- Relation: each document references `users._id` and optionally `cars._id`.
- API paths: `/reservation` (existing) and `/book-washes` (alias).

## One-time organization command

Run:

```bash
npm run db:organize
```

What it does:
- Ensures indexes for the main collections.
- Normalizes `users.resetPasswordToken` index to sparse + unique.
- Migrates legacy `orders` documents into `package_subscriptions` safely (without duplicates).
- Prints summary counts for the organized collections.
