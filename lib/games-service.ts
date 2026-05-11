// lib/games-service.ts

import type { GameEngine } from "@/types/upload";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.starcyeed.com";

export interface Game {
  id: string;
  slug: string;
  title: string;
  description: string;
  engine: GameEngine;
  thumbnail_url?: string;
  play_url: string;
  play_count: number;
  file_size_bytes: number;
  creator: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  created_at: string;
  updated_at: string;
}

/**
 * Fetch a single game by slug
 */
export async function getGameBySlug(slug: string): Promise<Game | null> {
  try {
    const response = await fetch(`${API_URL}/api/games/by-slug/${slug}`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch game: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching game:", error);
    return null;
  }
}

/**
 * Record a play event (call when user opens the game)
 */
export async function recordPlay(gameId: string): Promise<void> {
  try {
    await fetch(`${API_URL}/api/games/${gameId}/play`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to record play:", error);
  }
}

/**
 * Get games uploaded by a specific user.
 * Uses the working endpoint: GET /api/games/user/{userId}
 */
export async function getGamesByUser(userId: string): Promise<Game[]> {
  try {
    const response = await fetch(`${API_URL}/api/games/user/${encodeURIComponent(userId)}`, {
      headers: { 'X-User-Id': userId },
      cache: 'no-store',
    });
    if (!response.ok) return [];

    const data = await response.json();
    const raw: any[] = Array.isArray(data) ? data : (data?.games ?? data?.data ?? []);

    return raw.map((g: any): Game => ({
      id:              g.id ?? g.game_id ?? '',
      slug:            g.slug ?? '',
      title:           g.title ?? g.slug ?? '',
      description:     g.description ?? '',
      engine:          g.engine ?? 'unknown',
      thumbnail_url:   g.thumbnail_url ?? g.thumbnail ?? undefined,
      play_url:        g.play_url ?? '',
      play_count:      g.play_count ?? 0,
      file_size_bytes: g.file_size_bytes ?? Math.round((g.file_size_mb ?? 0) * 1024 * 1024),
      creator: g.creator ?? {
        id:         g.user_id ?? userId,
        username:   g.username ?? g.creator_username ?? 'creator',
        avatar_url: g.avatar_url ?? undefined,
      },
      created_at: g.created_at ?? new Date().toISOString(),
      updated_at: g.updated_at ?? g.created_at ?? new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

/** @deprecated Use getGamesByUser instead */
export async function getRecentGames(limit: number = 40): Promise<Game[]> {
  return [];
}
