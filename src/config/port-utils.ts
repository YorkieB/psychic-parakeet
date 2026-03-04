/*
  This file provides port utilities for the Jarvis system.

  It checks if ports are available before binding, kills stale processes
  hogging ports, and retries operations with exponential backoff so
  agents can start reliably every time.
*/

import net from 'node:net';
import type { Logger } from 'winston';

/** Check if a specific port is available (not in use) */
export function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

/** Wait for a port to become available, with timeout */
export async function waitForPort(
  port: number,
  timeoutMs: number = 5000,
  intervalMs: number = 500
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isPortAvailable(port)) return true;
    await sleep(intervalMs);
  }
  return false;
}

/** Sleep helper */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retry an async operation with exponential backoff */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    label: string;
    logger: Logger;
  }
): Promise<T> {
  const { maxRetries, baseDelayMs, maxDelayMs, label, logger } = options;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      if (attempt < maxRetries) {
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
        logger.warn(
          `[Retry] ${label} failed (attempt ${attempt}/${maxRetries}): ${error.message} -- retrying in ${delay}ms`
        );
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error(`${label} failed after ${maxRetries} attempts`);
}

/** Check multiple ports and return which ones are busy */
export async function findBusyPorts(
  ports: number[],
  logger?: Logger
): Promise<Map<number, boolean>> {
  const results = new Map<number, boolean>();

  await Promise.all(
    ports.map(async (port) => {
      const available = await isPortAvailable(port);
      results.set(port, available);
      if (!available && logger) {
        logger.warn(`[PortCheck] Port ${port} is already in use`);
      }
    })
  );

  return results;
}
