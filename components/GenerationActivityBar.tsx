'use client';

/**
 * GenerationActivityBar
 *
 * A floating pill that appears on any page whenever AI generation jobs are
 * running in the background. Clicking it navigates to the relevant generator.
 */

import { useRouter } from 'next/navigation';
import { RefreshCw, Image as ImageIcon, Video, X } from 'lucide-react';
import { useGenerationStore, type ActiveJob } from '@/lib/generation-store';

export default function GenerationActivityBar() {
  const router = useRouter();
  const { jobs, removeJob } = useGenerationStore();

  const activeJobs = jobs.filter(
    j => j.status === 'queued' || j.status === 'processing',
  );

  if (activeJobs.length === 0) return null;

  // Group by type for the label
  const videoCount = activeJobs.filter(j => j.type === 'video').length;
  const imageCount = activeJobs.filter(j => j.type === 'image').length;
  const ideoCount  = activeJobs.filter(j => j.type === 'ideogram').length;

  // Navigate to the most recently started job's generator
  const handleClick = (job: ActiveJob) => {
    if (job.type === 'video')    router.push('/video-gen');
    else if (job.type === 'ideogram') router.push('/ideogram-gen');
    else router.push('/image-gen');
  };

  // Aggregate progress of the first active job for the progress bar
  const lead = activeJobs[0];
  const pct  = lead?.progress ?? 0;

  // Build label
  const parts: string[] = [];
  if (videoCount) parts.push(`${videoCount} video${videoCount > 1 ? 's' : ''}`);
  if (imageCount) parts.push(`${imageCount} image${imageCount > 1 ? 's' : ''}`);
  if (ideoCount)  parts.push(`${ideoCount} design${ideoCount > 1 ? 's' : ''}`);
  const label = parts.join(', ');

  // Icon for lead job
  const LeadIcon = lead?.type === 'video' ? Video : ImageIcon;

  return (
    <div
      style={{
        position: 'fixed',
        top: 24,
        right: 24,
        zIndex: 9000,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      {activeJobs.map(job => (
        <div
          key={job.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 14px',
            borderRadius: 12,
            background: 'rgba(8,8,15,0.92)',
            border: '1px solid rgba(139,92,246,0.35)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5), 0 0 30px rgba(139,92,246,0.12)',
            minWidth: 220,
            maxWidth: 280,
            cursor: 'pointer',
          }}
          onClick={() => handleClick(job)}
        >
          {/* Spinning icon */}
          <div style={{ flexShrink: 0 }}>
            <RefreshCw
              size={14}
              color="#a78bfa"
              style={{ animation: 'gen-spin 1s linear infinite' }}
            />
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 11, fontWeight: 600,
              color: 'rgba(255,255,255,0.9)',
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {job.type === 'video' ? '🎬' : job.type === 'ideogram' ? '✏️' : '🖼️'}{' '}
              {(job.progressMsg) || 'Generating…'}
            </div>
            <div style={{
              fontSize: 10, color: 'rgba(255,255,255,0.4)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              marginTop: 2,
            }}>
              {job.prompt.length > 40 ? job.prompt.slice(0, 40) + '…' : job.prompt}
            </div>

            {/* Per-job progress bar */}
            {job.progress > 0 && (
              <div style={{
                marginTop: 5,
                height: 2,
                borderRadius: 2,
                background: 'rgba(255,255,255,0.07)',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  borderRadius: 2,
                  background: 'linear-gradient(90deg,#7c3aed,#06b6d4)',
                  width: `${job.progress}%`,
                  transition: 'width 0.4s',
                }} />
              </div>
            )}
          </div>

          {/* Dismiss button */}
          <button
            onClick={(e) => { e.stopPropagation(); removeJob(job.id); }}
            title="Dismiss (generation continues)"
            style={{
              flexShrink: 0,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.3)',
              padding: 2,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={12} />
          </button>
        </div>
      ))}

      <style>{`
        @keyframes gen-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
