from datetime import datetime, timezone, timedelta

COLOMBIA_TZ = timezone(timedelta(hours=-5))


def now_colombia() -> datetime:
    """Returns current time in Colombia timezone (UTC-5) as a naive datetime."""
    return datetime.now(COLOMBIA_TZ).replace(tzinfo=None)
