import re
from datetime import datetime, timezone
from typing import Awaitable, Callable, Optional, TypeVar
from uuid import uuid4

from argon2.exceptions import VerifyMismatchError
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import (
    AsyncAttrs,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import selectinload
from sqlmodel import (
    JSON,
    Column,
    Field,
    ForeignKey,
    Relationship,
    SQLModel,
    String,
    and_,
    asc,
    col,
    desc,
    select,
)

from lib.env import DB_URL
from lib.errors import (
    ConversationNotFound,
    Forbidden,
    InvalidPassword,
    InvalidUsername,
    MessageNotFound,
    Missing,
    UserExisted,
    UserNotFound,
    WrongPassword,
)
from lib.hash import hash_func, verify_func


class User(SQLModel):
    id: str = Field(default_factory=lambda: uuid4().__str__(), primary_key=True)
    username: str
    model_personality: str | None = Field(default=None)


class UserWithPassword(User):
    password: str


class DBUser(UserWithPassword, table=True):
    __tablename__ = "user"  # type: ignore


class BaseConversation(SQLModel):
    id: str = Field(default_factory=lambda: uuid4().__str__(), primary_key=True)
    model_id: str
    title: str = Field(default="")
    user_id: str = Field(foreign_key="user.id")


class DBConversation(BaseConversation, table=True):
    __tablename__ = "conversation"  # type: ignore

    messages: list["DBMessage"] = Relationship(back_populates="conversation")

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class BaseMessage(SQLModel):
    role: str
    content: str


class MessageWithReasoning(BaseMessage):
    reasoning: Optional[str]


class MessageWithId(MessageWithReasoning):
    id: str = Field(default_factory=lambda: uuid4().__str__(), primary_key=True)


class DBMessage(MessageWithId, AsyncAttrs, table=True):
    __tablename__ = "message"  # type: ignore
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Content
    role: str
    reasoning: Optional[str]
    content: str

    # Tree relationships
    conversation_id: str = Field(
        sa_column=Column(String, ForeignKey("conversation.id", ondelete="CASCADE"))
    )
    conversation: DBConversation = Relationship(back_populates="messages")

    parent_id: str | None = Field(default=None, foreign_key="message.id")
    parent: "DBMessage" = Relationship(
        back_populates="children",
        sa_relationship_kwargs={"remote_side": "DBMessage.id"},
    )
    children: list["DBMessage"] = Relationship(
        back_populates="parent",
        # sa_relationship_kwargs={"lazy": "joined"},
    )

    path: list[str] = Field(sa_column=Column(JSON))


class BranchInfo(BaseModel):
    total: int
    current: int


class MessageWithBranch(MessageWithId):
    branch: Optional[BranchInfo]


engine = create_async_engine(DB_URL)


async def init():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)


T = TypeVar("T")


async def create_session_and_run(
    func: Callable[[AsyncSession], Awaitable[T]],
    session: AsyncSession | None = None,
) -> T:
    if session:
        return await func(session)
    else:
        async_session = async_sessionmaker(engine, expire_on_commit=False)
        async with async_session() as session:
            return await func(session)


async def get_session():
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    async with async_session() as session:
        yield session


"""
AI
"""

_system_prompt = """You are an AI assistant.

Base rules:
- Be helpful, clear, and accurate.
- Adapt to the user's technical level.
- Remain respectful and follow content policies.
- Never fabricate facts.

{custom_personality}

Apply the user's personality request to tone, style, and interaction while keeping your base rules.
If the user does not specify a personality, default to warm, professional, and slightly lighthearted.
"""


async def get_conversations(
    user: User, session: AsyncSession | None = None
) -> list[DBConversation]:
    async def _iner(session: AsyncSession):
        statement = select(DBConversation).where(DBConversation.user_id == user.id)
        return list((await session.execute(statement)).scalars().all())

    return await create_session_and_run(_iner, session)


