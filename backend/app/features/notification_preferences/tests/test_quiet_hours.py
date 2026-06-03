from datetime import time
from app.features.notification_preferences.service import is_within_quiet_hours


def _prefs(enabled=True, start="22:00", end="07:00"):
    return {"quiet_hours_enabled": enabled, "quiet_start": start, "quiet_end": end}


def test_disabled_returns_false():
    assert is_within_quiet_hours({"quiet_hours_enabled": False}) is False


def test_missing_times_returns_false():
    assert is_within_quiet_hours({"quiet_hours_enabled": True, "quiet_start": None, "quiet_end": None}) is False


def test_normal_range_within():
    # 09:00–18:00, now=12:00 → within
    assert is_within_quiet_hours(_prefs(start="09:00", end="18:00"), _now=time(12, 0)) is True


def test_normal_range_outside():
    # 09:00–18:00, now=20:00 → outside
    assert is_within_quiet_hours(_prefs(start="09:00", end="18:00"), _now=time(20, 0)) is False


def test_overnight_range_within():
    # 22:00–07:00, now=23:30 → within (past midnight side)
    assert is_within_quiet_hours(_prefs(start="22:00", end="07:00"), _now=time(23, 30)) is True


def test_overnight_range_outside():
    # 22:00–07:00, now=12:00 → outside (daytime)
    assert is_within_quiet_hours(_prefs(start="22:00", end="07:00"), _now=time(12, 0)) is False


def test_overnight_range_early_morning_within():
    # 22:00–07:00, now=06:00 → within (before end)
    assert is_within_quiet_hours(_prefs(start="22:00", end="07:00"), _now=time(6, 0)) is True


def test_mexico_city_utc_converted_prefs():
    # Mexico City (UTC-6): 22:00–07:00 local → frontend sends 04:00–13:00 UTC
    prefs = {"quiet_hours_enabled": True, "quiet_start": "04:00", "quiet_end": "13:00"}
    assert is_within_quiet_hours(prefs, _now=time(5, 0))   is True   # 23:00 CST
    assert is_within_quiet_hours(prefs, _now=time(12, 0))  is True   # 06:00 CST
    assert is_within_quiet_hours(prefs, _now=time(14, 0))  is False  # 08:00 CST
    assert is_within_quiet_hours(prefs, _now=time(3, 59))  is False  # 21:59 CST


def test_utcplus2_overnight_utc_prefs():
    # UTC+2: 22:00–07:00 local → frontend sends 20:00–05:00 UTC (overnight in UTC)
    prefs = {"quiet_hours_enabled": True, "quiet_start": "20:00", "quiet_end": "05:00"}
    assert is_within_quiet_hours(prefs, _now=time(21, 0))  is True   # 23:00 local
    assert is_within_quiet_hours(prefs, _now=time(1, 0))   is True   # 03:00 local
    assert is_within_quiet_hours(prefs, _now=time(5, 1))   is False  # 07:01 local
    assert is_within_quiet_hours(prefs, _now=time(19, 59)) is False  # 21:59 local
