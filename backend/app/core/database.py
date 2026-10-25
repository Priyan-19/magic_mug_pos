from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.core.config import settings

# Engine configuration (supports PostgreSQL and SQLite)
is_sqlite = "sqlite" in settings.async_database_url
engine_kwargs = {
    "echo": False,
    "future": True,
}
if not is_sqlite:
    engine_kwargs.update({
        "pool_pre_ping": True,
        "pool_size": 10,
        "max_overflow": 20,
        "pool_recycle": 300,
        "pool_timeout": 30,
        "connect_args": {
            # Required for Supabase PgBouncer transaction pooling
            "statement_cache_size": 0,
        },
    })

engine = create_async_engine(
    settings.async_database_url,
    **engine_kwargs
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
        if not is_sqlite:
            from sqlalchemy import text
            try:
                await conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS track_stock BOOLEAN DEFAULT FALSE;"))
                await conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;"))
                await conn.execute(text("ALTER TABLE bill_items ALTER COLUMN product_id DROP NOT NULL;"))
                await conn.execute(text("ALTER TABLE bill_items DROP CONSTRAINT IF EXISTS bill_items_product_id_fkey;"))
                await conn.execute(text("ALTER TABLE bill_items ADD CONSTRAINT bill_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;"))
                await conn.execute(text("ALTER TABLE bills ADD COLUMN IF NOT EXISTS shift_id BIGINT REFERENCES shifts(id) ON DELETE SET NULL;"))
                await conn.execute(text("ALTER TABLE bills ADD COLUMN IF NOT EXISTS split_details JSONB NULL;"))
                await conn.execute(text("ALTER TABLE bills ADD COLUMN IF NOT EXISTS cash_tendered NUMERIC(12, 2) NULL;"))
                await conn.execute(text("ALTER TABLE bills ADD COLUMN IF NOT EXISTS change_given NUMERIC(12, 2) NULL;"))
                await conn.execute(text("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS shift_id BIGINT REFERENCES shifts(id) ON DELETE SET NULL;"))
                await conn.execute(text("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(20) DEFAULT 'CASH';"))
                await conn.execute(text("ALTER TABLE bills DROP CONSTRAINT IF EXISTS check_bill_payment_mode;"))
                await conn.execute(text("ALTER TABLE bills ADD CONSTRAINT check_bill_payment_mode CHECK (payment_mode IN ('CASH', 'CARD', 'UPI', 'SPLIT'));"))
                # Production performance indexes
                await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON bill_items(bill_id);"))
                await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_bills_status_date ON bills(status, bill_date);"))
                await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_expenses_payment_shift ON expenses(payment_mode, shift_id);"))
                await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_expenses_date_shift ON expenses(expense_date, shift_id);"))
                # Production migration for single USER role in Supabase PostgreSQL
                await conn.execute(text("ALTER TABLE users DROP CONSTRAINT IF EXISTS check_user_role;"))
                await conn.execute(text("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;"))
                await conn.execute(text("UPDATE users SET role = 'USER' WHERE role != 'USER';"))
                await conn.execute(text("ALTER TABLE users ADD CONSTRAINT check_user_role CHECK (role = 'USER');"))
            except Exception as e:
                print(f"[init_db] Column/FK/Index migration check: {e}")


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

            stmt = select(User).order_by(User.id.asc())
            result = await session.execute(stmt)
            existing_user = result.scalars().first()
            if not existing_user:
                admin_user = User(
                    username="admin",
                    email="admin@magicmug.com",
                    password_hash=get_password_hash("admin123"),
                    full_name="Magic Mug",
                    role="USER",
                    is_active=True,
                )
                session.add(admin_user)
            else:
                existing_user.role = "USER"
            await session.commit()
        except Exception as e:
            await session.rollback()
            print(f"[init_db] Admin user check: {e}")