async def get_conversation(
    id: str, session: AsyncSession | None = None
) -> DBConversation:
    async def _iner(session: AsyncSession):
        statement = select(DBConversation).where(DBConversation.id == id).limit(1)
        result = await session.execute(statement)
        conservation = result.scalar()
        if not conservation:
            raise ConversationNotFound()

        return conservation

    return await create_session_and_run(_iner, session)


async def update_conversation_title(
    id: str, title: str, session: AsyncSession | None = None
):
    async def _iner(session: AsyncSession):
        statement = select(DBConversation).where(DBConversation.id == id).limit(1)
        result = await session.execute(statement)
        conservation = result.scalar()
        if not conservation:
            raise ConversationNotFound()

        conservation.title = title
        session.add(conservation)
        await session.commit()

        return conservation

    return await create_session_and_run(_iner, session)


async def get_message(id: str, session: AsyncSession | None = None) -> DBMessage:
    async def _iner(session: AsyncSession):
        statement = (
            select(DBMessage)
            .where(DBMessage.id == id)
            .limit(1)
            .options(
                selectinload(DBMessage.conversation),  # type: ignore
                selectinload(DBMessage.children),  # type: ignore
            )
        )
        result = await session.execute(statement)
        message = result.scalar()
        if not message:
            raise MessageNotFound()

        await session.refresh(message, ["conversation", "children"])

        return message

    return await create_session_and_run(_iner, session)


async def get_latest_message_of_conversation(
    conversation_id: str,
    contain_message: str | None = None,
    session: AsyncSession | None = None,
) -> DBMessage:
    async def _iner(session: AsyncSession):
        conversation = await get_conversation(conversation_id, session)
        if contain_message:
            await get_message(contain_message)
        statement = (
            select(DBMessage)
            .where(
                and_(
                    DBMessage.conversation_id == conversation.id,
                    col(DBMessage.path).contains(contain_message)
                    if contain_message
                    else True,
                )
            )
            .order_by(desc(DBMessage.created_at))
            .limit(1)
        )
        result = await session.execute(statement)
        message = result.scalar()
        if not message:
            raise MessageNotFound()
        return message

    return await create_session_and_run(_iner, session)


def get_system_prompt(custom_personality: str | None = None) -> str:
    return _system_prompt.format(
        custom_personality=f"User's desired personality: {custom_personality}"
        if custom_personality
        else ""
    )


async def create_new_conversation(
    user_id: str, model_id: str, session: AsyncSession | None = None
) -> tuple[BaseConversation, MessageWithId]:
    async def _iner(session: AsyncSession):
        user = await get_user_db(user_id, session=session)

        conversation_id = uuid4().__str__()
        conversation = DBConversation(
            id=conversation_id, user_id=user.id, model_id=model_id
        )

        system_message_id = uuid4().__str__()
        system_message = DBMessage(
            id=system_message_id,
            content=get_system_prompt(user.model_personality),
            reasoning=None,
            role="system",
            conversation_id=conversation.id,
            path=[system_message_id],
        )

        session.add_all([conversation, system_message])
        await session.commit()

        return (
            BaseConversation(id=conversation_id, model_id=model_id, user_id=user.id),
            MessageWithId(
                role="system",
                reasoning=None,
                content=system_message.content,
                id=system_message_id,
            ),
        )

    return await create_session_and_run(_iner, session)


async def get_conversation_context(
    message_id: str, session: AsyncSession | None = None
) -> list[MessageWithId]:
    async def _iner(session: AsyncSession):
        base_statement = select(DBMessage).where(DBMessage.id == message_id)
        base_result = await session.execute(base_statement)
        base_message = base_result.scalar()
        if not base_message:
            raise MessageNotFound()

        statement = (
            select(DBMessage)
            .where(col(DBMessage.id).in_(base_message.path))
            .order_by(asc(DBMessage.created_at))
        )
        result = await session.execute(statement)
        messages = result.scalars().all()
        return [MessageWithId(**(message.model_dump())) for message in messages]

    return await create_session_and_run(_iner, session)


