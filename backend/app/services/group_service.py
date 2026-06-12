from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from uuid import UUID
from fastapi import HTTPException
from app.models.group import Group, GroupMember
from app.models.user import User
from app.schemas.group import GroupCreate

async def create_group(db: AsyncSession, group_data: GroupCreate, user_id: UUID):
    new_group = Group(name=group_data.name, created_by=user_id)
    db.add(new_group)
    await db.flush()
    
    # Add creator as member
    db.add(GroupMember(group_id=new_group.id, user_id=user_id))
    
    # Add other members by email
    for email in group_data.member_emails:
        user_res = await db.execute(select(User).filter(User.email == email))
        user = user_res.scalars().first()
        if not user:
            raise HTTPException(status_code=404, detail=f"User with email {email} not found")
        if user.id != user_id:
            db.add(GroupMember(group_id=new_group.id, user_id=user.id))
            
    await db.commit()
    return await get_group_by_id(db, new_group.id, user_id)

async def update_group(db: AsyncSession, group_id: UUID, name: str, user_id: UUID):
    group = await get_group_by_id(db, group_id, user_id)
    group.name = name
    await db.commit()
    await db.refresh(group)
    return group

async def delete_group(db: AsyncSession, group_id: UUID, user_id: UUID):
    group = await get_group_by_id(db, group_id, user_id)
    # Require creator to delete
    if group.created_by != user_id:
        raise HTTPException(status_code=403, detail="Only the creator can delete the group")
    await db.delete(group)
    await db.commit()

async def get_user_groups(db: AsyncSession, user_id: UUID):
    result = await db.execute(
        select(Group)
        .join(GroupMember, Group.id == GroupMember.group_id)
        .filter(GroupMember.user_id == user_id)
        .options(selectinload(Group.members).selectinload(GroupMember.user))
    )
    return result.scalars().all()

async def get_group_by_id(db: AsyncSession, group_id: UUID, user_id: UUID):
    # Check if member
    member_res = await db.execute(select(GroupMember).filter_by(group_id=group_id, user_id=user_id))
    if not member_res.scalars().first():
        raise HTTPException(status_code=403, detail="Not a member of this group")
        
    result = await db.execute(
        select(Group)
        .filter(Group.id == group_id)
        .options(selectinload(Group.members).selectinload(GroupMember.user))
    )
    group = result.scalars().first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group

async def add_member(db: AsyncSession, group_id: UUID, email: str, current_user_id: UUID):
    # Check if current user is member
    member_res = await db.execute(select(GroupMember).filter_by(group_id=group_id, user_id=current_user_id))
    if not member_res.scalars().first():
        raise HTTPException(status_code=403, detail="Not a member of this group")
        
    user_res = await db.execute(select(User).filter(User.email == email))
    user = user_res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    existing_res = await db.execute(select(GroupMember).filter_by(group_id=group_id, user_id=user.id))
    if existing_res.scalars().first():
        raise HTTPException(status_code=400, detail="User already in group")
        
    new_member = GroupMember(group_id=group_id, user_id=user.id)
    db.add(new_member)
    await db.commit()
    res = await db.execute(
        select(GroupMember)
        .filter_by(id=new_member.id)
        .options(selectinload(GroupMember.user))
    )
    return res.scalars().first()
