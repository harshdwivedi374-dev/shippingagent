"""
In-memory cache — replaces Redis for local/no-Docker development.
Uses a simple dict with TTL expiry. Drop-in replacement for the Redis client.
"""
import json
import time
from typing import Optional, Any

# Simple in-memory store: {key: (value_json, expires_at)}
_cache: dict[str, tuple[str, float]] = {}

# Event log for pub/sub (replaces Redis pub/sub)
_event_log: list[dict] = []


async def get_redis():
    """Stub — returns None, all functions work without Redis."""
    return None


async def cache_set(key: str, value: Any, ttl: int = 300) -> None:
    expires_at = time.time() + ttl
    _cache[key] = (json.dumps(value), expires_at)


async def cache_get(key: str) -> Optional[Any]:
    entry = _cache.get(key)
    if not entry:
        return None
    value_json, expires_at = entry
    if time.time() > expires_at:
        del _cache[key]
        return None
    return json.loads(value_json)


async def cache_delete(key: str) -> None:
    _cache.pop(key, None)


async def publish_event(channel: str, event: dict) -> None:
    """Store events in memory log instead of Redis pub/sub."""
    _event_log.append({
        "channel": channel,
        "event": event,
        "timestamp": time.time(),
    })
    # Keep only last 500 events
    if len(_event_log) > 500:
        _event_log.pop(0)


async def get_recent_events(channel: Optional[str] = None, limit: int = 50) -> list:
    """Read recent events (replaces Redis subscribe)."""
    events = _event_log[-limit:]
    if channel:
        events = [e for e in events if e["channel"] == channel]
    return events
