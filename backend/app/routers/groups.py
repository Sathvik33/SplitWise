from fastapi import APIRouter, Depends, status, UploadFile, File
import shutil
import os
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID
from app.database import get_db
from app.models.user import User
from app.dependencies.auth import get_current_user
from app.schemas.group import GroupCreate, GroupUpdate, GroupResponse, GroupMemberAdd, GroupMemberResponse
from app.schemas.balance import BalanceEntry
from app.services.group_service import create_group, update_group, delete_group, get_user_groups, get_group_by_id, add_member, remove_member
from app.services.balance_service import calculate_group_balances

router = APIRouter(prefix="/api/groups", tags=["groups"])

@router.post("/{id}/photo", response_model=GroupResponse)
async def upload_group_photo(id: UUID, file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    group = await get_group_by_id(db, id, current_user.id)
    os.makedirs("static/uploads", exist_ok=True)
    file_extension = file.filename.split(".")[-1]
    file_name = f"group_{id}.{file_extension}"
    file_path = f"static/uploads/{file_name}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    group.image_url = f"/static/uploads/{file_name}"
    await db.commit()
    await db.refresh(group)
    return group

@router.post("", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
async def create_new_group(group: GroupCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await create_group(db, group, current_user.id)

@router.get("", response_model=List[GroupResponse])
async def list_groups(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await get_user_groups(db, current_user.id)

@router.get("/{id}", response_model=GroupResponse)
async def get_group(id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await get_group_by_id(db, id, current_user.id)

@router.put("/{id}", response_model=GroupResponse)
async def edit_group(id: UUID, group: GroupUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await update_group(db, id, group.name, current_user.id)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_group(id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await delete_group(db, id, current_user.id)

@router.post("/{id}/members", response_model=GroupMemberResponse)
async def add_group_member(id: UUID, member: GroupMemberAdd, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await add_member(db, id, member.email, current_user.id)

@router.get("/{id}/balances", response_model=List[BalanceEntry])
async def get_group_balances(id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Check if user is in group
    await get_group_by_id(db, id, current_user.id)
    return await calculate_group_balances(db, id)

@router.delete("/{id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_group_member(id: UUID, user_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Remove a member from the group by setting their left_at timestamp."""
    await remove_member(db, id, user_id, current_user.id)

