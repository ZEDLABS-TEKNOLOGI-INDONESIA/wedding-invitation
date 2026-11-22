import db, { DEFAULT_WEDDING_ID, getConfig } from "./db";
import {
  getWaCredentials,
  isEligibleForH1Reminder,
  isWithinH1ReminderWindow,
  normalizeWaPhone,
  sendGuestH1ReminderWa,
} from "./whatsapp";

interface RsvpReminderRow {
  id: number;
  guest_name: string;
  phone: string | null;
  attendance: string | null;
  guest_count: number | null;
  reminder_sent_at: string | null;
}

export interface H1ReminderSummary {
  eligibleTotal: number;
  pendingCount: number;
  sentCount: number;
  hadirPendingCount: number;
  raguPendingCount: number;
  excludedTidakHadirCount: number;
  autoEnabled: boolean;
  inH1Window: boolean;
  gatewayConfigured: boolean;
  eventIsoStart: string;
}

export interface H1ReminderBatchResult {
  totalPending: number;
  sent: number;
  failed: number;
  skippedReason?: string;
  errors: string[];
}

export const getH1ReminderSummary = (
  weddingId: number = DEFAULT_WEDDING_ID
): H1ReminderSummary => {
  const config = getConfig(weddingId);
  const rows = db
    .prepare(
      "SELECT id, guest_name, phone, attendance, guest_count, reminder_sent_at FROM rsvps WHERE wedding_id = ?"
    )
    .all(weddingId) as RsvpReminderRow[];

  let eligibleTotal = 0;
  let pendingCount = 0;
  let sentCount = 0;
  let hadirPendingCount = 0;
  let raguPendingCount = 0;
  let excludedTidakHadirCount = 0;

  for (const row of rows) {
    const status = (row.attendance || "").trim().toLowerCase();
    const hasPhone = normalizeWaPhone(row.phone || "") !== "";

    if (status === "tidak_hadir") {
      if (hasPhone) excludedTidakHadirCount += 1;
      continue;
    }

    if ((status === "hadir" || status === "ragu") && hasPhone) {
      eligibleTotal += 1;
      if ((row.reminder_sent_at || "").trim() !== "") {
        sentCount += 1;
      } else {
        pendingCount += 1;
        if (status === "hadir") hadirPendingCount += 1;
        if (status === "ragu") raguPendingCount += 1;
      }
    }
  }

  return {
    eligibleTotal,
    pendingCount,
    sentCount,
    hadirPendingCount,
    raguPendingCount,
    excludedTidakHadirCount,
    autoEnabled: (config.WA_AUTO_REMINDER_H1 ?? "true") === "true",
    inH1Window: isWithinH1ReminderWindow(config.AKAD_ISO_START),
    gatewayConfigured: getWaCredentials(config) !== null,
    eventIsoStart: config.AKAD_ISO_START || "",
  };
};

let batchInFlight = false;

export const runH1ReminderBatch = async (options?: {
  force?: boolean;
  weddingId?: number;
}): Promise<H1ReminderBatchResult> => {
  const weddingId = options?.weddingId ?? DEFAULT_WEDDING_ID;
  if (batchInFlight) {
    return {
      totalPending: 0,
      sent: 0,
      failed: 0,
      skippedReason: "Pengiriman pengingat H-1 sedang berlangsung.",
      errors: [],
    };
  }

  const config = getConfig(weddingId);
  if (!getWaCredentials(config)) {
    return {
      totalPending: 0,
      sent: 0,
      failed: 0,
      skippedReason: "WhatsApp Gateway belum terkonfigurasi.",
      errors: [],
    };
  }

  if (!options?.force) {
    if ((config.WA_AUTO_REMINDER_H1 ?? "true") !== "true") {
      return {
        totalPending: 0,
        sent: 0,
        failed: 0,
        skippedReason: "Pengingat otomatis H-1 dinonaktifkan.",
        errors: [],
      };
    }
    if (!isWithinH1ReminderWindow(config.AKAD_ISO_START)) {
      return {
        totalPending: 0,
        sent: 0,
        failed: 0,
        skippedReason: "Belum memasuki rentang waktu H-1 acara.",
        errors: [],
      };
    }
  }

  const rows = db
    .prepare(
      "SELECT id, guest_name, phone, attendance, guest_count, reminder_sent_at FROM rsvps WHERE wedding_id = ? AND attendance IN ('hadir', 'ragu') AND TRIM(COALESCE(phone, '')) != '' AND TRIM(COALESCE(reminder_sent_at, '')) = ''"
    )
    .all(weddingId) as RsvpReminderRow[];

  const targets = rows.filter((row) => isEligibleForH1Reminder(row));
  if (targets.length === 0) {
    return {
      totalPending: 0,
      sent: 0,
      failed: 0,
      skippedReason: "Tidak ada tamu (Hadir/Ragu) yang menunggu pengingat H-1.",
      errors: [],
    };
  }

  batchInFlight = true;
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  const markSent = db.prepare(
    "UPDATE rsvps SET reminder_sent_at = ? WHERE id = ?"
  );

  try {
    for (const rsvp of targets) {
      const res = await sendGuestH1ReminderWa(config, {
        id: rsvp.id,
        guest_name: rsvp.guest_name,
        phone: rsvp.phone || "",
        attendance: rsvp.attendance || "hadir",
      });
      if (res.sent) {
        markSent.run(new Date().toISOString(), rsvp.id);
        sent += 1;
      } else {
        failed += 1;
        if (res.error) errors.push(`${rsvp.guest_name}: ${res.error}`);
      }
    }
  } finally {
    batchInFlight = false;
  }

  return {
    totalPending: targets.length,
    sent,
    failed,
    errors: errors.slice(0, 5),
  };
};

const SCHEDULER_KEY = "__wedding_h1_reminder_scheduler_started__";

export const ensureReminderSchedulerStarted = (): void => {
  const g = globalThis as Record<string, unknown>;
  if (g[SCHEDULER_KEY]) return;
  g[SCHEDULER_KEY] = true;

  const FIFTEEN_MINUTES = 15 * 60 * 1000;
  const timer = setInterval(() => {
    void (async () => {
      const activeWeddings = db
        .prepare("SELECT id FROM weddings WHERE status = 'active'")
        .all() as Array<{ id: number }>;
      for (const w of activeWeddings) {
        await runH1ReminderBatch({ weddingId: w.id });
      }
    })().catch((err) => {
      console.error("H-1 reminder scheduler error:", err);
    });
  }, FIFTEEN_MINUTES);

  if (typeof timer.unref === "function") {
    timer.unref();
  }
};
