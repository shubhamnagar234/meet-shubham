/**
 * ============================================================================
 * Meet Shubham — Pronunciation Regression Test Suite
 * ============================================================================
 *
 * Runs automated regression checks for pronunciation normalization.
 */

import { runPronunciationTestSuite } from "../lib/speech/pronunciationTests";

export * from "../lib/speech/pronunciationTests";

if (typeof process !== "undefined" && process.env.RUN_TESTS_STANDALONE === "true") {
  const report = runPronunciationTestSuite();
  console.log(
    `[Pronunciation Audit] Passed: ${report.passed}/${report.total} (${report.passRate})`,
  );
  if (report.failed > 0) {
    const failed = report.results.filter((r) => r.status === "FAIL");
    console.error(
      `[Pronunciation Failures]:`,
      JSON.stringify(failed, null, 2),
    );
    process.exit(1);
  } else {
    console.log(
      `[Pronunciation Success]: All ${report.total} pronunciation tests passed with 100% accuracy.`,
    );
  }
}