async def follow_up(
    follow_message: str,
    new_message: MessageWithReasoning,
    session: AsyncSession | None = None,
) -> DBMessage:
    async def _iner(session: AsyncSession):
        statement = select(DBMessage).where(DBMessage.id == follow_message)
        result = await session.execute(statement)
        follow_db_message = result.scalar()
        if not follow_db_message:
            raise MessageNotFound()

        new_db_message_id = uuid4().__str__()
        new_db_message = DBMessage(
            id=new_db_message_id,
            content=new_message.content,
            reasoning=new_message.reasoning,
            role=new_message.role,
            conversation_id=follow_db_message.conversation_id,
            parent_id=follow_db_message.id,
            path=[*follow_db_message.path, new_db_message_id],
        )
        session.add(new_db_message)
        await session.commit()
        await session.refresh(new_db_message, ["conversation"])

        return new_db_message

    return await create_session_and_run(_iner, session)


async def get_branch_info(last_message_id: str, session: AsyncSession | None = None):
    async def _iner(session: AsyncSession):
        last_message = await get_message(last_message_id, session)

        current_path = last_message.path
        if len(current_path) < 2:
            messages = await get_conversation_context(last_message.id, session)
            return [
                MessageWithBranch(**message.model_dump(), branch=None)
                for message in messages
            ]

        statement = (
            select(DBMessage)
            .where(col(DBMessage.id).in_(current_path))
            .order_by(asc(DBMessage.created_at))
        )
        result = await session.execute(statement)
        messages_in_branch = result.scalars().all()

        parent_ids = current_path[:-1]
        statement = (
            select(DBMessage)
            .where(col(DBMessage.parent_id).in_(parent_ids))
            .order_by(asc(DBMessage.created_at))
        )
        children_result = await session.execute(statement)
        children = children_result.scalars().all()

        children_map: dict[str, list[str]] = {}
        for child in children:
            if not child.parent_id:
                continue
            if child.parent_id not in children_map:
                children_map[child.parent_id] = []
            children_map[child.parent_id].append(child.id)

        message_with_branch: list[MessageWithBranch] = []
        for message in messages_in_branch:
            if message.id not in children_map or children_map[message.id].__len__() < 2:
                message_with_branch.append(
                    MessageWithBranch(**message.model_dump(), branch=None)
                )
                continue

            try:
                ind, _ = next(
                    (index, child)
                    for index, child in enumerate(children_map[message.id])
                    if child in current_path
                )
                message_with_branch.append(
                    MessageWithBranch(
                        **message.model_dump(),
                        branch=BranchInfo(
                            total=children_map[message.id].__len__(), current=ind + 1
                        ),
                    )
                )

            except StopIteration:
                message_with_branch.append(
                    MessageWithBranch(**message.model_dump(), branch=None)
                )

        return message_with_branch

    return await create_session_and_run(_iner, session)


async def delete_conversation(
    id: str,
    session: AsyncSession | None = None,
):
    async def _iner(session: AsyncSession):
        exist_conversation = await get_conversation(id=id, session=session)
        await session.delete(exist_conversation)
        await session.commit()

    return await create_session_and_run(_iner, session)



"""
USER
"""

username_regexp = re.compile(r"^[a-z0-9_]+$")


def _check_valid_username(username: str):
    return username_regexp.match(username)


def _check_password_safety(password: str):
    return password.__len__() >= 8


async def get_users(session: AsyncSession | None = None) -> list[User]:
    async def _iner(session: AsyncSession):
        statement = select(DBUser)
        result = await session.execute(statement)
        users = list(result.scalars().all())

        return [User(**user.model_dump()) for user in users]

    return await create_session_and_run(_iner, session)


