# CommerceFlow

CommerceFlow is an AI-powered commerce data management and intelligence application. It enables operations teams and managers to import, map, validate, normalize, and analyze sales, products, inventory, and customer data from heterogeneous files (CSV, Excel) and platform APIs (Shopify, WooCommerce).

The application is built as a highly responsive, high-performance React + Vite Single Page Application (SPA), coupled with Vercel serverless helper functions to proxy API connections and perform lightweight imports.

---

## Features

- **Dynamic Excel/CSV Importer**: Directly read sheets browser-side and normalize columns using local rules or OpenAI models.
- **Intelligent Field Mapping**: Fuzzy matching and historical pattern matching for product details, transaction prices, and order quantities.
- **Production-ready Data Recalculation**: Automates inventory stock level updates and aggregates customer Lifetime Value (LTV) and Average Order Value (AOV).
- **Interactive Dashboards**: Real-time analytical widgets showing revenue growth, cohort classification, customer acquisition, and low stock warnings.

---

## Project Structure

```
├── vercel.json                  # Vercel configuration (routing, CORS headers)
├── .env.example                 # Template for environment variables
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions CI verification workflow
├── api/
│   ├── import.js                # Serverless endpoint: data normalization
│   └── fetch-source.js          # Serverless endpoint: Shopify/WooCommerce proxy
├── docs/
│   └── DEPLOYMENT_GUIDE.md      # Step-by-step Vercel/GitHub deployment guide
├── src/
│   ├── components/
│   │   ├── ErrorBoundary.jsx    # Production error boundary handler
│   │   └── ...
│   ├── utils/
│   │   ├── flexibleImporter.js  # Client-side file parsing and api helper
│   │   └── ...
│   └── main.jsx                 # App entry point (validates env, initializes ErrorBoundary)
└── tests/                       # Unit tests for mapping and importing
```

---

## Getting Started

### Prerequisites

- Node.js (v20 or higher recommended)
- npm (v9 or higher)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Dhruv311boop/Commerce_Flow.git
   cd Commerce_Flow
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Local Development Setup

1. Copy the environment template to create your local variables configuration file:
   ```bash
   cp .env.example .env.local
   ```
2. Open `.env.local` and add your `VITE_OPENAI_API_KEY` (required for OpenAI-based mapping helper).
3. Start the local Vite development server:
   ```bash
   npm run dev
   ```
4. Access the application in your browser at `http://localhost:5173`.

---

## Testing & Compilation

### Running Tests

To run the import engine unit tests locally:
```bash
npm run test:import
```

### Production Build Verification

To compile and verify the production bundle:
```bash
npm run build
```
This command compiles resources into the `dist/` directory and splits bundles automatically to optimize bundle size and delivery performance.

---

## Production Deployment

### One-Click Vercel Deployment

CommerceFlow is configured for zero-friction deployment to Vercel:

1. Push the repository to your GitHub account (as described in the [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)).
2. Go to Vercel, click **Import Project**, and select the repository.
3. Add the required environment variables (`VITE_OPENAI_API_KEY` and `VITE_APP_ENV=production`) in Vercel settings.
4. Click **Deploy**. Vercel will build the frontend assets and automatically host the serverless functions in the `api/` folder.

For detailed custom domain routing, rollback procedures, and repository migration instructions, see the [CommerceFlow Deployment Guide](docs/DEPLOYMENT_GUIDE.md).

---

## Troubleshooting Guide

| Issue | Root Cause | Solution |
|---|---|---|
| **AI Mapping displays a warnings banner** | Missing `VITE_OPENAI_API_KEY` | Make sure the API key is configured correctly in `.env.local` (local) or Vercel Environment Settings (production). |
| **Vercel API routes return 404 / 405** | Incorrect deployment directory | Verify that the `api/` directory is situated at the project root, not inside `src/`. Check that `vercel.json` routing configuration is present at the root. |
| **Excel files fail to load in browser** | Mismatched parser | Check that `xlsx` package is listed in `dependencies` (not devDependencies) in `package.json`. |
| **Vite build throws manualChunks error** | Vite 8 Rolldown compatibility | Rolldown expects `manualChunks` to be configured as a function inside `vite.config.js` rather than an object. Verify you are using the function format. |
