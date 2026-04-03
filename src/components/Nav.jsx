import { Link, useLocation } from 'react-router-dom';

export default function Nav() {
  const location = useLocation();

  return (
    <>
      {/* Logo — fixed top-left, independent */}
      <Link
        to="/"
        style={{
          position: 'fixed',
          top: 20,
          left: 20,
          zIndex: 9999,
          display: 'block',
          lineHeight: 0,
        }}
      >
        <img src="/logo.svg" alt="Lukas Hendriks" style={{ height: 60, width: 'auto', display: 'block' }} />
      </Link>

      {/* Nav links — fixed top-right, independent */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          zIndex: 9999,
          display: 'flex',
          gap: '28px',
          padding: '20px 20px',
          fontSize: '11px',
          fontWeight: 500,
          letterSpacing: '-0.02em',
        }}
      >
        {[
          { label: 'Work',  to: '/' },
          { label: 'About', to: '/about' },
        ].map(({ label, to }) => (
          <Link
            key={label}
            to={to}
            style={{
              color: location.pathname === to ? 'var(--text-hover)' : 'var(--text)',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.target.style.color = 'var(--text-hover)'}
            onMouseLeave={e => e.target.style.color = location.pathname === to ? 'var(--text-hover)' : 'var(--text)'}
          >
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
