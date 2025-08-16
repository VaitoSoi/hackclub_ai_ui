from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from lib.db import get_user
from lib.env import SIGNATURE as signature
from lib.errors import UserNotFound

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/user/login")


def decode_jwt(token: str, verify_expiration: bool = True):
    try:
        return jwt.decode(token, signature, algorithms="HS512", verify_exp=verify_expiration)  # type: ignore

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "message": "token expired"
            }
        )

    except jwt.InvalidSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "message": "invalid signature"
            }
        )


async def get_user_from_token(token: Annotated[str, Depends(oauth2_scheme)]):
    decoded = decode_jwt(token)

    if "id" not in decoded:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail={"message": "missing user id"}
        )

    try:
        return await get_user(id=decoded["id"])

    except UserNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail={
                "message": "user not found",
                "id": decoded["id"]
            }
        )