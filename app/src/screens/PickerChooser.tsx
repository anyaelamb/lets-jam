interface PickerChooserProps {
  onBack: () => void;
  onStartGuidedPicker: () => void;
  onStartGenrePicker: () => void;
  onStartScatterPicker: () => void;
}

export default function PickerChooser({
  onBack,
  onStartGuidedPicker,
  onStartGenrePicker,
  onStartScatterPicker,
}: PickerChooserProps) {
  return (
    <div className="screen picker-chooser">
      <button type="button" className="btn btn-ghost" onClick={onBack}>
        ← Back to results
      </button>

      <h2>Find Songs</h2>
      <p className="modal-subtitle">Pick how you want to narrow things down.</p>

      <div className="picker-chooser-list">
        <button type="button" className="picker-chooser-option" onClick={onStartGuidedPicker}>
          <span className="picker-chooser-option-title">Guided Picker</span>
          <span className="picker-chooser-option-desc">
            One category at a time — pick a value and move to the next. Good when you're not sure yet what you're
            looking for.
          </span>
        </button>
        <button type="button" className="picker-chooser-option" onClick={onStartGenrePicker}>
          <span className="picker-chooser-option-title">Genre Picker</span>
          <span className="picker-chooser-option-desc">
            Jump straight to picking a genre — for when you already know the style you want.
          </span>
        </button>
        <button type="button" className="picker-chooser-option" onClick={onStartScatterPicker}>
          <span className="picker-chooser-option-title">Filter Picker</span>
          <span className="picker-chooser-option-desc">
            See every enabled category at once and tap anything that looks interesting, mixing and matching across
            all of them.
          </span>
        </button>
      </div>
    </div>
  );
}
