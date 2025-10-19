Add CORS middleware helper

This folder contains a PowerShell script that safely inserts a CORSMiddleware snippet into your FastAPI app startup file and creates a branch + PR.

How to use
1. Clone your backend repo locally.
2. Copy `create_cors_pr.ps1` into the root of your backend repo (or run it from this folder if the backend repo root is the current directory).
3. Run in PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\create_cors_pr.ps1
```

Railway instructions
- Set the ALLOWED_ORIGINS environment variable in Railway to include your frontend domain and localhost for testing:

```bash
# Example - set environment variable on Railway
railway environment set ALLOWED_ORIGINS "https://natural-presence-production.up.railway.app,http://localhost:3000"
```

Curl tests to verify CORS preflight and upload
- Preflight test (OPTIONS):

```bash
curl -i -X OPTIONS \
  -H "Origin: https://natural-presence-production.up.railway.app" \
  -H "Access-Control-Request-Method: PUT" \
  -H "Access-Control-Request-Headers: Content-Type, AccessKey" \
  https://your-backend.example.com/rooms/123/video-upload
```

- Simple upload test (proxy or direct presigned URL):

```bash
# If using the frontend proxy route
curl -i -X PUT \
  -H "Content-Type: video/mp4" \
  --data-binary @test.mp4 \
  https://your-frontend.example.com/api/upload-proxy/abc123

# If testing direct presigned URL
curl -i -X PUT \
  -H "Content-Type: video/mp4" \
  --data-binary @test.mp4 \
  "https://storage-provider.example.com/presigned-put-url"
```

Review
- The script makes a backup `<startup>.bak`. Review the patch before merging. If the script doesn't detect the right file or you prefer manual changes, the recommended CORSMiddleware snippet is in `create_cors_pr.ps1`.
