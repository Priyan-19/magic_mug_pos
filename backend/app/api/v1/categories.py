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

    await db.commit()
    await db.refresh(category)

    return CategoryResponse.model_validate(category)


@router.delete("/{category_id}")
async def delete_category(
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

    category_name = category.name

    # Check for any products in this category
    prod_stmt = select(Product).where(Product.category_id == category_id)
    prod_res = await db.execute(prod_stmt)
    products = prod_res.scalars().all()

    if products:
        prod_ids = [p.id for p in products]
        # Detach product from past bill items to preserve sales history
        from sqlalchemy import update
        from app.models.bill import BillItem
        await db.execute(
            update(BillItem)
            .where(BillItem.product_id.in_(prod_ids))
            .values(product_id=None)
        )
        # Delete products under this category
        for p in products:
            await db.delete(p)
        await db.flush()

    await db.delete(category)
    await db.commit()
    return {"success": True, "message": f"Category '{category_name}' deleted permanently"}
