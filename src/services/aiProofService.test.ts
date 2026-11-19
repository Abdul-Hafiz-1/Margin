import { describe, it, expect } from 'vitest';
import { checkOnDeviceHardware, runAIProofOfConcept } from './aiProofService';

describe('Phase 1 — Firebase AI Logic Technical Proof', () => {
  it('correctly audits on-device hardware capabilities', () => {
    const hw = checkOnDeviceHardware();
    expect(hw).toBeDefined();
    expect(typeof hw.hasWindowAI).toBe('boolean');
    expect(typeof hw.hasPromptAPI).toBe('boolean');
    expect(hw.status).toMatch(/supported|unsupported_browser|missing_nano_weights|unavailable/);
  });

  it('initializes and executes structured extraction with accurate execution reporting', async () => {
    const proof = await runAIProofOfConcept();
    expect(proof.initialized).toBe(true);
    expect(proof.structuredRequestSuccess).toBe(true);
    expect(proof.actualExecutionPath).toMatch(/on_device|in_cloud|deterministic_fallback/);
    expect(proof.log).toBeDefined();
    expect(proof.log.status).toMatch(/success|fallback|failed/);
    expect(proof.sampleOutput).toBeDefined();
    expect(proof.sampleOutput.type).toBe('observation');
  });
});
