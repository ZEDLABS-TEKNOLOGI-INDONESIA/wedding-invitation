import type { APIRoute } from "astro";
import { isAdminAuthenticated } from "../../lib/auth";
import db, { getConfig, setConfig } from "../../lib/db";
import {
  BUDGET_STARTER_TEMPLATE,
  ESSENTIALS_STARTER_TEMPLATE,
  TODO_STARTER_TEMPLATE,
} from "../../utils/plannerData";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

const VALID_RESOURCES = new Set([
  "all",
  "todos",
  "budget",
  "savings",
  "essentials",
  "journal",
]);

function cleanText(val: unknown, maxLen: number, fallback = ""): string {
  if (typeof val !== "string") return fallback;
  const trimmed = val.trim();
  return trimmed ? trimmed.slice(0, maxLen) : fallback;
}

function cleanInt(val: unknown, min = 0, max = 10_000_000_000): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function cleanDate(val: unknown, fallback = ""): string {
  if (typeof val !== "string") return fallback;
  const trimmed = val.trim();
  if (!trimmed) return fallback;
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : fallback;
}

function cleanPhone(val: unknown): string {
  if (typeof val !== "string") return "";
  return val.replace(/[^0-9+\-\s]/g, "").trim().slice(0, 25);
}

function hasNegativeValue(...values: unknown[]): boolean {
  return values.some((v) => {
    if (v === undefined || v === null || v === "") return false;
    const n = Number(v);
    return Number.isFinite(n) && n < 0;
  });
}

function getIdempotencyKey(
  request: Request,
  body: Record<string, unknown>
): string {
  const fromHeader = request.headers.get("x-idempotency-key") || "";
  const fromBody =
    typeof body.idempotencyKey === "string" ? body.idempotencyKey : "";
  const raw = (fromHeader || fromBody).trim();
  if (!raw || raw.length > 128) return "";
  return raw;
}

function findIdempotentResponse(key: string): string | null {
  if (!key) return null;
  const row = db
    .prepare(
      "SELECT response_json FROM planner_idempotency WHERE idempotency_key = ? LIMIT 1"
    )
    .get(key) as { response_json: string } | undefined;
  return row ? row.response_json : null;
}

function saveIdempotentResponse(
  key: string,
  resource: string,
  payload: Record<string, unknown>,
  nowIso: string
): void {
  if (!key) return;
  try {
    db.prepare(
      `INSERT OR IGNORE INTO planner_idempotency (idempotency_key, resource, response_json, created_at)
       VALUES (?, ?, ?, ?)`
    ).run(key, resource, JSON.stringify({ ...payload, deduplicated: true }), nowIso);
    // Bersihkan kunci idempotency lebih dari 24 jam agar tabel tetap ringan
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    db.prepare("DELETE FROM planner_idempotency WHERE created_at < ?").run(
      cutoff
    );
  } catch {
    // Abaikan kegagalan non-kritis penyimpanan cache idempotency
  }
}

function fetchAllPlannerData() {
  const cfg = getConfig();
  return {
    todos: db
      .prepare("SELECT * FROM planner_todos ORDER BY done ASC, id ASC")
      .all(),
    budget: db
      .prepare("SELECT * FROM planner_budget ORDER BY id ASC")
      .all(),
    savings: db
      .prepare(
        "SELECT * FROM planner_savings ORDER BY entry_date DESC, id DESC"
      )
      .all(),
    essentials: db
      .prepare("SELECT * FROM planner_essentials ORDER BY kind ASC, id ASC")
      .all(),
    journal: db
      .prepare(
        "SELECT * FROM planner_journal ORDER BY entry_date DESC, id DESC"
      )
      .all(),
    savingsTarget: cleanInt(cfg.PLANNER_SAVINGS_TARGET || 50_000_000, 0),
    weddingDateIso: cfg.AKAD_ISO_START || cfg.RESEPSI_ISO_START || "",
  };
}

