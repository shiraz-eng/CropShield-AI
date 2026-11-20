"use client";

import { Settings as SettingsIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { User } from "@/lib/data";
import { useDemo } from "@/lib/state";
import { MockDataNotice, PageHeader, SectionTitle } from "./shared";

export function Settings() {
  const { user, setUser } = useDemo();
  const [draft, setDraft] = useState(user);
  const [saved, setSaved] = useState(false);
  function update<K extends keyof User>(key: K, value: User[K]) {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setSaved(false);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim()) return;
    setUser({ ...draft, name: draft.name.trim(), email: draft.email.trim() });
    setSaved(true);
  }
  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your demo profile and workspace preferences."
        icon={SettingsIcon}
      />
      <MockDataNotice>
        Changes apply in this app session. Account management requires a
        backend.
      </MockDataNotice>
      <form className="stack" onSubmit={submit}>
        <div className="grid-two">
          <section className="card panel stack">
            <SectionTitle title="Profile information" />
            <label>
              Full name
              <input
                value={draft.name}
                required
                pattern=".*\S.*"
                maxLength={70}
                onChange={(event) => update("name", event.target.value)}
              />
            </label>
            <label>
              Email address
              <input
                type="email"
                value={draft.email}
                required
                onChange={(event) => update("email", event.target.value)}
              />
            </label>
            <div className="metric">
              <small>Workspace role</small>
              <strong>Farmer</strong>
            </div>
          </section>
          <section className="card panel stack">
            <SectionTitle title="Preferences" />
            <label>
              Preferred assistant language
              <select
                aria-label="Preferred assistant language"
                value={draft.language}
                onChange={(event) =>
                  update("language", event.target.value as User["language"])
                }
              >
                <option>English</option>
                <option>Urdu</option>
              </select>
            </label>
            <label>
              Temperature units
              <select
                aria-label="Temperature units"
                value={draft.units}
                onChange={(event) =>
                  update("units", event.target.value as User["units"])
                }
              >
                <option value="C">Celsius (°C)</option>
                <option value="F">Fahrenheit (°F)</option>
              </select>
            </label>
            <label>
              Crop reminder interval
              <select
                aria-label="Crop reminder interval"
                value={draft.interval}
                onChange={(event) =>
                  update("interval", Number(event.target.value))
                }
              >
                {[7, 15, 20, 25, 30].map((item) => (
                  <option key={item} value={item}>
                    {item} days
                  </option>
                ))}
              </select>
            </label>
            <label className="check-setting">
              <input
                type="checkbox"
                checked={draft.notifications}
                onChange={(event) =>
                  update("notifications", event.target.checked)
                }
              />
              Show in-app notifications
            </label>
          </section>
        </div>
        <div className="actions">
          <button className="button" type="submit">
            Save settings
          </button>
          <p className="form-status" role="status">
            {saved ? "Settings saved for this session." : ""}
          </p>
        </div>
      </form>
      <section className="card panel">
        <SectionTitle title="Account settings" />
        <p>
          Sign-in, password updates, and account management will be available
          after backend integration.
        </p>
      </section>
    </>
  );
}
