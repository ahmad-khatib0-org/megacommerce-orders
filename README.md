# megacommerce-orders

Orders microservice for MegaCommerce.

## Goal

Provide a robust order creation flow (synchronous payment capture, inventory reservation,
idempotency) and a simple API surface (gRPC) to be consumed by frontend and other backend
services.

This repository contains skeleton code to bootstrap the service and implement the
`OrderCreate` flow. The code is TypeScript and uses `pg` for Postgres/CockroachDB,
and calls out to external services (product service, inventory service, stripe).
Inventory is mocked for now.

## Getting started

Prerequisites

- Node.js 18+ / npm or pnpm
- PostgreSQL or CockroachDB
- Stripe test key (for payment flow) — optional for local dev

Install

```bash
pnpm install
