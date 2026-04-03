export default function About() {
  return (
    <div style={{
      background: 'var(--bg)',
      minHeight: '100vh',
      paddingTop: '36px',
      display: 'flex',
      alignItems: 'flex-start',
    }}>
      <div style={{
        padding: '60px 48px',
        maxWidth: 480,
      }}>
        <p style={{
          fontSize: '12px',
          lineHeight: '1.9',
          color: 'var(--text)',
          letterSpacing: '0.03em',
          marginBottom: '48px',
        }}>
          Lukas Hendriks' work spans architecture, computation, and moving image.
          Based in Los Angeles, currently studying Media Arts + Practice at USC School of Cinematic Arts.
          Interested in systems, materials, and speed.
        </p>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          fontSize: '11px',
          letterSpacing: '0.08em',
          color: 'var(--text)',
        }}>
          <a
            href="mailto:lhendrik@usc.edu"
            style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}
          >
            lhendrik@usc.edu
          </a>
          <a
            href="https://instagram.com/lukas_hendriks"
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}
          >
            Instagram
          </a>
          <a
            href="https://www.linkedin.com/in/lukas-hendriks"
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}
          >
            LinkedIn
          </a>
        </div>
      </div>
    </div>
  );
}
