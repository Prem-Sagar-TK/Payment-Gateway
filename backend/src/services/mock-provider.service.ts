import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env';
import { logger } from '../config/logger';
import { MockProviderMode, ProviderChargeResult, ProviderRefundResult } from '../types';

export class MockPaymentProvider {
  private mode: MockProviderMode;
  private latencyMin: number;
  private latencyMax: number;
  private failureRate: number;

  constructor(options?: {
    mode?: MockProviderMode;
    latencyMin?: number;
    latencyMax?: number;
    failureRate?: number;
  }) {
    this.mode = options?.mode ?? config.MOCK_PROVIDER_MODE;
    this.latencyMin = options?.latencyMin ?? config.MOCK_PROVIDER_LATENCY_MIN;
    this.latencyMax = options?.latencyMax ?? config.MOCK_PROVIDER_LATENCY_MAX;
    this.failureRate = options?.failureRate ?? config.MOCK_PROVIDER_FAILURE_RATE;
  }

  setMode(mode: MockProviderMode): void {
    this.mode = mode;
    logger.info('Mock provider mode updated', { mode });
  }

  getMode(): MockProviderMode {
    return this.mode;
  }

  private async simulateLatency(): Promise<void> {
    const ms =
      this.latencyMin +
      Math.floor(Math.random() * (this.latencyMax - this.latencyMin));
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  async createCharge(params: {
    amount: number;
    currency: string;
    customerId: string;
    description?: string;
  }): Promise<ProviderChargeResult> {
    const effectiveMode = this.resolveMode();

    logger.debug('Mock provider: creating charge', {
      customerId: params.customerId,
      amount: params.amount,
      currency: params.currency,
      mode: effectiveMode,
    });

    if (effectiveMode === 'timeout') {

      await new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Provider timeout: request timed out after 30s')), 30_000),
      );
    }

    await this.simulateLatency();

    if (effectiveMode === 'failure') {
      return {
        providerReference: `ch_mock_failed_${uuidv4().slice(0, 8)}`,
        status: 'failed',
        failureReason: 'Your card was declined. (mock)',
      };
    }

    return {
      providerReference: `ch_mock_${uuidv4().slice(0, 12)}`,
      status: 'succeeded',
    };
  }

  async createRefund(params: {
    providerReference: string;
    amount: number;
  }): Promise<ProviderRefundResult> {
    const effectiveMode = this.resolveMode();
    await this.simulateLatency();

    logger.debug('Mock provider: creating refund', {
      providerReference: params.providerReference,
      amount: params.amount,
      mode: effectiveMode,
    });

    if (effectiveMode === 'failure') {
      return {
        refundReference: `re_mock_failed_${uuidv4().slice(0, 8)}`,
        status: 'failed',
      };
    }

    return {
      refundReference: `re_mock_${uuidv4().slice(0, 12)}`,
      status: 'succeeded',
    };
  }

  private resolveMode(): Exclude<MockProviderMode, 'random'> {
    if (this.mode !== 'random') return this.mode;
    return Math.random() < this.failureRate ? 'failure' : 'success';
  }
}

export const mockProvider = new MockPaymentProvider();
