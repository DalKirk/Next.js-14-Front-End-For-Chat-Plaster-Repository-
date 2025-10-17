# ?? Complete Fix Guide - Chat & Mux Issues

## ? **Problems Identified:**

### 1. **Chat Messages Not Sending**
- WebSocket connection successful but messages don't appear
- "Message sent!" toast shows but nothing in chat
- Backend receives messages but frontend doesn't display them

### 2. **Mux Video Player Not Working**
- Videos don't load in chat
- Live streaming modal creates stream but video doesn't appear
- Upload video feature doesn't show player

### 3. **Message Display Issues**
- Messages may not be properly formatted
- Video messages missing playback components

---

## ? **Complete Fixes**

### **Fix 1: WebSocket Message Reception** 
**Issue**: Messages sent via WebSocket aren't being added to the messages state

**File**: `app/room/[id]/page.tsx`

**Find** (around line 150):
```typescript
socketManager.onMessage((socketMessage: any) => {
  console.log('?? Received message:', socketMessage);
  
  const newMessage: Message = {
    id: socketMessage.id || Date.now().toString(),
    room_id: roomId,
    user_id: socketMessage.user_id || 'unknown',
    username: socketMessage.username || 'Unknown User',
    content: socketMessage.content || socketMessage.message || '',
    timestamp: socketMessage.timestamp || new Date().toISOString(),
    type: socketMessage.type || 'message',
    title: socketMessage.title,
    playback_id: socketMessage.playback_id
  };
  
  setMessages(prev => {
    // Avoid duplicate messages
    const exists = prev.some(msg => msg.id === newMessage.id);
    if (exists) return prev;
    return [...prev, newMessage];
  });
});
```

**Replace with**:
```typescript
socketManager.onMessage((socketMessage: any) => {
  console.log('?? Received WebSocket message:', socketMessage);
  
  // Handle different message formats from backend
  const messageContent = socketMessage.content || socketMessage.message || '';
  const messageId = socketMessage.id || socketMessage.message_id || `msg-${Date.now()}-${Math.random()}`;
  
  const newMessage: Message = {
    id: messageId,
    room_id: roomId,
    user_id: socketMessage.user_id || socketMessage.sender_id || 'unknown',
    username: socketMessage.username || socketMessage.sender || 'Unknown User',
    content: messageContent,
    timestamp: socketMessage.timestamp || socketMessage.created_at || new Date().toISOString(),
    type: socketMessage.type || socketMessage.message_type || 'message',
    title: socketMessage.title,
    playback_id: socketMessage.playback_id
  };
  
  console.log('? Adding message to state:', newMessage);
  
  setMessages(prev => {
    // Avoid duplicate messages by ID
    const exists = prev.some(msg => msg.id === newMessage.id);
    if (exists) {
      console.log('?? Duplicate message detected, skipping:', messageId);
      return prev;
    }
    console.log(`?? Total messages: ${prev.length + 1}`);
    return [...prev, newMessage];
  });
});
```

---

### **Fix 2: Sending Messages - Add Optimistic Updates**
**Issue**: Messages sent don't immediately appear in UI

**File**: `app/room/[id]/page.tsx`

**Find** (around line 220):
```typescript
const sendMessage = (content: string) => {
  if (!content.trim() || !user) return;
  
  if (wsConnected && socketManager.isConnected()) {
    // Send via WebSocket
    try {
      socketManager.sendMessage(content);
      console.log('?? Message sent via WebSocket:', content);
      toast.success('Message sent!');
    } catch (error) {
      console.error('Failed to send message via WebSocket:', error);
      toast.error('Failed to send message. Check your connection.');
    }
  } else {
    toast.error('Not connected to server. Cannot send message.');
  }
};
```

**Replace with**:
```typescript
const sendMessage = (content: string) => {
  if (!content.trim() || !user) return;
  
  if (wsConnected && socketManager.isConnected()) {
    // Add optimistic update - show message immediately
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      room_id: roomId,
      user_id: user.id,
      username: user.username,
      content: content.trim(),
      timestamp: new Date().toISOString(),
      type: 'message'
    };
    
    // Add to UI immediately for better UX
    setMessages(prev => [...prev, optimisticMessage]);
    
    // Send via WebSocket
    try {
      socketManager.sendMessage(content);
      console.log('?? Message sent via WebSocket:', content);
      // Remove success toast - message already appears in chat
    } catch (error) {
      console.error('Failed to send message via WebSocket:', error);
      // Remove the optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      toast.error('Failed to send message. Check your connection.');
    }
  } else {
    toast.error('Not connected to server. Cannot send message.');
  }
};
```

---

### **Fix 3: Display Videos in Messages**
**Issue**: Video messages don't show the Mux player

**File**: `components/chat/message-bubble.tsx`

**Already correct!** But let's verify the video message handling:

