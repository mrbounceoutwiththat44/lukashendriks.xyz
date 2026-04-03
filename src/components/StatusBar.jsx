export default function StatusBar({ project, onViewProject }) {
  if (!project) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      borderTop: '1px solid var(--panel-border)',
      background: 'var(--titlebar-bg)',
      zIndex: 900,
      fontSize: '11px',
      animation: 'fadeIn 0.15s ease',
    }}>
      <span style={{ color: 'var(--text)' }}>{project.id} — {project.title}</span>
      <button
        onClick={onViewProject}
        style={{
          border: '1px solid var(--panel-border)',
          padding: '4px 14px',
          fontSize: '11px',
          color: 'var(--text)',
          transition: 'border-color 0.15s, color 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--accent)';
          e.currentTarget.style.color = 'var(--text-hover)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--panel-border)';
          e.currentTarget.style.color = 'var(--text)';
        }}
      >
        View project →

      </button>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
