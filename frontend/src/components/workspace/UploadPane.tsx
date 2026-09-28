import { useCallback, useEffect, useRef, useState } from "react";
import { createAnalysis } from "../../api/analysis";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { Button } from "../ui/Button";

/**
 * The upload stage. Behaviour is carried over unchanged from the previous
 * Analyze page — the same accepted types, the same createAnalysis call, the
 * same error handling and object-URL cleanup. Only the presentation is new:
 * a document plate rather than a dashed dropzone card.
 */
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadPane() {
  const { select, refresh } = useWorkspace();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Release the previous preview when it is replaced, and on unmount.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFile = useCallback((candidate: File | undefined) => {
    if (!candidate) return;
    if (!ACCEPTED_TYPES.includes(candidate.type)) {
      // Wording is generic; the accepted types are still enforced by
      // ACCEPTED_TYPES above and by the input's `accept` attribute.
      setError("Unsupported document type. Please upload a supported document.");
      return;
    }
    setError(null);
    setFile(candidate);
    setPreviewUrl(URL.createObjectURL(candidate));
  }, []);

  const handleSubmit = async () => {
    if (!file) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const analysis = await createAnalysis(file);
      // Same destination as before, expressed as a workspace selection so the
      // shell and the rail stay mounted while the pipeline runs.
      select(analysis.id);
      refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while starting the analysis.",
      );
      setIsSubmitting(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const openPicker = () => inputRef.current?.click();

  return (
    <div className="scroll-quiet mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center-safe overflow-y-auto px-6 py-12 lg:px-12">
      <span className="self-start rounded-full border border-border px-4 py-1.5 text-small text-ink-muted">
        New analysis
      </span>
      <h1 className="mt-6 max-w-2xl text-[2.5rem] font-medium leading-[1.02] tracking-[-0.04em] text-ink sm:text-[3.5rem]">
        Upload a document to localize its evidence
      </h1>
      <p className="mt-5 max-w-xl text-lead leading-relaxed text-ink-muted">
        The document is analyzed to identify regions showing unusual visual
        evidence. Results are presented as evidence for review, not as an
        authenticity verdict.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Choose a document image to analyze"
        className={`relative mt-10 flex min-h-[19rem] min-w-0 shrink-0 cursor-pointer flex-col items-center justify-center rounded-panel border border-dashed p-8 text-center transition-colors ${
          isDragging
            ? "border-accent bg-accent-soft"
            : "border-border-strong bg-surface hover:border-ink/40"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt="Selected document preview"
              className="block h-auto max-h-[min(18rem,38svh)] w-auto max-w-full rounded-lg object-contain"
            />
            <p className="mt-5 text-small text-ink-faint">Click to choose a different document</p>
          </>
        ) : (
          <>
            <UploadGlyph />
            {/* The accepted types are still enforced by ACCEPTED_TYPES and the
                file input's `accept` attribute — only the helper text is gone. */}
            <p className="mt-6 text-[1.375rem] font-medium tracking-[-0.02em] text-ink">
              Drop your document or click to browse
            </p>
            <p className="mt-2 text-small text-ink-faint">JPEG, PNG or WebP</p>
          </>
        )}
      </div>

      {file && (
        <div className="mt-4 flex items-center gap-4 rounded-full border border-border bg-surface px-5 py-3">
          <span className="label text-accent">{file.type.replace("image/", "")}</span>
          <span className="min-w-0 flex-1 truncate text-body text-ink">{file.name}</span>
          <span className="label shrink-0 text-ink-faint">{formatBytes(file.size)}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearFile();
            }}
            disabled={isSubmitting}
            className="shrink-0 text-small text-ink-faint transition-colors hover:text-evidence disabled:opacity-40"
          >
            Remove
          </button>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-card bg-evidence-soft px-6 py-4 text-small leading-relaxed text-evidence">
          {error}
        </p>
      )}

      <Button
        onClick={handleSubmit}
        disabled={!file || isSubmitting}
        size="lg"
        className="mt-8 w-full sm:w-auto sm:self-start"
      >
        {isSubmitting ? "Starting analysis…" : "Run Analysis"}
      </Button>
    </div>
  );
}

function UploadGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-14 w-14 rounded-2xl bg-surface-raised p-3.5 text-ink" aria-hidden="true">
      <path
        d="M12 15.5V4m0 0L8 8M12 4l4 4"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}
