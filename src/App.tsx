import type { Audience, FeedbackMode, Provider, Tone } from "./feedbackTypes";

const defaults: {
  mode: FeedbackMode;
  audience: Audience;
  tone: Tone;
  provider: Provider;
} = {
  mode: "single",
  audience: "manager",
  tone: "diplomatic",
  provider: "openai",
};

export function App() {
  return (
    <main className="shell">
      <section className="intro">
        <p className="eyebrow">Spicy-to-Nice</p>
        <h1>Turn raw feedback into something people can actually hear.</h1>
        <p>
          This repo currently holds the technical foundation and product plan.
          The full frontend will come after the interaction design is settled.
        </p>
      </section>

      <section className="snapshot" aria-label="Planned defaults">
        <dl>
          <div>
            <dt>Mode</dt>
            <dd>{defaults.mode}</dd>
          </div>
          <div>
            <dt>Audience</dt>
            <dd>{defaults.audience}</dd>
          </div>
          <div>
            <dt>Tone</dt>
            <dd>{defaults.tone}</dd>
          </div>
          <div>
            <dt>Provider</dt>
            <dd>{defaults.provider}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
