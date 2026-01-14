from __future__ import annotations

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo


def eastern_utc_bounds_for_local_day(d: datetime.date) -> tuple[datetime, datetime]:
    tz = ZoneInfo("America/New_York")
    start_local = datetime(d.year, d.month, d.day, tzinfo=tz)
    end_local = start_local + timedelta(days=1)
    return (start_local.astimezone(ZoneInfo("UTC")), end_local.astimezone(ZoneInfo("UTC")))


def test_eastern_day_bounds_duration_handles_dst() -> None:
    """Sanity check DST behavior is deterministic.

    We don't assert specific instants (depends on tzdb), but do assert the
    day-length changes around DST transitions.
    """

    # US DST starts 2nd Sunday in March; 2024-03-10 is a DST start day.
    start_utc, end_utc = eastern_utc_bounds_for_local_day(datetime(2024, 3, 10).date())
    assert int((end_utc - start_utc).total_seconds()) == 23 * 3600

    # US DST ends 1st Sunday in November; 2024-11-03 is a DST end day.
    start_utc, end_utc = eastern_utc_bounds_for_local_day(datetime(2024, 11, 3).date())
    assert int((end_utc - start_utc).total_seconds()) == 25 * 3600
