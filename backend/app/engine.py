from __future__ import annotations

import csv
import hashlib
import importlib.util
import json
import re
import shutil
import uuid
from pathlib import Path
from typing import Any
from urllib.parse import quote_plus

import pandas as pd
import requests
from sqlalchemy import create_engine, func, inspect, select, text

from .models import (
    AnalyticsResponse,
    ApiConnection,
    CustomerAcquisitionGrowthResponse,
    CustomerAcquisitionRecord,
    CustomerAcquisitionResponse,
    DatabaseConnection,
    DatasetPreview,
    MappingSuggestion,
    NormalizedCounts,
    SourceType,
    ValidationIssue,
)
from .storage import (
    IMPORT_DIR,
    customer_acquisition_table,
    customers_table,
    engine as app_engine,
    imports_table,
    inventory_table,
    orders_table,
    products_table,
    upsert_many,
)


CHUNK_SIZE = 10_000
PREVIEW_ROWS = 100
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

FIELD_LABELS: dict[str, tuple[str, str]] = {
    "product_id": ("Products", "Product ID"),
    "product_name": ("Products", "Product Name"),
    "sku": ("Products", "SKU"),
    "category": ("Products", "Category"),
    "price": ("Products", "Price"),
    "stock": ("Inventory", "Stock Quantity"),
    "reorder_level": ("Inventory", "Reorder Level"),
    "customer_id": ("Customers", "Customer ID"),
    "customer_name": ("Customers", "Customer Name"),
    "customer_email": ("Customers", "Customer Email"),
    "customer_phone": ("Customers", "Customer Phone"),
    "customer_city": ("Customers", "Customer City"),
    "customer_state": ("Customers", "Customer State"),
    "acquisition_date": ("Customers", "Acquisition Date"),
    "order_id": ("Orders", "Order ID"),
    "order_date": ("Orders", "Order Date"),
    "quantity": ("Orders", "Quantity"),
    "amount": ("Revenue", "Amount"),
    "status": ("Orders", "Status"),
    "supplier_name": ("Suppliers", "Supplier Name"),
}

ALIASES: dict[str, list[str]] = {
    "product_id": ["product id", "product_id", "pid", "item id", "item_id"],
    "product_name": ["product", "product name", "product_name", "item name", "item_name", "item", "title", "name", "line item"],
    "sku": ["sku", "sku code", "sku_code", "product sku", "item sku", "variant sku", "code"],
    "category": ["category", "product category", "collection", "type", "department"],
    "price": ["price", "selling price", "selling_price", "unit price", "unit_price", "rate", "mrp"],
    "stock": ["stock", "stock qty", "stock_qty", "inventory", "inventory quantity", "qty", "quantity available", "on hand"],
    "reorder_level": ["reorder level", "reorder_level", "minimum stock", "min stock", "safety stock"],
    "customer_id": ["customer id", "customer_id", "client id", "buyer id"],
    "customer_name": ["customer", "customer name", "customer_name", "client", "buyer", "billing name", "full name"],
    "customer_email": ["email", "customer email", "customer_email", "billing email", "buyer email", "email address"],
    "customer_phone": ["phone", "telephone", "mobile", "customer phone", "billing phone"],
    "customer_city": ["city", "customer city", "billing city", "shipping city", "town", "location city"],
    "customer_state": ["state", "province", "region", "customer state", "billing state", "shipping state"],
    "acquisition_date": ["acquisition date", "signup date", "sign up date", "registered at", "registration date", "created at", "customer since"],
    "order_id": ["order id", "order_id", "order number", "order_number", "order", "invoice id"],
    "order_date": ["order date", "order_date", "date", "created at", "created_at", "paid at", "processed at", "purchase date"],
    "quantity": ["quantity", "qty", "qty ordered", "items", "units", "lineitem quantity"],
    "amount": ["amount", "total", "order total", "grand total", "net sales", "sales", "revenue"],
    "status": ["status", "order status", "payment status", "fulfillment status"],
    "supplier_name": ["supplier", "supplier name", "vendor", "vendor name"],
}


def _clean_header(value: Any) -> str:
    return str(value or "").strip().lower().replace("-", " ")


def _compact(value: Any) -> str:
    return re.sub(r"[^a-z0-9]", "", _clean_header(value))


