# CropShield AI repository instructions

- Build a wheat-first monitoring tool with Next.js, FastAPI, Gemini, and Supabase. Use Open-Meteo for weather and Recharts for trends.
- Prioritize the Crop Scanner and Crop Memory Engine. Keep optional features behind the core demo.
- Start with HANDOFF.md and the relevant phase or architecture section. Use targeted searches and read only the files needed for the change.
- Make small, focused changes and reuse existing code. Add dependencies only when required and deploy only when requested.
- Verify every change with relevant checks and review the Git diff. Report checks actually run and any gaps.
- Keep secrets in local environment files or managed secret stores. Commit only empty variable definitions in .env.example. Enforce field ownership and keep crop photos private.
- Never invent API responses, research findings, survey data, or verification results. Label test fixtures and demo data.
- Update affected documentation when behavior or configuration changes. Update HANDOFF.md after each phase.
