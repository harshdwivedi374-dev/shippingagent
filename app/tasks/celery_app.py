"""
Background task runner — replaces Celery for no-Redis local development.
Uses asyncio directly. Tasks are triggered from the API or run via the scheduler.
"""
import asyncio
from app.core.logging import logger


async def run_task(coro):
    """Fire-and-forget a coroutine as a background task."""
    try:
        await coro
    except Exception as e:
        logger.error("background_task_failed", error=str(e))


def schedule_task(coro):
    """Schedule a coroutine to run in the background without blocking."""
    try:
        loop = asyncio.get_event_loop()
        loop.create_task(run_task(coro))
    except RuntimeError:
        # No running loop — run directly (e.g. in scripts)
        asyncio.run(run_task(coro))
