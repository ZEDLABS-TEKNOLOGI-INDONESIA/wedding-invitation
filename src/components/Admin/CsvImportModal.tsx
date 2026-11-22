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
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal mengimpor data."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="csv-import-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 dark:border-slate-700">
          <div>
            <h3
              id="csv-import-modal-title"
              className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white"
            >
              <FileSpreadsheet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              {title}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </div>
          <button
            type="button"
            aria-label="Tutup modal import"
            disabled={isSubmitting}
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto p-6">
          {/* Switcher & Template */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setInputMode("file")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                  inputMode === "file"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <Upload className="h-3.5 w-3.5" /> Upload File CSV
              </button>
              <button
                type="button"
                onClick={() => setInputMode("paste")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                  inputMode === "paste"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <ClipboardPaste className="h-3.5 w-3.5" /> Tempel dari Excel / Teks
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
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
              className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
                isDragging
                  ? "border-blue-500 bg-blue-50/70 dark:bg-blue-900/20"
                  : "border-slate-300 bg-slate-50/70 dark:border-slate-600 dark:bg-slate-900/40"
              }`}
            >
              <Upload className="mx-auto mb-2 h-8 w-8 text-slate-400" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {fileName
                  ? `File dipilih: ${fileName}`
                  : "Seret & lepas file CSV di sini, atau klik tombol di bawah"}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Mendukung pemisah koma (<code>,</code>), titik koma Excel (
                <code>;</code>), dan Tab.
              </p>
              <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700">
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
            <div className="space-y-2">
              <label
                htmlFor="csv-paste-area"
                className="block text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                Salin langsung tabel dari Excel / Google Sheets lalu tempel di sini:
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
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 font-mono text-xs outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400"
            >
              {errorMsg}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
              <p className="font-bold">Catatan ({warnings.length}):</p>
              <ul className="mt-1 list-disc pl-4">
                {warnings.slice(0, 5).map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
                {warnings.length > 5 && (
                  <li>...dan {warnings.length - 5} catatan lainnya.</li>
                )}
              </ul>
            </div>
          )}

          {/* Preview */}
          {rows.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-green-100 px-3 py-1 font-bold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                    {rows.length} baris siap diimpor
                  </span>
                  {skipped > 0 && (
                    <span className="rounded-full bg-amber-100 px-3 py-1 font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
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
                  className="text-xs font-bold text-red-600 hover:underline dark:text-red-400"
                >
                  Bersihkan
                </button>
              </div>

              <div className="custom-scrollbar max-h-60 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-slate-500 uppercase dark:bg-slate-900 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-2.5">#</th>
                      {columns.map((col, idx) => (
                        <th key={idx} className="px-3 py-2.5">
                          {col.header}
                        </th>
                      ))}
                      <th className="px-3 py-2.5 text-right">Hapus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {rows.slice(0, 100).map((row, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/40"
                      >
                        <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
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
                            className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
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
                <p className="text-center text-[11px] text-slate-400 italic">
                  Menampilkan 100 baris pertama dari {rows.length} total baris.
                  Seluruh {rows.length} baris tetap akan diimpor.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-slate-700 dark:bg-slate-900/40">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isSubmitting || rows.length === 0}
            onClick={handleConfirm}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {isSubmitting
              ? "Mengimpor..."
              : `${confirmLabel} (${rows.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CsvImportModal;
