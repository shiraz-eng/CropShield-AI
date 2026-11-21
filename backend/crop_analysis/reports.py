from dataclasses import dataclass
from datetime import date
from io import BytesIO
from typing import Annotated, Literal
from uuid import UUID
from xml.sax.saxutils import escape

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, HttpUrl
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer

from .comparison import ComparisonResult, HistoricalSource
from .images import CropImage, prepare_images
from .schema import AnalysisResult, VisibleDetail


@dataclass(frozen=True)
class ReportField:
    id: UUID
    name: str
    crop_type: str


@dataclass(frozen=True)
class ReportPhoto:
    image: CropImage
    caption: str


@dataclass(frozen=True)
class CropReport:
    title: str
    report_date: date
    field: ReportField | None
    sections: tuple[tuple[str, tuple[str, ...]], ...]
    photos: tuple[ReportPhoto, ...] = ()


class WeatherCaution(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    event: VisibleDetail
    severity: Literal["Normal", "Caution", "High Risk"]
    caution: VisibleDetail


class VerifiedWeather(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    field_id: UUID
    issued_at: AwareDatetime
    source: HttpUrl
    cautions: Annotated[list[WeatherCaution], Field(max_length=12)]


def health_report(
    field: ReportField, report_date: date, observation_id: UUID, observed_on: date,
    analysis: AnalysisResult, photos: tuple[ReportPhoto, ...] = (),
) -> CropReport:
    if analysis.observation_id != observation_id or field.crop_type.casefold() != analysis.crop_type.casefold():
        raise ValueError("The analysis must match the observation and crop.")
    findings = analysis.findings
    return CropReport(
        "Crop Health Report", report_date, field,
        (
            ("Recorded observation", (observed_on.isoformat(),)),
            ("AI interpretation", (
                f"Status: {findings.analysis_status.replace('_', ' ')}",
                f"Stage: {findings.growth_stage.replace('_', ' ')}",
                f"Image quality: {findings.image_quality}",
            )),
            ("Stage evidence", tuple(findings.stage_evidence)),
            ("Visible symptoms", tuple(findings.visible_symptoms)),
            ("Possible concerns", tuple(findings.possible_explanations)),
            ("Uncertainty", tuple(findings.uncertainty_notes)),
            ("Follow-up observations", tuple(findings.recommended_observations)),
        ), photos,
    )


def comparison_report(
    result: ComparisonResult, report_date: date, field: ReportField | None = None,
    photos: tuple[ReportPhoto, ...] = (),
) -> CropReport:
    source = result.source_provenance
    if isinstance(source, HistoricalSource):
        if field is None or field.id != source.field_id or field.crop_type.casefold() != "wheat":
            raise ValueError("The report field must match the historical wheat comparison.")
        metadata = (
            f"Earlier observation: {source.earlier_date.isoformat()}",
            f"Later observation: {source.later_date.isoformat()}",
            f"Verified interval: {result.interval_days} days",
        )
    else:
        if field is not None:
            raise ValueError("An illustrative report cannot be assigned to a field.")
        metadata = (
            "Illustrative growth-stage comparison - not verified historical field progression.",
            *(f"{photo.dataset_name} | {photo.attribution} | {photo.license} | {photo.source_url}" for photo in source),
        )
    return CropReport(
        "Growth Comparison Report", report_date, field,
        (
            ("Source records", metadata),
            ("AI interpretation", (
                f"First stage: {result.previous_growth_stage.replace('_', ' ')}",
                f"Second stage: {result.current_growth_stage.replace('_', ' ')}",
                f"Image comparability: {result.image_comparability}",
            )),
            ("Visible differences", tuple(result.observed_changes)),
            ("Newly visible symptoms", tuple(result.newly_visible_symptoms)),
            ("Symptoms no longer visible", tuple(result.no_longer_visible_symptoms)),
            ("Possible concerns", tuple(result.possible_concerns)),
            ("Uncertainty", tuple(result.uncertainty_notes)),
            ("Follow-up observations", tuple(result.suggested_followup)),
        ), photos,
    )


def weather_report(field: ReportField, report_date: date, weather: VerifiedWeather) -> CropReport:
    if field.id != weather.field_id:
        raise ValueError("The forecast must belong to the report field.")
    return CropReport(
        "Weather Risk Summary", report_date, field,
        (
            ("Forecast information", (f"Retrieved: {weather.issued_at.isoformat()}", f"Source: {weather.source}")),
            ("Recorded cautions", tuple(
                f"{item.severity} | {item.event} | {item.caution}" for item in weather.cautions
            )),
        ),
    )


def render_pdf(report: CropReport) -> bytes:
    """Render authorized report data without fetching remote URLs or interpreting markup."""
    output = BytesIO()
    document = SimpleDocTemplate(
        output, pagesize=A4, title=report.title, author="CropShield AI",
        leftMargin=48, rightMargin=48, topMargin=56, bottomMargin=52,
    )
    styles = getSampleStyleSheet()
    forest = HexColor("#14532D")
    heading = ParagraphStyle("ReportHeading", parent=styles["Heading2"], textColor=forest)
    brand = ParagraphStyle("ReportBrand", parent=styles["Normal"], textColor=forest, spaceAfter=12)

    def paragraph(value: str, style=styles["BodyText"]):
        return Paragraph(escape(value).replace("\n", "<br/>"), style)

    story = [paragraph("CROPSHIELD AI", brand), paragraph(report.title, styles["Title"])]
    if report.field:
        story.append(paragraph(f"{report.field.name} | {report.field.crop_type}", heading))
    story.append(paragraph(f"Report date: {report.report_date.isoformat()}"))
    if report.photos:
        prepared = prepare_images([photo.image for photo in report.photos])
        story.append(paragraph("Crop photographs", heading))
        for item, photo in zip(prepared, report.photos, strict=True):
            image = Image(BytesIO(item.content), width=480, height=205, kind="proportional")
            image.hAlign = "LEFT"
            story.extend([image, paragraph(photo.caption), Spacer(1, 10)])
    for title, values in report.sections:
        if values:
            story.append(paragraph(title, heading))
            story.extend(paragraph(value) for value in values)

    def footer(canvas, doc):
        canvas.setStrokeColor(forest)
        canvas.line(48, 40, A4[0] - 48, 40)
        canvas.setFont("Helvetica", 9)
        canvas.setFillColor(forest)
        canvas.drawString(48, 25, "CropShield AI")
        canvas.drawRightString(A4[0] - 48, 25, str(doc.page))

    document.build(story, onFirstPage=footer, onLaterPages=footer)
    return output.getvalue()
