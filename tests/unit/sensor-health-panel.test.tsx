/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import type React from "react";
import "@testing-library/jest-dom";
import http from "node:http";
import express from "express";
import { Server as IOServer } from "socket.io";

// Component and provider under test (no mocks)
import { SensorHealthPanel } from "../../dashboard/src/components/SensorHealthPanel";
import { WebSocketProvider } from "../../dashboard/src/contexts/WebSocketContext";

// Types
import type { SensorHealthReport } from "../../dashboard/src/types";

// Simple in-memory responder controlled by each test
type Responder = () => { status: number; body: any } | Promise<{ status: number; body: any }>;

let server: http.Server;
let io: IOServer;
let currentResponder: Responder;

function setResponder(responder: Responder) {
  currentResponder = responder;
}

function startTestServer(port = 3000) {
  const app = express();
  app.use(express.json());

  // Health endpoint used by checkConnection (if called)
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Primary endpoint used by useSensorHealth
  app.get("/health/sensors", async (_req, res) => {
    try {
      const { status, body } = await currentResponder();
      res.status(status).json(body);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // HTTP + Socket.IO server so WebSocketProvider can connect without mocks
  server = http.createServer(app);
  io = new IOServer(server, {
    cors: { origin: "*" },
  });

  return new Promise<void>((resolve) => {
    server.listen(port, () => resolve());
  });
}

function stopTestServer() {
  return new Promise<void>((resolve) => {
    io.close(() => {
      server.close(() => resolve());
    });
  });
}

function renderWithProviders(ui: React.ReactElement) {
  return render(<WebSocketProvider>{ui}</WebSocketProvider>);
}

describe("SensorHealthPanel (no mocks)", () => {
  beforeAll(async () => {
    // Default responder returns empty sensors list
    setResponder(() => ({ status: 200, body: { data: { sensors: [] } } }));
    await startTestServer(3000);
  });

  afterAll(async () => {
    await stopTestServer();
  });

  afterEach(() => {
    // Reset to empty state by default
    setResponder(() => ({ status: 200, body: { data: { sensors: [] } } }));
  });

  it("should render a loading state initially when no data loaded yet", () => {
    // Keep responder fast; initial render should show loading before first fetch resolves
    renderWithProviders(<SensorHealthPanel />);

    expect(screen.getByText(/Loading sensor data/i)).toBeInTheDocument();
  });

  it("should render empty state when no sensors and not loading after fetch", async () => {
    setResponder(() => ({ status: 200, body: { data: { sensors: [] } } }));

    renderWithProviders(<SensorHealthPanel />);

    expect(await screen.findByText(/No sensor reports received yet/i)).toBeInTheDocument();
  });

  it("should render sensor items with status labels and messages", async () => {
    const sensors: SensorHealthReport[] = [
      {
        sensorName: "Mic",
        status: "healthy",
        message: "All good",
        timestamp: Date.now(),
      },
      {
        sensorName: "Camera",
        status: "degraded",
        message: "Low FPS",
        timestamp: Date.now(),
      },
      {
        sensorName: "Network",
        status: "error",
        message: "Disconnected",
        timestamp: Date.now(),
      },
    ];

    setResponder(() => ({ status: 200, body: { data: { sensors } } }));

    renderWithProviders(<SensorHealthPanel />);

    // Names
    expect(await screen.findByText("Mic")).toBeInTheDocument();
    expect(screen.getByText("Camera")).toBeInTheDocument();
    expect(screen.getByText("Network")).toBeInTheDocument();

    // Status-specific labels
    expect(screen.getByText("Operating normally")).toBeInTheDocument();
    expect(screen.getByText("Performance degraded")).toBeInTheDocument();

    // Messages
    expect(screen.getByText("All good")).toBeInTheDocument();
    expect(screen.getByText("Low FPS")).toBeInTheDocument();
    expect(screen.getByText("Disconnected")).toBeInTheDocument();
  });

  it("should display an error banner when backend returns an error", async () => {
    setResponder(() => ({ status: 500, body: { error: "Internal error" } }));

    renderWithProviders(<SensorHealthPanel />);

    // useSensorHealth sets the error message from thrown error
    expect(await screen.findByText(/Failed to fetch sensor reports/i)).toBeInTheDocument();
  });

  it("should call backend again when clicking refresh button and update UI", async () => {
    // First response: empty -> shows empty state
    setResponder(() => ({ status: 200, body: { data: { sensors: [] } } }));

    renderWithProviders(<SensorHealthPanel />);
    expect(await screen.findByText(/No sensor reports received yet/i)).toBeInTheDocument();

    // Next response: one healthy sensor
    setResponder(() => ({
      status: 200,
      body: {
        data: {
          sensors: [
            {
              sensorName: "Mic",
              status: "healthy",
              message: "Ready",
              timestamp: Date.now(),
            },
          ],
        },
      },
    }));

    const btn = screen.getByRole("button", { name: /Refresh sensors/i });
    fireEvent.click(btn);

    expect(await screen.findByText("Mic")).toBeInTheDocument();
    expect(screen.getByText("Operating normally")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("should render last updated time when provided by hook after fetch", async () => {
    const sensors: SensorHealthReport[] = [
      {
        sensorName: "Clock",
        status: "healthy",
        message: "Tick",
        timestamp: Date.now(),
      },
    ];

    setResponder(() => ({ status: 200, body: { data: { sensors } } }));

    renderWithProviders(<SensorHealthPanel />);

    // After a successful fetch, lastUpdated is set and the label should be visible
    expect(await screen.findByText(/Last refresh:/i)).toBeInTheDocument();
  });
});
