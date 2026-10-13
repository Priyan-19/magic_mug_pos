from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.core.config import settings

# PostgreSQL Async Engine configuration
engine = create_async_engine(
    settings.async_database_url,
    echo=False,
    future=True,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    # Ensure all models are registered on Base.metadata before creating tables
    import app.models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        from sqlalchemy import text
        try:
            await conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS track_stock BOOLEAN DEFAULT FALSE;"))
            await conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;"))
            await conn.execute(text("ALTER TABLE bill_items ALTER COLUMN product_id DROP NOT NULL;"))
            await conn.execute(text("ALTER TABLE bill_items DROP CONSTRAINT IF EXISTS bill_items_product_id_fkey;"))
            await conn.execute(text("ALTER TABLE bill_items ADD CONSTRAINT bill_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;"))
        except Exception as e:
            print(f"[init_db] Column/FK migration check: {e}")

    # Ensure initial cafe admin account exists for production authentication (Zero test data)
    from sqlalchemy import select
    from app.models.user import User
    from app.core.security import get_password_hash

    async with AsyncSessionLocal() as session:
        try:
            from sqlalchemy import update
            # Normalize any 'Magic Mug Cafe' entries to 'Magic Mug'
            await session.execute(
                update(User)
                .where(User.full_name == "Magic Mug Cafe")
                .values(full_name="Magic Mug")
            )

            stmt = select(User).where(User.username == "admin")
            result = await session.execute(stmt)
            admin_user = result.scalars().first()
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
            elif admin_user.full_name != "Magic Mug":
                admin_user.full_name = "Magic Mug"
            await session.commit()
        except Exception as e:
            await session.rollback()
            print(f"[init_db] Admin user check: {e}")

