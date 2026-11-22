import FileSaver from "file-saver";
import {
  ClipboardPaste,
  FileSpreadsheet,
  FileText,
  Loader2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { buildCsvBlob, type CsvParseResult } from "../../utils/csvImport";

export interface CsvPreviewColumn<T> {
  header: string;
  render: (row: T, index: number) => React.ReactNode;
}

interface CsvImportModalProps<T> {
  isOpen: boolean;
  title: string;
  description: string;
  templateFilename: string;
  templateHeaders: string[];
  templateRows: unknown[][];
  pastePlaceholder: string;
  columns: CsvPreviewColumn<T>[];
  parseText: (text: string) => CsvParseResult<T>;
  onConfirm: (rows: T[]) => Promise<void> | void;
  onClose: () => void;
  confirmLabel?: string;
}

function CsvImportModal<T>({
  isOpen,
  title,
  description,
  templateFilename,
  templateHeaders,
  templateRows,
  pastePlaceholder,
  columns,
  parseText,
  onConfirm,
  onClose,
  confirmLabel = "Import Data",
}: CsvImportModalProps<T>) {
  const [inputMode, setInputMode] = useState<"file" | "paste">("file");
  const [pasteValue, setPasteValue] = useState("");
  const [rows, setRows] = useState<T[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, isSubmitting, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setPasteValue("");
      setRows([]);
      setSkipped(0);
      setWarnings([]);
      setFileName(null);
      setErrorMsg(null);
      setIsDragging(false);
      setInputMode("file");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const applyParsedText = (text: string, sourceFileName?: string) => {
    setErrorMsg(null);
    const parsed = parseText(text);
    setRows(parsed.rows);
    setSkipped(parsed.skipped);
    setWarnings(parsed.warnings);
    if (sourceFileName !== undefined) setFileName(sourceFileName);
    if (parsed.rows.length === 0 && text.trim()) {
      setErrorMsg(
        "Tidak ditemukan baris valid. Periksa kembali format kolom atau gunakan template CSV."
      );
    }
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Ukuran file maksimal 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === "string" ? reader.result : "";
      applyParsedText(content, file.name);
    };
    reader.onerror = () => {
      setErrorMsg("File tidak dapat dibaca. Pastikan berupa file teks/CSV.");
    };
    reader.readAsText(file, "utf-8");
  };

  const handleDownloadTemplate = () => {
    const blob = buildCsvBlob(templateHeaders, templateRows);
    const saveAsFunc = (FileSaver as any).saveAs || FileSaver;
    saveAsFunc(blob, templateFilename);
  };

  const handleConfirm = async () => {
    if (rows.length === 0) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onConfirm(rows);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal mengimpor data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="csv-import-modal-title"
      className="adm-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="adm-modal adm-modal-lg flex max-h-[90vh] flex-col">
        <div className="adm-modal-header">
          <div>
            <h3
              id="csv-import-modal-title"
              className="adm-modal-title flex items-center gap-2"
            >
              <FileSpreadsheet className="h-4 w-4 text-(--adm-accent)" />
              {title}
            </h3>
            <p className="mt-0.5 text-xs text-(--adm-text-secondary)">
              {description}
            </p>
          </div>
          <button
            type="button"
            aria-label="Tutup modal import"
            disabled={isSubmitting}
            onClick={onClose}
            className="adm-btn adm-btn-ghost adm-btn-sm px-1.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="adm-modal-body custom-scrollbar flex-1 space-y-4 overflow-y-auto">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="adm-seg">
              <button
                type="button"
                onClick={() => setInputMode("file")}
                className={`adm-seg-btn ${inputMode === "file" ? "is-active" : ""}`}
              >
                <Upload className="h-3.5 w-3.5" /> Upload File CSV
              </button>
              <button
                type="button"
                onClick={() => setInputMode("paste")}
                className={`adm-seg-btn ${inputMode === "paste" ? "is-active" : ""}`}
              >
                <ClipboardPaste className="h-3.5 w-3.5" /> Tempel dari Excel /
                Teks
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="adm-btn adm-btn-secondary adm-btn-sm"
            >
              <FileText className="h-3.5 w-3.5" /> Download Template CSV
            </button>
          </div>

          {inputMode === "file" ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFile(e.dataTransfer.files?.[0]);
              }}
              className={`rounded-lg border-2 border-dashed p-5 text-center transition-colors ${
                isDragging
                  ? "border-(--adm-accent) bg-(--adm-accent-soft)"
                  : "border-(--adm-border) bg-(--adm-bg-primary)"
              }`}
            >
              <Upload className="mx-auto mb-2 h-7 w-7 text-(--adm-text-muted)" />
              <p className="text-[13px] font-semibold text-(--adm-text-primary)">
                {fileName
                  ? `File dipilih: ${fileName}`
                  : "Seret & lepas file CSV di sini, atau klik tombol di bawah"}
              </p>
              <p className="mt-1 text-xs text-(--adm-text-secondary)">
                Mendukung pemisah koma (<code>,</code>), titik koma Excel (
                <code>;</code>), dan Tab.
              </p>
              <label className="adm-btn adm-btn-primary mt-3.5 cursor-pointer">
                <Upload className="h-3.5 w-3.5" />
                {fileName ? "Ganti File CSV" : "Pilih File CSV"}
                <input
                  type="file"
                  accept=".csv,.txt,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    handleFile(f);
                  }}
                />
              </label>
            </div>
          ) : (
            <div>
              <label htmlFor="csv-paste-area" className="adm-label">
                Salin langsung tabel dari Excel / Google Sheets lalu tempel di
                sini:
              </label>
              <textarea
                id="csv-paste-area"
                rows={5}
                value={pasteValue}
                onChange={(e) => {
                  const val = e.target.value;
                  setPasteValue(val);
                  applyParsedText(val, null as unknown as string);
                }}
                placeholder={pastePlaceholder}
                className="adm-input font-mono text-xs"
              />
            </div>
          )}

          {errorMsg && (
            <div role="alert" className="adm-alert adm-alert-danger text-xs">
              {errorMsg}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="adm-alert adm-alert-warning flex-col items-start text-xs">
              <p className="font-semibold">Catatan ({warnings.length}):</p>
              <ul className="list-disc pl-4">
                {warnings.slice(0, 5).map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
                {warnings.length > 5 && (
                  <li>...dan {warnings.length - 5} catatan lainnya.</li>
                )}
              </ul>
            </div>
          )}

          {rows.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="adm-badge adm-badge-success">
                    {rows.length} baris siap diimpor
                  </span>
                  {skipped > 0 && (
                    <span className="adm-badge adm-badge-warning">
                      {skipped} baris dilewati
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRows([]);
                    setSkipped(0);
                    setWarnings([]);
                    setFileName(null);
                    setPasteValue("");
                  }}
                  className="text-xs font-medium text-(--adm-red) hover:underline"
                >
                  Bersihkan
                </button>
              </div>

              <div className="custom-scrollbar max-h-56 overflow-auto rounded-lg border border-(--adm-border)">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 border-b border-(--adm-border) bg-(--adm-bg-primary) text-(--adm-text-secondary)">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      {columns.map((col, idx) => (
                        <th key={idx} className="px-3 py-2 font-semibold">
                          {col.header}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-right font-semibold">
                        Hapus
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--adm-border)">
                    {rows.slice(0, 100).map((row, idx) => (
                      <tr key={idx} className="hover:bg-(--adm-bg-overlay)">
                        <td className="px-3 py-2 text-(--adm-text-muted) tabular-nums">
                          {idx + 1}
                        </td>
                        {columns.map((col, cIdx) => (
                          <td key={cIdx} className="px-3 py-2">
                            {col.render(row, idx)}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            aria-label={`Hapus baris ${idx + 1}`}
                            onClick={() =>
                              setRows((prev) =>
                                prev.filter((_, i) => i !== idx)
                              )
                            }
                            className="adm-btn-aksi aksi-hapus"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 100 && (
                <p className="text-center text-[11px] text-(--adm-text-muted)">
                  Menampilkan 100 baris pertama dari {rows.length} total baris.
                  Seluruh {rows.length} baris tetap akan diimpor.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="adm-modal-footer">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="adm-btn adm-btn-outline-danger"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isSubmitting || rows.length === 0}
            onClick={handleConfirm}
            className="adm-btn adm-btn-primary"
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {isSubmitting ? "Mengimpor..." : `${confirmLabel} (${rows.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CsvImportModal;
