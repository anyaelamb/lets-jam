interface RangeSliderProps {
  bounds: [number, number];
  value: [number, number];
  onChange: (value: [number, number]) => void;
}

export default function RangeSlider({ bounds, value, onChange }: RangeSliderProps) {
  const [boundMin, boundMax] = bounds;
  const [lo, hi] = value;
  const span = Math.max(boundMax - boundMin, 1);
  const loPct = ((lo - boundMin) / span) * 100;
  const hiPct = ((hi - boundMin) / span) * 100;

  function setLo(next: number) {
    const clamped = Math.min(Math.max(next, boundMin), hi);
    onChange([clamped, hi]);
  }

  function setHi(next: number) {
    const clamped = Math.max(Math.min(next, boundMax), lo);
    onChange([lo, clamped]);
  }

  return (
    <div className="range-slider">
      <div className="range-slider-track-wrap">
        <div className="range-slider-track" />
        <div
          className="range-slider-track-fill"
          style={{ left: `${loPct}%`, right: `${100 - hiPct}%` }}
        />
        <input
          type="range"
          min={boundMin}
          max={boundMax}
          value={lo}
          onChange={(e) => setLo(Number(e.target.value))}
          className="range-slider-input range-slider-input-lo"
        />
        <input
          type="range"
          min={boundMin}
          max={boundMax}
          value={hi}
          onChange={(e) => setHi(Number(e.target.value))}
          className="range-slider-input range-slider-input-hi"
        />
      </div>
      <div className="range-slider-numbers">
        <input
          type="number"
          value={lo}
          min={boundMin}
          max={hi}
          onChange={(e) => setLo(Number(e.target.value))}
        />
        <span>to</span>
        <input
          type="number"
          value={hi}
          min={lo}
          max={boundMax}
          onChange={(e) => setHi(Number(e.target.value))}
        />
      </div>
    </div>
  );
}
