from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from services.hotel_search import HotelSearchService

router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
async def search_hotels(
    checkin_date: date | None = Query(default=None),
    checkout_date: date | None = Query(default=None),
    guests: int = Query(default=1, ge=1, le=8),
    db: AsyncSession = Depends(get_db),
):
    return await HotelSearchService.search_hotels(
        db=db,
        checkin_date=checkin_date,
        checkout_date=checkout_date,
        guests=guests,
    )
