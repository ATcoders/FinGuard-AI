import { useEffect, useRef } from 'react';
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import { inr, inrCompact, monthLabel } from '../utils/format';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

export default function SpendChart({ data }) {
  const canvas = useRef(null);

  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    const v = (name) => css.getPropertyValue(name).trim();
    const mono = v('--font-mono');

    const chart = new Chart(canvas.current, {
      type: 'bar',
      data: {
        labels: data.map((d) => monthLabel(d.month)),
        datasets: [{
          data: data.map((d) => Number(d.amount)),
          backgroundColor: v('--primary'),
          hoverBackgroundColor: v('--brass'),
          borderRadius: 0,
          maxBarThickness: 38,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: v('--ink'),
            titleFont: { family: mono, size: 11 },
            bodyFont: { family: mono, size: 13 },
            padding: 10,
            cornerRadius: 2,
            displayColors: false,
            callbacks: {
              label: (c) => inr(c.parsed.y),
              afterLabel: (c) => `${data[c.dataIndex].count} invoice${data[c.dataIndex].count === 1 ? '' : 's'}`,
            },
          },
        },
        scales: {
          x: { grid: { display: false }, border: { color: v('--ink') }, ticks: { font: { family: mono, size: 11 }, color: v('--ink-faint') } },
          y: {
            beginAtZero: true,
            border: { display: false },
            grid: { color: v('--rule'), borderDash: [2, 4] },
            ticks: { font: { family: mono, size: 11 }, color: v('--ink-faint'), callback: (val) => inrCompact(val), maxTicksLimit: 6 },
          },
        },
      },
    });
    return () => chart.destroy();
  }, [data]);

  return (
    <div className="chart-box" role="img" aria-label="Monthly invoice value for the last twelve months">
      <canvas ref={canvas} />
    </div>
  );
}
