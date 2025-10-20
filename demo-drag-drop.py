# Demo Python File for Drag & Drop Testing
# Try dragging this file into the chat input area!

import json
import datetime
from typing import List, Dict, Optional

class MessageProcessor:
    def __init__(self, room_id: str):
        self.room_id = room_id
        self.processed_count = 0
    
    def process_message(self, message: Dict) -> Optional[Dict]:
        """Process and validate a chat message."""
        try:
            # Validate required fields
            required_fields = ['content', 'username', 'timestamp']
            if not all(field in message for field in required_fields):
                return None
            
            # Clean and format content
            content = message['content'].strip()
            if not content:
                return None
            
            # Add metadata
            processed_message = {
                **message,
                'content': content,
                'room_id': self.room_id,
                'processed_at': datetime.datetime.now().isoformat(),
                'word_count': len(content.split())
            }
            
            self.processed_count += 1
            return processed_message
            
        except Exception as e:
            print(f"Error processing message: {e}")
            return None
    
    def batch_process(self, messages: List[Dict]) -> List[Dict]:
        """Process multiple messages at once."""
        processed = []
        for msg in messages:
            result = self.process_message(msg)
            if result:
                processed.append(result)
        
        print(f"✅ Processed {len(processed)} out of {len(messages)} messages")
        return processed

# Usage example
if __name__ == "__main__":
    processor = MessageProcessor("room-123")
    
    sample_messages = [
        {
            "content": "Hello world!",
            "username": "Alice",
            "timestamp": "2024-01-15T10:30:00Z"
        },
        {
            "content": "How's everyone doing?",
            "username": "Bob", 
            "timestamp": "2024-01-15T10:31:00Z"
        }
    ]
    
    results = processor.batch_process(sample_messages)
    print(json.dumps(results, indent=2))