def _safe_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    parsed = pd.to_numeric(str(value).replace(",", "").replace("$", ""), errors="coerce")
    return None if pd.isna(parsed) else float(parsed)


def _safe_int(value: Any) -> int | None:
    number = _safe_float(value)
    return None if number is None else int(number)


def _safe_date(value: Any) -> str | None:
    if value is None or value == "" or pd.isna(value):
        return None
    parsed = pd.to_datetime(value, errors="coerce")
    if pd.isna(parsed):
        return None
    return parsed.date().isoformat()


def _is_missing(value: Any) -> bool:
    return pd.isna(value) or str(value).strip() == ""


def _actual_id(prefix: str, values: list[Any]) -> str:
    source = "|".join(str(value).strip() for value in values if value not in (None, ""))
    digest = hashlib.sha256(source.encode("utf-8")).hexdigest()[:20]
    return f"{prefix}_{digest}"


def _json_default(value: Any) -> Any:
    if pd.isna(value):
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def _frame_to_records(df: pd.DataFrame) -> list[dict[str, Any]]:
    safe = df.where(pd.notnull(df), None)
    return json.loads(json.dumps(safe.to_dict(orient="records"), default=_json_default))


def _preview(name: str, df: pd.DataFrame) -> DatasetPreview:
    return DatasetPreview(
        name=name,
        rows=len(df),
        columns=[str(column) for column in df.columns],
        sample_rows=_frame_to_records(df.head(10)),
    )


