# Shoppie - Premium E-Commerce Marketplace

Shoppie is a fully-featured, dual-role e-commerce marketplace platform built for scale, performance, and user experience. 

It supports two main roles:
1. **Users (Customers):** Browse products, manage cart and wishlist, checkout with Stripe, and track order history.
2. **Merchants:** Manage product catalog, track sales analytics, and manage order fulfillment.

## Technology Stack

### Backend
- **Framework:** Django & Django REST Framework
- **Database:** PostgreSQL (hosted on Neon with connection pooling & PITR)
- **Background Jobs:** Django-Q2 (PostgreSQL Broker)
- **Authentication:** JWT (rest_framework_simplejwt)
- **Media Storage:** Cloudinary
- **Payments:** Stripe (with webhooks)

### Frontend
- **Framework:** React (Vite)
- **Styling:** Tailwind CSS, Framer Motion
- **State Management:** Redux Toolkit
- **API Client:** Axios (with global error interceptors & JWT refresh)
- **E2E Testing:** Playwright

## Prerequisites
- Node.js (v18+)
- Python (3.10+)
- PostgreSQL (Neon or local)

## Environment Variables
Copy `.env.example` to `.env` in the root directory and fill in the required credentials.

```bash
cp .env.example .env
```

Required keys include:
- `DJANGO_SECRET_KEY`
- `DATABASE_URL`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
The system uses `Django-Q2` backed by the default PostgreSQL database.
To run the background worker (which processes expired inventory reservations and abandoned carts):
```bash
cd Backend
python manage.py qcluster
```

## Production Deployment & Reliability
Shoppie is hardened for production environments:

- **Database Reliability**: Uses Neon Serverless PostgreSQL with connection pooling (`CONN_MAX_AGE=60`, `CONN_HEALTH_CHECKS=True`) and Point-in-Time Recovery (PITR).
- **Payment Safety**: Stripe webhooks are processed using row-level locking (`select_for_update`) to guarantee idempotency and avoid race conditions.
- **Inventory Safety**: Database-level `CheckConstraints` prevent negative stock quantities.
- **Observability**: Uses structured JSON logging with a `RequestCorrelationMiddleware` that injects an `X-Correlation-ID` into every request.
- **Background Workers**: `Django-Q2` jobs are configured with bounded retries (`max_attempts: 3`).
- **CI/CD**: GitHub Actions workflow automatically runs the Django test suite and builds the React frontend on every push and PR to `main`.

## Setup Instructions

### 1. Backend Setup
```bash
cd Backend
python -m venv venv

# Activate venv (Windows)
# Activate venv (Mac/Linux)
source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### 2. Frontend Setup
```bash
cd Frontend
npm install
npm run dev
```

### 3. Stripe Webhook Testing
To test payments locally, use the Stripe CLI to forward webhooks to your local server:
```bash
stripe listen --forward-to localhost:8000/api/v1/orders/webhook/
```
Update your `.env` with the generated webhook secret.

## Production Deployment
- **Backend:** Designed for deployment on platforms like Render, Heroku, or Fly.io. Ensure `DJANGO_DEBUG=False` and set `DJANGO_ALLOWED_HOSTS`.
- **Frontend:** Build with `npm run build` and deploy the `dist/` directory to Vercel, Netlify, or AWS S3/CloudFront.
- **Database:** Neon Serverless Postgres is recommended.

## Testing
Run E2E tests with Playwright:
```bash
cd Frontend
npx playwright test
```




agy --conversation=dbcf9965-61e8-4d9d-a9f0-4cc4d6e8f2e5


jkGcSov4h-RINGv9OAN6MghtL0yMXn6c0SiEJCcgYsM


Client ID	jkGcSov4h-RINGv9OAN6MghtL0yMXn6c0SiEJCcgYsM
Client Secret	yXY6-gONmOE_kMRw8wJp3LX90juP2As32iXyZ3sNCoY