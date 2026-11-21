import Link from "next/link";
import { CropDoctorHeader, SavedCropAnalysis } from "@/components/saved-crop-analysis";
import { EmptyState, SectionTitle } from "@/components/shared";
import { isUuid } from "@/lib/farm-validation";
import {
  analyzedObservationIds,
  latestAnalysis,
  listFields,
  listObservations,
} from "@/lib/farm-data";
import { notFound } from "next/navigation";

export const metadata = { title: "AI Crop Doctor" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ observation?: string }>;
}) {
  const { observation } = await searchParams;
  const [fields, observations] = await Promise.all([listFields(), listObservations()]);
  const fieldName = (id: string) => fields.find((field) => field.id === id)?.name ?? "Field";

  if (observation) {
    if (!isUuid(observation)) notFound();
    const selected = observations.find(({ id }) => id === observation);
    if (!selected) notFound();
    const saved = await latestAnalysis(observation);
    return (
      <SavedCropAnalysis
        key={observation}
        id={observation}
        fieldName={fieldName(selected.field_id)}
        observedAt={selected.observed_at}
        photos={selected.images}
        saved={saved ?? undefined}
      />
    );
  }

  const analyzed = await analyzedObservationIds();
  return (
    <>
      <CropDoctorHeader />
      <section className="card panel">
        <SectionTitle title="Saved observations" />
        {observations.length ? (
          observations.map((item) => (
            <div className="list-row" key={item.id}>
              <div className="grow">
                <strong>{fieldName(item.field_id)}</strong>
                <small>
                  {item.observed_at} · {item.images.length} photo(s) ·{" "}
                  {analyzed.has(item.id) ? "Analyzed" : "Not analyzed yet"}
                </small>
              </div>
              <Link className="button button-outline" href={`/crop-doctor?observation=${item.id}`}>
                {analyzed.has(item.id) ? "View analysis" : "Analyze"}
              </Link>
            </div>
          ))
        ) : (
          <EmptyState title="No saved observations">
            <Link href="/scanner">Use Crop Scanner to save dated wheat photos first.</Link>
          </EmptyState>
        )}
      </section>
    </>
  );
}
