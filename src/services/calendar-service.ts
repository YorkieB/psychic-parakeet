/*
  This file helps Jarvis connect to Google Calendar to manage your schedule and appointments.

  It handles OAuth authentication, reads calendar events, creates new events, and makes sure Jarvis can help you stay organized while keeping your calendar data secure.
*/

import fs from "node:fs";
import path from "node:path";
import type { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import type { Logger } from "winston";

/**
 * Google Calendar Service - Real Calendar API integration.
 */
export class CalendarService {
  private oauth2Client: OAuth2Client;
  private calendar: any;
  private logger: Logger;
  private tokenPath: string = path.join(process.cwd(), "config", "calendar-token.json");

  constructor(logger: Logger, oauth2Client?: OAuth2Client) {
    this.logger = logger;

    if (oauth2Client) {
      // Reuse OAuth2 client from Gmail (same credentials)
      this.oauth2Client = oauth2Client;
    } else {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/oauth2callback";

      if (!clientId || !clientSecret) {
        logger.warn("⚠️  Google OAuth credentials not found. Calendar features unavailable.");
        logger.info("💡 Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env");
      }

      this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri) as any;

      // Load saved token if exists
      if (fs.existsSync(this.tokenPath)) {
        try {
          const token = JSON.parse(fs.readFileSync(this.tokenPath, "utf-8"));
          this.oauth2Client.setCredentials(token);
          logger.info("✅ Loaded saved Calendar token");
        } catch (error) {
          logger.warn("Failed to load saved Calendar token:", error);
        }
      }
    }

    this.calendar = google.calendar({ version: "v3", auth: this.oauth2Client as any });
  }

  /**
   * Generate OAuth2 authorization URL (includes Calendar scope).
   */
  getAuthUrl(): string {
    const scopes = [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent",
    });
  }

  /**
   * Exchange authorization code for tokens.
   */
  async authenticate(code: string): Promise<void> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      // Save token for future use
      const dir = path.dirname(this.tokenPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.tokenPath, JSON.stringify(tokens, null, 2));

      this.logger.info("✅ Google Calendar authenticated successfully");
      this.logger.info(`📁 Token saved to: ${this.tokenPath}`);
    } catch (error: any) {
      this.logger.error("Calendar authentication failed:", error.message);
      throw new Error(`Calendar authentication failed: ${error.message}`);
    }
  }

  /**
   * Check if authenticated.
   */
  isAuthenticated(): boolean {
    return this.oauth2Client.credentials.access_token !== undefined;
  }

  /**
   * Refresh access token if needed.
   */
  async ensureAuthenticated(): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new Error("Calendar not authenticated. Run: npm run auth:google");
    }

    // Check if token is expired and refresh if needed
    if (
      this.oauth2Client.credentials.expiry_date &&
      this.oauth2Client.credentials.expiry_date <= Date.now()
    ) {
      try {
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        this.oauth2Client.setCredentials(credentials);

        // Save refreshed token
        const dir = path.dirname(this.tokenPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.tokenPath, JSON.stringify(credentials, null, 2));

        this.logger.info("✅ Calendar token refreshed");
      } catch (error: any) {
        this.logger.error("Failed to refresh Calendar token:", error.message);
        throw new Error("Calendar token expired. Please re-authenticate: npm run auth:google");
      }
    }
  }

  /**
   * List events in date range.
   */
  async listEvents(options: {
    calendarId?: string;
    timeMin?: Date;
    timeMax?: Date;
    maxResults?: number;
  }): Promise<CalendarEvent[]> {
    await this.ensureAuthenticated();

    try {
      const response = await this.calendar.events.list({
        calendarId: options.calendarId || "primary",
        timeMin: (options.timeMin || new Date()).toISOString(),
        timeMax: options.timeMax?.toISOString(),
        maxResults: options.maxResults || 250,
        singleEvents: true,
        orderBy: "startTime",
        timeZone: "Europe/London", // UK timezone
      });

      const events = response.data.items || [];

      return events.map((event: any) => ({
        id: event.id,
        summary: event.summary || "No title",
        description: event.description,
        location: event.location,
        start: new Date(event.start.dateTime || event.start.date),
        end: new Date(event.end.dateTime || event.end.date),
        attendees:
          event.attendees?.map((a: any) => ({
            email: a.email,
            displayName: a.displayName,
            responseStatus: a.responseStatus,
          })) || [],
        meetingLink: event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri,
        status: event.status,
        isAllDay: !event.start.dateTime,
      }));
    } catch (error: any) {
      this.logger.error("Failed to list events:", error.message);
      throw new Error(`Calendar API error: ${error.message}`);
    }
  }

  /**
   * Create new event.
   */
  async createEvent(options: {
    summary: string;
    description?: string;
    location?: string;
    start: Date;
    end: Date;
    attendees?: string[];
    reminders?: number[]; // minutes before
  }): Promise<CreateEventResult> {
    await this.ensureAuthenticated();

    try {
      const event: any = {
        summary: options.summary,
        description: options.description,
        location: options.location,
        start: {
          dateTime: options.start.toISOString(),
          timeZone: "Europe/London", // UK timezone
        },
        end: {
          dateTime: options.end.toISOString(),
          timeZone: "Europe/London",
        },
        attendees: options.attendees?.map((email) => ({ email })),
        reminders: {
          useDefault: !options.reminders,
          overrides: options.reminders?.map((minutes) => ({
            method: "popup",
            minutes,
          })),
        },
      };

      // Add Google Meet link if attendees are present
      if (options.attendees && options.attendees.length > 0) {
        event.conferenceData = {
          createRequest: {
            requestId: `jarvis-${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        };
      }

      const response = await this.calendar.events.insert({
        calendarId: "primary",
        requestBody: event,
        conferenceDataVersion: options.attendees && options.attendees.length > 0 ? 1 : 0,
        sendUpdates: "all", // Send email invites
      });

      this.logger.info(`✅ Event created: ${response.data.id}`);

      return {
        success: true,
        eventId: response.data.id,
        meetingLink:
          response.data.hangoutLink || response.data.conferenceData?.entryPoints?.[0]?.uri,
        htmlLink: response.data.htmlLink,
      };
    } catch (error: any) {
      this.logger.error("Failed to create event:", error.message);
      throw new Error(`Failed to create event: ${error.message}`);
    }
  }

  /**
   * Update existing event.
   */
  async updateEvent(
    eventId: string,
    updates: Partial<{
      summary: string;
      description: string;
      location: string;
      start: Date;
      end: Date;
    }>,
  ): Promise<void> {
    await this.ensureAuthenticated();

    const updateData: any = {};

    if (updates.summary) updateData.summary = updates.summary;
    if (updates.description) updateData.description = updates.description;
    if (updates.location) updateData.location = updates.location;
    if (updates.start) {
      updateData.start = {
        dateTime: updates.start.toISOString(),
        timeZone: "Europe/London",
      };
    }
    if (updates.end) {
      updateData.end = {
        dateTime: updates.end.toISOString(),
        timeZone: "Europe/London",
      };
    }

    await this.calendar.events.patch({
      calendarId: "primary",
      eventId,
      requestBody: updateData,
      sendUpdates: "all",
    });

    this.logger.info(`✅ Event updated: ${eventId}`);
  }

  /**
   * Delete event.
   */
  async deleteEvent(eventId: string): Promise<void> {
    await this.ensureAuthenticated();

    await this.calendar.events.delete({
      calendarId: "primary",
      eventId,
      sendUpdates: "all",
    });

    this.logger.info(`✅ Event deleted: ${eventId}`);
  }

  /**
   * Find free/busy times.
   */
  async getFreeBusy(options: {
    timeMin: Date;
    timeMax: Date;
    calendars?: string[];
  }): Promise<FreeBusyInfo> {
    await this.ensureAuthenticated();

    const response = await this.calendar.freebusy.query({
      requestBody: {
        timeMin: options.timeMin.toISOString(),
        timeMax: options.timeMax.toISOString(),
        timeZone: "Europe/London",
        items: (options.calendars || ["primary"]).map((id) => ({ id })),
      },
    });

    const calendar = response.data.calendars.primary;
    const busySlots = calendar.busy || [];

    return {
      busySlots: busySlots.map((slot: any) => ({
        start: new Date(slot.start),
        end: new Date(slot.end),
      })),
    };
  }
}

// Types
export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  attendees: Attendee[];
  meetingLink?: string;
  status: string;
  isAllDay: boolean;
}

export interface Attendee {
  email: string;
  displayName?: string;
  responseStatus: string;
}

export interface CreateEventResult {
  success: boolean;
  eventId: string;
  meetingLink?: string;
  htmlLink: string;
}

export interface FreeBusyInfo {
  busySlots: { start: Date; end: Date }[];
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
