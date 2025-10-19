# Messaging Debug Guide

## Issue: "Something went wrong" when sending messages

### Quick Debugging Steps

1. **Check WebSocket Connection Status**
   - Look at the room page header
   - Should show green dot with "Connected"
   - If red "Disconnected", click "Retry" button

2. **Open Browser Developer Console** (F12)
   - Look for these log messages:
     - `🔍 sendMessage called:` - Shows WebSocket state when sending
     - `📤 Message sent via WebSocket:` - Message sent successfully
     - `❌ Failed to send message` - Error occurred
     - `✅ WebSocket connected` - Initial connection successful
     - `❌ WebSocket not connected` - Connection failed

3. **Check Network Tab in Developer Console**
   - Filter by "WS" (WebSocket)
   - Should see connection to `wss://web-production-3ba7e.up.railway.app/ws/...`
   - Status should be "101 Switching Protocols" (successful)

4. **Common Issues and Solutions**

   **Issue: Red "Disconnected" status**
   - **Cause**: WebSocket connection failed
   - **Solution**: Click "Retry" button or refresh page (Ctrl+F5)
   - **Check**: Backend Railway deployment is running

   **Issue: Message doesn't appear after sending**
   - **Cause**: WebSocket message sent but not received back
   - **Solution**: Check backend WebSocket handler is broadcasting messages
   - **Check**: Backend logs in Railway dashboard

   **Issue: "Not connected to server" toast**
   - **Cause**: WebSocket disconnected or failed to join room
   - **Solution**: Refresh page and rejoin room
   - **Check**: Room ID is valid and exists on backend

   **Issue: Generic "Something went wrong" error**
   - **Cause**: Unhandled exception in message sending
   - **Solution**: Check browser console for detailed error
   - **New Fix**: Better error handling added (deployed now)

### Expected Console Logs (Successful Flow)

```
🔌 Initializing chat connection...
✅ Joined room on backend successfully
✅ WebSocket connected - real-time messaging active
📝 Total messages: X
🔍 sendMessage called: { wsConnected: true, isConnected: true, readyState: 1, content: "Hello" }
📤 Message sent via WebSocket: Hello
📨 Received WebSocket message: { type: "message", content: "Hello", ... }
✅ Adding message to state: { id: "...", content: "Hello", ... }
📝 Total messages: X+1
```

### Backend Connection Details

- **Backend URL**: https://web-production-3ba7e.up.railway.app
- **WebSocket URL**: wss://web-production-3ba7e.up.railway.app/ws/{roomId}/{userId}
- **Health Check**: https://web-production-3ba7e.up.railway.app/health

### Testing Backend Directly

```powershell
# Test backend health
Invoke-WebRequest -Uri "https://web-production-3ba7e.up.railway.app/health" -Method GET

# Test CORS (should return Vercel URL in Access-Control-Allow-Origin)
$headers = @{ "Origin" = "https://next-js-14-front-end-for-chat-plaster-repository-7vb273qqo.vercel.app" }
Invoke-WebRequest -Uri "https://web-production-3ba7e.up.railway.app/api/users" -Method OPTIONS -Headers $headers
```

### Recent Fixes

1. **✅ CORS Fix (Deployed)**: Removed wildcard origin that conflicted with credentials
2. **✅ Error Handling (Deploying Now)**: Added try-catch blocks with detailed logging
3. **✅ WebSocket Keep-Alive**: Prevents Railway from sleeping (10-second pings)

### Next Steps After Vercel Deployment

1. Hard refresh the page (Ctrl+F5) to get latest code
2. Open browser console (F12)
3. Try sending a message
4. Share the console logs if error persists
