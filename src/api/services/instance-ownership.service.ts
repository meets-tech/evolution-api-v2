import { redisClient } from '@cache/rediscache.client';
import { ConfigService, InstanceOwnership } from '@config/env.config';
import { Logger } from '@config/logger.config';
import { randomUUID } from 'crypto';

type OwnerLease = {
  nodeId: string;
  baseUrl: string;
  leaseVersion: string;
};

export class InstanceOwnershipService {
  private readonly logger = new Logger('InstanceOwnershipService');
  private readonly leases = new Map<string, OwnerLease>();
  private readonly renewals = new Map<string, NodeJS.Timeout>();

  constructor(private readonly config: ConfigService) {}

  async acquire(instanceName: string): Promise<boolean> {
    const settings = this.settings();
    if (!settings.ENABLED) return true;
    if (!settings.NODE_ID || !settings.NODE_BASE_URL) {
      throw new Error('Evolution ownership requires EVOLUTION_NODE_ID and EVOLUTION_NODE_BASE_URL');
    }

    const client = await this.connection();
    const lease: OwnerLease = {
      nodeId: settings.NODE_ID,
      baseUrl: settings.NODE_BASE_URL,
      leaseVersion: randomUUID(),
    };
    const acquired = await client.set(this.key(instanceName), JSON.stringify(lease), {
      NX: true,
      PX: settings.LEASE_TTL_MS,
    });
    if (acquired !== 'OK') return false;
    this.leases.set(instanceName, lease);
    return true;
  }

  startRenewal(instanceName: string, onLost: () => Promise<void>): void {
    const settings = this.settings();
    if (!settings.ENABLED || this.renewals.has(instanceName)) return;
    const timer = setInterval(async () => {
      if (await this.renew(instanceName)) return;
      this.stopRenewal(instanceName);
      await onLost();
    }, settings.RENEW_INTERVAL_MS);
    this.renewals.set(instanceName, timer);
  }

  async release(instanceName: string): Promise<void> {
    this.stopRenewal(instanceName);
    const settings = this.settings();
    const lease = this.leases.get(instanceName);
    this.leases.delete(instanceName);
    if (!settings.ENABLED || !lease) return;
    const client = await this.connection();
    await client.eval(
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      { keys: [this.key(instanceName)], arguments: [JSON.stringify(lease)] },
    );
  }

  private async renew(instanceName: string): Promise<boolean> {
    const settings = this.settings();
    const lease = this.leases.get(instanceName);
    if (!lease) return false;
    try {
      const client = await this.connection();
      const result = await client.eval(
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('pexpire', KEYS[1], ARGV[2]) else return 0 end",
        { keys: [this.key(instanceName)], arguments: [JSON.stringify(lease), String(settings.LEASE_TTL_MS)] },
      );
      return result === 1;
    } catch (error) {
      this.logger.error({ action: 'ownership.renew', instanceName, error });
      return false;
    }
  }

  private stopRenewal(instanceName: string): void {
    const timer = this.renewals.get(instanceName);
    if (timer) clearInterval(timer);
    this.renewals.delete(instanceName);
  }

  private settings(): InstanceOwnership {
    return this.config.get<InstanceOwnership>('OWNERSHIP');
  }

  private key(instanceName: string): string {
    return `evolution:owner:${instanceName}`;
  }

  private async connection() {
    const client = redisClient.getConnection();
    if (!client.isOpen) await client.connect();
    return client;
  }
}
