// Horizontal info drawer that slides up when a connected panel is clicked.
export default function InfoWindow({ project, onDismiss }) {
  if (!project) return null;

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 800,
        cursor: 'default',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          bottom: 48, // above status bar
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(800px, 90vw)',
          background: 'var(--titlebar-bg)',
          border: '1px solid var(--panel-border)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
          gap: '0',
          animation: 'slideUp 0.2s ease',
        }}
      >
        {[
          { label: 'Project', value: project.id },
          { label: 'Year', value: project.year },
          { label: 'Medium', value: project.medium },
          { label: 'Title', value: project.title },
        ].map(({ label, value }) => (
          <div key={label} style={{
            padding: '12px 16px',
            borderRight: '1px solid var(--panel-border)',
          }}>
            <div style={{ fontSize: '9px', color: 'var(--panel-border)', marginBottom: 4 }}>
              {label}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text)' }}>
              {value}
            </div>
          </div>
        ))}
        <style>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translateX(-50%) translateY(8px); }
            to   { opacity: 1; transform: translateX(-50%) translateY(0); }
          }
        `}</style>
      </div>
    </div>
  );
}
