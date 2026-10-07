from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.category import Category
from app.models.product import Product
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.services.auth_service import get_current_user, require_role
from app.services.audit_service import AuditService

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=List[CategoryResponse])
async def list_categories(
    include_inactive: bool = Query(False, description="Include soft-deleted categories"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Category)
    if not include_inactive:
        stmt = stmt.where(Category.is_active == True)
    stmt = stmt.order_by(Category.display_order.asc(), Category.name.asc())
    
    result = await db.execute(stmt)
    categories = result.scalars().all()

    # Get product counts
    count_stmt = (
        select(Product.category_id, func.count(Product.id))
        .where(Product.is_active == True)
        .group_by(Product.category_id)
    )
    count_res = await db.execute(count_stmt)
    count_map = {row[0]: row[1] for row in count_res.all()}

    response_list = []
    for cat in categories:
        cat_resp = CategoryResponse.model_validate(cat)
        cat_resp.product_count = count_map.get(cat.id, 0)
        response_list.append(cat_resp)

    return response_list


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    payload: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["OWNER"]))
):
    # Check if category with name already exists
    existing_stmt = select(Category).where(Category.name.ilike(payload.name.strip()))
    existing = (await db.execute(existing_stmt)).scalars().first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category '{payload.name}' already exists"
        )

    category = Category(
        name=payload.name.strip(),
        description=payload.description,
        display_order=payload.display_order,
        is_active=payload.is_active
    )
    db.add(category)
    await db.flush()

    await AuditService.log_action(
        db=db,
        action="CATEGORY_CREATED",
        entity_type="category",
        entity_id=str(category.id),
        metadata={"name": category.name},
        user_id=current_user.id
    )
    await db.commit()
    await db.refresh(category)

    return CategoryResponse.model_validate(category)


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int,
    payload: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["OWNER"]))
):
    category = await db.get(Category, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with ID {category_id} not found"
        )

    if payload.name is not None and payload.name.strip() != category.name:
        existing_stmt = select(Category).where(
            and_(Category.name.ilike(payload.name.strip()), Category.id != category_id)
        )
        existing = (await db.execute(existing_stmt)).scalars().first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category '{payload.name}' already exists"
            )
        category.name = payload.name.strip()

    if payload.description is not None:
        category.description = payload.description
    if payload.display_order is not None:
        category.display_order = payload.display_order
    if payload.is_active is not None:
        category.is_active = payload.is_active

    await AuditService.log_action(
        db=db,
        action="CATEGORY_UPDATED",
        entity_type="category",
        entity_id=str(category.id),
        metadata={"name": category.name, "is_active": category.is_active},
        user_id=current_user.id
    )
    await db.commit()
    await db.refresh(category)

    return CategoryResponse.model_validate(category)


@router.delete("/{category_id}")
async def deactivate_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["OWNER"]))
):
    category = await db.get(Category, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with ID {category_id} not found"
        )

    category.is_active = False
    await AuditService.log_action(
        db=db,
        action="CATEGORY_DEACTIVATED",
        entity_type="category",
        entity_id=str(category.id),
        metadata={"name": category.name},
        user_id=current_user.id
    )
    await db.commit()
    return {"success": True, "message": f"Category '{category.name}' deactivated successfully"}
