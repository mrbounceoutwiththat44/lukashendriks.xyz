import { useParams, useNavigate } from 'react-router-dom';
import { projects } from '../data/projects';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const project = projects.find((p) => p.id === id);

  if (!project) {
    return (
      <div style={{ padding: '80px 48px', color: 'var(--text)', fontSize: '11px' }}>
        Project not found.
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--bg)',
      minHeight: '100vh',
      paddingTop: '36px',
      display: 'flex',
    }}>
      {/* Metadata column */}
      <div style={{
        width: 220,
        minWidth: 220,
        padding: '48px 28px',
        borderRight: '1px solid var(--panel-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            fontSize: '11px',
            color: 'var(--text)',
            textAlign: 'left',
            padding: 0,
          }}
          onMouseEnter={e => e.target.style.color = 'var(--text-hover)'}
          onMouseLeave={e => e.target.style.color = 'var(--text)'}
        >
          ← Back
        </button>

        {[
          { label: 'Project', value: project.id },
          { label: 'Title', value: project.title },
          { label: 'Year', value: project.year },
          { label: 'Medium', value: project.medium },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize: '9px', color: 'var(--panel-border)', marginBottom: 5 }}>
              {label}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text)', lineHeight: 1.5 }}>
              {value}
            </div>
          </div>
        ))}

        <div>
          <div style={{ fontSize: '9px', color: 'var(--panel-border)', marginBottom: 5 }}>
            Description
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text)', lineHeight: 1.8 }}>
            {project.description}
          </div>
        </div>
      </div>

      {/* Image area */}
      <div style={{
        flex: 1,
        padding: '48px 40px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
      }}>
        {project.images && project.images.length > 0 ? (
          project.images.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              style={{ width: '100%', display: 'block' }}
            />
          ))
        ) : (
          <div style={{
            border: '1px solid var(--panel-border)',
            height: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            color: 'var(--panel-border)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            No images yet
          </div>
        )}
      </div>
    </div>
  );
}
