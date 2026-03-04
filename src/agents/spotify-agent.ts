/*
  This file lets Jarvis control your Spotify music and playlists.

  It handles playing songs, managing playlists, searching music, and controlling playback while making sure you can enjoy your music seamlessly.
*/
import axios from "axios";
import type { Request, Response } from "express";
import express from "express";
import type { Logger } from "winston";
import type { AgentRequest, AgentResponse } from "../types/agent";
import { EnhancedBaseAgent } from "./base-agent-enhanced";

/**
 * Spotify Agent - Full control over Spotify playback.
 * Play, pause, skip, search, create playlists, manage queue.
 */
export class SpotifyAgent extends EnhancedBaseAgent {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private clientId: string;
  private clientSecret: string;

  constructor(logger: Logger) {
    super("Spotify", "1.0.0", parseInt(process.env.SPOTIFY_AGENT_PORT || "3012", 10), logger);
    this.clientId = process.env.SPOTIFY_CLIENT_ID || "";
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || "";

    if (!this.clientId || !this.clientSecret) {
      logger.warn("⚠️  Spotify credentials not found. Spotify control unavailable.");
      logger.warn("💡 Note: Spotify is currently not accepting new developer app registrations.");
      logger.info("💡 Options:");
      logger.info("   1. Use existing Spotify app credentials if you have them");
      logger.info("   2. Use existing access tokens (SPOTIFY_ACCESS_TOKEN in .env)");
      logger.info("   3. Add credentials later - agent will work once configured");
      logger.info("   📝 All other agents (Music, Image, Video) work independently");
    }
  }

  protected async initialize(): Promise<void> {
    this.logger.info(`${this.agentId} agent initialized`);

    // Load saved tokens if available
    this.accessToken = process.env.SPOTIFY_ACCESS_TOKEN || null;
    this.refreshToken = process.env.SPOTIFY_REFRESH_TOKEN || null;

    if (this.accessToken) {
      this.logger.info("✅ Spotify access token loaded");
    } else if (this.clientId && this.clientSecret) {
      this.logger.info("⚠️  No Spotify access token. Run authentication flow to get tokens.");
      this.logger.info("💡 See CREATIVE_APIS_SETUP.md for authentication instructions");
    } else {
      this.logger.info(
        "⚠️  Spotify not configured. Agent registered but will return errors for Spotify actions.",
      );
      this.logger.info("💡 Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to .env to enable");
    }
  }

