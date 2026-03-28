"use client";

import ChatInterface from "@/components/ChatInterface";
import { AgeGate } from '@/components/AgeGate';

export default function AIChatPage() {
  return (
    <AgeGate>
      <div className="h-screen">
        {/* ChatInterface includes the user input section and streams via /api/ai-stream */}
        <ChatInterface />
      </div>
    </AgeGate>
  );
}

