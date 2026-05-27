export type ModelSelectorOption = {
  id: string;
  label: string;
  description: string;
  status?: string;
  disabled?: boolean;
  default?: boolean;
};

type ModelSelectorProps = {
  disabled: boolean;
  isOpen: boolean;
  label: string;
  hint: string;
  options: ModelSelectorOption[];
  selectedId: string;
  onSelect: (modelId: string) => void;
  onToggle: () => void;
};

export function ModelSelector({
  disabled,
  hint,
  isOpen,
  label,
  onSelect,
  onToggle,
  options,
  selectedId,
}: ModelSelectorProps) {
  return (
    <div className="model-selector">
      <button
        aria-expanded={isOpen}
        className="model-selector-button"
        disabled={disabled}
        type="button"
        onClick={onToggle}
      >
        <span>{label}</span>
        <small>{hint}</small>
      </button>

      {isOpen ? (
        <div className="model-menu" role="menu">
          <p>Model</p>
          {options.map((option) => {
            const isSelected = option.id === selectedId;

            return (
              <div className={`model-menu-item ${isSelected ? "selected" : ""}`} key={option.id}>
                <button
                  aria-checked={isSelected}
                  aria-disabled={option.disabled}
                  className={option.disabled ? "disabled-option" : ""}
                  role="menuitemradio"
                  type="button"
                  onClick={() => {
                    if (!option.disabled) {
                      onSelect(option.id);
                    }
                  }}
                >
                  <span>
                    {option.label}
                    {isSelected ? <em>Selected</em> : null}
                    {option.default ? <em>Default</em> : null}
                  </span>
                  <small>
                    {option.status ? `${option.status} - ` : ""}
                    {option.description}
                  </small>
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
