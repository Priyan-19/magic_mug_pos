from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.schemas.analytics import (
    DailyAnalyticsResponse,
    WeeklyAnalyticsResponse,
    MonthlyAnalyticsResponse,
    BestSellerItem,
    SlowMoverItem
)
from app.services.analytics_service import AnalyticsService
from app.services.auth_service import require_role

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def get_current_local_date() -> date:
    tz = ZoneInfo(settings.TIMEZONE)
    return datetime.now(tz).date()


@router.get("/daily", response_model=DailyAnalyticsResponse)
async def get_daily_analytics(
    target_date: Optional[date] = Query(None, alias="date", description="Target date (default: today)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["OWNER"]))
):
    query_date = target_date or get_current_local_date()
    return await AnalyticsService.get_daily_analytics(db=db, target_date=query_date)


@router.get("/weekly", response_model=WeeklyAnalyticsResponse)
async def get_weekly_analytics(
    start_date: Optional[date] = Query(None, description="Start date of 7-day period (default: 6 days ago)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["OWNER"]))
):
    query_date = start_date or (get_current_local_date() - timedelta(days=6))
    return await AnalyticsService.get_weekly_analytics(db=db, start_date=query_date)


@router.get("/monthly", response_model=MonthlyAnalyticsResponse)
async def get_monthly_analytics(
    year: Optional[int] = Query(None, description="Year (default: current year)"),
    month: Optional[int] = Query(None, ge=1, le=12, description="Month (default: current month)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["OWNER"]))
):
    today = get_current_local_date()
    q_year = year or today.year
    q_month = month or today.month
    return await AnalyticsService.get_monthly_analytics(db=db, year=q_year, month=q_month)


@router.get("/best-sellers", response_model=List[BestSellerItem])
async def get_best_sellers(
    limit: int = Query(10, ge=1, le=50),
    start_date: Optional[date] = Query(None, description="Filter start date"),
    end_date: Optional[date] = Query(None, description="Filter end date"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["OWNER"]))
):
    return await AnalyticsService.get_best_sellers(
        db=db,
        start_date=start_date,
        end_date=end_date,
        limit=limit
    )


@router.get("/slow-movers", response_model=List[SlowMoverItem])
async def get_slow_movers(
    limit: int = Query(10, ge=1, le=50),
    days: int = Query(30, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["OWNER"]))
):
    return await AnalyticsService.get_slow_movers(
        db=db,
        days=days,
        limit=limit
    )
