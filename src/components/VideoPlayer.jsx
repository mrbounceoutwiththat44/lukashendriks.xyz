import { useRef, useState, useEffect, useCallback } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';

function fmt(s) {
  if (!s || isNaN(s)) return '00:00';
  const m   = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

const IconUnmuted = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ display: 'block' }}>
    <path d="M1 4.5H3.5L6.5 2V11L3.5 8.5H1V4.5Z" fill="currentColor"/>
    <path d="M8.5 4.5C9.8 5.3 9.8 7.7 8.5 8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M10.2 3C12.3 4.4 12.3 8.6 10.2 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

const IconFullscreen = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ display: 'block' }}>
    <polyline points="1,4 1,1 4,1"   stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="9,1 12,1 12,4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="12,9 12,12 9,12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="4,12 1,12 1,9"  stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconMuted = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ display: 'block' }}>
    <path d="M1 4.5H3.5L6.5 2V11L3.5 8.5H1V4.5Z" fill="currentColor"/>
    <line x1="9" y1="4" x2="12" y2="9"   stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <line x1="12" y1="4" x2="9"  y2="9"  stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

export default function VideoPlayer({ src }) {
  const isMobile = useIsMobile();

  const videoRef    = useRef(null);
  const barRef      = useRef(null);
  const hideTimer   = useRef(null);

  const [playing,    setPlaying]    = useState(false);
  const [muted,      setMuted]      = useState(true); // always start muted for autoplay
  const [current,    setCurrent]    = useState(0);
  const [duration,   setDuration]   = useState(0);
  const [visible,    setVisible]    = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // ── Video event listeners + autoplay ────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {});

    const onTime  = () => setCurrent(v.currentTime);
    const onMeta  = () => setDuration(v.duration);
    const onPlay  = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);

    v.addEventListener('timeupdate',     onTime);
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('play',           onPlay);
    v.addEventListener('pause',          onPause);
    v.addEventListener('ended',          onEnded);
    return () => {
      v.removeEventListener('timeupdate',     onTime);
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('play',           onPlay);
      v.removeEventListener('pause',          onPause);
      v.removeEventListener('ended',          onEnded);
    };
  }, []);

  // ── Play / pause ─────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play(); else v.pause();
  }, []);

  // ── Mute ─────────────────────────────────────────────────────────────────
  const toggleMute = useCallback((e) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  // ── Controls show / hide (desktop only) ──────────────────────────────────
  const showControls = useCallback(() => {
    if (isMobile) return;
    setVisible(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setVisible(false), 2000);
  }, [isMobile]);

  const hideControls = useCallback(() => {
    if (isMobile) return;
    clearTimeout(hideTimer.current);
    setVisible(false);
  }, [isMobile]);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  // ── Fullscreen ────────────────────────────────────────────────────────────
  const toggleFullscreen = useCallback((e) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    // iOS Safari requires webkitEnterFullscreen on the video element itself
    if (v.webkitEnterFullscreen) {
      v.webkitEnterFullscreen();
    } else if (!document.fullscreenElement) {
      v.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // ── Scrub ─────────────────────────────────────────────────────────────────
  const seek = useCallback((clientX) => {
    const bar = barRef.current;
    const v   = videoRef.current;
    if (!bar || !v || !v.duration) return;
    const rect  = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    v.currentTime = ratio * v.duration;
  }, []);

  const onBarMouseDown = useCallback((e) => {
    e.stopPropagation();
    seek(e.clientX);
    const onMove = (mv) => seek(mv.clientX);
    const onUp   = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
  }, [seek]);

  const onBarTouchStart = useCallback((e) => {
    e.stopPropagation();
    seek(e.touches[0].clientX);
    const onMove = (mv) => seek(mv.touches[0].clientX);
    const onEnd  = () => {
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend',  onEnd);
    };
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend',  onEnd);
  }, [seek]);

  const progress = duration ? current / duration : 0;

  // On mobile: controls always visible, full-width layout
  const controlsOpacity = isMobile ? 1 : (visible ? 1 : 0);

  return (
    <div
      onMouseMove={showControls}
      onMouseEnter={showControls}
      onMouseLeave={hideControls}
      style={{
        position:   'relative',
        height:     isMobile ? 'auto' : '100%',
        width:      isMobile ? '100%' : 'auto',
        flexShrink: isMobile ? 0 : 0,
        display:    'inline-flex',
        alignItems: 'stretch',
      }}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={src}
        loop
        playsInline
        preload="metadata"
        style={{
          height:     isMobile ? 'auto' : '100%',
          width:      isMobile ? '100%' : 'auto',
          display:    'block',
          userSelect: 'none',
        }}
      />

      {/* Click/tap-to-play overlay — sits above video, below controls */}
      <div
        onClick={togglePlay}
        onTouchEnd={(e) => { e.preventDefault(); togglePlay(); }}
        style={{
          position: 'absolute',
          inset:    0,
          cursor:   'pointer',
          zIndex:   1,
        }}
      />

      {/* Control bar — progress + timecode + mute */}
      <div
        style={{
          position:             'absolute',
          bottom:               0,
          left:                 0,
          right:                0,
          zIndex:               2,
          opacity:              controlsOpacity,
          transition:           isMobile ? 'none' : 'opacity 0.35s ease',
          background:           'rgba(10,10,10,0.45)',
          backdropFilter:       'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        {/* Progress bar */}
        <div
          ref={barRef}
          onMouseDown={onBarMouseDown}
          onTouchStart={onBarTouchStart}
          style={{
            height:     '3px',
            background: '#2a2a2a',
            cursor:     'pointer',
            position:   'relative',
          }}
        >
          <div style={{
            position:      'absolute',
            left:          0,
            top:           0,
            height:        '100%',
            width:         `${progress * 100}%`,
            background:    '#c8c8c8',
            pointerEvents: 'none',
          }} />
        </div>

        {/* Timecode (desktop) + mute + fullscreen (both) */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: isMobile ? 'flex-end' : 'space-between',
          padding:        isMobile ? '6px 10px' : '5px 10px',
          gap:            '8px',
        }}>
          {!isMobile && (
            <span style={{
              fontSize:      '9px',
              letterSpacing: '0.05em',
              color:         'var(--text)',
              fontFamily:    'var(--font-sans)',
              fontVariantNumeric: 'tabular-nums',
              userSelect:    'none',
            }}>
              {fmt(current)} / {fmt(duration)}
            </span>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={toggleMute}
              style={{
                background:  'none',
                border:      'none',
                padding:     isMobile ? '4px' : 0,
                cursor:      'pointer',
                color:       'var(--text)',
                display:     'flex',
                alignItems:  'center',
                opacity:     0.85,
                flexShrink:  0,
                touchAction: 'manipulation',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0.85'}
            >
              {muted ? <IconMuted /> : <IconUnmuted />}
            </button>

            <button
              onClick={toggleFullscreen}
              style={{
                background:  'none',
                border:      'none',
                padding:     isMobile ? '4px' : 0,
                cursor:      'pointer',
                color:       'var(--text)',
                display:     'flex',
                alignItems:  'center',
                opacity:     0.85,
                flexShrink:  0,
                touchAction: 'manipulation',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0.85'}
            >
              <IconFullscreen />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
