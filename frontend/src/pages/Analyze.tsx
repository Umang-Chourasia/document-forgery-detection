import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createAnalysis } from "../api/analysis";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** What the pipeline will do, in the order the result page presents it. */
const PIPELINE_STEPS = [
  {
    label: "AI Localization",
    body: "The document is analyzed to identify regions showing unusual visual evidence.",
  },
  {
    label: "Measured Evidence",
    body: "Quantitative measurements are calculated from the detected evidence.",
  },
  {
    label: "AI Interpretation",
    body: "A language model summarizes the measured evidence in concise, human-readable points.",
  },
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function Analyze() {
  const navigate = useNavigate();
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
      navigate(`/analysis/${analysis.id}`);
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
    <div className="mx-auto max-w-3xl px-6 py-12">
      <PageHeader
        eyebrow="New analysis"
        title="Upload a document image"
        description="The document is analyzed to identify regions showing unusual visual evidence. Results are presented as evidence for review, not as an authenticity verdict."
      />

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
        className={`flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-sm border border-dashed p-8 text-center transition-colors ${
          isDragging
            ? "border-accent bg-accent-soft"
            : "border-border-strong bg-surface hover:border-ink-faint"
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
              className="max-h-64 rounded-sm border border-border object-contain"
            />
            <p className="mt-3 font-mono text-[11px] text-ink-faint">
              Click to choose a different image
            </p>
          </>
        ) : (
          <>
            <UploadGlyph />
            {/* The accepted types are still enforced by ACCEPTED_TYPES and the
                file input's `accept` attribute — only the helper text is gone. */}
            <p className="mt-4 font-mono text-sm text-ink">
              Drop your document or click to browse
            </p>
          </>
        )}
      </div>

      {file && (
        <div className="mt-3 flex items-center gap-3 rounded-sm border border-border bg-surface px-3 py-2.5">
          <span className="rounded-sm border border-accent/30 bg-accent-soft px-1.5 py-0.5 font-mono text-[10px] uppercase text-accent">
            {file.type.replace("image/", "")}
          </span>
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink">
            {file.name}
          </span>
          <span className="shrink-0 font-mono text-xs text-ink-faint">
            {formatBytes(file.size)}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearFile();
            }}
            disabled={isSubmitting}
            className="shrink-0 font-mono text-xs text-ink-faint transition-colors hover:text-evidence disabled:opacity-40"
          >
            Remove
          </button>
        </div>
      )}

      {error && (
        <Card tone="evidence" className="mt-3 px-3 py-2">
          <p className="text-sm text-evidence">{error}</p>
        </Card>
      )}

      <Button
        onClick={handleSubmit}
        disabled={!file || isSubmitting}
        size="lg"
        className="mt-6 w-full"
      >
        {isSubmitting ? "Starting analysis…" : "Run Analysis"}
      </Button>

      <section className="mt-10 border-t border-border pt-6">
        <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
          What happens next
        </p>
        <ol className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          {PIPELINE_STEPS.map((step, i) => (
            <li
              key={step.label}
              className="flex-1 rounded-sm border border-border bg-surface p-4"
            >
              <p className="mb-1.5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-accent">
                <span className="flex h-4 w-4 items-center justify-center rounded-full border border-accent/40 text-[9px]">
                  {i + 1}
                </span>
                {step.label}
              </p>
              <p className="text-xs leading-relaxed text-ink-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function UploadGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-10 w-10 text-ink-faint"
      aria-hidden="true"
    >
      <path
        d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 15v2.5A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5V15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
