# Nexura - Modern E-Commerce Marketplace

Nexura is a fully-featured, dual-role e-commerce marketplace platform built for scale, performance, and modern user experience.

It supports two core roles:
1. **Users (Customers):** Browse products, filter by category and price, manage cart and wishlist, checkout securely with Stripe, and track complete order lifecycles and returns.
2. **Merchants:** Manage product catalog, review and update fulfillment statuses, track net revenue and returns analytics, and inspect customer deliveries.

## Technology Stack

### Backend
- **Framework:** Django & Django REST Framework
- **Database:** PostgreSQL (Neon Serverless with connection pooling & health checks)
- **Background Worker:** Django-Q2 (PostgreSQL Broker)
- **Authentication:** JWT (`rest_framework_simplejwt`)
- **Media Storage:** Cloudinary
- **Payments:** Stripe (Payment Intents & Webhooks with idempotency)
- **Production Server:** Gunicorn & WhiteNoise

### Frontend
- **Framework:** React (Vite)
- **Styling:** Tailwind CSS, Framer Motion
- **Icons:** Lucide React
- **State Management:** Redux Toolkit
- **Routing:** React Router v7
- **API Client:** Axios (with global error handling & JWT refresh)
- **Testing:** Playwright

## Production Architecture & Deployment

Nexura is configured for modern cloud deployment:
- **Backend:** Hosted on **Render** using Gunicorn (`Procfile` & `render.yaml` included).
- **Frontend:** Hosted on **Vercel** with full client-side routing support (`vercel.json` included).
- **Database:** Hosted on **Neon Serverless PostgreSQL**.

Refer to the deployment guide for complete setup steps, environment keys, and operational commands.

## Local Development Setup

### 1. Backend Setup
```bash
cd Backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py seed_categories
python manage.py runserver
```

### 2. Frontend Setup
```bash
cd Frontend
npm install
npm run dev
```

### 3. Background Workers
To run the background task worker (inventory reservations, abandoned carts, stock notifications):
```bash
cd Backend
python manage.py qcluster
```

## Testing
Run end-to-end tests with Playwright:
```bash
cd Frontend
npx playwright test
```