export const GET: APIRoute = async ({ cookies, url }) => {
  if (!isAdminAuthenticated(cookies)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  try {
    const resource = url.searchParams.get("resource") || "all";
    if (!VALID_RESOURCES.has(resource)) {
      return new Response(
        JSON.stringify({ error: "Parameter resource tidak valid." }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const all = fetchAllPlannerData();
    if (resource === "all") {
      return new Response(JSON.stringify(all), {
        status: 200,
        headers: JSON_HEADERS,
      });
    }
    return new Response(
      JSON.stringify(all[resource as keyof typeof all]),
      { status: 200, headers: JSON_HEADERS }
    );
  } catch (err) {
    console.error("Planner GET error:", err);
    return new Response(
      JSON.stringify({ error: "Gagal memuat data manajemen pernikahan." }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isAdminAuthenticated(cookies)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "create";
    const resource = typeof body.resource === "string" ? body.resource : "";
    const nowIso = new Date().toISOString();
    const idempotencyKey = getIdempotencyKey(request, body);

    if (idempotencyKey) {
      const cached = findIdempotentResponse(idempotencyKey);
      if (cached) {
        return new Response(cached, { status: 200, headers: JSON_HEADERS });
      }
    }

    if (action === "set_target") {
      const target = cleanInt(body.target, 0);
      setConfig("PLANNER_SAVINGS_TARGET", String(target));
      return new Response(JSON.stringify({ success: true, target }), {
        status: 200,
        headers: JSON_HEADERS,
      });
    }

    if (action === "seed") {
      let insertedCount = 0;
      let skippedCount = 0;
      if (resource === "todos") {
        const existingRows = db
          .prepare("SELECT LOWER(title) AS key FROM planner_todos")
          .all() as Array<{ key: string }>;
        const existing = new Set(existingRows.map((r) => r.key));
        const stmt = db.prepare(
          `INSERT INTO planner_todos (title, phase, category, due_date, pic, done, notes, created_at)
           VALUES (?, ?, ?, '', ?, 0, ?, ?)`
        );
        const tx = db.transaction(() => {
          for (const item of TODO_STARTER_TEMPLATE) {
            if (existing.has(item.title.toLowerCase())) {
              skippedCount++;
              continue;
            }
            stmt.run(
              item.title,
              item.phase,
              item.category,
              item.pic,
              item.notes,
              nowIso
            );
            insertedCount++;
          }
        });
        tx();
      } else if (resource === "budget") {
        const existingRows = db
          .prepare("SELECT LOWER(name) AS key FROM planner_budget")
          .all() as Array<{ key: string }>;
        const existing = new Set(existingRows.map((r) => r.key));
        const stmt = db.prepare(
          `INSERT INTO planner_budget (name, category, estimated_cost, actual_cost, paid_amount, payment_status, vendor_phone, due_date, notes, created_at)
           VALUES (?, ?, ?, 0, 0, 'belum', '', '', ?, ?)`
        );
        const tx = db.transaction(() => {
          for (const item of BUDGET_STARTER_TEMPLATE) {
            if (existing.has(item.name.toLowerCase())) {
              skippedCount++;
              continue;
            }
            stmt.run(
              item.name,
              item.category,
              item.estimated_cost,
              item.notes,
              nowIso
            );
            insertedCount++;
          }
        });
        tx();
      } else if (resource === "essentials") {
        const existingRows = db
          .prepare("SELECT LOWER(title) AS key FROM planner_essentials")
          .all() as Array<{ key: string }>;
        const existing = new Set(existingRows.map((r) => r.key));
        const stmt = db.prepare(
          `INSERT INTO planner_essentials (kind, title, price, status, owner, done_groom, done_bride, notes, created_at)
           VALUES (?, ?, ?, 'rencana', ?, 0, 0, ?, ?)`
        );
        const tx = db.transaction(() => {
          for (const item of ESSENTIALS_STARTER_TEMPLATE) {
            if (existing.has(item.title.toLowerCase())) {
              skippedCount++;
              continue;
            }
            stmt.run(
              item.kind,
              item.title,
              item.price,
              item.owner,
              item.notes,
              nowIso
            );
            insertedCount++;
          }
        });
        tx();
      } else {
        return new Response(
          JSON.stringify({ error: "Template untuk resource ini tidak tersedia." }),
          { status: 400, headers: JSON_HEADERS }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          count: insertedCount,
          skipped: skippedCount,
        }),
        { status: 200, headers: JSON_HEADERS }
      );
    }

    if (resource === "todos") {
      const title = cleanText(body.title, 200);
      if (!title) {
        return new Response(
          JSON.stringify({ error: "Judul tugas wajib diisi." }),
          { status: 400, headers: JSON_HEADERS }
        );
      }
      const phase = cleanText(body.phase, 40, "H-3 Bulan");
      const dupTodo = db
        .prepare(
          "SELECT id FROM planner_todos WHERE LOWER(title) = LOWER(?) AND LOWER(phase) = LOWER(?) LIMIT 1"
        )
        .get(title, phase);
      if (dupTodo) {
        return new Response(
          JSON.stringify({
            error: "Tugas dengan judul dan fase yang sama sudah terdaftar.",
          }),
          { status: 409, headers: JSON_HEADERS }
        );
      }
      const res = db
        .prepare(
          `INSERT INTO planner_todos (title, phase, category, due_date, pic, done, notes, created_at)
           VALUES (?, ?, ?, ?, ?, 0, ?, ?)`
        )
        .run(
          title,
          phase,
          cleanText(body.category, 60, "Umum"),
          cleanDate(body.due_date, ""),
          cleanText(body.pic, 60, "Bersama"),
          cleanText(body.notes, 500, ""),
          nowIso
        );
      const item = db
        .prepare("SELECT * FROM planner_todos WHERE id = ?")
        .get(Number(res.lastInsertRowid));
      const payload = { success: true, item };
      saveIdempotentResponse(idempotencyKey, "todos", payload, nowIso);
      return new Response(JSON.stringify(payload), {
        status: 201,
        headers: JSON_HEADERS,
      });
    }

    if (resource === "budget") {
      const name = cleanText(body.name, 160);
      if (!name) {
        return new Response(
          JSON.stringify({ error: "Nama pos anggaran / vendor wajib diisi." }),
          { status: 400, headers: JSON_HEADERS }
        );
      }
      if (
        hasNegativeValue(
          body.estimated_cost,
          body.actual_cost,
          body.paid_amount
        )
      ) {
        return new Response(
          JSON.stringify({ error: "Nominal harga atau pembayaran tidak boleh negatif." }),
          { status: 400, headers: JSON_HEADERS }
        );
      }
      const category = cleanText(body.category, 60, "Lainnya");
      const dupBudget = db
        .prepare(
          "SELECT id FROM planner_budget WHERE LOWER(name) = LOWER(?) AND LOWER(category) = LOWER(?) LIMIT 1"
        )
        .get(name, category);
      if (dupBudget) {
        return new Response(
          JSON.stringify({
            error: "Pos anggaran / vendor dengan nama dan kategori yang sama sudah ada.",
          }),
          { status: 409, headers: JSON_HEADERS }
        );
      }
      const status = ["belum", "dp", "cicilan", "lunas"].includes(
        String(body.payment_status)
      )
        ? String(body.payment_status)
        : "belum";
      const res = db
        .prepare(
          `INSERT INTO planner_budget (name, category, estimated_cost, actual_cost, paid_amount, payment_status, vendor_phone, due_date, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          name,
          category,
          cleanInt(body.estimated_cost, 0),
          cleanInt(body.actual_cost, 0),
          cleanInt(body.paid_amount, 0),
          status,
          cleanPhone(body.vendor_phone),
          cleanDate(body.due_date, ""),
          cleanText(body.notes, 500, ""),
          nowIso
        );
      const item = db
        .prepare("SELECT * FROM planner_budget WHERE id = ?")
        .get(Number(res.lastInsertRowid));
      const payload = { success: true, item };
      saveIdempotentResponse(idempotencyKey, "budget", payload, nowIso);
      return new Response(JSON.stringify(payload), {
        status: 201,
        headers: JSON_HEADERS,
      });
    }

    if (resource === "savings") {
      const amount = cleanInt(body.amount, 0);
      if (amount <= 0) {
        return new Response(
          JSON.stringify({ error: "Nominal tabungan harus lebih dari 0." }),
          { status: 400, headers: JSON_HEADERS }
        );
      }
      const entryType = body.entry_type === "tarik" ? "tarik" : "setor";
      const entryDate = cleanDate(body.entry_date, nowIso.slice(0, 10));
      const contributor = cleanText(body.contributor, 60, "Bersama");
      const note = cleanText(body.note, 300, "");
      const recentCutoff = new Date(Date.now() - 10_000).toISOString();
      const recentDup = db
        .prepare(
          `SELECT * FROM planner_savings
           WHERE entry_date = ? AND contributor = ? AND entry_type = ? AND amount = ? AND LOWER(note) = LOWER(?) AND created_at >= ?
           LIMIT 1`
        )
        .get(entryDate, contributor, entryType, amount, note, recentCutoff);
      if (recentDup) {
        return new Response(
          JSON.stringify({ success: true, item: recentDup, deduplicated: true }),
          { status: 200, headers: JSON_HEADERS }
        );
      }
      const res = db
        .prepare(
          `INSERT INTO planner_savings (entry_date, contributor, entry_type, amount, note, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(entryDate, contributor, entryType, amount, note, nowIso);
      const item = db
        .prepare("SELECT * FROM planner_savings WHERE id = ?")
        .get(Number(res.lastInsertRowid));
      const payload = { success: true, item };
      saveIdempotentResponse(idempotencyKey, "savings", payload, nowIso);
      return new Response(JSON.stringify(payload), {
        status: 201,
        headers: JSON_HEADERS,
      });
    }

    if (resource === "essentials") {
      const title = cleanText(body.title, 200);
      if (!title) {
        return new Response(
          JSON.stringify({ error: "Nama item wajib diisi." }),
          { status: 400, headers: JSON_HEADERS }
        );
      }
      if (hasNegativeValue(body.price)) {
        return new Response(
          JSON.stringify({ error: "Perkiraan harga tidak boleh negatif." }),
          { status: 400, headers: JSON_HEADERS }
        );
      }
      const kind = ["mahar", "seserahan", "kua"].includes(String(body.kind))
        ? String(body.kind)
        : "seserahan";
      const dupEssential = db
        .prepare(
          "SELECT id FROM planner_essentials WHERE kind = ? AND LOWER(title) = LOWER(?) LIMIT 1"
        )
        .get(kind, title);
      if (dupEssential) {
        return new Response(
          JSON.stringify({
            error: "Item dengan nama yang sama sudah ada pada daftar ini.",
          }),
          { status: 409, headers: JSON_HEADERS }
        );
      }
      const status = ["rencana", "dibeli", "siap"].includes(String(body.status))
        ? String(body.status)
        : "rencana";
      const res = db
        .prepare(
          `INSERT INTO planner_essentials (kind, title, price, status, owner, done_groom, done_bride, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          kind,
          title,
          cleanInt(body.price, 0),
          status,
          cleanText(body.owner, 60, "Bersama"),
          body.done_groom ? 1 : 0,
          body.done_bride ? 1 : 0,
          cleanText(body.notes, 500, ""),
          nowIso
        );
      const item = db
        .prepare("SELECT * FROM planner_essentials WHERE id = ?")
        .get(Number(res.lastInsertRowid));
      const payload = { success: true, item };
      saveIdempotentResponse(idempotencyKey, "essentials", payload, nowIso);
      return new Response(JSON.stringify(payload), {
        status: 201,
        headers: JSON_HEADERS,
      });
    }

    if (resource === "journal") {
      const title = cleanText(body.title, 180);
      const content = cleanText(body.content, 4000);
      if (!title || !content) {
        return new Response(
          JSON.stringify({ error: "Judul dan isi jurnal wajib diisi." }),
          { status: 400, headers: JSON_HEADERS }
        );
      }
      const mood = [
        "bersyukur",
        "bahagia",
        "haru",
        "reflektif",
        "bersemangat",
      ].includes(String(body.mood))
        ? String(body.mood)
        : "bersyukur";
      const entryDate = cleanDate(body.entry_date, nowIso.slice(0, 10));
      const dupJournal = db
        .prepare(
          "SELECT id FROM planner_journal WHERE entry_date = ? AND LOWER(title) = LOWER(?) LIMIT 1"
        )
        .get(entryDate, title);
      if (dupJournal) {
        return new Response(
          JSON.stringify({
            error: "Catatan jurnal dengan judul dan tanggal yang sama sudah ada.",
          }),
          { status: 409, headers: JSON_HEADERS }
        );
      }
      const res = db
        .prepare(
          `INSERT INTO planner_journal (entry_date, author, mood, title, content, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(
          entryDate,
          cleanText(body.author, 60, "Bersama"),
          mood,
          title,
          content,
          nowIso
        );
      const item = db
        .prepare("SELECT * FROM planner_journal WHERE id = ?")
        .get(Number(res.lastInsertRowid));
      const payload = { success: true, item };
      saveIdempotentResponse(idempotencyKey, "journal", payload, nowIso);
      return new Response(JSON.stringify(payload), {
        status: 201,
        headers: JSON_HEADERS,
      });
    }

    return new Response(JSON.stringify({ error: "Resource tidak dikenali." }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  } catch (err) {
    console.error("Planner POST error:", err);
    return new Response(
      JSON.stringify({ error: "Gagal menyimpan data manajemen pernikahan." }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  if (!isAdminAuthenticated(cookies)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const resource = typeof body.resource === "string" ? body.resource : "";
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) {
      return new Response(JSON.stringify({ error: "ID tidak valid." }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }

    if (resource === "todos") {
      if (body.toggleDone !== undefined) {
        db.prepare("UPDATE planner_todos SET done = ? WHERE id = ?").run(
          body.toggleDone ? 1 : 0,
          id
        );
      } else {
        const title = cleanText(body.title, 200);
        if (!title) {
          return new Response(
            JSON.stringify({ error: "Judul tugas wajib diisi." }),
            { status: 400, headers: JSON_HEADERS }
          );
        }
        db.prepare(
          `UPDATE planner_todos
           SET title = ?, phase = ?, category = ?, due_date = ?, pic = ?, done = ?, notes = ?
           WHERE id = ?`
        ).run(
          title,
          cleanText(body.phase, 40, "H-3 Bulan"),
          cleanText(body.category, 60, "Umum"),
          cleanText(body.due_date, 30, ""),
          cleanText(body.pic, 60, "Bersama"),
          body.done ? 1 : 0,
          cleanText(body.notes, 500, ""),
          id
        );
      }
      const item = db
        .prepare("SELECT * FROM planner_todos WHERE id = ?")
        .get(id);
      return new Response(JSON.stringify({ success: true, item }), {
        status: 200,
        headers: JSON_HEADERS,
      });
    }

    if (resource === "budget") {
      const name = cleanText(body.name, 160);
      if (!name) {
        return new Response(
          JSON.stringify({ error: "Nama pos wajib diisi." }),
          { status: 400, headers: JSON_HEADERS }
        );
      }
      const status = ["belum", "dp", "cicilan", "lunas"].includes(
        String(body.payment_status)
      )
        ? String(body.payment_status)
        : "belum";
      db.prepare(
        `UPDATE planner_budget
         SET name = ?, category = ?, estimated_cost = ?, actual_cost = ?, paid_amount = ?, payment_status = ?, vendor_phone = ?, due_date = ?, notes = ?
         WHERE id = ?`
      ).run(
        name,
        cleanText(body.category, 60, "Lainnya"),
        cleanInt(body.estimated_cost, 0),
        cleanInt(body.actual_cost, 0),
        cleanInt(body.paid_amount, 0),
        status,
        cleanText(body.vendor_phone, 30, ""),
        cleanText(body.due_date, 30, ""),
        cleanText(body.notes, 500, ""),
        id
      );
      const item = db
        .prepare("SELECT * FROM planner_budget WHERE id = ?")
        .get(id);
      return new Response(JSON.stringify({ success: true, item }), {
        status: 200,
        headers: JSON_HEADERS,
      });
    }

    if (resource === "essentials") {
      if (body.patchToggle === "groom") {
        db.prepare(
          "UPDATE planner_essentials SET done_groom = ? WHERE id = ?"
        ).run(body.value ? 1 : 0, id);
      } else if (body.patchToggle === "bride") {
        db.prepare(
          "UPDATE planner_essentials SET done_bride = ? WHERE id = ?"
        ).run(body.value ? 1 : 0, id);
      } else if (body.patchStatus) {
        const status = ["rencana", "dibeli", "siap"].includes(
          String(body.patchStatus)
        )
          ? String(body.patchStatus)
          : "rencana";
        db.prepare("UPDATE planner_essentials SET status = ? WHERE id = ?").run(
          status,
          id
        );
      } else {
        const title = cleanText(body.title, 200);
        if (!title) {
          return new Response(
            JSON.stringify({ error: "Nama item wajib diisi." }),
            { status: 400, headers: JSON_HEADERS }
          );
        }
        const status = ["rencana", "dibeli", "siap"].includes(
          String(body.status)
        )
          ? String(body.status)
          : "rencana";
        db.prepare(
          `UPDATE planner_essentials
           SET title = ?, price = ?, status = ?, owner = ?, done_groom = ?, done_bride = ?, notes = ?
           WHERE id = ?`
        ).run(
          title,
          cleanInt(body.price, 0),
          status,
          cleanText(body.owner, 60, "Bersama"),
          body.done_groom ? 1 : 0,
          body.done_bride ? 1 : 0,
          cleanText(body.notes, 500, ""),
          id
        );
      }
      const item = db
        .prepare("SELECT * FROM planner_essentials WHERE id = ?")
        .get(id);
      return new Response(JSON.stringify({ success: true, item }), {
        status: 200,
        headers: JSON_HEADERS,
      });
    }

    if (resource === "savings") {
      const amount = cleanInt(body.amount, 0);
      if (amount <= 0) {
        return new Response(
          JSON.stringify({ error: "Nominal tabungan harus lebih dari 0." }),
          { status: 400, headers: JSON_HEADERS }
        );
      }
      const entryType = body.entry_type === "tarik" ? "tarik" : "setor";
      const entryDate = cleanDate(
        body.entry_date,
        new Date().toISOString().slice(0, 10)
      );
      const result = db
        .prepare(
          `UPDATE planner_savings
           SET entry_date = ?, contributor = ?, entry_type = ?, amount = ?, note = ?
           WHERE id = ?`
        )
        .run(
          entryDate,
          cleanText(body.contributor, 60, "Bersama"),
          entryType,
          amount,
          cleanText(body.note, 300, ""),
          id
        );
      if (result.changes === 0) {
        return new Response(
          JSON.stringify({ error: "Catatan tabungan tidak ditemukan." }),
          { status: 404, headers: JSON_HEADERS }
        );
      }
      const item = db
        .prepare("SELECT * FROM planner_savings WHERE id = ?")
        .get(id);
      return new Response(JSON.stringify({ success: true, item }), {
        status: 200,
        headers: JSON_HEADERS,
      });
    }

    if (resource === "journal") {
      const title = cleanText(body.title, 180);
      const content = cleanText(body.content, 4000);
      if (!title || !content) {
        return new Response(
          JSON.stringify({ error: "Judul dan isi jurnal wajib diisi." }),
          { status: 400, headers: JSON_HEADERS }
        );
      }
      const mood = [
        "bersyukur",
        "bahagia",
        "haru",
        "reflektif",
        "bersemangat",
      ].includes(String(body.mood))
        ? String(body.mood)
        : "bersyukur";
      db.prepare(
        `UPDATE planner_journal
         SET entry_date = ?, author = ?, mood = ?, title = ?, content = ?
         WHERE id = ?`
      ).run(
        cleanText(body.entry_date, 20, new Date().toISOString().slice(0, 10)),
        cleanText(body.author, 60, "Bersama"),
        mood,
        title,
        content,
        id
      );
      const item = db
        .prepare("SELECT * FROM planner_journal WHERE id = ?")
        .get(id);
      return new Response(JSON.stringify({ success: true, item }), {
        status: 200,
        headers: JSON_HEADERS,
      });
    }

    return new Response(JSON.stringify({ error: "Resource tidak dikenali." }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  } catch (err) {
    console.error("Planner PUT error:", err);
    return new Response(
      JSON.stringify({ error: "Gagal memperbarui data." }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
};

const TABLE_BY_RESOURCE: Record<string, string> = {
  todos: "planner_todos",
  budget: "planner_budget",
  savings: "planner_savings",
  essentials: "planner_essentials",
  journal: "planner_journal",
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  if (!isAdminAuthenticated(cookies)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  try {
    const body = (await request.json()) as {
      resource?: string;
      id?: number;
    };
    const table = TABLE_BY_RESOURCE[body.resource || ""];
    const id = Number(body.id);
    if (!table || !Number.isInteger(id) || id <= 0) {
      return new Response(
        JSON.stringify({ error: "Parameter hapus tidak valid." }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (err) {
    console.error("Planner DELETE error:", err);
    return new Response(
      JSON.stringify({ error: "Gagal menghapus data." }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
};
