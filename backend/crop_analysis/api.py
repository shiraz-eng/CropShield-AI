"""Authenticated endpoints that read and write Supabase with the caller's own permissions."""

import json
import logging
import os
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, date, datetime
from typing import Annotated
from urllib.parse import quote
from uuid import UUID

import httpx2 as httpx
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, ValidationError

from .assistant import AssistantReply, AssistantRequest, ContextRecord, FieldContext, answer_question
from .compare_samples import load_sample_photos
from .comparison import ComparisonResult, HistoricalObservation, compare_dataset, compare_historical
from .gemini import AnalysisUnavailable, GeminiCropAnalysis
from .images import MAX_IMAGE_BYTES, CropImage
from .reports import ReportField, ReportPhoto, comparison_report, health_report, render_pdf, weather_report
from .schema import AnalysisResult, Findings
from .weather import field_forecast

router = APIRouter()
bearer = HTTPBearer(auto_error=False)
logger = logging.getLogger(__name__)
Credentials = Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]
PROVIDER_STATUS = {"rate_limited": 429, "timeout": 504, "invalid_output": 502, "unsupported_crop": 422}
FIELD_COLUMNS = "id,name,crop_type,crop_variety,planting_date,latitude,longitude"


class Session:
    def __init__(self, client: httpx.Client, owner: str):
        self.client = client
        self.owner = owner

    def rows(self, table: str, **params: str) -> list[dict]:
        response = self.client.get(f"/rest/v1/{table}", params={**params, "user_id": f"eq.{self.owner}"})
        response.raise_for_status()
        return response.json()

    def insert(self, table: str, record: dict) -> httpx.Response:
        return self.client.post(
            f"/rest/v1/{table}", json={**record, "user_id": self.owner},
            headers={"Prefer": "return=minimal"},
        )

    def photos(self, observation_id: str, images: list[dict]) -> list[CropImage]:
        result = []
        for image in images:
            path = image["storage_path"]
            if not path.startswith(f"{self.owner}/{observation_id}/"):
                raise HTTPException(404, "Observation photo unavailable.")
            url = "/storage/v1/object/authenticated/crop-observations/" + quote(path, safe="/")
            with self.client.stream("GET", url) as photo:
                photo.raise_for_status()
                content = bytearray()
                for chunk in photo.iter_bytes():
                    content.extend(chunk)
                    if len(content) > MAX_IMAGE_BYTES:
                        raise HTTPException(422, "The photo exceeds the size limit.")
            result.append(CropImage(bytes(content), image["mime_type"]))
        return result

    def observation(self, observation_id: UUID) -> dict:
        rows = self.rows(
            "crop_observations",
            select=f"id,field_id,observed_at,notes,fields({FIELD_COLUMNS}),observation_images(storage_path,mime_type)",
            id=f"eq.{observation_id}", limit="1",
        )
        if not rows:
            raise HTTPException(404, "Observation unavailable.")
        row = rows[0]
        if row["fields"]["crop_type"].strip().casefold() != "wheat":
            raise HTTPException(422, "Only wheat photos are supported.")
        if not 1 <= len(row["observation_images"]) <= 3:
            raise HTTPException(422, "The observation needs one to three photos.")
        return row

    def field(self, field_id: UUID) -> dict:
        rows = self.rows("fields", select=FIELD_COLUMNS, id=f"eq.{field_id}", limit="1")
        if not rows:
            raise HTTPException(404, "Field unavailable.")
        return rows[0]

    def latest_analysis(self, observation_id: str) -> AnalysisResult | None:
        rows = self.rows(
            "crop_analyses", select="model_name,analyzed_at,findings",
            observation_id=f"eq.{observation_id}", order="analyzed_at.desc", limit="1",
        )
        if not rows:
            return None
        row = rows[0]
        try:
            return AnalysisResult(
                observation_id=UUID(observation_id), crop_type="Wheat", model_name=row["model_name"],
                analyzed_at=datetime.fromisoformat(row["analyzed_at"]),
                findings=Findings.model_validate_json(json.dumps(row["findings"])),
            )
        except (ValidationError, ValueError):
            logger.warning("Ignored a stored analysis that no longer validates.")
            return None


