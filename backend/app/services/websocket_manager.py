from typing import Dict, List
from fastapi import WebSocket
from uuid import UUID

class ConnectionManager:
    def __init__(self):
        # expense_id -> list of websockets
        self.active_connections: Dict[UUID, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, expense_id: UUID):
        await websocket.accept()
        if expense_id not in self.active_connections:
            self.active_connections[expense_id] = []
        self.active_connections[expense_id].append(websocket)

    def disconnect(self, websocket: WebSocket, expense_id: UUID):
        if expense_id in self.active_connections:
            if websocket in self.active_connections[expense_id]:
                self.active_connections[expense_id].remove(websocket)
            if not self.active_connections[expense_id]:
                del self.active_connections[expense_id]

    async def broadcast(self, message: str, expense_id: UUID):
        if expense_id in self.active_connections:
            for connection in self.active_connections[expense_id]:
                await connection.send_text(message)

manager = ConnectionManager()
