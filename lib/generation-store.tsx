'use client';

/**
 * GenerationStore — global React Context that keeps AI generation jobs alive
 * even when the user navigates away from the generator pages.
 *
 * The Context provider lives at the layout level so it is never unmounted
 * during client-side navigation. Polling intervals are stored in a ref, not
 * component state, so they survive renders.
 */

import React, {
  createContext, useContext, useRef, useState, useCallback,
} from 'react';
import { pollVideoJob, getVideoResultUrl, type VideoModel } from '@/services/video-generation.service';
import { pollImageJob, getImageResultUrl } from '@/services/image-generation.service';
import { pollIdeogramJob, getIdeogramResultUrl } from '@/services/ideogram.service';
import { apiClient } from '@/lib/api';
import { StorageUtils } from '@/lib/storage-utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type JobType = 'video' | 'image' | 'ideogram';

export interface ActiveJob {
  id: string;            // local temp ID, e.g. "temp-1714000000000"
  jobId: string;         // backend job ID returned after submit
  type: JobType;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  progress: number;
  progressMsg: string;
  prompt: string;
  // Video-specific
  model?: VideoModel;
  mode?: string;
  duration?: string;
  resolution?: string;
  enhancedPrompt?: string | null;
  // Display colours
  c1: string;
  c2: string;
  // Result
  resultUrl?: string | null;
  time?: string | null;
  error?: string;
  startedAt: number;
}

