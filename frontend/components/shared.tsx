"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowRight,
  CalendarDays,
  Check,
  CircleAlert,
  Info,
  MapPin,
  Sprout,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  fieldObservations,
  formatDate,
  type CropComparison,
  type CropObservation,
  type Field,
  type Reminder,
  type Severity,
  type Stage,
  type WeatherAlert,
} from "@/lib/data";
import { Dialog } from "./ui/dialog";

export function PageHeader({
  title,
  description,
  icon: Icon,
  action,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div className="heading-main">
        <div className="heading-icon">
          <Icon size={25} />
        </div>
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

export function SectionTitle({
  title,
  href,
  link = "View all",
}: {
  title: string;
  href?: string;
  link?: string;
}) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {href && (
        <Link className="text-link" href={href}>
          {link}
          <ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}

export function MockDataNotice({
  children = "Sample records for the Phase 1 demo.",
}: {
  children?: ReactNode;
}) {
  return (
    <div className="mock-notice">
      <Info size={16} />
      <span>{children}</span>
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "green",
  detail,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: string;
  detail: string;
}) {
  return (
    <article className={`stat card tone-${tone}`}>
      <div className="stat-head">
        <span>{label}</span>
        <div className="stat-icon">
          <Icon size={18} />
        </div>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

export function CropStageBadge({ stage }: { stage: Stage }) {
  return (
    <span className="badge">
      <Sprout size={13} />
      {stage}
    </span>
  );
}

export function RiskSeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`badge ${severity === "High Risk" ? "risk-high" : severity === "Caution" ? "risk-caution" : ""}`}
    >
      {severity}
    </span>
  );
}

export function CropPhoto({
  src,
  alt,
  className = "",
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={`crop-photo ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        preload={priority}
        unoptimized={src.startsWith("blob:")}
        sizes={
          className.includes("hero")
            ? "(max-width: 700px) 100vw, 1200px"
            : "(max-width: 700px) 90vw, 480px"
        }
      />
    </div>
  );
}

export function FieldCard({ field }: { field: Field }) {
  const last = fieldObservations(field.id).at(-1);
  return (
    <article className="card field-card">
      <div className="field-photo">
        <CropPhoto src={field.photo} alt="Illustrative wheat crop" />
        <span className="photo-chip">
          <Sprout size={13} />
          {field.crop}
        </span>
      </div>
      <div className="field-info">
        <h3>{field.name}</h3>
        <p>
          <MapPin size={14} />
          {field.location} · {field.acres} acres
        </p>
        <p>
          <CalendarDays size={14} />
          {last ? formatDate(last.date) : "No observations yet"}
        </p>
        <div className="field-bottom">
          {last ? (
            <CropStageBadge stage={last.stage} />
          ) : (
            <span className="badge">Awaiting observation</span>
          )}
          <Link
            className="round-link"
            href={`/fields/${field.id}`}
            aria-label={`View details for ${field.name}`}
          >
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function ObservationCard({
  observation,
}: {
  observation: CropObservation;
}) {
  return (
    <figure className="observation">
      <CropPhoto
        src={observation.photo}
        alt={`Illustrative wheat at ${observation.stage.toLowerCase()}`}
      />
      <figcaption>
        <time dateTime={observation.date}>{formatDate(observation.date)}</time>
        <CropStageBadge stage={observation.stage} />
      </figcaption>
    </figure>
  );
}

export function BeforeAfterViewer({
  comparison,
}: {
  comparison: CropComparison;
}) {
  return (
    <div className="before-after">
      <ObservationCard observation={comparison.before} />
      <span className="compare-divider" aria-hidden="true">
        <ArrowLeftRight size={17} />
      </span>
      <ObservationCard observation={comparison.after} />
    </div>
  );
}

export function WeatherAlertCard({
  alert,
  fieldName,
  compact,
}: {
  alert: WeatherAlert;
  fieldName: string;
  compact?: boolean;
}) {
  return (
    <article
      className={`weather-alert ${alert.severity === "High Risk" ? "weather-critical" : ""}`}
    >
      <div className="alert-head">
        <div className="alert-icon">
          <CircleAlert size={20} />
        </div>
        <div>
          <h3>{alert.event}</h3>
          <small>
            {fieldName} · {alert.dates}
          </small>
        </div>
        <RiskSeverityBadge severity={alert.severity} />
      </div>
      <p>{alert.message}</p>
      {compact ? (
        <Link className="text-link" href="/weather">
          View details <ArrowRight size={14} />
        </Link>
      ) : (
        <details>
          <summary>View details</summary>
          <ul>
            {alert.precautions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}

export function ReminderCard({
  reminder,
  fieldName,
  onToggle,
}: {
  reminder: Reminder;
  fieldName: string;
  onToggle?: () => void;
}) {
  return (
    <div className="list-row reminder-row">
      <span className="soft-icon">
        <CalendarDays size={17} />
      </span>
      <div className="grow">
        <strong>{reminder.title}</strong>
        <small>
          {fieldName} · {formatDate(reminder.date)}
        </small>
      </div>
      {onToggle && (
        <button className="button button-outline" onClick={onToggle}>
          <Check size={16} />
          {reminder.completed ? "Reopen" : "Complete"}
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty-state">
      <Sprout size={30} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

export function LoadingSkeleton({ label }: { label: string }) {
  return (
    <div className="loading-state" role="status">
      <div />
      <span>{label}</span>
    </div>
  );
}

export function ConfirmDialog({
  title,
  description,
  trigger,
  onConfirm,
}: {
  title: string;
  description: string;
  trigger: ReactNode;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      title={title}
      description={description}
      trigger={trigger}
      open={open}
      onOpenChange={setOpen}
    >
      <div className="actions">
        <button
          className="button button-outline"
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
        <button
          className="button"
          onClick={() => {
            onConfirm();
            setOpen(false);
          }}
        >
          Confirm
        </button>
      </div>
    </Dialog>
  );
}

export function FieldSelect({
  fields,
  value,
  onChange,
}: {
  fields: Field[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      Field
      <select
        aria-label="Field"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {fields.map((field) => (
          <option key={field.id} value={field.id}>
            {field.name}
          </option>
        ))}
      </select>
    </label>
  );
}
