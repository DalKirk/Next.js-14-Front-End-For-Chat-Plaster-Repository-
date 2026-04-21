"use client";

import ChatInterface from "@/components/ChatInterface";
import { AgeGate } from '@/components/AgeGate';

export default function AIChatPage() {
  return (
    <AgeGate>
      <ChatInterface fullscreen />
    </AgeGate>
  );
}