**Ensure this code exists** (around line 35):
```typescript
{isVideoMessage ? (
  <div className="space-y-3">
    {/* Video type indicator */}
    <div className="flex items-center space-x-2">
      <span className="text-lg">
        {message.type === 'live_stream_created' ? '??' : '??'}
      </span>
      <span className="text-sm font-medium">
        {message.type === 'live_stream_created' ? 'Live Stream' : 'Video'}
      </span>
    </div>
    
    {/* Video title */}
    {videoMessage.title && (
      <h4 className="text-sm font-medium text-white">
        {videoMessage.title}
      </h4>
    )}
    
    {/* Video player */}
    {message.playback_id ? (
      <VideoPlayer
        playbackId={message.playback_id}
        title={message.title}
        className="w-full"
        muted={true}
        autoPlay={false}
      />
    ) : (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
        <p className="text-red-300 text-xs">?? No playback ID - backend may not have configured Mux correctly</p>
      </div>
    )}
    
    {/* Message text if any */}
    {message.content && (
      <p className="text-sm text-white/90">{message.content}</p>
    )}
  </div>
) : (
  <p className="text-sm text-white break-words">{message.content}</p>
)}
```

---

### **Fix 4: Live Stream Creation**
**Issue**: Live stream modal doesn't properly handle the response

**File**: `app/room/[id]/page.tsx`

**Find** (around line 285):
```typescript
const handleLiveStream = async () => {
  if (!user || !videoTitle.trim()) {
    toast.error('Please enter a title for your stream');
    return;
  }

  setIsLoading(true);
  try {
    const stream = await apiClient.createLiveStream(roomId, videoTitle.trim());
    
    // Create a video message with live stream info
    const streamMessage: Message = {
      id: Date.now().toString(),
      room_id: roomId,
      user_id: user.id,
      username: user.username,
      content: `?? Started live stream: ${videoTitle}`,
      timestamp: new Date().toISOString(),
      type: 'live_stream_created',
      title: videoTitle,
      playback_id: stream.playback_id,
      stream_key: stream.stream_key
    };
    
    // Send via WebSocket if connected
    if (wsConnected) {
      socketManager.sendMessage(JSON.stringify(streamMessage));
    }
    
    toast.success(`Live stream created! Stream key: ${stream.stream_key}`);
```

**Replace with**:
```typescript
const handleLiveStream = async () => {
  if (!user || !videoTitle.trim()) {
    toast.error('Please enter a title for your stream');
    return;
  }

  setIsLoading(true);
  try {
    console.log('?? Creating live stream:', videoTitle);
    const stream = await apiClient.createLiveStream(roomId, videoTitle.trim());
    console.log('? Live stream created:', stream);
    
    // Verify we have required data
    if (!stream.playback_id) {
      toast.error('?? Live stream created but missing playback ID. Check backend Mux configuration.');
      console.error('Missing playback_id in stream response:', stream);
    }
    
    if (!stream.stream_key) {
      toast.error('?? Live stream created but missing stream key. Check backend Mux configuration.');
      console.error('Missing stream_key in stream response:', stream);
    }
    
    // Create a video message with live stream info
    const streamMessage: Message = {
      id: `stream-${Date.now()}`,
      room_id: roomId,
      user_id: user.id,
      username: user.username,
      content: `?? Started live stream: ${videoTitle}`,
      timestamp: new Date().toISOString(),
      type: 'live_stream_created',
      title: videoTitle,
      playback_id: stream.playback_id,
      stream_key: stream.stream_key
    };
    
    // Add to messages immediately
    setMessages(prev => [...prev, streamMessage]);
    
    // Also send via WebSocket if connected
    if (wsConnected && socketManager.isConnected()) {
      try {
        // Send as JSON string with proper structure
        const wsMessage = {
          type: 'live_stream_created',
          content: streamMessage.content,
          title: videoTitle,
          playback_id: stream.playback_id,
          stream_key: stream.stream_key
        };
        socketManager.sendMessage(JSON.stringify(wsMessage));
        console.log('?? Sent live stream message via WebSocket');
      } catch (wsError) {
        console.error('Failed to send via WebSocket:', wsError);
      }
    }
    
    toast.success(`? Live stream created!`, { duration: 3000 });
```

---

### **Fix 5: Video Upload**
**Issue**: Similar to live stream, needs proper message handling

**File**: `app/room/[id]/page.tsx`

**Find** (around line 335):
```typescript
const handleVideoUpload = async () => {
  // ... existing validation ...
  
  setIsLoading(true);
  setUploadProgress(0);
  
  try {
    // Step 1: Create video upload request
    const upload = await apiClient.createVideoUpload(roomId, videoTitle.trim());
    setUploadProgress(25);
    
    // Step 2: Upload file directly to Mux
    await apiClient.uploadVideoFile(upload.upload_url, selectedFile);
    setUploadProgress(100);
    
    // Step 3: Create video message
    const videoMessage: Message = {
      id: Date.now().toString(),
      room_id: roomId,
      user_id: user.id,
      username: user.username,
      content: `?? Shared video: ${videoTitle}`,
      timestamp: new Date().toISOString(),
      type: 'video_ready',
      title: videoTitle,
      playback_id: upload.playback_id
    };
    
    // Send via WebSocket if connected
    if (wsConnected) {
      socketManager.sendMessage(JSON.stringify(videoMessage));
    }
```

