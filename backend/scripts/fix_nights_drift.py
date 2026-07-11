"""
One-off data-repair script: recompute nights/total/commission from stored
dates wherever they've drifted (e.g. a manually-typed nights value that
didn't match checkin/checkout).

Run from backend/ with the venv active:
    python scripts/fix_nights_drift.py          # dry run, prints what would change
    python scripts/fix_nights_drift.py --apply  # writes the fixes
"""
import sys
import os
import asyncio
from decimal import Decimal, ROUND_HALF_UP

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
import database
from models import Booking, Reservation, Stay


def _round2(x) -> Decimal:
    return Decimal(str(x)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


async def fix_bookings(session, apply: bool) -> int:
    result = await session.execute(select(Booking))
    fixed = 0
    for b in result.scalars().all():
        correct_nights = (b.checkout_date - b.checkin_date).days
        if correct_nights <= 0:
            print(f"  [SKIP] booking {b.booking_ref}: checkout <= checkin ({b.checkin_date} -> {b.checkout_date})")
            continue
        correct_total = _round2(Decimal(str(b.room_rate)) * correct_nights)
        correct_commission = _round2(correct_total * Decimal("0.15"))
        if b.nights != correct_nights or _round2(b.total_amount) != correct_total:
            print(f"  booking {b.booking_ref}: nights {b.nights}->{correct_nights}, "
                  f"total ${b.total_amount}->${correct_total}, commission ${b.commission_amount}->${correct_commission}")
            fixed += 1
            if apply:
                b.nights = correct_nights
                b.total_amount = correct_total
                b.commission_amount = correct_commission
    return fixed


async def fix_reservations(session, apply: bool) -> int:
    result = await session.execute(select(Reservation))
    fixed = 0
    for r in result.scalars().all():
        correct_nights = (r.checkout_date - r.checkin_date).days
        if correct_nights <= 0:
            print(f"  [SKIP] reservation {r.reservation_ref}: checkout <= checkin ({r.checkin_date} -> {r.checkout_date})")
            continue
        correct_total = _round2(Decimal(str(r.rate_per_night)) * correct_nights)
        correct_commission = _round2(correct_total * Decimal(str(r.commission_rate)) / Decimal("100"))
        correct_balance = correct_total - (r.amount_paid or Decimal("0"))
        if r.nights != correct_nights or _round2(r.total_amount) != correct_total:
            print(f"  reservation {r.reservation_ref}: nights {r.nights}->{correct_nights}, "
                  f"total ${r.total_amount}->${correct_total}, commission ${r.commission_amount}->${correct_commission}")
            fixed += 1
            if apply:
                r.nights = correct_nights
                r.total_amount = correct_total
                r.balance_due = correct_balance
                r.commission_amount = correct_commission
    return fixed


async def fix_stays(session, apply: bool) -> int:
    result = await session.execute(select(Stay))
    fixed = 0
    for s in result.scalars().all():
        correct_nights = (s.expected_checkout - s.checkin_date).days
        if correct_nights <= 0:
            print(f"  [SKIP] stay {s.id} ({s.guest_first_name} {s.guest_last_name}): "
                  f"checkout <= checkin ({s.checkin_date} -> {s.expected_checkout})")
            continue
        num_rooms = s.num_rooms or 1
        correct_total = _round2(Decimal(str(s.rate_per_night)) * correct_nights * num_rooms)
        correct_commission = _round2(correct_total * Decimal(str(s.commission_rate)) / Decimal("100"))
        correct_balance = correct_total - (s.amount_paid or Decimal("0"))
        if s.nights_total != correct_nights or _round2(s.total_amount) != correct_total:
            print(f"  stay {s.id} ({s.guest_first_name} {s.guest_last_name}): "
                  f"nights {s.nights_total}->{correct_nights}, "
                  f"total ${s.total_amount}->${correct_total}, commission ${s.commission_amount}->${correct_commission}")
            fixed += 1
            if apply:
                s.nights_total = correct_nights
                s.total_amount = correct_total
                s.balance_due = correct_balance
                s.commission_amount = correct_commission
    return fixed


async def main():
    apply = "--apply" in sys.argv
    database.setup_db()
    async with database._AsyncSessionLocal() as session:
        print("Bookings:")
        n1 = await fix_bookings(session, apply)
        print("Reservations:")
        n2 = await fix_reservations(session, apply)
        print("Stays:")
        n3 = await fix_stays(session, apply)

        total = n1 + n2 + n3
        if apply:
            await session.commit()
            print(f"\nApplied fixes to {total} record(s).")
        else:
            print(f"\n{total} record(s) would be fixed. Re-run with --apply to write changes.")


if __name__ == "__main__":
    asyncio.run(main())
