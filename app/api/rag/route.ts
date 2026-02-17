import { NextRequest, NextResponse } from "next/server";
import { QueryRAG } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const { query, thread_id: threadId } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const result = await QueryRAG(query, threadId);

    return NextResponse.json({
      answer: result.answer,
      context: result.context,
      threadId: result.threadId,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