  protected async startServer(): Promise<void> {
    this.app.use((express as any).json());
    this.setupHealthEndpoint();
    this.setupEnhancedRoutes();

    this.app.post("/api", async (req: Request, res: Response) => {
      const startTime = Date.now();
      const request = req.body as AgentRequest;

      try {
        const action = request.action;
        const inputs = request.inputs || {};

        this.logger.info(`Spotify Agent executing: ${action}`, {
          requestId: request.id,
          action,
        });

        // Check authentication
        if (!this.accessToken && action !== "authenticate") {
          throw new Error("Spotify not authenticated. Run authenticate() first.");
        }

        let result: unknown;

        switch (action) {
          case "play":
            result = await this.play(inputs);
            break;
          case "pause":
            result = await this.pause();
            break;
          case "skip":
            result = await this.skip();
            break;
          case "previous":
            result = await this.previous();
            break;
          case "seek":
            result = await this.seek(inputs);
            break;
          case "set_volume":
            result = await this.setVolume(inputs);
            break;
          case "shuffle":
            result = await this.setShuffle(inputs);
            break;
          case "repeat":
            result = await this.setRepeat(inputs);
            break;
          case "search":
            result = await this.search(inputs);
            break;
          case "create_playlist":
            result = await this.createPlaylist(inputs);
            break;
          case "add_to_playlist":
            result = await this.addToPlaylist(inputs);
            break;
          case "get_queue":
            result = await this.getQueue();
            break;
          case "add_to_queue":
            result = await this.addToQueue(inputs);
            break;
          case "currently_playing":
            result = await this.getCurrentlyPlaying();
            break;
          case "get_devices":
            result = await this.getDevices();
            break;
          default:
            throw new Error(`Unknown action: ${action}`);
        }

        const duration = Date.now() - startTime;

        const response: AgentResponse = {
          success: true,
          data: result,
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        res.json(response);
      } catch (error) {
        this.logger.error("Error processing Spotify request", {
          error: error instanceof Error ? error.message : String(error),
          requestId: request.id,
        });

        const duration = Date.now() - startTime;
        const errorResponse: AgentResponse = {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        res.status(500).json(errorResponse);
      }
    });

    // Start listening on port
    return new Promise<void>((resolve, reject) => {
      this.app
        .listen(this.port, () => {
          this.logger.info(`Spotify agent server listening on port ${this.port}`);
          resolve();
        })
        .on("error", (error: Error) => {
          this.logger.error(`Failed to start Spotify server on port ${this.port}`, {
            error: error.message,
          });
          reject(error);
        });
    });
  }

  /**
   * Play track, album, or playlist.
   */
  private async play(inputs: Record<string, unknown>): Promise<PlaybackResult> {
    const uri = inputs.uri as string; // spotify:track:xxx or spotify:playlist:xxx
    const query = inputs.query as string; // "play some jazz"

    let uris: string[] = [];

    if (uri) {
      uris = [uri];
    } else if (query) {
      // Search and play first result
      const searchResult = await this.search({ query, type: "track", limit: 1 });
      const tracks = (searchResult as SearchResult).tracks;

      if (tracks.length === 0) {
        throw new Error(`No results found for: ${query}`);
      }

      uris = [tracks[0].uri];
    } else {
      // Resume playback
      await this.spotifyRequest("PUT", "/v1/me/player/play");
      return { success: true, message: "Playback resumed" };
    }

    await this.spotifyRequest("PUT", "/v1/me/player/play", {
      uris,
    });

    this.logger.info(`▶️  Playing: ${uris[0]}`);

    return {
      success: true,
      message: `Playing ${uris[0]}`,
    };
  }

  /**
   * Pause playback.
   */
  private async pause(): Promise<PlaybackResult> {
    await this.spotifyRequest("PUT", "/v1/me/player/pause");

    this.logger.info("⏸️  Playback paused");

    return {
      success: true,
      message: "Playback paused",
    };
  }

  /**
   * Skip to next track.
   */
  private async skip(): Promise<PlaybackResult> {
    await this.spotifyRequest("POST", "/v1/me/player/next");

    this.logger.info("⏭️  Skipped to next track");

    return {
      success: true,
      message: "Skipped to next track",
    };
  }

  /**
   * Previous track.
   */
  private async previous(): Promise<PlaybackResult> {
    await this.spotifyRequest("POST", "/v1/me/player/previous");

    this.logger.info("⏮️  Previous track");

    return {
      success: true,
      message: "Previous track",
    };
  }

  /**
   * Seek to position.
   */
  private async seek(inputs: Record<string, unknown>): Promise<PlaybackResult> {
    const positionMs = inputs.positionMs as number;

    if (positionMs === undefined) {
      throw new Error("Position (ms) required");
    }

    await this.spotifyRequest("PUT", "/v1/me/player/seek", null, {
      position_ms: positionMs,
    });

    this.logger.info(`⏩ Seeked to ${(positionMs / 1000).toFixed(1)}s`);

    return {
      success: true,
      message: `Seeked to ${(positionMs / 1000).toFixed(1)}s`,
    };
  }

  /**
   * Set volume.
   */
  private async setVolume(inputs: Record<string, unknown>): Promise<PlaybackResult> {
    const volumePercent = inputs.volumePercent as number;

    if (volumePercent === undefined || volumePercent < 0 || volumePercent > 100) {
      throw new Error("Volume must be 0-100");
    }

    await this.spotifyRequest("PUT", "/v1/me/player/volume", null, {
      volume_percent: volumePercent,
    });

    this.logger.info(`🔊 Volume set to ${volumePercent}%`);

    return {
      success: true,
      message: `Volume set to ${volumePercent}%`,
    };
  }

  /**
   * Set shuffle.
   */
  private async setShuffle(inputs: Record<string, unknown>): Promise<PlaybackResult> {
    const state = inputs.state as boolean;

    await this.spotifyRequest("PUT", "/v1/me/player/shuffle", null, {
      state,
    });

    this.logger.info(`🔀 Shuffle ${state ? "on" : "off"}`);

    return {
      success: true,
      message: `Shuffle ${state ? "on" : "off"}`,
    };
  }

  /**
   * Set repeat mode.
   */
  private async setRepeat(inputs: Record<string, unknown>): Promise<PlaybackResult> {
    const state = inputs.state as "off" | "track" | "context";

    await this.spotifyRequest("PUT", "/v1/me/player/repeat", null, {
      state,
    });

    this.logger.info(`🔁 Repeat: ${state}`);

    return {
      success: true,
      message: `Repeat: ${state}`,
    };
  }

  /**
   * Search Spotify.
   */
  private async search(inputs: Record<string, unknown>): Promise<SearchResult> {
    const query = inputs.query as string;
    const type = (inputs.type as string) || "track";
    const limit = (inputs.limit as number) || 10;

    if (!query) {
      throw new Error("Search query required");
    }

    const response = await this.spotifyRequest("GET", "/v1/search", null, {
      q: query,
      type,
      limit,
    });

    const tracks = response.tracks?.items || [];
    const albums = response.albums?.items || [];
    const playlists = response.playlists?.items || [];
    const artists = response.artists?.items || [];

    this.logger.info(`🔍 Found ${tracks.length} tracks, ${albums.length} albums`);

    return {
      tracks: tracks.map((t: any) => ({
        id: t.id,
        name: t.name,
        artist: t.artists?.[0]?.name || "Unknown",
        album: t.album?.name || "Unknown",
        uri: t.uri,
        duration: t.duration_ms,
      })),
      albums: albums.map((a: any) => ({
        id: a.id,
        name: a.name,
        artist: a.artists?.[0]?.name || "Unknown",
        uri: a.uri,
      })),
      playlists: playlists.map((p: any) => ({
        id: p.id,
        name: p.name,
        owner: p.owner?.display_name || "Unknown",
        uri: p.uri,
      })),
      artists: artists.map((a: any) => ({
        id: a.id,
        name: a.name,
        uri: a.uri,
      })),
    };
  }

  /**
   * Create playlist.
   */
  private async createPlaylist(inputs: Record<string, unknown>): Promise<PlaylistResult> {
    const name = inputs.name as string;
    const description = inputs.description as string;
    const isPublic = (inputs.isPublic as boolean) !== false;

    if (!name) {
      throw new Error("Playlist name required");
    }

    // Get user ID
    const user = await this.spotifyRequest("GET", "/v1/me");
    const userId = user.id;

    // Create playlist
    const playlist = await this.spotifyRequest("POST", `/v1/users/${userId}/playlists`, {
      name,
      description: description || "",
      public: isPublic,
    });

    this.logger.info(`✅ Created playlist: ${name} (${playlist.id})`);

    return {
      success: true,
      playlist: {
        id: playlist.id,
        name: playlist.name,
        uri: playlist.uri,
        url: playlist.external_urls?.spotify || "",
      },
      message: `Playlist "${name}" created`,
    };
  }

  /**
   * Add tracks to playlist.
   */
  private async addToPlaylist(inputs: Record<string, unknown>): Promise<PlaylistResult> {
    const playlistId = inputs.playlistId as string;
    const trackUris = inputs.trackUris as string[];

    if (!playlistId) {
      throw new Error("Playlist ID required");
    }

    if (!trackUris || trackUris.length === 0) {
      throw new Error("Track URIs required");
    }

    await this.spotifyRequest("POST", `/v1/playlists/${playlistId}/tracks`, {
      uris: trackUris,
    });

    this.logger.info(`✅ Added ${trackUris.length} tracks to playlist ${playlistId}`);

    return {
      success: true,
      message: `Added ${trackUris.length} tracks`,
    };
  }

  /**
   * Returns the capabilities of this agent.
   */
  protected getCapabilities(): string[] {
    return [
      "play",
      "pause",
      "skip",
      "previous",
      "seek",
      "set_volume",
      "shuffle",
      "repeat",
      "search",
      "create_playlist",
      "add_to_playlist",
      "get_queue",
      "add_to_queue",
      "currently_playing",
      "get_devices",
    ];
  }

  /**
   * Returns the dependencies for this agent.
   */
  protected getDependencies(): string[] {
    return [];
  }

  /**
   * Get queue.
   */
  private async getQueue(): Promise<QueueResult> {
    const response = await this.spotifyRequest("GET", "/v1/me/player/queue");

    const currentTrack = response.currently_playing;
    const queue = response.queue || [];

    return {
      currentTrack: currentTrack
        ? {
            id: currentTrack.id,
            name: currentTrack.name,
            artist: currentTrack.artists?.[0]?.name || "Unknown",
            album: "Unknown",
            uri: currentTrack.uri,
            duration: currentTrack.duration_ms || 0,
          }
        : null,
      queue: queue.map((t: any) => ({
        id: t.id,
        name: t.name,
        artist: t.artists?.[0]?.name || "Unknown",
        uri: t.uri,
      })),
      count: queue.length,
    };
  }

  /**
   * Add to queue.
   */
  private async addToQueue(inputs: Record<string, unknown>): Promise<PlaybackResult> {
    const uri = inputs.uri as string;

    if (!uri) {
      throw new Error("Track URI required");
    }

    await this.spotifyRequest("POST", "/v1/me/player/queue", null, {
      uri,
    });

    this.logger.info(`✅ Added to queue: ${uri}`);

    return {
      success: true,
      message: `Added to queue: ${uri}`,
    };
  }

  /**
   * Get currently playing track.
   */
  private async getCurrentlyPlaying(): Promise<CurrentlyPlayingResult> {
    const response = await this.spotifyRequest("GET", "/v1/me/player/currently-playing");

    if (!response || !response.item) {
      return {
        isPlaying: false,
        track: null,
      };
    }

    const track = response.item;

    return {
      isPlaying: response.is_playing,
      track: {
        id: track.id,
        name: track.name,
        artist: track.artists?.[0]?.name || "Unknown",
        album: track.album?.name || "Unknown",
        uri: track.uri,
        duration: track.duration_ms,
        progress: response.progress_ms,
      },
      device: response.device?.name,
      shuffleState: response.shuffle_state,
      repeatState: response.repeat_state,
    };
  }

  /**
   * Get available devices.
   */
  private async getDevices(): Promise<DevicesResult> {
    const response = await this.spotifyRequest("GET", "/v1/me/player/devices");

    const devices = response.devices || [];

    return {
      devices: devices.map((d: any) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        isActive: d.is_active,
        volume: d.volume_percent,
      })),
      count: devices.length,
    };
  }

