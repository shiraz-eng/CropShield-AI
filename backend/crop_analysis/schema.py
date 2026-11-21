from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, StringConstraints, model_validator

VisibleDetail = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=350)]
Details = Annotated[list[VisibleDetail], Field(max_length=8)]
Stage = Literal[
    "emergence", "seedling", "tillering", "stem_elongation", "booting",
    "heading", "flowering", "grain_development", "ripening", "uncertain",
]
Outcome = Literal["completed", "insufficient_image_quality", "unsupported_crop", "inconclusive"]


class ZadoksRange(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    lower: int = Field(ge=0, le=99)
    upper: int = Field(ge=0, le=99)

    @model_validator(mode="after")
    def ordered(self):
        if self.lower >= self.upper:
            raise ValueError("Use a broad, ordered Zadoks range")
        return self


class Findings(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    analysis_status: Outcome
    image_quality: Literal["adequate", "limited", "insufficient"]
    growth_stage: Stage
    zadoks_range: ZadoksRange | None
    stage_evidence: Details
    visible_symptoms: Details
    possible_explanations: Details
    uncertainty_notes: Details
    recommended_observations: Details
    requires_expert_review: bool

    @model_validator(mode="after")
    def evidence_is_consistent(self):
        poor_image = self.image_quality == "insufficient"
        if poor_image != (self.analysis_status == "insufficient_image_quality"):
            raise ValueError("Use the image quality status for insufficient photos")
        if self.analysis_status != "completed" and self.growth_stage != "uncertain":
            raise ValueError("Incomplete analyses cannot assign a stage")
        if self.analysis_status == "completed" and self.growth_stage == "uncertain":
            raise ValueError("Use the inconclusive status if stage evidence is insufficient")
        if self.growth_stage != "uncertain" and not self.stage_evidence:
            raise ValueError("An estimated stage requires visible evidence")
        if self.growth_stage == "uncertain" and (self.zadoks_range or not self.uncertainty_notes):
            raise ValueError("An uncertain stage needs an explanation and no Zadoks range")
        if self.possible_explanations and not self.visible_symptoms:
            raise ValueError("Possible causes require recorded visible symptoms")
        return self


class AnalysisResult(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    observation_id: UUID
    crop_type: Literal["Wheat"]
    model_name: str
    analyzed_at: AwareDatetime
    findings: Findings


class AnalysisFailure(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    observation_id: UUID
    analysis_status: Literal["failed", "unsupported_crop"]
    code: str
    occurred_at: datetime
