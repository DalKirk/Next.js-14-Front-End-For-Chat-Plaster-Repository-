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
 * Get featured/recent games for the browse page
 */
export async function getRecentGames(limit: number = 40): Promise<Game[]> {
  try {
    const response = await fetch(`${API_URL}/api/games?limit=${limit}`, {
      next: { revalidate: 30 },
    });
    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
}
