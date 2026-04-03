// Renders curved SVG connector lines from the active panel to related panels.
// panelRects: { [id]: { x, y, w, h } }
// activeId: string
// relatedIds: string[]

export default function Connectors({ panelRects, activeId, relatedIds }) {
  if (!activeId || !panelRects[activeId]) return null;

  const from = panelRects[activeId];
  const fromCx = from.x + from.w / 2;
  const fromCy = from.y + from.h / 2;

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 500,
      }}
    >
      {relatedIds.map((id) => {
        const to = panelRects[id];
        if (!to) return null;
        const toCx = to.x + to.w / 2;
        const toCy = to.y + to.h / 2;

        // Control points for cubic bezier — curve bows away from the midpoint
        const mx = (fromCx + toCx) / 2;
        const my = (fromCy + toCy) / 2;
        const dx = toCx - fromCx;
        const dy = toCy - fromCy;
        // Perpendicular offset for curvature
        const perp = 60;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const cx1 = mx - (dy / len) * perp;
        const cy1 = my + (dx / len) * perp;

        return (
          <path
            key={id}
            d={`M ${fromCx} ${fromCy} Q ${cx1} ${cy1} ${toCx} ${toCy}`}
            stroke="var(--accent)"
            strokeWidth="1"
            strokeOpacity="0.5"
            fill="none"
            strokeDasharray="4 3"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="0"
              to="-28"
              dur="1.2s"
              repeatCount="indefinite"
            />
          </path>
        );
      })}
    </svg>
  );
}
