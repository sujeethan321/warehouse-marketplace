from app.schemas.user import UserCreate, UserResponse, Token


def test_auth_schema_aliases_are_available():
    assert UserCreate is not None
    assert UserResponse is not None
    assert Token is not None