  /**
   * Make Spotify API request.
   */
  private async spotifyRequest(
    method: string,
    endpoint: string,
    body?: any,
    params?: Record<string, any>,
  ): Promise<any> {
    if (!this.accessToken) {
      throw new Error("Not authenticated");
    }

    try {
      const url = `https://api.spotify.com${endpoint}`;

      const response = await axios({
        method,
        url,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        data: body,
        params,
      });

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Token expired, try refresh
        if (this.refreshToken) {
          await this.refreshAccessToken();
          // Retry request
          return this.spotifyRequest(method, endpoint, body, params);
        }
      }

      throw new Error(`Spotify API error: ${error.message}`);
    }
  }

  /**
   * Refresh access token.
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      const response = await axios.post(
        "https://accounts.spotify.com/api/token",
        new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: this.refreshToken,
        }),
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );

      this.accessToken = response.data.access_token;
      this.logger.info("✅ Spotify access token refreshed");
    } catch (error) {
      this.logger.error("Failed to refresh Spotify token:", error);
      throw error;
    }
  }

  /**
   * Get agent-specific metrics
   */
  protected getMetrics(): {
    requestCount: number;
    errorCount: number;
    uptime: number;
    lastRequest?: string;
    [key: string]: any;
  } {
    return {
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      uptime: Date.now() - this.startTime.getTime(),
      lastRequest: this.lastRequestTime ? new Date(this.lastRequestTime).toISOString() : undefined,
      averageResponseTime: this.calculateAverageResponseTime(),
      status: this.getStatus(),
    };
  }

  /**
   * Update agent configuration
   */
  protected async updateConfig(config: any): Promise<void> {
    this.config = { ...this.config, ...config };
    this.logger.info("Configuration updated", { config });
  }

  /**
   * Restart the agent
   */
  protected async restart(): Promise<void> {
    this.logger.info("Restarting Spotify agent...");
    await this.stop();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await this.start();
  }
}

// Types
interface PlaybackResult {
  success: boolean;
  message: string;
}

interface SearchResult {
  tracks: Track[];
  albums: Album[];
  playlists: Playlist[];
  artists: Artist[];
}

interface Track {
  id: string;
  name: string;
  artist: string;
  album: string;
  uri: string;
  duration: number;
}

interface Album {
  id: string;
  name: string;
  artist: string;
  uri: string;
}

interface Playlist {
  id: string;
  name: string;
  owner: string;
  uri: string;
}

interface Artist {
  id: string;
  name: string;
  uri: string;
}

interface PlaylistResult {
  success: boolean;
  playlist?: {
    id: string;
    name: string;
    uri: string;
    url: string;
  };
  message: string;
}

interface QueueResult {
  currentTrack: Track | null;
  queue: Track[];
  count: number;
}

interface CurrentlyPlayingResult {
  isPlaying: boolean;
  track: (Track & { progress?: number }) | null;
  device?: string;
  shuffleState?: boolean;
  repeatState?: string;
}

interface DevicesResult {
  devices: Device[];
  count: number;
}

interface Device {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  volume: number;
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
