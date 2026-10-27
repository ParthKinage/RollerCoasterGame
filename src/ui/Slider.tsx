interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  format?: (v: number) => string;
  onChange: (v: number) => void;
  disabled?: boolean;
}

export function Slider({ label, value, min, max, step = 1, unit = '', format, onChange, disabled }: Props) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <label className={`block ${disabled ? 'opacity-40' : ''}`}>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-slate-200">{label}</span>
        <span className="font-semibold tabular-nums text-white">{format ? format(value) : `${Math.round(value * 100) / 100}${unit}`}</span>
      </div>
      <input
        type="range"
        className="w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        style={{ ['--fill' as string]: `${fill}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
