interface PickerChooserProps {
  onBack: () => void;
  onStartGuidedPicker: () => void;
  onStartGenrePicker: () => void;
  onStartScatterPicker: () => void;
  onStartRandomTen: () => void;
}

export default function PickerChooser({
  onBack,
  onStartGuidedPicker,
  onStartGenrePicker,
  onStartScatterPicker,
  onStartRandomTen,
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
          <span className="picker-chooser-option-desc">Answer one question at a time.</span>
        </button>
        <button type="button" className="picker-chooser-option" onClick={onStartGenrePicker}>
          <span className="picker-chooser-option-title">Genre Picker</span>
          <span className="picker-chooser-option-desc">Jump straight to a genre.</span>
        </button>
        <button type="button" className="picker-chooser-option" onClick={onStartScatterPicker}>
          <span className="picker-chooser-option-title">Filter Picker</span>
          <span className="picker-chooser-option-desc">See everything, tap what's interesting.</span>
        </button>
        <button type="button" className="picker-chooser-option" onClick={onStartRandomTen}>
          <span className="picker-chooser-option-title">Random 10</span>
          <span className="picker-chooser-option-desc">10 random songs you already know.</span>
        </button>
      </div>
    </div>
  );
}
