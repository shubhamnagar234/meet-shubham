import { NextRequest, NextResponse } from "next/server";
import { runPronunciationTestSuite } from "@/lib/speech/pronunciationTests";

export async function GET(req: NextRequest) {
  try {
    const report = runPronunciationTestSuite();

    const failedTests = report.results.filter((r) => r.status === "FAIL");

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      summary: {
        total: report.total,
        passed: report.passed,
        failed: report.failed,
        passRate: report.passRate,
      },
      failedTests: failedTests.map((f) => ({
        id: f.id,
        category: f.category,
        description: f.description,
        failureReason: f.failureReason,
        normalized: f.normalized,
      })),
      results: report.results,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Pronunciation test suite error", details: msg },
      { status: 500 },
    );
  }
}
