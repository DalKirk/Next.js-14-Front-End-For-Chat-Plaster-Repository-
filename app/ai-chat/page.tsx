"use client";

import ChatInterface from "@/components/ChatInterface";

export default function AIChatPage() {
  return (
    <div className="h-screen">
      {/* ChatInterface includes the user input section and streams via /api/ai-stream */}
      <ChatInterface />
    </div>
  );
}

