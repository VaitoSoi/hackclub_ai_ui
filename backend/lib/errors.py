"""
USER
"""


class InvalidUsername(Exception): ...


class InvalidPassword(Exception): ...


class UserNotFound(Exception): ...


class Missing(Exception): ...


class UserExisted(Exception): ...


class WrongPassword(Exception): ...


class Forbidden(Exception): ...


"""
MODEL
"""


class ModelNotFound(Exception): ...


class MessageNotFound(Exception): ...


class ConversationNotFound(Exception): ...


class WrongModel(Exception): ...


class EmptyResponse(Exception): ...