interface GenerationStore {
  jobs: ActiveJob[];
  addJob: (job: ActiveJob) => void;
  updateJob: (id: string, patch: Partial<ActiveJob>) => void;
  removeJob: (id: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const GenerationContext = createContext<GenerationStore>({
  jobs: [],
  addJob: () => {},
  updateJob: () => {},
  removeJob: () => {},
});

export function useGenerationStore(): GenerationStore {
  return useContext(GenerationContext);
}

// ─── localStorage storage keys (must match what generators use) ───────────────

const VIDEO_KEY    = 'starcyeed-generated-videos';
const IMAGE_KEY    = 'starcyeed-generated-images';
const IDEOGRAM_KEY = 'starcyeed-ideogram-images';
const STORAGE_TTL  = 24 * 60 * 60 * 1000; // 24 h

/**
 * Persist a completed job to the appropriate localStorage bucket so the
 * generator can display it when the user next visits the page.
 */
function persistCompletedJob(job: ActiveJob) {
  try {
    if (!job.resultUrl) return;
    const key =
      job.type === 'video' ? VIDEO_KEY :
      job.type === 'ideogram' ? IDEOGRAM_KEY :
      IMAGE_KEY;

    const existing: Array<Record<string, unknown>> =
      JSON.parse(localStorage.getItem(key) || '[]');
    const now = Date.now();
    const fresh = existing.filter(v => v.savedAt && (now - (v.savedAt as number)) < STORAGE_TTL);
    // Avoid duplicates
    if (fresh.some(v => v.id === job.id)) return;

    let record: Record<string, unknown>;
    if (job.type === 'video') {
      record = {
        id: job.id, prompt: job.prompt, model: job.model, mode: job.mode,
        duration: job.duration, resolution: job.resolution,
        videoUrl: job.resultUrl, status: 'complete',
        c1: job.c1, c2: job.c2, time: job.time, savedAt: now,
        enhancedPrompt: job.enhancedPrompt ?? null,
      };
    } else if (job.type === 'ideogram') {
      record = {
        id: job.id, jobId: job.jobId, prompt: job.prompt, style: '',
        time: job.time ?? null, imageUrl: job.resultUrl,
        status: 'complete', c1: job.c1, c2: job.c2, savedAt: now,
      };
    } else {
      record = {
        id: job.id, prompt: job.prompt, style: '',
        time: job.time ?? null, imageUrl: job.resultUrl,
        status: 'complete', c1: job.c1, c2: job.c2, savedAt: now,
      };
    }

    localStorage.setItem(key, JSON.stringify([record, ...fresh]));
  } catch { /* storage full / unavailable — ignore */ }
}

/**
 * Auto-save a completed result to the user's profile gallery.
 */
async function saveToUserGallery(url: string, type: 'video' | 'image', prompt: string) {
  try {
    const raw = StorageUtils.safeGetItem('chat-user');
    if (!raw) return;
    const user: { id?: string; username?: string } = JSON.parse(raw);
    if (!user.id || !user.username) return;
    await apiClient.saveToGallery(user.id, user.username, url, type, prompt.slice(0, 100));
  } catch { /* ignore */ }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function GenerationStoreProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<ActiveJob[]>([]);
  // Map of tempId → interval handle; stored in a ref so clearing doesn't
  // trigger re-renders and survives the provider staying mounted.
  const pollsRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  // ── Core mutations ──────────────────────────────────────────────────────────

  const removeJob = useCallback((id: string) => {
    if (pollsRef.current[id]) {
      clearInterval(pollsRef.current[id]);
      delete pollsRef.current[id];
    }
    setJobs(prev => prev.filter(j => j.id !== id));
  }, []);

  const updateJob = useCallback((id: string, patch: Partial<ActiveJob>) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...patch } : j));
  }, []);

  // ── Polling ─────────────────────────────────────────────────────────────────

  /**
   * Start a 2-second polling loop for the given job.
   * All state updates use the functional `setJobs(prev => …)` form to avoid
   * stale-closure issues — the `job` object captured in the closure only
   * needs the static fields (id, jobId, model, type) which never change.
   */
  const startPolling = useCallback((job: ActiveJob) => {
    if (pollsRef.current[job.id] || !job.jobId) return;

    pollsRef.current[job.id] = setInterval(async () => {
      try {
        // ── VIDEO ────────────────────────────────────────────────────────────
        if (job.type === 'video') {
          const status = await pollVideoJob(job.model!, job.jobId);
          const resultUrl =
            status.status === 'complete' && status.video_url
              ? getVideoResultUrl(job.model!, job.jobId)
              : undefined;

          setJobs(prev => prev.map(j =>
            j.id !== job.id ? j : {
              ...j,
              status: status.status,
              progress: status.progress,
              progressMsg: status.message,
              ...(resultUrl ? { resultUrl } : {}),
              time: status.generation_time != null
                ? `${status.generation_time.toFixed(1)}s` : j.time,
              error: status.error ?? undefined,
              enhancedPrompt: status.enhanced_prompt ?? j.enhancedPrompt,
            },
          ));

          if (status.status === 'complete' || status.status === 'failed') {
            clearInterval(pollsRef.current[job.id]);
            delete pollsRef.current[job.id];

            if (status.status === 'complete' && status.video_url) {
              const url = getVideoResultUrl(job.model!, job.jobId);
              // Update resultUrl one final time (race-free)
              setJobs(prev => prev.map(j => j.id === job.id ? { ...j, resultUrl: url } : j));
              saveToUserGallery(url, 'video', job.prompt);
              persistCompletedJob({ ...job, resultUrl: url, status: 'complete' });
            }
          }

        // ── IMAGE ────────────────────────────────────────────────────────────
        } else if (job.type === 'image') {
          const status = await pollImageJob(job.jobId);
          const resultUrl = status.status === 'complete'
            ? getImageResultUrl(job.jobId) : undefined;

          setJobs(prev => prev.map(j =>
            j.id !== job.id ? j : {
              ...j,
              status: status.status,
              ...(resultUrl ? { resultUrl } : {}),
              time: status.generation_time ?? j.time,
              error: status.error,
            },
          ));

          if (status.status === 'complete' || status.status === 'failed') {
            clearInterval(pollsRef.current[job.id]);
            delete pollsRef.current[job.id];

            if (status.status === 'complete') {
              const url = getImageResultUrl(job.jobId);
              setJobs(prev => prev.map(j => j.id === job.id ? { ...j, resultUrl: url } : j));
              saveToUserGallery(url, 'image', job.prompt);
              persistCompletedJob({ ...job, resultUrl: url, status: 'complete' });
            }
          }

        // ── IDEOGRAM ─────────────────────────────────────────────────────────
        } else if (job.type === 'ideogram') {
          const status = await pollIdeogramJob(job.jobId);
          const resultUrl = status.status === 'complete'
            ? getIdeogramResultUrl(job.jobId) : undefined;

          setJobs(prev => prev.map(j =>
            j.id !== job.id ? j : {
              ...j,
              status: status.status,
              time: status.generation_time ?? j.time,
              ...(resultUrl ? { resultUrl } : {}),
              error: status.error ?? undefined,
            },
          ));

          if (status.status === 'complete' || status.status === 'failed') {
            clearInterval(pollsRef.current[job.id]);
            delete pollsRef.current[job.id];

            if (status.status === 'complete') {
              const url = getIdeogramResultUrl(job.jobId);
              setJobs(prev => prev.map(j => j.id === job.id ? { ...j, resultUrl: url } : j));
              saveToUserGallery(url, 'image', job.prompt);
              persistCompletedJob({ ...job, resultUrl: url, status: 'complete' });
            }
          }
        }

      } catch {
        // Don't silently swallow all errors — mark the job as failed
        clearInterval(pollsRef.current[job.id]);
        delete pollsRef.current[job.id];
        setJobs(prev => prev.map(j =>
          j.id === job.id ? { ...j, status: 'failed', error: 'Polling error' } : j,
        ));
      }
    }, 2000);
  }, []); // no deps — only uses refs & stable setJobs

  // ── addJob: enqueue + immediately start polling ─────────────────────────────

  const addJob = useCallback((job: ActiveJob) => {
    setJobs(prev => [job, ...prev]);
    if (job.jobId) startPolling(job);
  }, [startPolling]);

  // ── Provider ────────────────────────────────────────────────────────────────

  return (
    <GenerationContext.Provider value={{ jobs, addJob, updateJob, removeJob }}>
      {children}
    </GenerationContext.Provider>
  );
}
