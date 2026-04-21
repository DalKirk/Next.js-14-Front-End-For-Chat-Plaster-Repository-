'use client';

import React from 'react';
import Link from 'next/link';
import {
  Video,
  Image as ImageIcon,
  Type,
  Box,
  Eye,
  Grid,
  MessageSquare,
  Mic,
  Users,
  Radio,
  Gamepad2,
  LayoutGrid,
  Zap,
  User as UserIcon,
  Settings,
  Home,
} from 'lucide-react';
import type { GenerationTool, CenterTab } from '@/app/(app)/workspace/page';
import type { User } from '@/lib/types';

interface LeftRailProps {
  activeTab: CenterTab;
  onTabChange: (tab: CenterTab) => void;
  onOpenTool: (tool: GenerationTool) => void;
  currentUser: User | null;
}

export function WorkspaceLeftRail({ activeTab, onTabChange, onOpenTool, currentUser }: LeftRailProps) {
  return (
    <aside className="ws-left">
      {/* Logo */}
      <Link href="/" className="ws-left-logo">
        <span>STARCYEED</span>
      </Link>

      {/* Generate section */}
      <nav className="ws-nav-group">
        <div className="ws-nav-label">Generate</div>
        <button className="ws-nav-item" onClick={() => onOpenTool('video')}>
          <Video /> <span>Video</span>
        </button>
        <button className="ws-nav-item" onClick={() => onOpenTool('image')}>
          <ImageIcon /> <span>Image</span>
        </button>
        <button className="ws-nav-item" onClick={() => onOpenTool('ideogram')}>
          <Type /> <span>Logo</span>
        </button>
        <button className="ws-nav-item" onClick={() => onOpenTool('3d')}>
          <Box /> <span>3D Model</span>
        </button>
      </nav>

      <div className="ws-nav-divider" />

      {/* Tools section */}
      <nav className="ws-nav-group">
        <div className="ws-nav-label">Tools</div>
        <button className="ws-nav-item" onClick={() => onOpenTool('image-analysis')}>
          <Eye /> <span>Analyze Image</span>
        </button>
        <button className="ws-nav-item" onClick={() => onOpenTool('transparency')}>
          <Grid /> <span>Remove BG</span>
        </button>
        <button
          className={`ws-nav-item ${activeTab === 'agent' ? 'active' : ''}`}
          onClick={() => onTabChange('agent')}
        >
          <Zap /> <span>Star Agent</span>
        </button>
        <button
          className={`ws-nav-item ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => onTabChange('chat')}
        >
          <Mic /> <span>Star Chat</span>
        </button>
      </nav>

      <div className="ws-nav-divider" />

      {/* View section */}
      <nav className="ws-nav-group">
        <div className="ws-nav-label">View</div>
        <button
          className={`ws-nav-item ${activeTab === 'gallery' ? 'active' : ''}`}
          onClick={() => onTabChange('gallery')}
        >
          <LayoutGrid /> <span>Gallery</span>
        </button>
      </nav>

      <div className="ws-nav-divider" />

      {/* Platform links */}
      <nav className="ws-nav-group">
        <div className="ws-nav-label">Platform</div>
        <Link href="/chat" className="ws-nav-item">
          <MessageSquare /> <span>Chat Rooms</span>
        </Link>
        <Link href="/feed" className="ws-nav-item">
          <Users /> <span>Feed</span>
        </Link>
        <Link href="/messages" className="ws-nav-item">
          <Radio /> <span>Messages</span>
        </Link>
        <Link href="/game-builder" className="ws-nav-item">
          <Gamepad2 /> <span>Game Builder</span>
        </Link>
      </nav>

      <div className="ws-nav-divider" />

      {/* Account / bottom links */}
      <nav className="ws-nav-group">
        <Link href="/" className="ws-nav-item">
          <Home /> <span>Home</span>
        </Link>
        {currentUser && (
          <Link href="/profile" className="ws-nav-item">
            <UserIcon /> <span>Profile</span>
          </Link>
        )}
      </nav>

      {/* Credit meter — pushed to bottom via margin-top:auto */}
      <div className="ws-credit-meter">
        <div className="ws-credit-label">Credits</div>
        <div className="ws-credit-bar">
          <div className="ws-credit-fill" style={{ width: '65%' }} />
        </div>
        <div className="ws-credit-value">
          {currentUser ? '—' : <span>Sign in to track</span>}
        </div>
      </div>
    </aside>
  );
}
