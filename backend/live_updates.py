"""Process-local fan-out for immediate dashboard updates.

The database remains the source of truth. This fan-out only reduces UI latency;
clients refresh persisted vitals after receiving a message.
"""

import asyncio
from collections import defaultdict


_subscribers: dict[int, set[asyncio.Queue]] = defaultdict(set)


def subscribe(patient_id: int) -> asyncio.Queue:
    queue: asyncio.Queue = asyncio.Queue(maxsize=20)
    _subscribers[patient_id].add(queue)
    return queue


def unsubscribe(patient_id: int, queue: asyncio.Queue):
    subscribers = _subscribers.get(patient_id)
    if not subscribers:
        return
    subscribers.discard(queue)
    if not subscribers:
        _subscribers.pop(patient_id, None)


async def publish(patient_id: int, payload: dict):
    for queue in tuple(_subscribers.get(patient_id, ())):
        if queue.full():
            try:
                queue.get_nowait()
            except asyncio.QueueEmpty:
                pass
        await queue.put(payload)
