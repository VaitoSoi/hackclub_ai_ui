import re
from asyncio import Timeout
from typing import Any

from aiohttp import ClientSession
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from lib.db import (
    BaseConversation,
    BaseMessage,
    MessageWithId,
    MessageWithReasoning,
    create_new_conversation,
    create_session_and_run,
    follow_up,
    get_conversation_context,
    update_conversation_title,
)
from lib.errors import EmptyResponse, ModelNotFound, WrongModel


class APIMessageReponse(BaseModel):
    content: str
    reasoning: str | None = Field(default=None)
    role: str


class APIChoicesReponse(BaseModel):
    finish_reason: str
    index: int
    logprobs: Any
    message: APIMessageReponse


class APIUsageReponse(BaseModel):
    completion_time: float
    completion_tokens: int
    prompt_time: float
    prompt_tokens: int
    queue_time: float
    total_time: float
    total_tokens: int


class APIXGroqResponse(BaseModel):
    id: str


class APIReponse(BaseModel):
    choices: list[APIChoicesReponse]
    created: int
    id: str
    model: str
    object: str
    service_tier: str
    system_fingerprint: str
    usage: APIUsageReponse
    usage_breakdown: Any
    x_groq: APIXGroqResponse


class UserPrompt(BaseModel):
    content: str


class CreateConversationRequest(UserPrompt):
    model_id: str


class SendPromptRequest(UserPrompt):
    message_id: str

class SendPromptResponse(BaseModel):
    user: MessageWithId
    model: MessageWithId

class CreateConversationResponse(SendPromptResponse):
    conversation: BaseConversation


session: ClientSession
model_list: list[str] = [
    "qwen/qwen3-32b",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "meta-llama/llama-4-maverick-17b-128e-instruct",
]
reasoning_regex = re.compile(r"^<think>([\s\S]+)<\/think>([\s\S]+)$")


async def init() -> None:
    global session, model_list
    session = ClientSession("https://ai.hackclub.com")

    try:
        async with Timeout(5):
            async with session.get("/model") as response:
                model_list = (await response.text()).split(",")

    except TimeoutError:
        ...


async def close() -> None:
    await session.close()


async def create_conversation(
    user_id: str, model_id: str, message: str, session: AsyncSession | None = None
):
    if model_id not in model_list:
        raise ModelNotFound()

    async def _iner(session: AsyncSession):
        (new_conversation, new_message) = await create_new_conversation(
            user_id, model_id, session
        )
        await update_conversation_title(
            new_conversation.id, await entitle_message(message), session
        )
        model_reponse = await send_prompt(new_message.id, message, session)
        return CreateConversationResponse(
            conversation=new_conversation, **model_reponse.model_dump()
        )

    return await create_session_and_run(_iner, session)


async def send_prompt(
    follow_message_id: str, message: str, session: AsyncSession | None = None
) -> SendPromptResponse:
    async def _iner(session: AsyncSession):
        user_message = await follow_up(
            follow_message_id,
            MessageWithReasoning(content=message, role="user", reasoning=None),
            session,
        )
        return SendPromptResponse(
            user=MessageWithId(**user_message.model_dump()),
            model=await _send_prompt(user_message, user_message.conversation, session)
        )

    return await create_session_and_run(_iner, session)


async def _send_prompt(
    user_message: MessageWithId, conversation: BaseConversation, _session: AsyncSession
):
    global session

    context = await get_conversation_context(user_message.id)
    send_data: dict[str, Any] = {
        "messages": [
            BaseMessage(**message.model_dump()).model_dump() for message in context
        ],
        "model": conversation.model_id,
    }
    async with session.post("/chat/completions", json=send_data) as response:
        resp_data = APIReponse(**(await response.json()))
        if resp_data.model != conversation.model_id:
            raise WrongModel()

        try:
            model_response_message_raw = resp_data.choices[0].message

        except IndexError:
            raise EmptyResponse()

        model_response_message = MessageWithReasoning(
            **model_response_message_raw.model_dump()
        )
        if reasoning_regex.match(model_response_message.content):
            reasoning, content = reasoning_regex.findall(
                model_response_message.content
            )[0]
            model_response_message.reasoning = reasoning
            model_response_message.content = content
        model_response_message_db = await follow_up(
            user_message.id, model_response_message, _session
        )
        return MessageWithId(
            id=model_response_message_db.id,
            content=model_response_message_db.content,
            reasoning=model_response_message_db.reasoning,
            role=model_response_message_db.role,
        )


_system_prompt = """
You are a title generator. Your task is to read the user's message and create a short, descriptive, and engaging title that summarizes its main topic or intent.  
Follow these rules:  
1. Just response the title, not to say anything else
2. Keep the title concise (ideally under 10 words).  
3. Use clear, natural language — avoid unnecessary jargon.  
4. Capitalize the first letter of major words.  
5. Do not include quotation marks or punctuation at the end unless necessary.  
6. Focus on the main subject, not minor details.  

Example:  
User: "I need help understanding how SQL joins work"  
Title: "Understanding SQL Joins"
"""


async def entitle_message(message: str):
    send_data: dict[str, Any] = {
        "messages": [
            {"role": "system", "content": _system_prompt},
            {"role": "user", "content": message},
        ],
        "model": "openai/gpt-oss-20b",
    }
    async with session.post("/chat/completions", json=send_data) as response:
        resp_data = APIReponse(**(await response.json()))

        try:
            return resp_data.choices[0].message.content

        except IndexError:
            raise EmptyResponse()
