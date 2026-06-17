from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field, SecretStr


class SourceType(str, Enum):
    csv = "csv"
    excel = "excel"
    json = "json"
    google_sheets = "google_sheets"
    woocommerce = "woocommerce"
    shopify = "shopify"
    mysql = "mysql"
    postgresql = "postgresql"
    sql_server = "sql_server"
    sqlite = "sqlite"
    oracle = "oracle"
    business_export = "business_export"


class DatasetPreview(BaseModel):
    name: str
    rows: int
    columns: list[str]
    sample_rows: list[dict[str, Any]]


class MappingSuggestion(BaseModel):
    dataset: str
    source_column: str
    entity: str
    target_field: str | None
    display_name: str
    confidence: int = Field(ge=0, le=100)


class ValidationIssue(BaseModel):
    dataset: str
    row_number: int | None = None
    column: str | None = None
    severity: Literal["warning", "error"] = "warning"
    message: str
    suggested_fix: str


class DatabaseConnection(BaseModel):
    source_type: Literal[
        SourceType.mysql,
        SourceType.postgresql,
        SourceType.sql_server,
        SourceType.sqlite,
        SourceType.oracle,
    ]
    host: str | None = None
    port: int | None = None
    database: str | None = None
    service_name: str | None = None
    username: str | None = None
    password: SecretStr | None = None
    sqlite_path: str | None = None
    driver: str | None = None
    selected_tables: list[str] | None = None


class ApiConnection(BaseModel):
    source_type: Literal[SourceType.google_sheets, SourceType.woocommerce, SourceType.shopify]
    url: str | None = None
    spreadsheet_id: str | None = None
    worksheet: str | None = None
    credentials_json: dict[str, Any] | None = None
    api_key: SecretStr | None = None
    api_secret: SecretStr | None = None
    access_token: SecretStr | None = None


class DetectRequest(BaseModel):
    import_id: str | None = None
    connection: DatabaseConnection | ApiConnection | None = None


class MapRequest(BaseModel):
    import_id: str
    manual_mappings: list[MappingSuggestion] | None = None


class ValidateRequest(BaseModel):
    import_id: str
    mappings: list[MappingSuggestion] | None = None


class SaveRequest(BaseModel):
    import_id: str
    mappings: list[MappingSuggestion] | None = None
    replace_existing: bool = False


class AnalyzeRequest(BaseModel):
    import_id: str | None = None


class ImportResponse(BaseModel):
    import_id: str
    source_type: SourceType
    datasets: list[DatasetPreview]


class MappingResponse(BaseModel):
    import_id: str
    mappings: list[MappingSuggestion]
    detected_entities: dict[str, bool]
    confidence: int


class ValidationResponse(BaseModel):
    import_id: str
    issues: list[ValidationIssue]
    valid: bool


class NormalizedCounts(BaseModel):
    products: int
    customers: int
    orders: int
    inventory: int


class SaveResponse(BaseModel):
    import_id: str
    saved: bool
    counts: NormalizedCounts
    validation_issues: list[ValidationIssue]


class AnalyticsResponse(BaseModel):
    revenue_analysis: dict[str, Any]
    top_products: list[dict[str, Any]]
    low_stock_alerts: list[dict[str, Any]]
    customer_insights: dict[str, Any]
    inventory_recommendations: list[dict[str, Any]]


class CustomerAcquisitionRecord(BaseModel):
    customer_id: str
    customer_name: str | None = None
    acquisition_date: str
    first_order_date: str | None = None
    first_order_value: float = 0
    acquisition_source: str | None = None
    location: str | None = None


class CustomerAcquisitionResponse(BaseModel):
    records: list[CustomerAcquisitionRecord]
    total_acquired_customers: int


class CustomerAcquisitionGrowthResponse(BaseModel):
    labels: list[str]
    customers: list[int]
    granularity: Literal["day", "week", "month", "year"]
    total_acquired_customers: int
    new_customers: int
    growth_percent: float | None = None
    acquisition_trend: list[dict[str, Any]]
