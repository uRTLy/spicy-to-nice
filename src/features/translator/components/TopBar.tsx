import type { ReactNode } from "react";

type TopBarProps = {
  children: ReactNode;
  isAiSetupOpen: boolean;
  onOpenConversation: () => void;
  onToggleAiSetup: () => void;
  providerLabel: string;
};

export function TopBar({
  children,
  isAiSetupOpen,
  onOpenConversation,
  onToggleAiSetup,
  providerLabel,
}: TopBarProps) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Spicy-to-Nice</p>
        <h1>Feedback without the flames.</h1>
      </div>
      <div className="topbar-actions">
        <button className="topbar-link" type="button" onClick={onOpenConversation}>
          How this was built
        </button>
        <div className="ai-setup-menu">
          <button
            aria-expanded={isAiSetupOpen}
            className="ai-setup-button"
            type="button"
            onClick={onToggleAiSetup}
          >
            <span>AI setup</span>
            <small>{providerLabel}</small>
          </button>
          {isAiSetupOpen ? children : null}
        </div>
      </div>
    </header>
  );
}