@contextmanager
def session(credentials: HTTPAuthorizationCredentials | None) -> Iterator[Session]:
    if credentials is None:
        raise HTTPException(401, "Sign in to continue.")
    url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    key = os.getenv("SUPABASE_PUBLISHABLE_KEY", "").strip()
    if not url or not key:
        raise HTTPException(503, "Crop analysis is not configured.")
    headers = {"apikey": key, "Authorization": f"Bearer {credentials.credentials}"}
    try:
        with httpx.Client(base_url=url, headers=headers, timeout=10.0) as client:
            identity = client.get("/auth/v1/user")
            if identity.status_code in (401, 403):
                raise HTTPException(401, "Sign in to continue.")
            identity.raise_for_status()
            yield Session(client, identity.json()["id"])
    except AnalysisUnavailable as error:
        raise HTTPException(PROVIDER_STATUS.get(error.code, 503), str(error)) from None
    except httpx.HTTPError:
        raise HTTPException(503, "Could not load your saved records.") from None
    except PermissionError:
        raise HTTPException(404, "Record unavailable.") from None
    except ValueError as error:
        raise HTTPException(422, str(error) or "The saved records could not be used.") from None


@contextmanager
def provider(*, retry_overload: bool = False) -> Iterator[GeminiCropAnalysis]:
    analyzer = GeminiCropAnalysis.from_environment(retry_overload=retry_overload)
    try:
        yield analyzer
    finally:
        analyzer.close()


@router.post("/observations/{observation_id}/analysis", response_model=AnalysisResult)
def analyze_observation(observation_id: UUID, credentials: Credentials) -> AnalysisResult:
    with session(credentials) as db:
        row = db.observation(observation_id)
        with provider() as analyzer:
            photos = db.photos(str(observation_id), row["observation_images"])
            result = analyzer.analyze(
                observation_id, "Wheat", photos, observed_at=date.fromisoformat(row["observed_at"]),
                planting_date=date.fromisoformat(row["fields"]["planting_date"]),
            )
        saved = db.insert("crop_analyses", {
            "observation_id": str(observation_id), "model_name": result.model_name,
            "analysis_status": result.findings.analysis_status,
            "findings": result.findings.model_dump(mode="json"),
            "analyzed_at": result.analyzed_at.isoformat(),
        })
        if saved.is_error:
            logger.warning("Analysis insert failed: HTTP %s", saved.status_code)
            raise HTTPException(503, "The analysis finished but could not be saved. Try again.")
        return result


class HistoricalRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    first_observation_id: UUID
    second_observation_id: UUID


def _store_comparison(db: Session, result: ComparisonResult, field_id: str | None) -> None:
    saved = db.insert("crop_comparisons", {
        "id": str(result.comparison_id), "field_id": field_id,
        "earlier_observation_id": str(result.earlier_observation_id) if result.earlier_observation_id else None,
        "later_observation_id": str(result.later_observation_id) if result.later_observation_id else None,
        "comparison_mode": result.comparison_mode, "interval_days": result.interval_days,
        "result": result.model_dump(mode="json"), "model_name": result.model_name,
    })
    if saved.status_code == 409:
        raise HTTPException(409, "These two observations were already compared. Open the saved result.")
    if saved.is_error:
        logger.warning("Comparison insert failed: HTTP %s", saved.status_code)
        raise HTTPException(503, "The comparison finished but could not be saved. Try again.")


