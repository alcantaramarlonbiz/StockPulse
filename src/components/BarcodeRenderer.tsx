import React, { useMemo } from 'react';

interface BarcodeRendererProps {
  value: string;
  height?: number;
  showText?: boolean;
  className?: string;
}

/**
 * Generates an SVG 1D barcode pattern deterministically from the string
 * Suitable for on-screen scanning and label printing
 */
export const BarcodeRenderer: React.FC<BarcodeRendererProps> = ({
  value,
  height = 48,
  showText = true,
  className = ''
}) => {
  const bars = useMemo(() => {
    // Generate deterministic pattern based on characters
    const clean = (value || '000000').toUpperCase();
    const pattern: number[] = [2, 1, 1, 2]; // Start guard

    for (let i = 0; i < clean.length; i++) {
      const code = clean.charCodeAt(i);
      // Alternate between bar widths (1, 2, 3) and space widths (1, 2)
      pattern.push(((code * 7) % 3) + 1);
      pattern.push(((code * 3) % 2) + 1);
      pattern.push(((code * 5) % 3) + 1);
      pattern.push(((code * 11) % 2) + 1);
    }

    pattern.push(2, 1, 2, 1, 2); // Stop guard
    return pattern;
  }, [value]);

  const totalWidth = useMemo(() => {
    return bars.reduce((acc, curr) => acc + curr, 0);
  }, [bars]);

  let currentX = 0;

  return (
    <div className={`inline-flex flex-col items-center bg-white p-2 rounded border border-slate-200 select-none ${className}`}>
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="w-full h-auto max-w-[200px]"
        style={{ minHeight: `${height}px` }}
        preserveAspectRatio="none"
      >
        {bars.map((width, idx) => {
          const x = currentX;
          currentX += width;
          // Even indexes are bars, odd indexes are spaces
          if (idx % 2 === 0) {
            return (
              <rect
                key={idx}
                x={x}
                y={0}
                width={width}
                height={height}
                fill="#0f172a"
              />
            );
          }
          return null;
        })}
      </svg>
      {showText && (
        <span className="text-[11px] font-mono tracking-widest text-slate-700 mt-1 font-semibold">
          {value}
        </span>
      )}
    </div>
  );
};
