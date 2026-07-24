"""Schemas for the support feedback endpoint."""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, StringConstraints

FeedbackType = Literal["bug", "mejora", "nueva_funcion", "otro"]

NonBlankSubject = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=200),
]
NonBlankMessage = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=5000),
]


class SupportFeedbackRequest(BaseModel):
    """Payload for POST /support/feedback."""

    model_config = ConfigDict(extra="forbid")

    type: FeedbackType
    subject: NonBlankSubject
    message: NonBlankMessage


class SupportFeedbackResponse(BaseModel):
    """Response for POST /support/feedback."""

    success: bool
    message: str