@router.post("/comparisons", response_model=ComparisonResult)
def compare_observations(request: HistoricalRequest, credentials: Credentials) -> ComparisonResult:
    with session(credentials) as db:
        rows = [db.observation(request.first_observation_id), db.observation(request.second_observation_id)]
        rows.sort(key=lambda row: row["observed_at"])
        if rows[0]["observed_at"] == rows[1]["observed_at"]:
            raise HTTPException(422, "Choose observations captured on different dates.")
        records = [
            HistoricalObservation(
                id=UUID(row["id"]), owner_id=UUID(db.owner), field_id=UUID(row["field_id"]),
                crop_type=row["fields"]["crop_type"], confirmed_date=date.fromisoformat(row["observed_at"]),
                images=db.photos(row["id"], row["observation_images"]),
                analysis=db.latest_analysis(row["id"]),
            )
            for row in rows
        ]
        with provider() as analyzer:
            result = compare_historical(analyzer, UUID(db.owner), *records)
        _store_comparison(db, result, rows[0]["field_id"])
        return result


@router.post("/comparisons/illustrative", response_model=ComparisonResult)
def compare_samples(credentials: Credentials) -> ComparisonResult:
    with session(credentials) as db:
        try:
            first, second = load_sample_photos()
        except (OSError, KeyError, ValueError):
            raise HTTPException(503, "The attributed sample photos are unavailable.") from None
        with provider() as analyzer:
            result = compare_dataset(analyzer, first, second)
        _store_comparison(db, result, None)
        return result


class AssistantQuestion(AssistantRequest):
    # JSON bodies carry UUIDs as strings, so this request model cannot be strict.
    model_config = ConfigDict(extra="forbid", strict=False)
    field_id: UUID | None = None


def _clip(text: str, limit: int = 350) -> str:
    text = " ".join(text.split())
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


def _field_context(db: Session, field: dict) -> FieldContext:
    records: list[ContextRecord] = []
    observations = db.rows(
        "crop_observations", select="id,observed_at,notes,observation_images(id)",
        field_id=f"eq.{field['id']}", order="observed_at.desc,created_at.desc", limit="1",
    )
    if observations:
        latest = observations[0]
        notes = f"; farmer notes: {latest['notes']}" if latest["notes"].strip() else ""
        records.append(ContextRecord(key="observation", evidence="recorded_fact", detail=_clip(
            f"Latest observation {latest['observed_at']} with {len(latest['observation_images'])} photo(s){notes}"
        )))
        analysis = db.latest_analysis(latest["id"])
        if analysis:
            found = analysis.findings
            symptoms = "; ".join(found.visible_symptoms) or "none recorded"
            records.append(ContextRecord(key="analysis", evidence="ai_interpretation", detail=_clip(
                f"Gemini analysis of {latest['observed_at']}: status {found.analysis_status}, stage "
                f"{found.growth_stage}, image quality {found.image_quality}; visible symptoms: {symptoms}"
            )))
    comparisons = db.rows(
        "crop_comparisons", select="interval_days,result", field_id=f"eq.{field['id']}",
        comparison_mode="eq.verified_historical", order="created_at.desc", limit="1",
    )
    if comparisons:
        result = comparisons[0]["result"]
        changes = "; ".join(result.get("observed_changes", [])) or "none recorded"
        records.append(ContextRecord(key="comparison", evidence="ai_interpretation", detail=_clip(
            f"Comparison over {comparisons[0]['interval_days']} days: stage "
            f"{result.get('previous_growth_stage')} to {result.get('current_growth_stage')}; changes: {changes}"
        )))
    if field["latitude"] is not None and field["longitude"] is not None:
        forecast = field_forecast(UUID(field["id"]), float(field["latitude"]), float(field["longitude"]))
        if forecast:
            _, weather = forecast
            records.append(ContextRecord(key="weather", evidence="forecast", detail=_clip(
                "Open-Meteo 7-day forecast: " + "; ".join(f"{c.severity} {c.event}" for c in weather.cautions)
            )))
    reminders = db.rows(
        "reminders", select="title,due_on", field_id=f"eq.{field['id']}",
        completed="eq.false", order="due_on.asc", limit="1",
    )
    if reminders:
        records.append(ContextRecord(key="reminder", evidence="recorded_fact", detail=_clip(
            f"Next reminder: {reminders[0]['title']} due {reminders[0]['due_on']}"
        )))
    return FieldContext(
        owner_id=UUID(db.owner), field_id=UUID(field["id"]), field_name=field["name"],
        crop_type=field["crop_type"], crop_variety=field["crop_variety"] or None,
        planting_date=date.fromisoformat(field["planting_date"]), records=records,
    )


