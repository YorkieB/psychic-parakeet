/*
  This file provides the permanent startup configuration for Jarvis services.
  
  It handles service management without PM2 dependency issues and makes sure
  all agents start properly with the correct TypeScript compilation.
*/

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

const PROJECT_ROOT = path.resolve(__dirname);

interface Service {
  name: string;
  command: string;
  args: string[];
  port: number;
  process?: ChildProcess;
  restartCount: number;
  maxRestarts: number;
}

class JarvisServiceManager {
  private services: Service[] = [
    {
      name: 'Main API',
      command: 'npm',
      args: ['run', 'dev:quick'],
      port: 3000,
      restartCount: 0,
      maxRestarts: 5
    },
    {
      name: 'LLM Agent',
      command: 'ts-node',
      args: ['--transpile-only', 'start-llm-agent.ts'],
      port: 3028,
      restartCount: 0,
      maxRestarts: 5
    },
    {
      name: 'Ollama Agent',
      command: 'ts-node',
      args: ['--transpile-only', 'start-ollama-agent.ts'],
      port: 3030,
      restartCount: 0,
      maxRestarts: 5
    }
  ];

  private isShuttingDown = false;

  constructor() {
    this.setupGracefulShutdown();
  }

  private setupGracefulShutdown() {
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  private async startService(service: Service): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`🚀 Starting ${service.name} on port ${service.port}...`);
      
      service.process = spawn(service.command, service.args, {
        cwd: PROJECT_ROOT,
        stdio: 'inherit',
        shell: true
      });

      service.process.on('error', (error) => {
        console.error(`❌ Failed to start ${service.name}:`, error.message);
        reject(error);
      });

      service.process.on('close', (code) => {
        if (!this.isShuttingDown && service.restartCount < service.maxRestarts) {
          service.restartCount++;
          console.log(`🔄 Restarting ${service.name} (attempt ${service.restartCount}/${service.maxRestarts})...`);
          setTimeout(() => this.startService(service), 3000);
        } else if (code !== 0) {
          console.error(`❌ ${service.name} exited with code ${code}`);
        }
      });

      // Wait a moment to see if it starts successfully
      setTimeout(() => {
        if (service.process && !service.process.killed) {
          console.log(`✅ ${service.name} started successfully`);
          resolve();
        } else {
          reject(new Error(`${service.name} failed to start`));
        }
      }, 2000);
    });
  }

  async startAll(): Promise<void> {
    console.log('🎯 Starting Jarvis Services...\n');

    for (const service of this.services) {
      try {
        await this.startService(service);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Stagger starts
      } catch (error) {
        console.error(`Failed to start ${service.name}:`, error);
      }
    }

    console.log('\n🎉 All Jarvis services started!');
    console.log('📊 Service Status:');
    console.log(`   - Main API: http://localhost:3000`);
    console.log(`   - LLM Agent: http://localhost:3028`);
    console.log(`   - Ollama Agent: http://localhost:3030`);
    console.log('\n🛑 Press Ctrl+C to stop all services');
  }

  private async shutdown(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    console.log('\n🛑 Shutting down Jarvis services...');

    for (const service of this.services) {
      if (service.process && !service.process.killed) {
        console.log(`🔄 Stopping ${service.name}...`);
        service.process.kill('SIGTERM');
        
        // Force kill if it doesn't stop gracefully
        setTimeout(() => {
          if (service.process && !service.process.killed) {
            service.process.kill('SIGKILL');
          }
        }, 5000);
      }
    }

    setTimeout(() => {
      console.log('✅ All services stopped');
      process.exit(0);
    }, 6000);
  }
}

// Start the service manager
const manager = new JarvisServiceManager();
manager.startAll().catch(error => {
  console.error('Failed to start services:', error);
  process.exit(1);
});
