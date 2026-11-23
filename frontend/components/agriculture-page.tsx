import Link from "next/link";
import { callBackend } from "@/lib/backend";
import { listFields, listObservations } from "@/lib/farm-data";
import { AgricultureForm, AgricultureHeader, RecordActions } from "./agriculture-form";
import { EmptyState, SectionTitle } from "./shared";

type Kind = "irrigation" | "rust" | "storage";
type RecordDetails = {
  notes?: string; inspect_on?: string; irrigated?: boolean; moisture_pct?: number;
  temperature_c?: number; humidity_pct?: number; soil?: string; method?: string;
  soil_condition?: string; visible_concern?: string; cautions?: string[]; observed_on?: string;
  review?: string; finding?: { status: string; evidence: string; follow_up: string };
  capture_quality?: { quality_status: string }[];
};
type WeatherDay = { date: string; rain: number | null; high: number | null };
type View = {
  records: { id: string; recorded_on: string; details: RecordDetails; review_status?: string | null }[];
  batches: { id: string; name: string; details: {
    grain: string; harvested_on: string; stored_on: string; method: string; quantity: number; unit: string;
    moisture_limit_pct?: number; temperature_limit_c?: number; humidity_limit_pct?: number;
  }}[];
  cautions: string[];
  growth_stage?: string;
  weather?: { recent: WeatherDay[]; forecast: WeatherDay[]; timezone: string };
};
const modules = {
  irrigation: { title: "AquaGuard AI", path: "/aquaguard", summary: "Review recorded irrigation and weather-based inspection cues." },
  rust: { title: "RustWatch AI", path: "/rustwatch", summary: "Keep private records of suspected wheat rust and follow-up reviews." },
  storage: { title: "GrainSafe AI", path: "/grainsafe", summary: "Track grain batches, measured storage conditions, and inspections." },
};
const today = () => new Date().toISOString().slice(0, 10);
const words = (value: string) => value.replaceAll("_", " ");

function Input({ name, label, type = "text", required = false, min, max }: {
  name: string; label: string; type?: string; required?: boolean; min?: number; max?: number;
}) {
  return <label>{label}<input {...{ name, type, required, min, max }} step={type === "number" ? "any" : undefined}
    maxLength={type === "text" ? 100 : undefined} /></label>;
}

function Choice({ name, label, choices }: { name: string; label: string; choices: string[] }) {
  return <label>{label}<select name={name}>{choices.map((value) => <option key={value} value={value}>{words(value)}</option>)}</select></label>;
}

function DatedInputs() {
  return <>
    <label>Record date (UTC)<input name="recorded_on" type="date" defaultValue={today()} required /></label>
    <Input name="inspect_on" label="Next inspection reminder date (optional)" type="date" />
    <label>Notes<textarea name="notes" maxLength={600} /></label>
  </>;
}

function Measurements({ details }: { details: RecordDetails }) {
  return <p>Measured grain moisture: {details.moisture_pct == null ? "not measured" : details.moisture_pct + "%"} ·
    Temperature: {details.temperature_c == null ? "not measured" : details.temperature_c + " °C"} ·
    Relative humidity: {details.humidity_pct == null ? "not measured" : details.humidity_pct + "%"}</p>;
}

function History({ data, kind }: { data: View; kind: Kind }) {
  return <section className="card panel stack">
    <SectionTitle title="History and inspection reminders" />
    {!data.records.length && <EmptyState title="No records yet">Add a record to start the timeline.</EmptyState>}
    {data.records.map(({ id, recorded_on, details, review_status }) => <article className="stack" key={id}>
      <strong>{recorded_on}</strong>
      {kind === "irrigation" && <p>{details.irrigated ? "Irrigation recorded" : "Soil inspection"} · Soil: {details.soil_condition} ·
        Measured moisture: {details.moisture_pct == null ? "not measured" : details.moisture_pct + "%"}
        {details.soil && " · " + details.soil}{details.method && " · " + details.method}</p>}
      {kind === "rust" && <>
        <p>Photo date: {details.observed_on} · Image review: {details.finding ? words(details.finding.status) : "inconclusive"} (suspected, not confirmed)</p>
        <p>{details.finding?.evidence} {details.finding?.follow_up}</p>
        <p>Capture checks: {details.capture_quality?.map(({ quality_status }) => words(quality_status)).join(", ") || "unavailable"}</p>
      </>}
      {kind === "storage" && <>
        <Measurements details={details} />
        <p>Visible concern: {words(details.visible_concern ?? "not_checked")}</p>
        {details.cautions?.map((item) => <p key={item}>{item}</p>)}
      </>}
      {details.notes && <p>{details.notes}</p>}
      {details.inspect_on && <p>Inspection {details.inspect_on < today() ? "overdue" : details.inspect_on === today() ? "due today" : "due"} · {details.inspect_on}</p>}
      <RecordActions id={id} target="records" label={`the ${recorded_on} record`}
        review={kind === "rust" ? review_status ?? details.review ?? "unreviewed" : undefined} />
    </article>)}
  </section>;
}

