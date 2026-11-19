import { describe, it, expect } from 'vitest';
import { EVAL_DATASET } from './dataset';
import { evaluateRules } from '../services/rulesEngine';
import { runHybridScan } from '../services/hybridAI';

describe('Wary Evaluation Harness (/eval)', () => {
  it('evaluates rules-only and hybrid pipeline against 61 labeled samples', async () => {
    let totalSamples = EVAL_DATASET.length;
    let scamCount = 0;
    let legitCount = 0;
    let borderlineCount = 0;

    let rulesCorrect = 0;
    let rulesFalsePositives = 0;

    let hybridCorrect = 0;
    let hybridFalsePositives = 0;

    const stageDecisions: Record<string, number> = {
      stage0_rules: 0,
      stage1_on_device: 0,
      stage2_cloud_redacted: 0,
    };

    for (const sample of EVAL_DATASET) {
      if (sample.category === 'scam') scamCount++;
      else if (sample.category === 'legitimate') legitCount++;
      else borderlineCount++;

      // 1. Evaluate Stage 0 Rules
      const ruleRes = evaluateRules(sample.text);
      const ruleMatched =
        sample.expectedVerdict === 'Likely scam'
          ? ruleRes.verdict === 'Likely scam'
          : sample.expectedVerdict === 'Suspicious'
            ? ruleRes.verdict === 'Suspicious' || ruleRes.verdict === 'Safe'
            : ruleRes.verdict === 'Safe';

      if (ruleMatched) {
        rulesCorrect++;
      } else {
        console.log(`[Rules Mismatch] ID: ${sample.id} Expected: ${sample.expectedVerdict} Got: ${ruleRes.verdict} Text: "${sample.text}"`);
      }
      if (sample.category === 'legitimate' && ruleRes.verdict === 'Likely scam') {
        rulesFalsePositives++;
        console.warn(`[Rules False Positive] ID: ${sample.id} Text: "${sample.text}"`);
      }

      // 2. Evaluate Hybrid Pipeline (Simulate Offline/Client First)
      const hybridRes = await runHybridScan(sample.text, { simulateOffline: true });
      stageDecisions[hybridRes.stageDecided] = (stageDecisions[hybridRes.stageDecided] || 0) + 1;

      const hybridMatched =
        sample.expectedVerdict === 'Likely scam'
          ? hybridRes.verdict === 'Likely scam'
          : sample.expectedVerdict === 'Suspicious'
            ? hybridRes.verdict === 'Suspicious' || hybridRes.verdict === 'Safe'
            : hybridRes.verdict === 'Safe';

      if (hybridMatched) {
        hybridCorrect++;
      }
      if (sample.category === 'legitimate' && hybridRes.verdict === 'Likely scam') {
        hybridFalsePositives++;
      }
    }

    const rulesAccuracy = ((rulesCorrect / totalSamples) * 100).toFixed(1);
    const rulesFPR = ((rulesFalsePositives / legitCount) * 100).toFixed(1);

    const hybridAccuracy = ((hybridCorrect / totalSamples) * 100).toFixed(1);
    const hybridFPR = ((hybridFalsePositives / legitCount) * 100).toFixed(1);

    const summaryTable = `
========================================================================================
                      WARY HYBRID-AI EVALUATION RESULTS HARNESS
========================================================================================
Dataset Breakdown:
  • Total Evaluated Samples:     ${totalSamples} (Mix of English, Hindi, Kannada)
  • Synthetic Scam Messages:     ${scamCount}
  • Legitimate Daily Messages:   ${legitCount}
  • Tricky Borderline Cases:     ${borderlineCount}

Performance Metrics:
  ┌───────────────────────┬──────────────┬────────────────────────┬────────────────────┐
  │ Pipeline Mode         │ Accuracy     │ False Positive Rate    │ Target Threshold   │
  ├───────────────────────┼──────────────┼────────────────────────┼────────────────────┤
  │ Stage 0 (Rules Only)  │ ${rulesAccuracy.padStart(10)}% │ ${rulesFPR.padStart(20)}% │ < 5.0%             │
  │ Hybrid Pipeline       │ ${hybridAccuracy.padStart(10)}% │ ${hybridFPR.padStart(20)}% │ < 5.0%             │
  └───────────────────────┴──────────────┴────────────────────────┴────────────────────┘

Decision Stages Breakdown:
  • Stage 0 (Deterministic Rules):    ${stageDecisions['stage0_rules']} (${Math.round((stageDecisions['stage0_rules'] / totalSamples) * 100)}%)
  • Stage 1 (On-Device AI):          ${stageDecisions['stage1_on_device']} (${Math.round((stageDecisions['stage1_on_device'] / totalSamples) * 100)}%)
  • Stage 2 (Redacted Cloud Fallback):${stageDecisions['stage2_cloud_redacted']} (${Math.round((stageDecisions['stage2_cloud_redacted'] / totalSamples) * 100)}%)
========================================================================================
`;

    console.log(summaryTable);

    // Quality Bar Assertions
    expect(totalSamples).toBeGreaterThanOrEqual(60);
    expect(Number(rulesAccuracy)).toBeGreaterThanOrEqual(90);
    expect(Number(rulesFPR)).toBeLessThanOrEqual(5.0);
    expect(Number(hybridAccuracy)).toBeGreaterThanOrEqual(90);
    expect(Number(hybridFPR)).toBeLessThanOrEqual(5.0);
  });
});
