import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createAnalysis } from "../api/analysis";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function Analyze() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFile = useCallback((candidate: File | undefined) => {
    if (!candidate) return;
    if (!ACCEPTED_TYPES.includes(candidate.type)) {
      setError("Unsupported file type. Please upload a JPEG, PNG, or WebP image.");
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

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-ink-faint">
        Step 1 of 1
      </p>
      <h1 className="mb-8 text-2xl font-medium text-ink">Upload a document image</h1>

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
        onClick={() => inputRef.current?.click()}
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
          <img
            src={previewUrl}
            alt="Selected document preview"
            className="max-h-56 rounded-sm border border-border object-contain"
          />
        ) : (
          <>
            <p className="mb-1 font-mono text-sm text-ink">
              Drop an image here, or click to browse
            </p>
            <p className="text-xs text-ink-faint">JPEG, PNG, or WebP</p>
          </>
        )}
      </div>

      {file && (
        <p className="mt-3 truncate font-mono text-xs text-ink-muted">{file.name}</p>
      )}

      {error && (
        <p className="mt-3 rounded-sm border border-evidence/30 bg-evidence-soft px-3 py-2 text-sm text-evidence">
          {error}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={!file || isSubmitting}
        className="mt-8 w-full rounded-sm border border-accent/40 bg-accent-soft py-3 font-mono text-sm font-medium text-accent transition-colors enabled:hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isSubmitting ? "Starting analysis…" : "Run Analysis"}
      </button>
    </div>
  );
}
