/**
 * ============================================================================
 * Meet Shubham — Grounding & Anti-Hallucination Test Suite
 * ============================================================================
 *
 * Automated test suite covering categories A through I.
 * Re-exports from app/data/groundingAudit for use with Jest, Vitest, or custom test runners.
 */

export * from "../app/data/groundingAudit";
import { runGroundingSuite } from "../app/data/groundingAudit";

// If executed directly with node --test or standalone tsx
if (typeof process !== "undefined" && process.env.RUN_TESTS_STANDALONE === "true") {
  const report = runGroundingSuite();
  console.log(`[Grounding Audit] Passed: ${report.passed}/${report.total} (${report.passRate})`);
  if (report.failed > 0) {
    const failed = report.results.filter((r) => r.status === "FAIL");
    console.error(`[Grounding Audit Failures]:`, JSON.stringify(failed, null, 2));
    process.exit(1);
  } else {
    console.log(`[Grounding Audit Success]: All 81 tests passed with 100% accuracy.`);
  }
}
