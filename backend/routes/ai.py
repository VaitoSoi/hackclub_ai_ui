from typing import Annotated, Awaitable, Callable, TypeVar

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from lib.api import (
    CreateConversationRequest,
    CreateConversationResponse,
    SendPromptRequest,
    create_conversation,
    send_prompt,
)
from lib.db import (
    DBConversation,
    MessageWithBranch,
    MessageWithId,
    User,
    delete_conversation,
    get_branch_info,
    get_conversations,
    get_latest_message_of_conversation,
    get_message,
    get_session,
    user_can_see_conversation,
    user_can_see_message,
)
from lib.errors import ConversationNotFound, Forbidden, MessageNotFound, ModelNotFound
from lib.response import HTTP_EXECEPTION_MESSAGE, MESSAGE_OK
from lib.security import get_user_from_token

router = APIRouter(
    prefix="/ai",
    tags=["ai"],
    responses={
        404: HTTP_EXECEPTION_MESSAGE("<model | message | conservation> not found"),
        403: HTTP_EXECEPTION_MESSAGE("you cannot access this message or conversation"),
    },
)

T = TypeVar("T")


async def raise_if_error(
    func: Callable[..., Awaitable[T]], *args: ..., **kwargs: ...
) -> T:
    try:
        return await func(*args, **kwargs)

    except ModelNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "message": "model not found",
            },
        )

    except MessageNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "message": "message not found",
            },
        )

    except ConversationNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "message": "conservation not found",
            },
        )

    except Forbidden:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "message": "you cannot access this message or conversation",
            },
        )


@router.get(
    "/model", description="Get available models", responses={200: {"model": list[str]}}
)
async def get_models():
    from lib.api import model_list

    return model_list


@router.get(
    "/conversations",
    description="Get all conversations",
    responses={200: {"model": list[DBConversation]}},
)
async def get_conversations_api(
    user: Annotated[User, Depends(get_user_from_token)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    return await raise_if_error(get_conversations, user=user, session=session)


@router.get(
    "/conversation",
    description="Get all messages in a conversation",
    responses={200: {"model": list[MessageWithBranch]}},
)
async def get_conversation_api(
    id: str,
    user: Annotated[User, Depends(get_user_from_token)],
    session: Annotated[AsyncSession, Depends(get_session)],
    message: str | None = None,
):
    async def _iner():
        await user_can_see_conversation(user.id, id, session)
        latest_message = await get_latest_message_of_conversation(id, message, session)
        return await get_branch_info(latest_message.id, session)

    return await raise_if_error(_iner)


@router.get(
    "/children",
    description="Get all children of a message",
    responses={200: {"model": list[MessageWithId]}},
)
async def get_children_api(
    id: str,
    user: Annotated[User, Depends(get_user_from_token)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    async def _iner():
        await user_can_see_message(user.id, id, session)
        message = await get_message(id, session)
        return [MessageWithId(**child.model_dump()) for child in message.children]

    return await raise_if_error(_iner)


@router.post(
    "/conversation",
    description="Create a new conversation",
    responses={200: {"model": CreateConversationResponse}},
)
async def new_conversation_api(
    user: Annotated[User, Depends(get_user_from_token)],
    body: CreateConversationRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
):
    model_id = body.model_id
    message = body.content
    return await raise_if_error(
        create_conversation,
        user_id=user.id,
        model_id=model_id,
        message=message,
        session=session,
    )


@router.post(
    "/prompt",
    description="Send new message follow up message",
    responses={200: {"model": MessageWithId}},
)
async def send_prompt_api(
    user: Annotated[User, Depends(get_user_from_token)],
    body: SendPromptRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
):
    previous_message_id = body.message_id
    new_message = body.content

    async def _iner():
        await user_can_see_message(user.id, previous_message_id, session)
        return await send_prompt(previous_message_id, new_message, session)

    return await raise_if_error(_iner)


@router.delete(
    "/conversation", description="Delete a conversation", responses={200: MESSAGE_OK()}
)
async def delete_conversation_api(
    id: str,
    user: Annotated[User, Depends(get_user_from_token)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    async def _iner():
        await user_can_see_conversation(user.id, id, session)
        await delete_conversation(id, session)
        return {"message": "ok"}

    return await raise_if_error(_iner)
