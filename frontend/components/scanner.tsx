"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CloudUpload,
  ScanLine,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CropAnalysis } from "@/lib/data";
import {
  acceptedImages,
  analyzeExample,
  uploadError,
} from "@/lib/mock-service";
import { useDemo } from "@/lib/state";
import {
  CropPhoto,
  FieldSelect,
  LoadingSkeleton,
  MockDataNotice,
  PageHeader,
  SectionTitle,
} from "./shared";

interface Preview {
  id: string;
  name: string;
  url: string;
}
const steps = ["Select field", "Upload photos", "Review analysis"];

export function Scanner() {
  const { fields } = useDemo();
  const [field, setField] = useState(fields[0].id);
  const [date, setDate] = useState("");
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState<Preview[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<CropAnalysis>();
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const urls = useRef(new Set<string>());
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const activeUrls = urls.current;
    return () => {
      activeUrls.forEach((url) => URL.revokeObjectURL(url));
      activeUrls.clear();
    };
  }, []);

  function add(files: FileList) {
    const previews: Preview[] = [];
    const invalid: string[] = [];
    for (const file of Array.from(files)) {
      const error = uploadError(file);
      if (error) {
        invalid.push(error);
        continue;
      }
      const url = URL.createObjectURL(file);
      urls.current.add(url);
      previews.push({ id: crypto.randomUUID(), name: file.name, url });
    }
    setPhotos((items) => [...items, ...previews]);
    setErrors(invalid);
  }

  function remove(photo: Preview) {
    URL.revokeObjectURL(photo.url);
    urls.current.delete(photo.url);
    setPhotos((items) => items.filter(({ id }) => id !== photo.id));
  }

  async function analyze() {
    setLoading(true);
    setErrors([]);
    try {
      setResult(await analyzeExample(field, photos.length));
      setStep(2);
    } catch (error) {
      setErrors([
        error instanceof Error
          ? error.message
          : "Unable to load the sample analysis.",
      ]);
      errorRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Crop Scanner"
        description="Choose a field, preview crop photos, and explore an example analysis."
        icon={ScanLine}
      />
      <MockDataNotice>
        Simulation only. Your images stay in this tab. The analysis displays a
        fixed example.
      </MockDataNotice>
      <ol className="card panel stepper" aria-label="Scanner progress">
        {steps.map((label, index) => (
          <li key={label} aria-current={index === step ? "step" : undefined}>
            <span>{index < step ? <Check size={14} /> : index + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      {step === 0 && (
        <section className="card panel stack">
          <SectionTitle title="Observation details" />
          <FieldSelect fields={fields} value={field} onChange={setField} />
          <label>
            Observation date (optional)
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <div className="actions">
            <button className="button" onClick={() => setStep(1)}>
              Continue to photos
              <ArrowRight size={17} />
            </button>
          </div>
        </section>
      )}
      {step === 1 && (
        <section className="card panel stack">
          <SectionTitle title={`Crop photographs (${photos.length})`} />
          <input
            ref={input}
            type="file"
            accept={acceptedImages.join(",")}
            multiple
            hidden
            onChange={(event) => {
              if (event.target.files) add(event.target.files);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            className={`dropzone ${dragging ? "dragging" : ""}`}
            disabled={loading}
            onClick={() => input.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              if (!loading) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              if (!loading) add(event.dataTransfer.files);
            }}
          >
            <CloudUpload size={33} />
            <strong>Drop crop photos here or browse files</strong>
            <small>JPG, PNG, or WebP · Up to 10 MB per image</small>
          </button>
          <div ref={errorRef} tabIndex={-1}>
            {errors.length > 0 && (
              <div className="message-error" role="alert">
                {errors.map((error, index) => (
                  <div key={`${error}-${index}`}>{error}</div>
                ))}
              </div>
            )}
          </div>
          {photos.length > 0 && (
            <div className="grid-three">
              {photos.map((photo) => (
                <div className="file-tile" key={photo.id}>
                  <CropPhoto src={photo.url} alt={photo.name} />
                  <button
                    className="icon-button"
                    disabled={loading}
                    aria-label={`Remove ${photo.name}`}
                    onClick={() => remove(photo)}
                  >
                    <X size={17} />
                  </button>
                  <small>{photo.name}</small>
                </div>
              ))}
            </div>
          )}
          {loading && <LoadingSkeleton label="Loading sample analysis…" />}
          <div className="actions">
            <button
              className="button button-outline"
              disabled={loading}
              onClick={() => setStep(0)}
            >
              <ArrowLeft size={17} />
              Back
            </button>
            <button
              className="button"
              disabled={loading || !photos.length}
              onClick={analyze}
            >
              <Sparkles size={17} />
              Run demo analysis
            </button>
          </div>
        </section>
      )}
      {step === 2 && result && (
        <section className="card panel stack">
          <SectionTitle title="Sample analysis" />
          <div className="insight" role="status">
            <Check size={18} />
            <div>
              <strong>Example loaded</strong>
              <p>
                {fields.find((item) => item.id === field)?.name}
                {date ? ` · ${date}` : ""} · {photos.length} local photo
                previews
              </p>
            </div>
          </div>
          <div className="grid-three">
            {[
              ["Crop identity", result.crop],
              ["Estimated growth stage", result.stage],
              ["Visible symptoms", result.symptoms],
              ["Image quality", result.quality],
              ["Uncertainty", result.uncertainty],
              ["Additional observations", result.followUp],
            ].map(([label, value]) => (
              <div className="metric" key={label}>
                <small>{label}</small>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className="actions">
            <button
              className="button button-outline"
              onClick={() => setStep(1)}
            >
              <ArrowLeft size={17} />
              Edit photos
            </button>
            <Link className="button" href={`/comparison?field=${field}`}>
              Compare Growth
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
