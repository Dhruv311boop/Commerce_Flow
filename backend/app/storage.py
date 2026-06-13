from __future__ import annotations

from pathlib import Path

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, MetaData, String, Table, Text, create_engine, text
from sqlalchemy.dialects.sqlite import insert
from sqlalchemy.sql import func


BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
IMPORT_DIR = DATA_DIR / "imports"
DB_PATH = DATA_DIR / "commerceflow.db"

DATA_DIR.mkdir(parents=True, exist_ok=True)
IMPORT_DIR.mkdir(parents=True, exist_ok=True)

metadata = MetaData()

products_table = Table(
    "products",
    metadata,
    Column("id", String, primary_key=True),
    Column("name", String, nullable=False),
    Column("sku", String, index=True),
    Column("category", String),
    Column("price", Float),
    Column("stock", Integer),
    Column("source_import_id", String, index=True),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
)

customers_table = Table(
    "customers",
    metadata,
    Column("id", String, primary_key=True),
    Column("name", String),
    Column("email", String, index=True),
    Column("phone", String),
    Column("city", String),
    Column("state", String),
    Column("acquisition_date", String, index=True),
    Column("source_import_id", String, index=True),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), server_default=func.now()),
)

orders_table = Table(
    "orders",
    metadata,
    Column("id", String, primary_key=True),
    Column("customer_id", String, index=True),
    Column("customer", String),
    Column("product", String),
    Column("quantity", Integer),
    Column("amount", Float),
    Column("order_date", String, index=True),
    Column("status", String),
    Column("source_import_id", String, index=True),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), server_default=func.now()),
)

customer_acquisition_table = Table(
    "customer_acquisition",
    metadata,
    Column("customer_id", String, primary_key=True),
    Column("customer_name", String),
    Column("acquisition_date", String, index=True),
    Column("first_order_date", String, index=True),
    Column("first_order_value", Float),
    Column("acquisition_source", String),
    Column("location", String),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), server_default=func.now()),
)

inventory_table = Table(
    "inventory",
    metadata,
    Column("id", String, primary_key=True),
    Column("product", String, nullable=False),
    Column("stock", Integer),
    Column("reorder_level", Integer),
    Column("source_import_id", String, index=True),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
)

imports_table = Table(
    "imports",
    metadata,
    Column("id", String, primary_key=True),
    Column("source_type", String, nullable=False),
    Column("dataset_count", Integer, nullable=False, default=0),
    Column("row_count", Integer, nullable=False, default=0),
    Column("saved", Boolean, nullable=False, default=False),
    Column("metadata_json", Text),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
)

engine = create_engine(f"sqlite:///{DB_PATH}", future=True)
metadata.create_all(engine)


def ensure_schema() -> None:
    migrations = {
        "customers": [
            ("city", "TEXT"),
            ("state", "TEXT"),
            ("acquisition_date", "TEXT"),
            ("updated_at", "DATETIME"),
        ],
        "orders": [
            ("customer_id", "TEXT"),
            ("order_date", "TEXT"),
            ("updated_at", "DATETIME"),
        ],
    }

    with engine.begin() as connection:
        for table_name, columns in migrations.items():
            existing = {row._mapping["name"] for row in connection.execute(text(f"PRAGMA table_info({table_name})"))}
            for column_name, column_type in columns:
                if column_name not in existing:
                    connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"))


ensure_schema()


def upsert_many(table: Table, rows: list[dict]) -> int:
    if not rows:
        return 0

    with engine.begin() as connection:
        statement = insert(table).values(rows)
        update_columns = {
            column.name: statement.excluded[column.name]
            for column in table.columns
            if not column.primary_key and column.name != "created_at"
        }
        connection.execute(statement.on_conflict_do_update(index_elements=["id"], set_=update_columns))
    return len(rows)