async def get_user_db(
    id: str | None = None,
    username: str | None = None,
    session: AsyncSession | None = None,
) -> DBUser:
    if not id and not username:
        raise Missing()

    async def _get_user(session: AsyncSession):
        user: DBUser | None = None
        statement = select(DBUser)

        if id:
            result = await session.execute(statement.where(DBUser.id == id))
            user = result.scalar()
            if user:
                return user

        if username:
            result = await session.execute(statement.where(DBUser.username == username))
            user = result.scalar()

        return user

    user: DBUser | None = await create_session_and_run(_get_user, session)

    if not user:
        raise UserNotFound()
    return user


async def get_user(id: str | None = None, username: str | None = None) -> User:
    user: DBUser = await get_user_db(id=id, username=username)
    return User(**user.model_dump())


async def verify_user(
    input_password: str,
    id: str | None = None,
    user: DBUser | None = None,
):
    user = user or await get_user_db(id=id)

    try:
        return verify_func(user.password, input_password)

    except (AssertionError, VerifyMismatchError):
        raise WrongPassword()


# NEW


async def _new_user(new_user: DBUser, session: AsyncSession | None = None):
    async def _iner(session: AsyncSession):
        try:
            exist_user = await get_user_db(username=new_user.username, session=session)
            if exist_user:
                raise UserExisted()
        except UserNotFound:
            ...

        new_user.password = hash_func(new_user.password)

        session.add(new_user)
        await session.commit()

        return await get_user_db(username=new_user.username, session=session)

    return await create_session_and_run(_iner, session)


async def new_user(new_user: UserWithPassword):
    if not _check_valid_username(new_user.username):
        raise InvalidUsername()

    if not _check_password_safety(new_user.password):
        raise InvalidPassword()

    return await _new_user(
        DBUser(username=new_user.username, password=new_user.password)
    )


# UPDATE
async def update_user(
    new_user: User,
    id: str | None = None,
    username: str | None = None,
    session: AsyncSession | None = None,
):
    async def _iner(session: AsyncSession):
        db_user = await get_user_db(id=id, username=username, session=session)
        db_user_dump = db_user.model_dump()

        for key, value in new_user.model_dump().items():
            if key == "id":
                continue

            if db_user_dump[key] != value:
                if key == "username":
                    if not _check_valid_username(value):
                        raise InvalidUsername()

                    try:
                        existed_user = await get_user_db(
                            username=value, session=session
                        )
                        if existed_user.id != db_user.id:
                            raise UserExisted()

                    except UserNotFound:
                        ...

                if key == "password" and value:
                    if not _check_password_safety(value):
                        raise InvalidPassword()

                    value = hash_func(value)

                if value:
                    setattr(db_user, key, value)

        if not _check_valid_username(db_user.username):
            raise InvalidUsername()

        if not _check_password_safety(db_user.password):
            raise InvalidPassword()

        session.add(db_user)
        await session.commit()

        return await get_user_db(username=new_user.username, session=session)

    return await create_session_and_run(_iner, session)


# DELETE
async def delete_user(
    id: str | None = None,
    username: str | None = None,
    session: AsyncSession | None = None,
):
    async def _iner(session: AsyncSession):
        exist_user = await get_user_db(id=id, username=username, session=session)
        await session.delete(exist_user)
        await session.commit()

    return await create_session_and_run(_iner, session)


# UTILS
async def user_can_see_message(
    user_id: str, message_id: str, session: AsyncSession | None = None
):
    async def _iner(session: AsyncSession):
        user = await get_user_db(id=user_id, session=session)
        message = await get_message(message_id, session)

        await session.refresh(message, ["conversation"])

        if message.conversation.user_id != user.id:
            raise Forbidden()

        return "ok"

    return await create_session_and_run(_iner, session)


async def user_can_see_conversation(
    user_id: str, conversation_id: str, session: AsyncSession | None = None
):
    async def _iner(session: AsyncSession):
        user = await get_user_db(id=user_id, session=session)
        conversation = await get_conversation(conversation_id, session)

        if conversation.user_id != user.id:
            raise Forbidden()

        return "ok"

    return await create_session_and_run(_iner, session)
