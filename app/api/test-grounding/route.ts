import { NextRequest, NextResponse } from "next/server";
import { runGroundingSuite } from "@/app/data/groundingAudit";
import { matchFallbackAnswer, UNRECOGNIZED_FALLBACK_MESSAGE } from "@/app/data/fallbackAnswers";

export async function GET(req: NextRequest) {
  try {
    // Run the complete deterministic grounding audit suite
    const suiteReport = runGroundingSuite((question) => {
      const match = matchFallbackAnswer(question);
      return match ? match.answer : UNRECOGNIZED_FALLBACK_MESSAGE;
    });

    const failedTests = suiteReport.results.filter((r) => r.status === "FAIL");

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: suiteReport.total,
        passed: suiteReport.passed,
        failed: suiteReport.failed,
        passRate: suiteReport.passRate,
      },
      failedTests: failedTests.map((f) => ({
        testId: f.testId,
        category: f.category,
        question: f.question,
        actualAnswer: f.actualAnswer,
        explanation: f.failureExplanation,
        severity: f.severity,
      })),
      results: suiteReport.results,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to run test suite", details: errMsg },
      { status: 500 },
    );
  }
}