export async function AgriculturePage({ kind, selection }: { kind: Kind; selection?: string }) {
  const m = modules[kind];
  const fields = kind === "storage" ? [] : await listFields();
  const eligible = kind === "rust" ? fields.filter((f) => f.crop_type.trim().toLowerCase() === "wheat") : fields;
  const field = eligible.find(({ id }) => id === selection) ?? eligible[0];
  const result = kind === "storage"
    ? await callBackend<View>("/agriculture/storage" + (selection ? "?batch_id=" + encodeURIComponent(selection) : ""))
    : field ? await callBackend<View>(`/agriculture/${kind}/${field.id}`) : null;
  const data = result?.data;
  const batch = data?.batches.find(({ id }) => id === selection);
  const photos = kind === "rust" && field && data ? await listObservations(field.id, 30) : [];
  const lastIrrigation = data?.records.find(({ details }) => details.irrigated);
  return <>
    <AgricultureHeader kind={kind} title={m.title} description={m.summary} />
    {result?.error && <p className="message-error" role="alert">{result.error} Reload to retry.</p>}
    {kind !== "storage" && !field && <EmptyState title={kind === "rust" ? "No wheat fields" : "No fields"}>
      <Link href="/fields">Open My Fields</Link>
    </EmptyState>}
    {kind !== "storage" && !!eligible.length && <nav className="card panel actions" aria-label="Saved fields">
      {eligible.map(({ id, name }) => <Link key={id} href={`${m.path}?field=${id}`} className={id === field?.id ? "button" : "text-link"}>{name}</Link>)}
    </nav>}
    {kind === "storage" && data && <>
      <nav className="card panel actions" aria-label="Storage batches">
        {data.batches.map(({ id, name }) => <Link key={id} className={id === selection ? "button" : "text-link"} href={`/grainsafe?batch=${id}`}>{name}</Link>)}
        {!data.batches.length && <p>No batches saved. Create a batch to begin.</p>}
      </nav>
      <AgricultureForm kind="batches">
        <SectionTitle title="Create storage batch" />
        <Input name="name" label="Batch name" required /><Input name="grain" label="Grain type" required />
        <Input name="harvested_on" label="Harvest date" type="date" required /><Input name="stored_on" label="Storage date" type="date" required />
        <Input name="method" label="Storage method" required /><Input name="quantity" label="Quantity" type="number" min={0.001} required />
        <Choice name="unit" label="Quantity unit" choices={["kg", "tonnes", "bags"]} />
        <p>Optional inspection triggers from your storage adviser. These do not certify food safety.</p>
        <Input name="moisture_limit_pct" label="Moisture trigger (%)" type="number" min={0} max={100} />
        <Input name="temperature_limit_c" label="Temperature trigger (°C)" type="number" min={-50} max={100} />
        <Input name="humidity_limit_pct" label="Relative humidity trigger (%)" type="number" min={0} max={100} />
      </AgricultureForm>
    </>}
    {data && (field || batch) && <>
      <section className="card panel stack">
        <SectionTitle title={kind === "irrigation" ? "Irrigation assessment" : kind === "rust" ? "Suspected rust surveillance" : batch!.name} />
        {kind === "irrigation" && field && <>
          <p>{field.name} · {field.crop_type} · {data.growth_stage ? `Saved AI stage: ${words(data.growth_stage)}` : "Growth stage unavailable"}</p>
          <p>Last recorded irrigation: {lastIrrigation?.recorded_on ?? "none in recent history"}</p>
          {data.cautions.map((item) => <p key={item} className="message-caution">{item}</p>)}
          {!data.cautions.length && <p>No inspection rule was triggered by the available data.</p>}
          {data.weather ? <>
            <p>Open-Meteo modeled precipitation and forecast · {data.weather.timezone} local dates. Field measurements may differ.</p>
            {([["Recent modeled", data.weather.recent], ["Forecast", data.weather.forecast]] as const).map(([title, values]) => <div key={title}>
              <strong>{title}</strong>
              {values.map((day) => <p key={day.date}>{day.date} · {day.rain ?? "unavailable"} {day.rain != null && "mm"} · high {day.high == null ? "unavailable" : day.high + " °C"}</p>)}
            </div>)}
          </> : <p>Weather unavailable. Check Weather Guardian for field location setup.</p>}
          <Link className="text-link" href={`/weather?field=${field.id}`}>Open Weather Guardian</Link>
          <Link className="text-link" href="/reminders">Open workspace reminders</Link>
        </>}
        {kind === "rust" && field && <>
          <p>Image findings are suspected or inconclusive. Ask a qualified reviewer to inspect the crop. Records stay private.</p>
          <Link className="text-link" href={`/scanner?field=${field.id}`}>Upload wheat-leaf photos in Crop Scanner</Link>
        </>}
        {batch && <>
          <p>{batch.details.grain} · {batch.details.quantity} {batch.details.unit} · {batch.details.method}</p>
          <p>Harvested {batch.details.harvested_on} · Stored {batch.details.stored_on}</p>
          {data.records[0] ? <Measurements details={data.records[0].details} /> : <p>No inspections recorded.</p>}
          <p>Configured triggers: moisture {batch.details.moisture_limit_pct ?? "not set"}, temperature {batch.details.temperature_limit_c ?? "not set"}, humidity {batch.details.humidity_limit_pct ?? "not set"}.</p>
          <p>Use a meter for grain moisture. Visible spoilage or contamination requires qualified assessment.</p>
          <Link className="text-link" href={`/assistant?batch=${batch.id}`}>Ask the Farmer Assistant about this batch</Link>
          <RecordActions id={batch.id} target="batches" label={`batch ${batch.name}`} redirectTo="/grainsafe" />
        </>}
      </section>
      {kind === "irrigation" && field && <AgricultureForm key={field.id} kind={kind}>
        <SectionTitle title="Record irrigation or soil observations" />
        <input type="hidden" name="field_id" value={field.id} />
        <Choice name="irrigated" label="Was irrigation applied?" choices={["no", "yes"]} />
        <Choice name="soil_condition" label="Observed soil condition" choices={["unknown", "dry", "damp", "wet"]} />
        <Input name="moisture_pct" label="Measured soil moisture (%)" type="number" min={0} max={100} />
        <Input name="soil" label="Soil description (optional)" /><Input name="method" label="Irrigation method (optional)" />
        <DatedInputs />
      </AgricultureForm>}
      {kind === "rust" && field && (photos.some((photo) => photo.images.length) ? <AgricultureForm key={field.id} kind={kind}>
        <SectionTitle title="Record suspected rust or review follow-up" />
        <label>Saved wheat observation<select name="observation_id" required aria-label="Saved wheat observation">
          {photos.filter(({ images }) => images.length).map(({ id, observed_at, images }) =>
            <option key={id} value={id}>{observed_at} · {images.length} photo(s)</option>)}
        </select></label>
        <Choice name="review" label="Human review status" choices={["unreviewed", "review_requested", "feedback_received"]} />
        <DatedInputs />
      </AgricultureForm> : <EmptyState title="No wheat photos yet">Upload a leaf close-up and a wider view in Crop Scanner.</EmptyState>)}
      {batch && <AgricultureForm key={batch.id} kind="storage">
        <SectionTitle title="Record storage inspection" />
        <input type="hidden" name="batch_id" value={batch.id} />
        <Input name="moisture_pct" label="Measured grain moisture (%)" type="number" min={0} max={100} />
        <Input name="temperature_c" label="Measured temperature (°C)" type="number" min={-50} max={100} />
        <Input name="humidity_pct" label="Measured relative humidity (%)" type="number" min={0} max={100} />
        <Choice name="visible_concern" label="Visible concerns" choices={["not_checked", "none_observed", "mold_or_odor", "pests", "water_or_condensation", "other"]} />
        <DatedInputs />
      </AgricultureForm>}
      <History data={data} kind={kind} />
    </>}
  </>;
}