@router.post("/assistant", response_model=AssistantReply)
def ask_assistant(question: AssistantQuestion, credentials: Credentials) -> AssistantReply:
    with session(credentials) as db:
        context = _field_context(db, db.field(question.field_id)) if question.field_id else None
        with provider(retry_overload=True) as analyzer:
            return answer_question(
                analyzer, UUID(db.owner), context,
                AssistantRequest(
                    question=question.question, language=question.language, history=question.history,
                ),
            )


def _pdf(content: bytes, name: str) -> Response:
    return Response(content, media_type="application/pdf", headers={
        "Content-Disposition": f'attachment; filename="{name}.pdf"', "Cache-Control": "private, no-store",
    })


def _report_field(field: dict) -> ReportField:
    return ReportField(UUID(field["id"]), field["name"], field["crop_type"])


@router.get("/reports/health/{observation_id}")
def health_pdf(observation_id: UUID, credentials: Credentials) -> Response:
    with session(credentials) as db:
        row = db.observation(observation_id)
        analysis = db.latest_analysis(str(observation_id))
        if analysis is None:
            raise HTTPException(409, "Analyze this observation in Crop Doctor before creating its report.")
        photos = tuple(
            ReportPhoto(image, f"Observation photo {index} · {row['observed_at']}")
            for index, image in enumerate(db.photos(str(observation_id), row["observation_images"]), 1)
        )
        report = health_report(
            _report_field(row["fields"]), datetime.now(UTC).date(), observation_id,
            date.fromisoformat(row["observed_at"]), analysis, photos,
        )
        return _pdf(render_pdf(report), f"crop-health-{row['observed_at']}")


@router.get("/reports/comparison/{comparison_id}")
def comparison_pdf(comparison_id: UUID, credentials: Credentials) -> Response:
    with session(credentials) as db:
        rows = db.rows("crop_comparisons", select="field_id,result", id=f"eq.{comparison_id}", limit="1")
        if not rows:
            raise HTTPException(404, "Comparison unavailable.")
        try:
            result = ComparisonResult.model_validate_json(json.dumps(rows[0]["result"]))
        except ValidationError:
            raise HTTPException(422, "The saved comparison could not be read.") from None
        field = _report_field(db.field(UUID(rows[0]["field_id"]))) if rows[0]["field_id"] else None
        report = comparison_report(result, datetime.now(UTC).date(), field)
        return _pdf(render_pdf(report), f"growth-comparison-{result.created_at.date()}")


@router.get("/reports/weather/{field_id}")
def weather_pdf(field_id: UUID, credentials: Credentials) -> Response:
    with session(credentials) as db:
        field = db.field(field_id)
        if field["latitude"] is None or field["longitude"] is None:
            raise HTTPException(409, "Add field coordinates before creating a weather report.")
        forecast = field_forecast(field_id, float(field["latitude"]), float(field["longitude"]))
        if forecast is None:
            raise HTTPException(503, "The Open-Meteo forecast is unavailable. Try again later.")
        days, weather = forecast
        report = weather_report(_report_field(field), datetime.now(UTC).date(), weather)
        lines = tuple(f"{d['date']}: high {d['high']} °C, low {d['low']} °C, precipitation {d['rain']} mm" for d in days)
        report = type(report)(report.title, report.report_date, report.field,
                              (*report.sections, ("Daily forecast", lines)))
        return _pdf(render_pdf(report), f"weather-risk-{datetime.now(UTC).date()}")
