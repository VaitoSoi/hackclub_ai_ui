from datetime import datetime, timedelta
from typing import Annotated, Any, Dict

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse, Response
from fastapi.security import OAuth2PasswordRequestForm

from lib.db import (
    DBUser,
    User,
    UserWithPassword,
    delete_user,
    # get_user,
    get_user_db,
    # get_users,
    new_user,
    update_user,
    verify_user,
)
from lib.errors import (
    InvalidPassword,
    InvalidUsername,
    # Missing,
    UserExisted,
    UserNotFound,
    WrongPassword,
)
from lib.response import HTTP_EXECEPTION_MESSAGE
from lib.security import (
    get_user_from_token,
    signature,
)

router = APIRouter(prefix="/user", tags=["user"])


@router.get(
    path="/me", description="Get current user", responses={200: {"model": User}}
)
def get_me(user: Annotated[User, Depends(get_user_from_token)]):
    return user


@router.post(
    "/login",
    description="Login and get token",
    responses={
        200: {
            "content": {
                "application/json": {
                    "schema": {
                        "type": "object",
                        "properties": {
                            "access_token": "string",
                            "token_type": {"type": "string", "default": "bearer"},
                            "user": DBUser.model_json_schema(),
                        },
                    }
                }
            }
        },
        401: HTTP_EXECEPTION_MESSAGE("wrong password D:"),
    },
)
async def login(
    user_form: Annotated[OAuth2PasswordRequestForm, Depends()],
    expire_time: timedelta = timedelta(days=7),
) -> Dict[str, Any]:
    input_username = user_form.username
    input_password = user_form.password

    try:
        user = await get_user_db(username=input_username)
    except UserNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "username not found D:", "username": input_username},
        )

    try:
        await verify_user(input_password=input_password, user=user)
    except WrongPassword:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": "wrong password D:"},
        )

    token = jwt.encode(  # type: ignore
        {"id": user.id, "exp": datetime.now() + expire_time},
        signature,
        algorithm="HS512",
    )
    return {"access_token": token, "token_type": "bearer", "user": user.model_dump()}


@router.post(
    "/",
    description="Create new user",
    responses={
        201: {
            "content": {
                "application/json": {
                    "schema": {
                        "type": "object",
                        "properties": {
                            "message": {"type": "string", "default": "created"},
                            "user": DBUser.model_json_schema(),
                        },
                    }
                }
            }
        },
        409: HTTP_EXECEPTION_MESSAGE("username already existed"),
        400: HTTP_EXECEPTION_MESSAGE(["invalid username", "invalid password"]),
    },
)
async def create_user(user: UserWithPassword):
    try:
        _new_user = await new_user(user)

        return JSONResponse(
            {"message": "created", "user": _new_user.model_dump()},
            status_code=status.HTTP_201_CREATED,
        )

    except UserExisted:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"message": "username already existed"},
        )

    except InvalidUsername:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "invalid username"},
        )

    except InvalidPassword:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "invalid password"},
        )


@router.put(
    "/",
    description="Update current user or a specific user by ID",
    responses={
        200: {
            "content": {
                "application/json": {
                    "schema": {
                        "type": "object",
                        "properties": {
                            "message": {"type": "string", "default": "updated"},
                            "user": DBUser.model_json_schema(),
                        },
                    }
                }
            }
        },
        409: HTTP_EXECEPTION_MESSAGE("username already existed"),
        400: HTTP_EXECEPTION_MESSAGE(["invalid username", "invalid password"]),
    },
)
async def update_user_api(
    user: Annotated[User, Depends(get_user_from_token)],
    new_user: User,
):
    try:
        new_user_ = await update_user(new_user, username=user.username)

        return JSONResponse({"message": "updated", "user": new_user_.model_dump()})

    except UserExisted:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"message": "username already existed"},
        )

    except InvalidUsername:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "invalid username"},
        )

    except InvalidPassword:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "invalid password"},
        )


@router.delete(
    path="/",
    description="Delete current user or a specific user by ID",
    responses={204: {}},
)
async def delete_user_api(
    user: Annotated[User, Depends(get_user_from_token)],
):
    await delete_user(username=user.username)

    return Response(status_code=status.HTTP_204_NO_CONTENT)
