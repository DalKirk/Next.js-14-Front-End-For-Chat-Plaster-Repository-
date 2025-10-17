# Quick Fix Guide for WebSocket Connection Issues

## Issues Found:
1. WebSocket trying to connect before user/room exist on backend
2. No backend room join before WebSocket connection  
3. Toast messages showing "Connected" then "Disconnected" rapidly
4. Missing error handling for backend API failures

## Fixes to Apply:

### Fix 1: Update initializeWebSocket function
Add room join before WebSocket connection:
```typescript
const initializeWebSocket = async (userData?: User) => {
  const currentUser = userData || user;
  if (!currentUser) return;

  try {
    // IMPORTANT: Join room on backend FIRST
    await apiClient.joinRoom(roomId, currentUser.id);
    console.log(' Joined room on backend');

    // NOW connect WebSocket
    socketManager.connect(roomId, currentUser.id);
    // ... rest of code
  } catch (error) {
    console.error('Failed to join room:', error);
    toast.error('Could not join room. Please try again.');
    return; // Don't attempt WebSocket if backend join fails
  }
};
```

### Fix 2: Remove duplicate toast notifications
The connect callback is being called multiple times. Update:
```typescript
socketManager.onConnect((connected: boolean) => {
  setWsConnected(connected);
  setIsConnected(connected);

  if (connected) {
    // Only show toast on first successful connection
    if (connectionAttempts === 1) {
      toast.success('Connected to real-time chat!', { duration: 2000 });
    }
    console.log(' WebSocket connected');
  } else {
    console.log(' WebSocket disconnected');
    // Don't show error toast on every disconnect (happens during reconnect)
  }
});
```

### Fix 3: Add proper cleanup
```typescript
useEffect(() => {
  // ... existing code ...

  return () => {
    console.log(' Cleaning up WebSocket connection');
    socketManager.disconnect();
    setWsConnected(false);
    setIsConnected(false);
  };
}, [roomId, router]);
```

## Testing Steps:
1. Create a user
2. Create or join a room
3. Check console for proper flow:
   -  Joined room on backend
   -  WebSocket connected
4. Send a message
5. Should see ONE toast: "Connected to real-time chat!"
6. Should NOT see repeated connect/disconnect messages

