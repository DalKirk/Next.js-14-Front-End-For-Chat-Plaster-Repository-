'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  User as UserIcon,
  LogOut,
  Radio,
  ChevronDown,
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  Zap,
} from 'lucide-react';
import type { User } from '@/lib/types';
import { useVoice } from '@/hooks/useVoice';
import { useVoiceMobile } from '@/hooks/useVoiceMobile';

// ─── Mobile detection ──────────────────────────────────────────────────────
function getIsMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
}

// ─── Waveform bars (animated when active) ──────────────────────────────────
const BAR_COUNT = 20;

function WaveformBars({ active, color }: { active: boolean; color: string }) {
  const [heights, setHeights] = useState<number[]>(Array(BAR_COUNT).fill(3));
  const ivRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (active) {
      ivRef.current = setInterval(() => {
        setHeights(Array.from({ length: BAR_COUNT }, () =>
          Math.max(2, Math.floor(Math.random() * 18) + 3)
        ));
      }, 100);
    } else {
      if (ivRef.current) clearInterval(ivRef.current);
      ivRef.current = null;
      setHeights(Array(BAR_COUNT).fill(3));
    }
    return () => { if (ivRef.current) clearInterval(ivRef.current); };
  }, [active]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      height: 24,
      flex: 1,
      minWidth: 0,
    }}>
      {heights.map((h, i) => (
        <div
          key={i}
          style={{
            width: 2,
            height: h,
            borderRadius: 1,
            background: active ? color : 'rgba(255,255,255,0.08)',
            transition: active ? 'height 80ms ease' : 'height 300ms ease',
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
}

// ─── Voice status label ────────────────────────────────────────────────────
function getStatusLabel(
  voiceStatus: string,
  isProcessing: boolean,
  activated: boolean,
  isMobile: boolean,
): string {
  if (isProcessing) return 'Thinking…';
  if (voiceStatus === 'recording') return 'Listening…';
  if (voiceStatus === 'listening') return 'Listening…';
  if (voiceStatus === 'speaking') return 'Speaking…';
  if (voiceStatus === 'processing') return 'Processing…';
  if (voiceStatus === 'wake_listening') return '"Hey Star"…';
  if (voiceStatus === 'error') return 'Mic error';
  if (isMobile) return 'Tap mic';
  return activated ? '"Hey Star"' : 'Star Agent';
}

function getStatusColor(voiceStatus: string): string {
  switch (voiceStatus) {
    case 'listening':
    case 'recording':
      return 'var(--ws-cyan)';
    case 'speaking':
      return 'var(--ws-purple)';
    case 'processing':
    case 'wake_listening':
      return 'var(--ws-green)';
    case 'error':
      return 'var(--ws-red)';
    default:
      return 'var(--ws-accent)';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Right Rail — profile + stream + Star Agent voice strip
// ═══════════════════════════════════════════════════════════════════════════

interface RightRailProps {
  currentUser: User | null;
  onVoiceSpeech?: (text: string) => void;
  responseText?: string;
  isProcessing?: boolean;
  onVoiceStateChange?: (state: VoiceExposedState) => void;
}

/** Voice state exposed to siblings (e.g. MobileVoiceFAB) */
export interface VoiceExposedState {
  voiceStatus: string;
  isProcessing: boolean;
  isActive: boolean;
  isMobile: boolean;
  activated: boolean;
  statusLabel: string;
  statusColor: string;
  micRecording: boolean;
  micSpeaking: boolean;
  onMicClick: () => void;
}

export function WorkspaceRightRail({
  currentUser,
  onVoiceSpeech,
  responseText = '',
  isProcessing = false,
  onVoiceStateChange,
}: RightRailProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [activated, setActivated] = useState(false);
  const lastSpokenRef = useRef('');

  useEffect(() => {
    setIsMobile(getIsMobile());
  }, []);

  // ─── Desktop voice ────────────────────────────────────
  const desktopVoice = useVoice({
    wakeWord: 'hey star',
    onTranscript: (text) => {
      onVoiceSpeech?.(text);
    },
    onWakeWord: () => {},
  });

  // ─── Mobile voice ─────────────────────────────────────
  const mobileVoice = useVoiceMobile({
    onTranscript: (text) => {
      onVoiceSpeech?.(text);
    },
  });

  // Unified status
  const voiceStatus = isMobile ? mobileVoice.status : desktopVoice.status;
  const isSpeaking = isMobile ? mobileVoice.isSpeaking : desktopVoice.isSpeaking;
  const isActive = voiceStatus === 'listening' || voiceStatus === 'recording'
    || voiceStatus === 'speaking' || voiceStatus === 'processing'
    || voiceStatus === 'wake_listening';

  // Speak response text via TTS
  useEffect(() => {
    if (!responseText) return;
    if (responseText === lastSpokenRef.current) return;
    if (isProcessing) return;
    if (isMobile) {
      lastSpokenRef.current = responseText;
      mobileVoice.speak(responseText);
    } else if (activated) {
      lastSpokenRef.current = responseText;
      desktopVoice.speak(responseText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responseText, isProcessing, activated, isMobile]);

  // Safety: if processing ended but voice hook is genuinely stuck on "processing",
  // force-reset after a grace period. Use a ref to read real-time voice status so
  // timeouts see the current value (not the stale closure value).
  const prevProcessingRef = useRef(false);
  const voiceStatusRef = useRef(voiceStatus);
  useEffect(() => { voiceStatusRef.current = voiceStatus; }, [voiceStatus]);

  useEffect(() => {
    const wasProcessing = prevProcessingRef.current;
    prevProcessingRef.current = isProcessing;

    if (wasProcessing && !isProcessing) {
      const t = setTimeout(() => {
        // Only intervene if voice is genuinely stuck — NOT if it's speaking or already listening
        const st = voiceStatusRef.current;
        if (st === 'processing') {
          if (!isMobile) desktopVoice.stopSpeaking();
        }
      }, 5000);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProcessing]);

  // Cleanup desktop voice on unmount
  useEffect(() => {
    return () => { desktopVoice.deactivate(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Mic button handler ───────────────────────────────
  const handleMicClick = useCallback(() => {
    if (isMobile) {
      if (mobileVoice.isRecording) {
        mobileVoice.stopRecording();
      } else if (mobileVoice.isSpeaking) {
        mobileVoice.stopSpeaking();
      } else {
        mobileVoice.startRecording();
      }
    } else {
      if (desktopVoice.isSpeaking) {
        desktopVoice.stopSpeaking();
        return;
      }
      if (!activated) {
        setActivated(true);
        desktopVoice.activate();
        return;
      }
      // Already activated — tap mic to go directly to capture mode (skip wake word)
      if (desktopVoice.isWakeListening || (!desktopVoice.isListening)) {
        desktopVoice.directListen();
      }
    }
  }, [isMobile, activated, desktopVoice, mobileVoice]);

  // ─── Expose voice state for mobile FAB ────────────────
  const micRecording = voiceStatus === 'listening' || voiceStatus === 'recording';
  const micSpeaking = voiceStatus === 'speaking';
  const statusLabel = getStatusLabel(voiceStatus, isProcessing, activated, isMobile);
  const statusColor = getStatusColor(voiceStatus);

  const onVoiceStateChangeRef = useRef(onVoiceStateChange);
  useEffect(() => { onVoiceStateChangeRef.current = onVoiceStateChange; });

  const handleMicClickRef = useRef(handleMicClick);
  useEffect(() => { handleMicClickRef.current = handleMicClick; });

  const stableMicClick = useCallback(() => handleMicClickRef.current(), []);

  useEffect(() => {
    onVoiceStateChangeRef.current?.({
      voiceStatus,
      isProcessing,
      isActive,
      isMobile,
      activated,
      statusLabel,
      statusColor,
      micRecording,
      micSpeaking,
      onMicClick: stableMicClick,
    });
  }, [voiceStatus, isProcessing, isActive, isMobile, activated, statusLabel, statusColor, micRecording, micSpeaking, stableMicClick]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('chat-user');
    localStorage.removeItem('userProfile');
    localStorage.removeItem('userAvatar');
    window.location.href = '/';
  };

  const avatarUrl = currentUser?.avatar_urls?.small || currentUser?.avatar_url;
  const initials = currentUser?.username?.charAt(0).toUpperCase() || '?';

  return (
    <aside className="ws-right">
      {/* Profile section */}
      <div className="ws-profile-section" ref={dropdownRef} style={{ position: 'relative' }}>
        <button
          className="ws-profile-btn"
          onClick={() => setShowDropdown(prev => !prev)}
        >
          <div className="ws-profile-avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt={currentUser?.username || ''} />
            ) : (
              initials
            )}
          </div>
          <span className="ws-profile-name">
            {currentUser?.username || 'Guest'}
          </span>
          <ChevronDown size={14} style={{ marginLeft: 'auto', color: 'var(--ws-text-muted)' }} />
        </button>

        {showDropdown && (
          <div className="ws-profile-dropdown">
            {currentUser ? (
              <>
                <Link href="/profile" className="ws-profile-dropdown-item" onClick={() => setShowDropdown(false)}>
                  <UserIcon size={14} /> My Profile
                </Link>
                <button className="ws-profile-dropdown-item" onClick={handleLogout}>
                  <LogOut size={14} /> Sign Out
                </button>
              </>
            ) : (
              <Link href="/login" className="ws-profile-dropdown-item" onClick={() => setShowDropdown(false)}>
                <UserIcon size={14} /> Sign In
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Live stream panel */}
      <div className="ws-stream-panel">
        <div className="ws-stream-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          Live Stream
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 9, letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 20, background: 'rgba(255,16,240,0.1)', border: '1px solid rgba(255,16,240,0.3)', color: '#ff10f0' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff10f0', boxShadow: '0 0 6px rgba(255,16,240,0.6)', animation: 'indicator-blink 1.4s ease-in-out infinite' }} />
            COMING SOON
          </span>
        </div>
        <div className="ws-stream-placeholder">
          <Radio size={24} />
          <p>No active streams</p>
          <p style={{ fontSize: 10, marginTop: 4, color: 'var(--ws-text-muted)' }}>
            Join a chat room to view live streams
          </p>
        </div>
      </div>

      {/* ═══ Star Agent Strip ═══
          Layout: [ status/label ]  [ ── waveform bars ── ]  [ mic btn ]
          One compact row pinned to the bottom of the right rail. */}
      <div className="ws-voice-strip">
        {/* Left: status dot + label */}
        <div className="ws-voice-strip-status">
          <div
            className="ws-voice-strip-dot"
            style={{
              background: isActive ? statusColor : 'var(--ws-text-muted)',
              boxShadow: isActive ? `0 0 6px ${statusColor}` : 'none',
            }}
          />
          <span
            className="ws-voice-strip-label"
            style={{ color: isActive ? statusColor : 'var(--ws-text-muted)' }}
          >
            {statusLabel}
          </span>
        </div>

        {/* Center: waveform bars */}
        <WaveformBars active={isActive} color={statusColor} />

        {/* Right: mic button */}
        <button
          className="ws-voice-strip-mic"
          onClick={handleMicClick}
          onPointerDown={isMobile ? (e) => {
            e.preventDefault();
            if (!mobileVoice.isSpeaking && !mobileVoice.isRecording) mobileVoice.startRecording();
          } : undefined}
          onPointerUp={isMobile ? (e) => {
            e.preventDefault();
            if (mobileVoice.isRecording) mobileVoice.stopRecording();
          } : undefined}
          onPointerLeave={isMobile ? (e) => {
            e.preventDefault();
            if (mobileVoice.isRecording) mobileVoice.stopRecording();
          } : undefined}
          style={{
            background: micRecording
              ? 'var(--ws-cyan)'
              : micSpeaking
                ? 'var(--ws-purple)'
                : '#ff10f0',
            boxShadow: isActive ? `0 0 12px ${statusColor}40` : '0 0 8px rgba(255,16,240,0.3)',
          }}
        >
          {micRecording ? (
            <MicOff size={15} style={{ color: '#fff' }} />
          ) : micSpeaking ? (
            <Volume2 size={15} style={{ color: '#fff' }} />
          ) : isProcessing ? (
            <Sparkles size={14} className="ws-spinner" style={{ color: '#fff' }} />
          ) : !activated && !isMobile ? (
            <Zap size={14} style={{ color: '#fff' }} />
          ) : (
            <Mic size={15} style={{ color: '#fff' }} />
          )}
        </button>
      </div>

      <style>{`
        @keyframes vPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.15); opacity: 0.3; } }
      `}</style>
    </aside>
  );
}
