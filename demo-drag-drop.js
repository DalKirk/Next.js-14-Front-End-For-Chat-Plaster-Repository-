// Demo JavaScript File for Drag & Drop Testing
// Try dragging this file into the chat input area!

class ChatDemo {
  constructor(username) {
    this.username = username;
    this.messages = [];
  }

  sendMessage(content) {
    const message = {
      id: Date.now(),
      username: this.username,
      content: content,
      timestamp: new Date().toISOString()
    };
    
    this.messages.push(message);
    console.log(`📤 ${this.username} sent: ${content}`);
    return message;
  }

  async fetchMessages() {
    try {
      const response = await fetch('/api/messages');
      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      return [];
    }
  }

  formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleTimeString();
  }
}

// Usage example
const chat = new ChatDemo('CodeTester');
chat.sendMessage('Hello from drag & drop!');