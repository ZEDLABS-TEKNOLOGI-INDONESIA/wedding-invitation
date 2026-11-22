import type { APIRoute } from "astro";
import { getAuthSession } from "../../../lib/auth";
import {
  ensureReminderSchedulerStarted,
  getH1ReminderSummary,
  runH1ReminderBatch,
} from "../../../lib/reminderScheduler";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

export const GET: APIRoute = async ({ cookies }) => {
  const session = getAuthSession(cookies);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  ensureReminderSchedulerStarted();

  try {
    const summary = getH1ReminderSummary(session.weddingId);
    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (err) {
    console.error("Failed to fetch H-1 reminder summary:", err);
    return new Response(
      JSON.stringify({ error: "Gagal memuat ringkasan pengingat H-1." }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
};

export const POST: APIRoute = async ({ cookies }) => {
  const session = getAuthSession(cookies);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  ensureReminderSchedulerStarted();

  try {
    const result = await runH1ReminderBatch({
      force: true,
      weddingId: session.weddingId,
    });
    const summary = getH1ReminderSummary(session.weddingId);
    return new Response(JSON.stringify({ ...result, summary }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (err) {
    console.error("Failed to send H-1 reminders:", err);
    return new Response(
      JSON.stringify({ error: "Gagal mengirim pengingat H-1." }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
};
