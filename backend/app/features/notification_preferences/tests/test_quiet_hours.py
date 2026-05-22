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
