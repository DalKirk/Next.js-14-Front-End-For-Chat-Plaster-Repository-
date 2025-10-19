# CORS configuration

This file explains the addition of CORSMiddleware to the FastAPI application.

Environment variable: ALLOWED_ORIGINS
- Comma-separated list of origins allowed, e.g. https://example.com,https://app.example.com
- Use * to allow all origins (not recommended for production).

Example (Railway) CLI to set allowed origins:

`ash
# allow the frontend deployment and localhost for testing
railway environment set ALLOWED_ORIGINS "https://web-production-3ba7e.up.railway.app,http://localhost:3000"
`

If you use a different host or domain, include it in the list.

