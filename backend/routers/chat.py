from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.ai_chat import chat

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    conversation_history: list[ChatMessage] = []


@router.post("")
def send_message(payload: ChatRequest):
    try:
        history = [{"role": m.role, "content": m.content} for m in payload.conversation_history]
        result = chat(payload.message, history)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
