from __future__ import annotations

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

from .engine import UniversalDataIngestionEngine
from .models import (
    AnalyzeRequest,
    ApiConnection,
    CustomerAcquisitionGrowthResponse,
    CustomerAcquisitionResponse,
    DatabaseConnection,
    DetectRequest,
    ImportResponse,
    MapRequest,
    MappingResponse,
    SaveRequest,
    SaveResponse,
    ValidateRequest,
    ValidationResponse,
)


app = FastAPI(
    title="CommerceFlow Universal Data Ingestion Engine",
    version="1.0.0",
    description="Import, validate, normalize, map, save, and analyze commerce data from files, APIs, SQL databases, and Oracle.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ingestion_engine = UniversalDataIngestionEngine()


def _http_error(error: Exception) -> HTTPException:
    return HTTPException(status_code=400, detail=str(error))


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "commerceflow-import-engine"}


@app.post("/api/import/upload", response_model=ImportResponse)
async def upload_import(file: UploadFile = File(...)) -> ImportResponse:
    try:
        import_id, source_type, previews = await run_in_threadpool(
            ingestion_engine.upload_file,
            file.file,
            file.filename or "upload",
            file.content_type,
        )
        return ImportResponse(import_id=import_id, source_type=source_type, datasets=previews)
    except Exception as error:
        raise _http_error(error) from error


@app.post("/api/import/detect", response_model=ImportResponse)
async def detect_import(request: DetectRequest) -> ImportResponse:
    try:
        if request.import_id:
            source_type, _ = await run_in_threadpool(ingestion_engine.store.load, request.import_id)
            previews = await run_in_threadpool(ingestion_engine.store.previews, request.import_id)
            return ImportResponse(import_id=request.import_id, source_type=source_type, datasets=previews)

        if isinstance(request.connection, DatabaseConnection):
            import_id, source_type, previews = await run_in_threadpool(ingestion_engine.discover_database, request.connection)
            return ImportResponse(import_id=import_id, source_type=source_type, datasets=previews)

        if isinstance(request.connection, ApiConnection):
            import_id, source_type, previews = await run_in_threadpool(ingestion_engine.import_api_source, request.connection)
            return ImportResponse(import_id=import_id, source_type=source_type, datasets=previews)

        raise ValueError("Provide either import_id or a database/API connection payload.")
    except Exception as error:
        raise _http_error(error) from error


@app.post("/api/import/map", response_model=MappingResponse)
async def map_import(request: MapRequest) -> MappingResponse:
    try:
        mappings, entities, confidence = await run_in_threadpool(
            ingestion_engine.map_import,
            request.import_id,
            request.manual_mappings,
        )
        return MappingResponse(import_id=request.import_id, mappings=mappings, detected_entities=entities, confidence=confidence)
    except Exception as error:
        raise _http_error(error) from error


@app.post("/api/import/validate", response_model=ValidationResponse)
async def validate_import(request: ValidateRequest) -> ValidationResponse:
    try:
        issues = await run_in_threadpool(ingestion_engine.validate_import, request.import_id, request.mappings)
        return ValidationResponse(import_id=request.import_id, issues=issues, valid=not any(issue.severity == "error" for issue in issues))
    except Exception as error:
        raise _http_error(error) from error


@app.post("/api/import/save", response_model=SaveResponse)
async def save_import(request: SaveRequest) -> SaveResponse:
    try:
        counts, issues = await run_in_threadpool(
            ingestion_engine.save_import,
            request.import_id,
            request.mappings,
            request.replace_existing,
        )
        return SaveResponse(import_id=request.import_id, saved=True, counts=counts, validation_issues=issues)
    except Exception as error:
        raise _http_error(error) from error


@app.post("/api/import/analyze")
async def analyze_import(request: AnalyzeRequest):
    try:
        return await run_in_threadpool(ingestion_engine.analyze_import, request.import_id)
    except Exception as error:
        raise _http_error(error) from error


@app.get("/api/analytics/customer-acquisition", response_model=CustomerAcquisitionResponse)
async def customer_acquisition() -> CustomerAcquisitionResponse:
    try:
        return await run_in_threadpool(ingestion_engine.customer_acquisition)
    except Exception as error:
        raise _http_error(error) from error


@app.get("/api/analytics/customer-acquisition-growth", response_model=CustomerAcquisitionGrowthResponse)
async def customer_acquisition_growth(granularity: str = "month") -> CustomerAcquisitionGrowthResponse:
    try:
        return await run_in_threadpool(ingestion_engine.customer_acquisition_growth, granularity)
    except Exception as error:
        raise _http_error(error) from error
