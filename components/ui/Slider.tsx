import React from 'react';

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
}

const Slider: React.FC<SliderProps> = ({ value, onChange, min = 1, max = 10, step = 0.1, label }) => {
  return (
    <div className="w-full">
      <label htmlFor="slider" className="block text-sm font-medium text-gray-700">{label}: <span className="font-bold text-blue-600">{value.toFixed(1)}</span></label>
      <input
        id="slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
};

export default Slider;