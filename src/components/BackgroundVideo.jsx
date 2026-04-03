export default function BackgroundVideo() {
  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .bg-video { display: none; }
        }
      `}</style>
      <video
        className="bg-video"
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
          filter: 'blur(8px)',
          transform: 'scale(1.05)',
          pointerEvents: 'none',
        }}
        src="/video/bg.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="none"
      />
    </>
  );
}
