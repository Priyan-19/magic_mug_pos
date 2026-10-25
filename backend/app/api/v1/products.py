import io
import base64
from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from PIL import Image

from app.core.database import get_db
from app.core.cache import catalog_cache
from app.models.product import Product
from app.models.category import Category
from app.models.user import User
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from app.services.auth_service import get_current_user, require_role

router = APIRouter(prefix="/products", tags=["Products"])


def optimize_image_payload(image_url: Optional[str]) -> Optional[str]:
    """Ensures base64 images never exceed 400x400 WebP (max ~25 KB) in database."""
    if not image_url or not isinstance(image_url, str):
        return None
    raw = image_url.strip()
    if not raw.startswith("data:image/") or len(raw) < 40000:
        return raw if raw else None
    try:
        header, encoded = raw.split(",", 1)
        img_bytes = base64.b64decode(encoded)
        img = Image.open(io.BytesIO(img_bytes))
        if img.mode in ("RGBA", "LA", "P"):
            img = img.convert("RGBA")
            bg = Image.new("RGBA", img.size, (255, 255, 255))
            img = Image.alpha_composite(bg, img).convert("RGB")
        elif img.mode != "RGB":
            img = img.convert("RGB")
        img.thumbnail((400, 400), Image.Resampling.LANCZOS)
        out = io.BytesIO()
        img.save(out, format="WEBP", quality=75, method=6)
        return f"data:image/webp;base64,{base64.b64encode(out.getvalue()).decode('ascii')}"
    except Exception:
        return raw


@router.get("", response_model=List[ProductResponse])
async def list_products(
    category_id: Optional[int] = Query(None, description="Filter by category ID"),
    active_only: bool = Query(True, description="Filter active products only"),
    search: Optional[str] = Query(None, description="Search product name"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cache_key = f"products:{category_id}:{active_only}:{search}"
    cached = catalog_cache.get(cache_key)
    if cached is not None:
        return cached

    stmt = (
        select(Product, Category.name.label("category_name"))
        .outerjoin(Category, Category.id == Product.category_id)
    )
    filters = []
    if category_id is not None:
        filters.append(Product.category_id == category_id)
    if active_only:
        filters.append(Product.is_active == True)
    if search:
        filters.append(Product.name.ilike(f"%{search}%"))

    if filters:
        stmt = stmt.where(and_(*filters))

    stmt = stmt.order_by(Product.name.asc())
    result = await db.execute(stmt)
    rows = result.all()

    response_list = []
    for prod, cat_name in rows:
        resp = ProductResponse.model_validate(prod)
        resp.category_name = cat_name
        response_list.append(resp)

    catalog_cache.set(cache_key, response_list)
    return response_list


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = (
        select(Product, Category.name.label("category_name"))
        .outerjoin(Category, Category.id == Product.category_id)
        .where(Product.id == product_id)
    )
    result = await db.execute(stmt)
    row = result.first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found"
        )
    prod, cat_name = row
    resp = ProductResponse.model_validate(prod)
    resp.category_name = cat_name
    return resp


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["USER"]))
):
    # Verify category exists
    category = await db.get(Category, payload.category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category ID {payload.category_id} does not exist"
        )

    product = Product(
        category_id=payload.category_id,
        name=payload.name.strip(),
        description=payload.description,
        selling_price=payload.selling_price,
        image_url=optimize_image_payload(payload.image_url),
        is_active=payload.is_active,
        track_stock=payload.track_stock,
        stock_quantity=payload.stock_quantity if payload.track_stock else 0
    )
    db.add(product)
    await db.commit()
    await db.refresh(product)

    catalog_cache.clear_prefix("products")
    catalog_cache.clear_prefix("categories")

    resp = ProductResponse.model_validate(product)
    resp.category_name = category.name
    return resp


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["USER"]))
):
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found"
        )

    old_price = str(product.selling_price)
    
    if payload.category_id is not None:
        cat = await db.get(Category, payload.category_id)
        if not cat:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category ID {payload.category_id} not found"
            )
        product.category_id = payload.category_id

    if payload.name is not None:
        product.name = payload.name.strip()
    if payload.description is not None:
        product.description = payload.description
    if payload.selling_price is not None:
        product.selling_price = payload.selling_price
    if payload.image_url is not None:
        product.image_url = optimize_image_payload(payload.image_url)
    if payload.is_active is not None:
        product.is_active = payload.is_active
    if payload.track_stock is not None:
        product.track_stock = payload.track_stock
    if payload.stock_quantity is not None:
        product.stock_quantity = max(0, payload.stock_quantity)

    await db.commit()
    await db.refresh(product)

    catalog_cache.clear_prefix("products")
    catalog_cache.clear_prefix("categories")

    cat = await db.get(Category, product.category_id)
    resp = ProductResponse.model_validate(product)
    resp.category_name = cat.name if cat else None
    return resp


@router.patch("/{product_id}/stock", response_model=ProductResponse)
async def update_product_stock(
    product_id: int,
    payload: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["USER"]))
):
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found"
        )

    if payload.track_stock is not None:
        product.track_stock = payload.track_stock
    if payload.stock_quantity is not None:
        product.stock_quantity = max(0, payload.stock_quantity)

    await db.commit()
    await db.refresh(product)

    catalog_cache.clear_prefix("products")

    cat = await db.get(Category, product.category_id)
    resp = ProductResponse.model_validate(product)
    resp.category_name = cat.name if cat else None
    return resp


@router.delete("/{product_id}")
async def delete_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["USER"]))
):
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found"
        )

    # Detach product from past bill items to preserve sales history
    from sqlalchemy import update
    from app.models.bill import BillItem
    await db.execute(
        update(BillItem)
        .where(BillItem.product_id == product_id)
        .values(product_id=None)
    )

    product_name = product.name
    await db.delete(product)
    await db.commit()

    catalog_cache.clear_prefix("products")
    catalog_cache.clear_prefix("categories")
    return {"success": True, "message": f"Product '{product_name}' deleted permanently"}