class ImportStore:
    def __init__(self, root: Path = IMPORT_DIR):
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)

    def create_import(self, source_type: SourceType, datasets: dict[str, pd.DataFrame], metadata: dict[str, Any] | None = None) -> str:
        import_id = uuid.uuid4().hex
        folder = self.root / import_id
        folder.mkdir(parents=True, exist_ok=True)
        manifest = {
            "import_id": import_id,
            "source_type": source_type.value,
            "datasets": [],
            "metadata": metadata or {},
        }

        total_rows = 0
        for name, df in datasets.items():
            file_name = f"{_compact(name) or 'dataset'}.jsonl"
            path = folder / file_name
            df.where(pd.notnull(df), None).to_json(path, orient="records", lines=True, force_ascii=False, date_format="iso")
            manifest["datasets"].append({"name": name, "path": file_name, "rows": len(df), "columns": [str(column) for column in df.columns]})
            total_rows += len(df)

        (folder / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        with app_engine.begin() as connection:
            connection.execute(
                imports_table.insert().values(
                    id=import_id,
                    source_type=source_type.value,
                    dataset_count=len(datasets),
                    row_count=total_rows,
                    saved=False,
                    metadata_json=json.dumps(metadata or {}),
                )
            )
        return import_id

    def load(self, import_id: str) -> tuple[SourceType, dict[str, pd.DataFrame]]:
        folder = self.root / import_id
        manifest_path = folder / "manifest.json"
        if not manifest_path.exists():
            raise ValueError(f"Unknown import_id: {import_id}")

        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        datasets = {}
        for item in manifest["datasets"]:
            datasets[item["name"]] = pd.read_json(folder / item["path"], orient="records", lines=True)
        return SourceType(manifest["source_type"]), datasets

    def previews(self, import_id: str) -> list[DatasetPreview]:
        _, datasets = self.load(import_id)
        return [_preview(name, df) for name, df in datasets.items()]


class UniversalDataIngestionEngine:
    def __init__(self):
        self.store = ImportStore()

    def detect_file_source(self, file_name: str, content_type: str | None = None) -> SourceType:
        suffix = Path(file_name).suffix.lower()
        if suffix == ".csv":
            return SourceType.csv
        if suffix in {".xlsx", ".xls"}:
            return SourceType.excel
        if suffix == ".json":
            return SourceType.json
        if suffix in {".txt", ".tsv"}:
            return SourceType.business_export
        if content_type and "json" in content_type:
            return SourceType.json
        return SourceType.business_export

    def parse_uploaded_file(self, source_path: Path, original_name: str, content_type: str | None = None) -> tuple[SourceType, dict[str, pd.DataFrame]]:
        source_type = self.detect_file_source(original_name, content_type)
        suffix = Path(original_name).suffix.lower()

        if suffix == ".csv":
            return source_type, {"csv": pd.read_csv(source_path, chunksize=None)}

        if suffix == ".tsv":
            return source_type, {"tsv": pd.read_csv(source_path, sep="\t")}

        if suffix in {".xlsx", ".xls"}:
            engine = "openpyxl" if suffix == ".xlsx" else "xlrd"
            sheets = pd.read_excel(source_path, sheet_name=None, engine=engine)
            return SourceType.excel, {name: frame for name, frame in sheets.items()}

        if suffix == ".json":
            payload = json.loads(source_path.read_text(encoding="utf-8"))
            return SourceType.json, self._frames_from_json(payload)

        try:
            dialect = csv.Sniffer().sniff(source_path.read_text(encoding="utf-8", errors="ignore")[:4096])
            return source_type, {"business_export": pd.read_csv(source_path, delimiter=dialect.delimiter)}
        except csv.Error:
            return source_type, {"business_export": pd.read_csv(source_path)}

    def _frames_from_json(self, payload: Any) -> dict[str, pd.DataFrame]:
        if isinstance(payload, list):
            return {"json": pd.DataFrame(payload)}
        if isinstance(payload, dict):
            frames = {key: pd.DataFrame(value) for key, value in payload.items() if isinstance(value, list)}
            if frames:
                return frames
            return {"json": pd.json_normalize(payload)}
        raise ValueError("JSON import must contain an object or an array of records.")

    def upload_file(self, file_obj: Any, original_name: str, content_type: str | None = None) -> tuple[str, SourceType, list[DatasetPreview]]:
        temp_folder = IMPORT_DIR / "_uploads"
        temp_folder.mkdir(parents=True, exist_ok=True)
        temp_path = temp_folder / f"{uuid.uuid4().hex}_{Path(original_name).name}"
        with temp_path.open("wb") as output:
            shutil.copyfileobj(file_obj, output)

        source_type, datasets = self.parse_uploaded_file(temp_path, original_name, content_type)
        import_id = self.store.create_import(source_type, datasets, {"file_name": original_name})
        temp_path.unlink(missing_ok=True)
        return import_id, source_type, [_preview(name, df) for name, df in datasets.items()]

    def sqlalchemy_url(self, connection: DatabaseConnection) -> str:
        password = quote_plus(connection.password.get_secret_value()) if connection.password else ""
        username = quote_plus(connection.username or "")
        host = connection.host or "localhost"

        if connection.source_type == SourceType.mysql:
            return f"mysql+pymysql://{username}:{password}@{host}:{connection.port or 3306}/{connection.database or ''}"
        if connection.source_type == SourceType.postgresql:
            driver = "psycopg2" if importlib.util.find_spec("psycopg2") else "psycopg"
            return f"postgresql+{driver}://{username}:{password}@{host}:{connection.port or 5432}/{connection.database or ''}"
        if connection.source_type == SourceType.sql_server:
            driver = quote_plus(connection.driver or "ODBC Driver 18 for SQL Server")
            return f"mssql+pyodbc://{username}:{password}@{host}:{connection.port or 1433}/{connection.database or ''}?driver={driver}&TrustServerCertificate=yes"
        if connection.source_type == SourceType.sqlite:
            if not connection.sqlite_path:
                raise ValueError("sqlite_path is required for SQLite imports.")
            return f"sqlite:///{connection.sqlite_path}"
        if connection.source_type == SourceType.oracle:
            service = connection.service_name or connection.database or ""
            return f"oracle+oracledb://{username}:{password}@{host}:{connection.port or 1521}/?service_name={service}"
        raise ValueError(f"Unsupported database source: {connection.source_type}")

    def discover_database(self, connection: DatabaseConnection) -> tuple[str, SourceType, list[DatasetPreview]]:
        db_engine = create_engine(self.sqlalchemy_url(connection), future=True)
        inspector = inspect(db_engine)
        datasets: dict[str, pd.DataFrame] = {}

        with db_engine.connect() as db:
            for schema in inspector.get_schema_names():
                if schema.lower() in {"information_schema", "pg_catalog", "sys"}:
                    continue
                for table_name in inspector.get_table_names(schema=schema):
                    dataset_name = f"{schema}.{table_name}"
                    if connection.selected_tables and dataset_name not in connection.selected_tables and table_name not in connection.selected_tables:
                        continue
                    preparer = db_engine.dialect.identifier_preparer
                    quoted_schema = preparer.quote_schema(schema)
                    quoted_table = preparer.quote(table_name)
                    if connection.selected_tables:
                        statement = text(f"SELECT * FROM {quoted_schema}.{quoted_table}")
                    else:
                        statement = text(f"SELECT * FROM {quoted_schema}.{quoted_table} LIMIT {PREVIEW_ROWS}")
                        if connection.source_type == SourceType.sql_server:
                            statement = text(f"SELECT TOP {PREVIEW_ROWS} * FROM {quoted_schema}.{quoted_table}")
                        if connection.source_type == SourceType.oracle:
                            statement = text(f"SELECT * FROM {quoted_schema}.{quoted_table} FETCH FIRST {PREVIEW_ROWS} ROWS ONLY")

                    if connection.selected_tables:
                        chunks = pd.read_sql(statement, db, chunksize=CHUNK_SIZE)
                        chunk_list = list(chunks)
                        datasets[dataset_name] = pd.concat(chunk_list, ignore_index=True) if chunk_list else pd.DataFrame()
                    else:
                        datasets[dataset_name] = pd.read_sql(statement, db)

        import_id = self.store.create_import(connection.source_type, datasets, {"connection": connection.model_dump(mode="json", exclude={"password"})})
        return import_id, connection.source_type, [_preview(name, df) for name, df in datasets.items()]

    def import_api_source(self, connection: ApiConnection) -> tuple[str, SourceType, list[DatasetPreview]]:
        if connection.source_type == SourceType.google_sheets:
            return self._import_google_sheet(connection)
        if connection.source_type == SourceType.woocommerce:
            return self._import_woocommerce(connection)
        if connection.source_type == SourceType.shopify:
            return self._import_shopify(connection)
        raise ValueError(f"Unsupported API source: {connection.source_type}")

    def _import_google_sheet(self, connection: ApiConnection) -> tuple[str, SourceType, list[DatasetPreview]]:
        import gspread
        from google.oauth2.service_account import Credentials

        if not connection.credentials_json or not connection.spreadsheet_id:
            raise ValueError("Google Sheets imports require credentials_json and spreadsheet_id.")
        credentials = Credentials.from_service_account_info(connection.credentials_json, scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"])
        client = gspread.authorize(credentials)
        spreadsheet = client.open_by_key(connection.spreadsheet_id)
        worksheets = [spreadsheet.worksheet(connection.worksheet)] if connection.worksheet else spreadsheet.worksheets()
        datasets = {sheet.title: pd.DataFrame(sheet.get_all_records()) for sheet in worksheets}
        import_id = self.store.create_import(SourceType.google_sheets, datasets, {"spreadsheet_id": connection.spreadsheet_id})
        return import_id, SourceType.google_sheets, [_preview(name, df) for name, df in datasets.items()]

    def _import_woocommerce(self, connection: ApiConnection) -> tuple[str, SourceType, list[DatasetPreview]]:
        from woocommerce import API

        if not connection.url or not connection.api_key or not connection.api_secret:
            raise ValueError("WooCommerce imports require url, api_key, and api_secret.")
        wcapi = API(
            url=connection.url,
            consumer_key=connection.api_key.get_secret_value(),
            consumer_secret=connection.api_secret.get_secret_value(),
            version="wc/v3",
            timeout=30,
        )
        datasets = {
            "products": pd.DataFrame(wcapi.get("products", params={"per_page": 100}).json()),
            "orders": pd.DataFrame(wcapi.get("orders", params={"per_page": 100}).json()),
            "customers": pd.DataFrame(wcapi.get("customers", params={"per_page": 100}).json()),
        }
        import_id = self.store.create_import(SourceType.woocommerce, datasets, {"url": connection.url})
        return import_id, SourceType.woocommerce, [_preview(name, df) for name, df in datasets.items()]

    def _import_shopify(self, connection: ApiConnection) -> tuple[str, SourceType, list[DatasetPreview]]:
        if not connection.url or not connection.access_token:
            raise ValueError("Shopify imports require url and access_token.")
        headers = {"X-Shopify-Access-Token": connection.access_token.get_secret_value()}
        base = connection.url.rstrip("/")
        datasets = {}
        for resource in ["products", "orders", "customers"]:
            response = requests.get(f"{base}/admin/api/2026-04/{resource}.json", headers=headers, timeout=30)
            response.raise_for_status()
            datasets[resource] = pd.DataFrame(response.json().get(resource, []))
        import_id = self.store.create_import(SourceType.shopify, datasets, {"url": connection.url})
        return import_id, SourceType.shopify, [_preview(name, df) for name, df in datasets.items()]

    def score_column(self, column: str, field: str) -> int:
        normalized = _clean_header(column)
        compacted = _compact(column)
        aliases = ALIASES[field]
        if normalized in aliases:
            return 98
        if compacted in {_compact(alias) for alias in aliases}:
            return 96
        if any(compacted in _compact(alias) or _compact(alias) in compacted for alias in aliases):
            return 88
        words = set(normalized.split())
        alias_words = {word for alias in aliases for word in _clean_header(alias).split()}
        overlap = len(words & alias_words)
        return min(82, 55 + overlap * 10) if overlap else 0

    def map_import(self, import_id: str, manual_mappings: list[MappingSuggestion] | None = None) -> tuple[list[MappingSuggestion], dict[str, bool], int]:
        _, datasets = self.store.load(import_id)
        automatic = []
        for dataset_name, df in datasets.items():
            for column in df.columns:
                best_field, best_score = None, 0
                for field in FIELD_LABELS:
                    score = self.score_column(str(column), field)
                    if score > best_score:
                        best_field, best_score = field, score
                entity, label = FIELD_LABELS[best_field] if best_field else ("Unmapped", "Unmapped")
                automatic.append(
                    MappingSuggestion(
                        dataset=dataset_name,
                        source_column=str(column),
                        entity=entity if best_score else "Unmapped",
                        target_field=best_field if best_score else None,
                        display_name=label if best_score else "Unmapped",
                        confidence=best_score,
                    )
                )

        mappings = self._merge_manual_mappings(automatic, manual_mappings)
        entities = {name: any(item.entity == name for item in mappings) for name in ["Products", "Customers", "Orders", "Inventory", "Suppliers", "Revenue"]}
        confidence = round(sum(item.confidence for item in mappings) / max(1, len(mappings)))
        return mappings, entities, confidence

    def _merge_manual_mappings(self, automatic: list[MappingSuggestion], manual: list[MappingSuggestion] | None) -> list[MappingSuggestion]:
        if not manual:
            return automatic
        manual_by_key = {(item.dataset, item.source_column): item for item in manual}
        return [manual_by_key.get((item.dataset, item.source_column), item) for item in automatic]

    def _column_map(self, mappings: list[MappingSuggestion], dataset: str) -> dict[str, str]:
        return {item.target_field: item.source_column for item in mappings if item.dataset == dataset and item.target_field}

    def validate_import(self, import_id: str, mappings: list[MappingSuggestion] | None = None) -> list[ValidationIssue]:
        _, datasets = self.store.load(import_id)
        resolved, _, _ = self.map_import(import_id, mappings)
        issues: list[ValidationIssue] = []

        for dataset, df in datasets.items():
            column_map = self._column_map(resolved, dataset)
            for field, label in [("product_name", "Product Name"), ("sku", "SKU"), ("price", "Price"), ("customer_name", "Customer Name"), ("customer_email", "Customer Email")]:
                if field not in column_map:
                    issues.append(
                        ValidationIssue(
                            dataset=dataset,
                            column=label,
                            message=f"Missing mapped column: {label}.",
                            suggested_fix=f"Map the source column containing {label.lower()}.",
                        )
                    )

            if "sku" in column_map:
                sku_series = df[column_map["sku"]].fillna("").astype(str).str.strip()
                duplicates = df[(sku_series != "") & sku_series.duplicated(keep=False)]
                for index, row in duplicates.head(200).iterrows():
                    issues.append(
                        ValidationIssue(
                            dataset=dataset,
                            row_number=int(index) + 2,
                            column=column_map["sku"],
                            message=f"Duplicate SKU: {row[column_map['sku']]}.",
                            suggested_fix="Merge duplicate product rows or provide unique SKUs.",
                        )
                    )

            for index, row in df.head(100_000).iterrows():
                row_number = int(index) + 2
                for field, label in [("product_name", "Product Name"), ("sku", "SKU"), ("customer_name", "Customer Name")]:
                    if field in column_map and _is_missing(row.get(column_map[field])):
                        issues.append(
                            ValidationIssue(
                                dataset=dataset,
                                row_number=row_number,
                                column=column_map[field],
                                message=f"Missing value for {label}.",
                                suggested_fix=f"Fill {label.lower()} or remove the incomplete row before saving.",
                            )
                        )
                if "price" in column_map:
                    price = _safe_float(row.get(column_map["price"]))
                    if price is not None and price < 0:
                        issues.append(ValidationIssue(dataset=dataset, row_number=row_number, column=column_map["price"], message="Invalid price.", suggested_fix="Use a non-negative numeric price."))
                if "customer_email" in column_map:
                    email = str(row.get(column_map["customer_email"]) or "").strip()
                    if email and not EMAIL_RE.match(email):
                        issues.append(ValidationIssue(dataset=dataset, row_number=row_number, column=column_map["customer_email"], message="Invalid email address.", suggested_fix="Use a valid address such as customer@example.com."))
                if "customer_name" in column_map and "customer_email" in column_map:
                    email = str(row.get(column_map["customer_email"]) or "").strip()
                    name = str(row.get(column_map["customer_name"]) or "").strip()
                    if email and not name:
                        issues.append(ValidationIssue(dataset=dataset, row_number=row_number, column=column_map["customer_name"], message="Missing customer name.", suggested_fix="Add a customer name or map the correct source column."))
        return issues

    def normalize_import(self, import_id: str, mappings: list[MappingSuggestion] | None = None) -> dict[str, list[dict[str, Any]]]:
        _, datasets = self.store.load(import_id)
        resolved, _, _ = self.map_import(import_id, mappings)
        products: dict[str, dict[str, Any]] = {}
        customers: dict[str, dict[str, Any]] = {}
        orders: dict[str, dict[str, Any]] = {}
        inventory: dict[str, dict[str, Any]] = {}

        for dataset, df in datasets.items():
            column_map = self._column_map(resolved, dataset)
            for start in range(0, len(df), CHUNK_SIZE):
                for _, row in df.iloc[start : start + CHUNK_SIZE].iterrows():
                    get = lambda field: row.get(column_map[field]) if field in column_map else None

                    product_name = str(get("product_name") or "").strip()
                    sku = str(get("sku") or "").strip()
                    if product_name or sku:
                        product_key = sku or product_name.lower()
                        price = _safe_float(get("price"))
                        stock = _safe_int(get("stock"))
                        if product_key not in products and product_name:
                            products[product_key] = {
                                "id": str(get("product_id") or _actual_id("product", [product_name, sku])),
                                "name": product_name,
                                "sku": sku,
                                "category": str(get("category") or "").strip(),
                                "price": price,
                                "stock": stock,
                                "source_import_id": import_id,
                            }
                        if product_name and stock is not None:
                            inventory[product_key] = {
                                "id": _actual_id("inventory", [product_name, sku]),
                                "product": product_name,
                                "stock": stock,
                                "reorder_level": _safe_int(get("reorder_level")) or 5,
                                "source_import_id": import_id,
                            }

                    customer_name = str(get("customer_name") or "").strip()
                    customer_email = str(get("customer_email") or "").strip().lower()
                    if customer_name or customer_email:
                        customer_key = customer_email or customer_name.lower()
                        if customer_key not in customers:
                            city = str(get("customer_city") or "").strip()
                            state = str(get("customer_state") or "").strip()
                            customers[customer_key] = {
                                "id": str(get("customer_id") or _actual_id("customer", [customer_name, customer_email])),
                                "name": customer_name,
                                "email": customer_email,
                                "phone": str(get("customer_phone") or "").strip(),
                                "city": city,
                                "state": state,
                                "acquisition_date": _safe_date(get("acquisition_date")),
                                "source_import_id": import_id,
                            }

                    order_id = str(get("order_id") or "").strip()
                    quantity = _safe_int(get("quantity"))
                    amount = _safe_float(get("amount"))
                    status = str(get("status") or "").strip()
                    order_date = _safe_date(get("order_date"))
                    if order_id or quantity is not None or amount is not None or status:
                        actual_values = [order_id, customer_name, customer_email, product_name, sku, quantity, amount, status]
                        order_key = order_id or _actual_id("order", actual_values)
                        orders[order_key] = {
                            "id": order_key,
                            "customer_id": customers.get(customer_email or customer_name.lower(), {}).get("id"),
                            "customer": customer_name or customer_email,
                            "product": product_name or sku,
                            "quantity": quantity,
                            "amount": amount,
                            "order_date": order_date,
                            "status": status,
                            "source_import_id": import_id,
                        }

        return {
            "products": list(products.values()),
            "customers": list(customers.values()),
            "orders": list(orders.values()),
            "inventory": list(inventory.values()),
        }

    def save_import(self, import_id: str, mappings: list[MappingSuggestion] | None = None, replace_existing: bool = False) -> tuple[NormalizedCounts, list[ValidationIssue]]:
        issues = self.validate_import(import_id, mappings)
        normalized = self.normalize_import(import_id, mappings)

        with app_engine.begin() as connection:
            if replace_existing:
                for table_obj in [products_table, customers_table, orders_table, inventory_table]:
                    connection.execute(table_obj.delete().where(table_obj.c.source_import_id == import_id))

        counts = NormalizedCounts(
            products=upsert_many(products_table, normalized["products"]),
            customers=upsert_many(customers_table, normalized["customers"]),
            orders=upsert_many(orders_table, normalized["orders"]),
            inventory=upsert_many(inventory_table, normalized["inventory"]),
        )

        with app_engine.begin() as connection:
            connection.execute(imports_table.update().where(imports_table.c.id == import_id).values(saved=True))
        self.recalculate_customer_acquisition()
        return counts, issues

    def recalculate_customer_acquisition(self) -> None:
        with app_engine.begin() as connection:
            connection.execute(customer_acquisition_table.delete())
            connection.execute(
                text(
                    """
                    WITH order_matches AS (
                        SELECT
                            c.id AS customer_id,
                            COALESCE(o.order_date, date(o.created_at)) AS first_order_date,
                            COALESCE(o.amount, 0) AS first_order_value,
                            ROW_NUMBER() OVER (
                                PARTITION BY c.id
                                ORDER BY COALESCE(o.order_date, date(o.created_at), date('now')), o.created_at
                            ) AS rn
                        FROM customers c
                        LEFT JOIN orders o
                          ON o.customer_id = c.id
                          OR lower(COALESCE(o.customer, '')) = lower(COALESCE(c.name, ''))
                          OR lower(COALESCE(o.customer, '')) = lower(COALESCE(c.email, ''))
                    )
                    INSERT INTO customer_acquisition (
                        customer_id,
                        customer_name,
                        acquisition_date,
                        first_order_date,
                        first_order_value,
                        acquisition_source,
                        location,
                        created_at,
                        updated_at
                    )
                    SELECT
                        c.id,
                        c.name,
                        COALESCE(c.acquisition_date, om.first_order_date, date(c.created_at), date('now')) AS acquisition_date,
                        om.first_order_date,
                        COALESCE(om.first_order_value, 0),
                        COALESCE(c.source_import_id, 'direct'),
                        trim(COALESCE(c.city, '') || CASE WHEN COALESCE(c.city, '') != '' AND COALESCE(c.state, '') != '' THEN ', ' ELSE '' END || COALESCE(c.state, '')),
                        CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP
                    FROM customers c
                    LEFT JOIN order_matches om ON om.customer_id = c.id AND om.rn = 1
                    WHERE c.id IS NOT NULL
                    """
                )
            )

    def customer_acquisition(self) -> CustomerAcquisitionResponse:
        self.recalculate_customer_acquisition()
        with app_engine.connect() as connection:
            rows = connection.execute(
                select(customer_acquisition_table).order_by(customer_acquisition_table.c.acquisition_date)
            ).mappings().all()

        records = [
            CustomerAcquisitionRecord(
                customer_id=row["customer_id"],
                customer_name=row["customer_name"],
                acquisition_date=row["acquisition_date"],
                first_order_date=row["first_order_date"],
                first_order_value=float(row["first_order_value"] or 0),
                acquisition_source=row["acquisition_source"],
                location=row["location"],
            )
            for row in rows
            if row["acquisition_date"]
        ]
        return CustomerAcquisitionResponse(records=records, total_acquired_customers=len(records))

    def customer_acquisition_growth(self, granularity: str = "month") -> CustomerAcquisitionGrowthResponse:
        self.recalculate_customer_acquisition()
        granularity = granularity if granularity in {"day", "week", "month", "year"} else "month"
        bucket_expr = {
            "day": "date(acquisition_date)",
            "week": "strftime('%Y-W%W', acquisition_date)",
            "month": "strftime('%Y-%m', acquisition_date)",
            "year": "strftime('%Y', acquisition_date)",
        }[granularity]

        with app_engine.connect() as connection:
            rows = connection.execute(
                text(
                    f"""
                    SELECT {bucket_expr} AS bucket, COUNT(DISTINCT customer_id) AS customers
                    FROM customer_acquisition
                    WHERE acquisition_date IS NOT NULL AND acquisition_date != ''
                    GROUP BY bucket
                    ORDER BY bucket
                    """
                )
            ).mappings().all()
            total = connection.execute(
                select(func.count(func.distinct(customer_acquisition_table.c.customer_id)))
            ).scalar_one()

        labels = [str(row["bucket"]) for row in rows]
        customer_counts = [int(row["customers"] or 0) for row in rows]
        new_customers = customer_counts[-1] if customer_counts else 0
        previous = customer_counts[-2] if len(customer_counts) >= 2 else 0
        growth_percent = ((new_customers - previous) / previous * 100) if previous else None
        trend = [{"label": label, "customers": count} for label, count in zip(labels, customer_counts)]

        return CustomerAcquisitionGrowthResponse(
            labels=labels,
            customers=customer_counts,
            granularity=granularity,  # type: ignore[arg-type]
            total_acquired_customers=int(total or 0),
            new_customers=new_customers,
            growth_percent=growth_percent,
            acquisition_trend=trend,
        )

    def analyze_import(self, import_id: str | None = None) -> AnalyticsResponse:
        with app_engine.connect() as connection:
            product_rows = [dict(row._mapping) for row in connection.execute(select(products_table))]
            customer_rows = [dict(row._mapping) for row in connection.execute(select(customers_table))]
            order_rows = [dict(row._mapping) for row in connection.execute(select(orders_table))]
            inventory_rows = [dict(row._mapping) for row in connection.execute(select(inventory_table))]

        if import_id:
            product_rows = [row for row in product_rows if row["source_import_id"] == import_id]
            customer_rows = [row for row in customer_rows if row["source_import_id"] == import_id]
            order_rows = [row for row in order_rows if row["source_import_id"] == import_id]
            inventory_rows = [row for row in inventory_rows if row["source_import_id"] == import_id]

        total_revenue = sum(float(row["amount"] or 0) for row in order_rows)
        order_count = len(order_rows)
        product_sales: dict[str, dict[str, Any]] = {}
        for order in order_rows:
            product = order.get("product")
            if product:
                current = product_sales.setdefault(product, {"name": product, "quantity": 0, "revenue": 0.0})
                current["quantity"] += int(order.get("quantity") or 0)
                current["revenue"] += float(order.get("amount") or 0)

        top_products = sorted(product_sales.values(), key=lambda item: (item["revenue"], item["quantity"]), reverse=True)[:10]
        if not top_products:
            top_products = sorted(
                [{"name": row["name"], "sku": row["sku"], "stock": row["stock"], "price": row["price"]} for row in product_rows],
                key=lambda item: item["price"] or 0,
                reverse=True,
            )[:10]
        low_stock = [row for row in inventory_rows if int(row["stock"] or 0) <= int(row["reorder_level"] or 5)]

        return AnalyticsResponse(
            revenue_analysis={"total_revenue": total_revenue, "order_count": order_count, "average_order_value": total_revenue / order_count if order_count else 0},
            top_products=top_products,
            low_stock_alerts=[{"product": row["product"], "stock": row["stock"], "reorder_level": row["reorder_level"]} for row in low_stock],
            customer_insights={"customer_count": len(customer_rows), "customers_with_email": sum(1 for row in customer_rows if row.get("email"))},
            inventory_recommendations=[{"product": row["product"], "recommendation": f"Reorder above {row['reorder_level']} units.", "stock": row["stock"]} for row in low_stock],
        )
