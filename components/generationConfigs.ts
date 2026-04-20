import type { GenerationPanelConfig } from './GenerationPanel';

/* ─────────────────────────────────────────────
 *  IMAGE GENERATION
 * ───────────────────────────────────────────── */
export const imageConfig: GenerationPanelConfig = {
  title: 'Image Generation',
  accent: '#00d4ff',
  promptPlaceholder: 'Describe the image you want to create...',
  showNegativePrompt: true,
  generateLabel: 'Generate Image',
  models: [
    { id: 'schnell', name: 'FLUX Schnell', badge: '⚡ Fast', description: '1 credit · 4 steps' },
    { id: 'dev', name: 'FLUX Dev', badge: '🎨 Quality', description: '3 credits · 20 steps' },
    { id: 'sd35', name: 'Stable Diffusion 3.5', badge: '✨ Open', description: '2 credits · 28 steps' },
  ],
  defaultModel: 'dev',
  styles: [
    { id: 'none', label: 'None' },
    { id: 'photorealistic', label: 'Photorealistic' },
    { id: 'anime', label: 'Anime' },
    { id: 'oil-painting', label: 'Oil Painting' },
    { id: 'cyberpunk', label: 'Cyberpunk' },
    { id: 'watercolor', label: 'Watercolor' },
    { id: 'pixel-art', label: 'Pixel Art' },
    { id: '3d-render', label: '3D Render' },
    { id: 'comic', label: 'Comic' },
    { id: 'cinematic', label: 'Cinematic' },
    { id: 'sketch', label: 'Sketch' },
    { id: 'neon', label: 'Neon' },
  ],
  defaultStyle: 'none',
  ratios: [
    { id: '1:1', label: '1:1', w: 13, h: 13 },
    { id: '16:9', label: '16:9', w: 18, h: 12 },
    { id: '9:16', label: '9:16', w: 12, h: 18 },
    { id: '4:3', label: '4:3', w: 16, h: 13 },
  ],
  defaultRatio: '1:1',
  sliders: [
    { label: 'Steps', key: 'steps', min: 4, max: 50, step: 1, default: 20 },
    { label: 'Guidance', key: 'guidance', min: 0, max: 200, step: 1, default: 70, display: (v) => (v / 10).toFixed(1) },
  ],
};

/* ─────────────────────────────────────────────
 *  LOGEX (IDEOGRAM) – TEXT & LOGO GENERATION
 * ───────────────────────────────────────────── */
export const logexConfig: GenerationPanelConfig = {
  title: 'Logex · Text & Logos',
  accent: '#ec4899',
  promptPlaceholder: 'Describe the image… Logex excels at text, logos & typography',
  showNegativePrompt: true,
  generateLabel: 'Generate · 2 cr',
  models: [
    { id: 'V_2_TURBO', name: 'Ideogram v2 Turbo', badge: '⚡ Fast', description: 'Fast & good quality' },
    { id: 'V_2', name: 'Ideogram v2', badge: '✨ Quality', description: 'Best quality' },
  ],
  defaultModel: 'V_2_TURBO',
  styles: [
    { id: 'none', label: 'Auto' },
    { id: 'GENERAL', label: 'General' },
    { id: 'REALISTIC', label: 'Realistic' },
    { id: 'DESIGN', label: 'Design' },
    { id: 'RENDER_3D', label: '3D Render' },
    { id: 'ANIME', label: 'Anime' },
  ],
  defaultStyle: 'none',
  ratios: [
    { id: 'ASPECT_1_1', label: '1:1', w: 13, h: 13 },
    { id: 'ASPECT_16_9', label: '16:9', w: 18, h: 12 },
    { id: 'ASPECT_9_16', label: '9:16', w: 12, h: 18 },
    { id: 'ASPECT_4_3', label: '4:3', w: 16, h: 13 },
    { id: 'ASPECT_3_4', label: '3:4', w: 13, h: 16 },
    { id: 'ASPECT_3_2', label: '3:2', w: 16, h: 11 },
    { id: 'ASPECT_2_3', label: '2:3', w: 11, h: 16 },
  ],
  defaultRatio: 'ASPECT_1_1',
};

/* ─────────────────────────────────────────────
 *  VIDEO GENERATION (WAN + LTX)
 * ───────────────────────────────────────────── */
export const videoConfig: GenerationPanelConfig = {
  title: 'Video Generation',
  accent: '#a855f7',
  promptPlaceholder: 'Describe the video scene you want to create...',
  showNegativePrompt: true,
  generateLabel: 'Generate Video',
  models: [
    { id: 'wan', name: 'WAN 2.2', badge: '🎬 5B', description: 'Realistic humans · Cinematic · 5 cr' },
    { id: 'ltx', name: 'LTX-Video', badge: '⚡ 13B', description: 'Fast · Up to 1080p · V2V · 5 cr' },
  ],
  defaultModel: 'wan',
  ratios: [
    { id: '16:9', label: '16:9', w: 18, h: 12 },
    { id: '9:16', label: '9:16', w: 12, h: 18 },
    { id: '1:1', label: '1:1', w: 13, h: 13 },
  ],
  defaultRatio: '16:9',
  sliders: [
    { label: 'Duration', key: 'duration', min: 2, max: 10, step: 1, default: 5, display: (v) => `${v}s` },
  ],
};

/* ─────────────────────────────────────────────
 *  SKYREELS
 * ───────────────────────────────────────────── */
export const skyreelConfig: GenerationPanelConfig = {
  title: 'SkyReels V3',
  accent: '#06b6d4',
  promptPlaceholder: 'Describe the scene with character reference...',
  showNegativePrompt: true,
  generateLabel: 'Generate SkyReel · 8 cr',
  models: [
    { id: 'skyreel', name: 'SkyReels V3', badge: '🎥 14B', description: 'Reference-to-Video · Character consistency' },
  ],
  defaultModel: 'skyreel',
  ratios: [
    { id: '480P', label: '480P', w: 16, h: 10 },
    { id: '540P', label: '540P', w: 16, h: 11 },
    { id: '720P', label: '720P', w: 18, h: 12 },
  ],
  defaultRatio: '480P',
};

/* ─────────────────────────────────────────────
 *  AVATAR (Talking Avatar)
 * ───────────────────────────────────────────── */
export const avatarConfig: GenerationPanelConfig = {
  title: 'Talking Avatar',
  accent: '#f59e0b',
  promptPlaceholder: 'Upload a portrait + audio to generate a talking avatar...',
  showNegativePrompt: false,
  generateLabel: 'Generate Avatar · 12 cr',
  models: [
    { id: 'avatar', name: 'Talking Avatar', badge: '🗣️ 19B', description: 'Portrait + Audio → Lip-synced video' },
    { id: 'hunyuan-avatar', name: 'HunyuanVideo Avatar', badge: '✨ HD', description: 'High-res lip-sync · Up to 1280px · 15 cr' },
  ],
  defaultModel: 'avatar',
  ratios: [
    { id: '480P', label: '480P', w: 12, h: 16 },
    { id: '720P', label: '720P', w: 12, h: 18 },
  ],
  defaultRatio: '480P',
};
