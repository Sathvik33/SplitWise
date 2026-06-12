from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import List
from app.schemas.user import UserResponse

class GroupBase(BaseModel):
    name: str
    image_url: str | None = None

class GroupCreate(GroupBase):
    member_emails: List[str]

class GroupUpdate(GroupBase):
    pass

class GroupMemberAdd(BaseModel):
    email: str

class GroupMemberResponse(BaseModel):
    user_id: UUID
    user: UserResponse
    joined_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class GroupResponse(GroupBase):
    id: UUID
    created_by: UUID
    created_at: datetime
    members: List[GroupMemberResponse] = []

    model_config = ConfigDict(from_attributes=True)
