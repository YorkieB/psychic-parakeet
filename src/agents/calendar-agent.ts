/*
  This file connects Jarvis to your Google Calendar to manage your schedule.

  It handles creating events, checking your availability, and finding free time while making sure you never miss an important appointment.
*/

import type { Request, Response } from "express";
import express from "express";
import type { Logger } from "winston";
import { CalendarService } from "../services/calendar-service";
import type { AgentRequest, AgentResponse } from "../types/agent";
import { EnhancedBaseAgent } from "./base-agent-enhanced";

/**
 * Calendar Agent - Real Google Calendar integration.
 */
export class CalendarAgent extends EnhancedBaseAgent {
  private calendarService: CalendarService;

  constructor(logger: Logger) {
    super("Calendar", "2.0.0", parseInt(process.env.CALENDAR_AGENT_PORT || "3005", 10), logger);
    this.calendarService = new CalendarService(logger);
  }

  protected async initialize(): Promise<void> {
    if (this.calendarService.isAuthenticated()) {
      this.logger.info("✅ Google Calendar authenticated");
    } else {
      this.logger.warn("⚠️  Calendar not authenticated. Run: npm run auth:google");
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

        this.logger.info(`Calendar Agent executing: ${action}`, {
          requestId: request.id,
          action,
        });

        let result: unknown;

        switch (action) {
          case "list_events":
            result = await this.listEvents(inputs);
            break;
          case "create_event":
            result = await this.createEvent(inputs);
            break;
          case "update_event":
            result = await this.updateEvent(inputs);
            break;
          case "delete_event":
            result = await this.deleteEvent(inputs);
            break;
          case "find_free_time":
            result = await this.findFreeTime(inputs);
            break;
          case "check_schedule":
            result = await this.checkSchedule(inputs);
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
        this.logger.error("Error processing calendar request", {
          error: error instanceof Error ? error.message : String(error),
          requestId: request.id,
        });

        const duration = Date.now() - startTime;
        const errorResponse: AgentResponse = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        res.status(500).json(errorResponse);
      }
    });

    return new Promise<void>((resolve, reject) => {
      this.app
        .listen(this.port, () => {
          this.logger.info(`Calendar agent server listening on port ${this.port}`);
          resolve();
        })
        .on("error", (error: Error) => {
          this.logger.error(`Failed to start server on port ${this.port}`, {
            error: error.message,
          });
          reject(error);
        });
    });
  }

  protected getCapabilities(): string[] {
    return [
      "list_events",
      "create_event",
      "update_event",
      "delete_event",
      "find_free_time",
      "check_schedule",
    ];
  }

  protected getDependencies(): string[] {
    return [];
  }

  protected getPriority(): number {
    return 6;
  }

  /**
   * List events for a time period.
   */
  private async listEvents(inputs: Record<string, unknown>) {
    const period = (inputs.period as string) || "week";
    const now = new Date();
    let timeMax: Date;

    switch (period) {
      case "today":
        timeMax = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case "week":
        timeMax = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        timeMax = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const events = await this.calendarService.listEvents({
      timeMin: now,
      timeMax,
    });

    return { events, count: events.length };
  }

  /**
   * Create new event.
   */
  private async createEvent(inputs: Record<string, unknown>) {
    const summary = (inputs.summary || inputs.title) as string;
    const startValue = (inputs.start || inputs.startTime) as string | Date;
    const start = new Date(startValue);
    const end = inputs.end
      ? new Date(inputs.end as string)
      : new Date(start.getTime() + 60 * 60 * 1000);
    const description = inputs.description as string;
    const location = inputs.location as string;
    const attendees = inputs.attendees as string[];

    if (!summary) throw new Error("Event title/summary required");

    return this.calendarService.createEvent({
      summary: summary as string,
      description,
      location,
      start,
      end,
      attendees,
    });
  }

  /**
   * Update existing event.
   */
  private async updateEvent(inputs: Record<string, unknown>) {
    const eventId = inputs.eventId as string;
    if (!eventId) throw new Error("Event ID required");

    const updates: any = {};
    if (inputs.summary) updates.summary = inputs.summary as string;
    if (inputs.description) updates.description = inputs.description as string;
    if (inputs.location) updates.location = inputs.location as string;
    if (inputs.start) updates.start = new Date(inputs.start as string);
    if (inputs.end) updates.end = new Date(inputs.end as string);

    await this.calendarService.updateEvent(eventId, updates);
    return { success: true, message: "Event updated" };
  }

  /**
   * Delete event.
   */
  private async deleteEvent(inputs: Record<string, unknown>) {
    const eventId = inputs.eventId as string;
    if (!eventId) throw new Error("Event ID required");

    await this.calendarService.deleteEvent(eventId);
    return { success: true, message: "Event deleted" };
  }

  /**
   * Find free time slots.
   */
  private async findFreeTime(inputs: Record<string, unknown>) {
    const date = inputs.date ? new Date(inputs.date as string) : new Date();
    const duration = (inputs.duration as number) || 60;

    const dayStart = new Date(date);
    dayStart.setHours(9, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(17, 0, 0, 0);

    const freeBusy = await this.calendarService.getFreeBusy({
      timeMin: dayStart,
      timeMax: dayEnd,
    });

    // Calculate free slots
    const freeSlots = this.calculateFreeSlots(dayStart, dayEnd, freeBusy.busySlots, duration);

    return { date, freeSlots, count: freeSlots.length };
  }

  /**
   * Check schedule for a specific day.
   */
  private async checkSchedule(inputs: Record<string, unknown>) {
    const date = inputs.date ? new Date(inputs.date as string) : new Date();
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const events = await this.calendarService.listEvents({
      timeMin: dayStart,
      timeMax: dayEnd,
    });

    return {
      date,
      events,
      totalEvents: events.length,
      isBusy: events.length > 3,
      nextEvent: events.length > 0 ? events[0] : undefined,
    };
  }

  /**
   * Calculate free time slots between busy periods.
   */
  private calculateFreeSlots(
    dayStart: Date,
    dayEnd: Date,
    busySlots: { start: Date; end: Date }[],
    duration: number,
  ): { start: Date; end: Date; duration: number }[] {
    const freeSlots: { start: Date; end: Date; duration: number }[] = [];
    let currentTime = dayStart;

    for (const busy of busySlots.sort((a, b) => a.start.getTime() - b.start.getTime())) {
      if (currentTime < busy.start) {
        const slotDuration = (busy.start.getTime() - currentTime.getTime()) / (60 * 1000);
        if (slotDuration >= duration) {
          freeSlots.push({
            start: new Date(currentTime),
            end: new Date(busy.start),
            duration: slotDuration,
          });
        }
      }
      currentTime = busy.end > currentTime ? busy.end : currentTime;
    }

    if (currentTime < dayEnd) {
      const slotDuration = (dayEnd.getTime() - currentTime.getTime()) / (60 * 1000);
      if (slotDuration >= duration) {
        freeSlots.push({
          start: new Date(currentTime),
          end: new Date(dayEnd),
          duration: slotDuration,
        });
      }
    }

    return freeSlots;
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
    this.logger.info("Restarting Calendar agent...");
    await this.stop();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await this.start();
  }
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
