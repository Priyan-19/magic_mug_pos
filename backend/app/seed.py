from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.models.category import Category
from app.models.product import Product
from app.core.security import get_password_hash


async def seed_data(session: AsyncSession) -> None:
    """
    Seeds safe synthetic test/development data into the local database.
    Does NOT contain sensitive production records.
    """
    # 1. Admin / Owner User
    admin_stmt = select(User).where(User.username == "admin")
    admin_res = await session.execute(admin_stmt)
    admin_user = admin_res.scalars().first()
    if not admin_user:
        admin_user = User(
            username="admin",
            email="admin@magicmug.com",
            password_hash=get_password_hash("secretpassword"),
            full_name="Magic Mug",
            role="OWNER",
            is_active=True,
        )
        session.add(admin_user)
        await session.flush()

    # 2. Categories
    cat_names = [
        ("Espresso & Brews", "Artisanal hot and cold coffee brews", 1),
        ("Bakery & Pastries", "Freshly baked croissants, cookies and rolls", 2),
        ("Cold Beverages", "Refreshing iced sodas, cold brews and coolers", 3),
    ]

    category_map = {}
    for name, desc, order in cat_names:
        c_stmt = select(Category).where(Category.name == name)
        c_res = await session.execute(c_stmt)
        cat = c_res.scalars().first()
        if not cat:
            cat = Category(name=name, description=desc, display_order=order, is_active=True)
            session.add(cat)
            await session.flush()
        category_map[name] = cat

    # 3. Products
    products_to_seed = [
        ("Espresso Single", "Rich, intense single shot espresso", "20.00", "Espresso & Brews", False, 0),
        ("Cafe Latte", "Smooth espresso with steamed milk and microfoam", "50.00", "Espresso & Brews", False, 0),
        ("Espresso Double (Doppio)", "Double shot of bold espresso extraction", "30.00", "Espresso & Brews", False, 0),
        ("Classic Cappuccino", "Balanced espresso, hot milk, and thick milk foam", "55.00", "Espresso & Brews", False, 0),
        ("Butter Flaky Croissant", "Golden, layered French butter croissant", "60.00", "Bakery & Pastries", True, 20),
        ("Chocolate Muffin", "Decadent dark chocolate chip muffin", "45.00", "Bakery & Pastries", True, 15),
        ("Iced Americano", "Double shot espresso over chilled water and ice", "40.00", "Cold Beverages", False, 0),
    ]

    for name, desc, price, cat_name, track_stock, stock_qty in products_to_seed:
        p_stmt = select(Product).where(Product.name == name)
        p_res = await session.execute(p_stmt)
        prod = p_res.scalars().first()
        if not prod:
            cat = category_map.get(cat_name)
            prod = Product(
                name=name,
                description=desc,
                selling_price=Decimal(price),
                category_id=cat.id if cat else 1,
                track_stock=track_stock,
                stock_quantity=stock_qty,
                is_active=True,
            )
            session.add(prod)

    await session.commit()


if __name__ == "__main__":
    import asyncio
    from app.core.database import AsyncSessionLocal, init_db

    async def main():
        await init_db()
        async with AsyncSessionLocal() as session:
            await seed_data(session)
            print("Safe local seed data applied successfully.")

    asyncio.run(main())
