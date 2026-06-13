# CommerceFlow Universal Data Ingestion Engine

FastAPI backend for importing actual commerce data from files, SaaS APIs, SQL databases, and Oracle into normalized CommerceFlow tables.

## Run

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Pipeline

1. `POST /api/import/upload` uploads CSV, XLSX, XLS, JSON, TSV, or business exports.
2. `POST /api/import/detect` previews uploaded imports or connects to Google Sheets, WooCommerce, Shopify, SQL, SQLite, or Oracle.
3. `POST /api/import/map` returns AI-style synonym mapping suggestions.
4. `POST /api/import/validate` returns warnings with row and column context.
5. `POST /api/import/save` normalizes and stores actual records.
6. `POST /api/import/analyze` generates revenue, product, stock, customer, and inventory insights.

The engine never creates demo products, placeholder records, or fake data. Rows that cannot form a real entity are validated and skipped during normalization.

## SQL Table Selection

Call `/api/import/detect` once without `selected_tables` to preview schemas and tables. Call it again with `selected_tables` to import full selected tables using chunked reads.