**Replace with**:
```typescript
const handleVideoUpload = async () => {
  if (!user || !videoTitle.trim()) {
    toast.error('Please enter a title for your video');
    return;
  }

  if (!selectedFile) {
    toast.error('Please select a video file');
    return;
  }

  setIsLoading(true);
  setUploadProgress(0);
  
  try {
    console.log('?? Starting video upload:', { title: videoTitle, file: selectedFile.name });
    
    // Step 1: Create video upload request
    const upload = await apiClient.createVideoUpload(roomId, videoTitle.trim());
    console.log('? Upload URL received:', upload);
    
    if (!upload.playback_id) {
      toast.error('?? Upload created but missing playback ID. Check backend Mux configuration.');
    }
    
    setUploadProgress(25);
    
    // Step 2: Upload file directly to Mux
    console.log('?? Uploading file to Mux...');
    await apiClient.uploadVideoFile(upload.upload_url, selectedFile);
    setUploadProgress(100);
    console.log('? File uploaded successfully');
    
    // Step 3: Create video message
    const videoMessage: Message = {
      id: `video-${Date.now()}`,
      room_id: roomId,
      user_id: user.id,
      username: user.username,
      content: `?? Shared video: ${videoTitle}`,
      timestamp: new Date().toISOString(),
      type: 'video_ready',
      title: videoTitle,
      playback_id: upload.playback_id
    };
    
    // Add to messages immediately
    setMessages(prev => [...prev, videoMessage]);
    
    // Also send via WebSocket if connected
    if (wsConnected && socketManager.isConnected()) {
      try {
        const wsMessage = {
          type: 'video_ready',
          content: videoMessage.content,
          title: videoTitle,
          playback_id: upload.playback_id
        };
        socketManager.sendMessage(JSON.stringify(wsMessage));
        console.log('?? Sent video message via WebSocket');
      } catch (wsError) {
        console.error('Failed to send via WebSocket:', wsError);
      }
    }
    
    toast.success('? Video uploaded successfully!', { duration: 3000 });
```

---

## ?? **How to Apply**

1. **Open** `app/room/[id]/page.tsx`
2. **Apply** Fixes 1, 2, 4, and 5 to that file
3. **Verify** `components/chat/message-bubble.tsx` has Fix 3
4. **Test** each feature

---

## ?? **Testing Checklist**

After applying fixes:

### **Test 1: Send Text Message**
- [ ] Type a message
- [ ] Click send
- [ ] **Expected**: Message appears immediately in chat
- [ ] **Expected**: Other users see it in real-time

### **Test 2: Live Stream**
- [ ] Click "?? Live" button
- [ ] Enter stream title
- [ ] Click "Start Stream"
- [ ] **Expected**: Stream message appears in chat
- [ ] **Expected**: Mux player loads (may show "Waiting for stream" until you actually stream)
- [ ] **Expected**: Toast shows stream key

### **Test 3: Video Upload**
- [ ] Click "?? Upload" button
- [ ] Enter video title
- [ ] Select video file
- [ ] Click "Upload Video"
- [ ] **Expected**: Progress bar shows upload
- [ ] **Expected**: Video message appears in chat
- [ ] **Expected**: Mux player loads video

---

## ?? **Debugging Tips**

### **If messages still don't appear:**

1. **Check browser console** (F12):
```
Expected logs:
?? Message sent via WebSocket: [your message]
?? Received WebSocket message: {...}
? Adding message to state: {...}
?? Total messages: X
```

2. **Check WebSocket in Network tab**:
- Open DevTools ? Network ? WS
- Click on the WebSocket connection
- See Messages tab for sent/received data

3. **Backend issue?** Check if backend is actually receiving:
```powershell
# Test backend WebSocket manually
$ws = New-Object System.Net.WebSockets.ClientWebSocket
# This will fail - just checking if endpoint exists
```

### **If Mux videos don't load:**

1. **Check backend Mux configuration**:
- Backend needs `MUX_TOKEN_ID` and `MUX_TOKEN_SECRET`
- Test backend endpoint: `POST /rooms/{room_id}/live-stream`

2. **Check playback_id** in console:
```
Expected in message object:
playback_id: "abc123..."  ?
playback_id: undefined    ?
```

3. **Test Mux player directly**:
```tsx
// Add temporary test in room page
<VideoPlayer playback_id="test-playback-id" />
```

---

## ?? **Still Not Working?**

### **Quick Diagnostic Script**

Add this to bottom of `app/room/[id]/page.tsx` before export:

```typescript
// Diagnostic logging
useEffect(() => {
  console.log('?? DIAGNOSTIC INFO:');
  console.log('- Room ID:', roomId);
  console.log('- User:', user);
  console.log('- WebSocket Connected:', wsConnected);
  console.log('- Total Messages:', messages.length);
  console.log('- Is Connected:', isConnected);
  console.log('- Socket Ready State:', socketManager.getReadyState());
}, [messages, wsConnected, isConnected]);
```

---

**Apply these fixes in order, test after each one, and report which ones work!** ??
