"""Validated inputs and inspection rules for the private agricultural modules."""

from datetime import UTC, date, datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

Percent = Annotated[float, Field(ge=0, le=100, allow_inf_nan=False)]
Text = Annotated[str, Field(max_length=600)]
Label = Annotated[str, Field(min_length=1, max_length=100)]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Dated(Input):
    recorded_on: date
    inspect_on: date | None = None
    notes: Text = ""

    @model_validator(mode="after")
    def date_order(self):
        if self.recorded_on > datetime.now(UTC).date():
            raise ValueError("Use a record date that is today or earlier (UTC).")
        if self.inspect_on and self.inspect_on < self.recorded_on:
            raise ValueError("The inspection reminder must be on or after the record date.")
        return self


class Irrigation(Dated):
    field_id: UUID
    irrigated: bool = False
    moisture_pct: Percent | None = None
    soil: Text = ""
    method: Text = ""
    soil_condition: Literal["dry", "damp", "wet", "unknown"] = "unknown"


class RustRecord(Dated):
    observation_id: UUID
    review: Literal["unreviewed", "review_requested", "feedback_received"] = "unreviewed"


class RustFinding(Input):
    status: Literal["possibly_consistent", "signs_not_seen", "inconclusive"]
    evidence: Text
    follow_up: Text


class GrainBatch(Input):
    name: Label
    grain: Label
    harvested_on: date
    stored_on: date
    method: Label
    quantity: Annotated[float, Field(gt=0, le=1e9, allow_inf_nan=False)]
    unit: Literal["kg", "tonnes", "bags"]
    moisture_limit_pct: Percent | None = None
    temperature_limit_c: Annotated[float, Field(ge=-50, le=100, allow_inf_nan=False)] | None = None
    humidity_limit_pct: Percent | None = None

    @model_validator(mode="after")
    def date_order(self):
        if not self.harvested_on <= self.stored_on <= datetime.now(UTC).date():
            raise ValueError("Use a storage date on or after harvest, through today (UTC).")
        return self


class GrainInspection(Dated):
    batch_id: UUID
    moisture_pct: Percent | None = None
    temperature_c: Annotated[float, Field(ge=-50, le=100, allow_inf_nan=False)] | None = None
    humidity_pct: Percent | None = None
    visible_concern: Literal["none_observed", "mold_or_odor", "pests", "water_or_condensation", "other", "not_checked"]


def storage_cautions(batch: GrainBatch, inspection: GrainInspection) -> list[str]:
    warnings = []
    for label, value, threshold in (
        ("Grain moisture", inspection.moisture_pct, batch.moisture_limit_pct),
        ("Storage temperature", inspection.temperature_c, batch.temperature_limit_c),
        ("Relative humidity", inspection.humidity_pct, batch.humidity_limit_pct),
    ):
        if value is None:
            warnings.append(f"{label} was not measured.")
        elif threshold is not None and value >= threshold:
            warnings.append(f"{label} reached your inspection threshold.")
    if inspection.visible_concern not in ("none_observed", "not_checked"):
        warnings.append("A visible concern was reported. Seek qualified storage or food-safety assessment.")
    if inspection.visible_concern == "not_checked":
        warnings.append("Visible concerns were not checked.")
    return warnings


def irrigation_cautions(recent: list[float | None], upcoming_highs: list[float | None], dry: bool) -> list[str]:
    warnings = []
    if len(recent) != 3 or any(value is None for value in recent):
        warnings.append("Three complete days of modeled precipitation are unavailable.")
    elif all(value is not None and value < 1 for value in recent):
        warnings.append("Each of the last three modeled days had under 1 mm precipitation. Inspect the root zone.")
    if any(value is not None and value >= 35 for value in upcoming_highs[:3]):
        warnings.append("A forecast high reaches 35 °C. Check the crop and soil for possible water stress.")
    if dry:
        warnings.append("The latest soil observation was recorded as dry. Confirm conditions in the field.")
    return warnings
