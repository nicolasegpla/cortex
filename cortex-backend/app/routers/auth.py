from fastapi import APIRouter, status

from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse

router = APIRouter(prefix='/auth', tags=['auth'])


@router.post('/login', response_model=TokenResponse, status_code=status.HTTP_501_NOT_IMPLEMENTED)
def login(_: LoginRequest) -> TokenResponse:
    # TODO: implement Supabase-backed login flow for the first client.
    return TokenResponse(access_token='', token_type='bearer')


@router.post('/register', response_model=TokenResponse, status_code=status.HTTP_501_NOT_IMPLEMENTED)
def register(_: RegisterRequest) -> TokenResponse:
    # TODO: implement Supabase-backed registration flow.
    return TokenResponse(access_token='', token_type='bearer')


@router.get('/me', status_code=status.HTTP_501_NOT_IMPLEMENTED)
def me() -> dict[str, str]:
    # TODO: return the authenticated user profile.
    return {'detail': 'Not implemented'}
