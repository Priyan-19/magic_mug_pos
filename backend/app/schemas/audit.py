from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict, field_serializer


class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int]
    username: Optional[str] = None
    action: str
    entity_type: str
    entity_id: str
    metadata: Dict[str, Any] = Field(default_factory=dict, alias="metadata_payload")
    created_at: datetime
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    @field_serializer("created_at", when_used="always")
    def serialize_dt(self, v: Optional[datetime], _info):
        if v is None:
            return None
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        return v.isoformat()


class AuditLogListResponse(BaseModel):
    items: List[AuditLogResponse]
    total: int
    page: int
    limit: int
