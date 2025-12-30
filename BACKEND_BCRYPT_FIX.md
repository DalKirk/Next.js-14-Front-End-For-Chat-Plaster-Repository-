# Backend Bcrypt Fix - Password Length Error

## Problem
```
ValueError: password cannot be longer than 72 bytes, truncate manually if necessary
```

Bcrypt has a 72-byte limitation on password length. This error occurs during backend initialization when passlib tests the bcrypt backend.

## Solution

Update your backend's `utils/security.py` file:

### Current Code (BROKEN):
```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)
```

### Fixed Code:
```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    # Bcrypt has a 72-byte limit - truncate if necessary
    # Using UTF-8 encoding for byte length calculation
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
        password = password_bytes.decode('utf-8', errors='ignore')
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Apply same truncation during verification
    password_bytes = plain_password.encode('utf-8')
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
        plain_password = password_bytes.decode('utf-8', errors='ignore')
    return pwd_context.verify(plain_password, hashed_password)
```

## Alternative Solution (Recommended)

Use Argon2 instead of bcrypt - it's more secure and has no length limitations:

```python
from passlib.context import CryptContext

# Use Argon2 instead of bcrypt
pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
    argon2__memory_cost=65536,  # 64 MB
    argon2__time_cost=3,        # 3 iterations
    argon2__parallelism=4       # 4 parallel threads
)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
```

**Note**: If using Argon2, install the dependency:
```bash
pip install passlib[argon2]
```

## Steps to Apply

1. **Option 1 (Quick Fix)**: Update `utils/security.py` with the bcrypt truncation code above
2. **Option 2 (Better)**: Switch to Argon2, install `passlib[argon2]`, update security.py
3. Commit and push to Railway
4. Wait for redeployment (~1-2 minutes)
5. Test signup at http://localhost:3000

## Why This Happens

Bcrypt internally tests its backend during initialization by hashing a test password. This test password exceeds 72 bytes, causing the error. The truncation ensures all passwords stay within bcrypt's limits.

## Testing After Fix

Once deployed, the signup endpoint should return:
- **Success (201)**: `{"user": {...}, "token": "..."}`
- **No more 500 errors**
- **CORS headers should appear** (the 500 error was hiding them)
