import { useState, useEffect, useRef, useCallback } from 'react';
import VideoPlayer from './VideoPlayer';
import { useIsMobile } from '../hooks/useIsMobile';

// Cursor-hiding hover overlay — rAF lerp for smooth GPU-composited movement
const OVERLAY_LERP = 0.18;

function GalleryItem({ src, projectTitle, children }) {
  const containerRef = useRef(null);
  const overlayRef   = useRef(null);
  const targetRef    = useRef({ x: 0, y: 0 });
  const currentRef   = useRef({ x: 0, y: 0 });
  const rafRef       = useRef(null);
  const [visible, setVisible] = useState(false);

  const filename = src.split('/').pop().replace(/\.[^.]+$/, '');

  const clamp = useCallback((lx, ly) => {
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(lx + 16, rect.width  - 160)),
      y: Math.max(0, Math.min(ly + 16, rect.height -  36)),
    };
  }, []);

  const stopRaf = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, []);

  const startRaf = useCallback(() => {
    const tick = () => {
      const cur = currentRef.current;
      const tgt = targetRef.current;
      const nx = cur.x + (tgt.x - cur.x) * OVERLAY_LERP;
      const ny = cur.y + (tgt.y - cur.y) * OVERLAY_LERP;
      currentRef.current = { x: nx, y: ny };
      if (overlayRef.current) {
        overlayRef.current.style.transform = `translate3d(${nx}px, ${ny}px, 0)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const onMouseEnter = useCallback((e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const snapped = clamp(e.clientX - rect.left, e.clientY - rect.top);
    // Snap current to cursor so overlay appears exactly at cursor, then lerp from there
    targetRef.current  = snapped;
    currentRef.current = snapped;
    setVisible(true);
    startRaf();
  }, [clamp, startRaf]);

  const onMouseMove = useCallback((e) => {
    const rect = containerRef.current.getBoundingClientRect();
    targetRef.current = clamp(e.clientX - rect.left, e.clientY - rect.top);
  }, [clamp]);

  const onMouseLeave = useCallback(() => {
    stopRaf();
    setVisible(false);
  }, [stopRaf]);

  useEffect(() => () => stopRaf(), [stopRaf]);

  return (
    <div
      ref={containerRef}
      onMouseEnter={onMouseEnter}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ position: 'relative', height: '100%', flexShrink: 0, cursor: 'none' }}
    >
      {children}
      {visible && (
        <div
          ref={overlayRef}
          style={{
            position:      'absolute',
            left:          0,
            top:           0,
            transform:     `translate3d(${currentRef.current.x}px, ${currentRef.current.y}px, 0)`,
            willChange:    'transform',
            pointerEvents: 'none',
            color:         '#FF0051',
            fontFamily:    "'Helvetica Neue', Helvetica, Arial, sans-serif",
            fontSize:      '12px',
            lineHeight:    1.4,
            whiteSpace:    'nowrap',
            zIndex:        10,
          }}
        >
          <div>{projectTitle}</div>
          <div>{filename}</div>
        </div>
      )}
    </div>
  );
}

const TITLEBAR_H  = 28;
const META_H      = 148;
const GALLERY_GAP = 2;

export default function ExpandedPanel({ project, sourceRect, onClose }) {
  const isMobile = useIsMobile();
  const [phase, setPhase] = useState('entering'); // entering → open → closing
  const [contentVisible, setContentVisible] = useState(false);

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Desktop: 65% × 60% centered. Mobile: 90% wide, 72% tall, centered.
  const tw = isMobile ? Math.floor(vw * 0.90) : Math.floor(vw * 0.65);
  const th = isMobile ? Math.floor(vh * 0.72) : Math.floor(vh * 0.60);
  const tx = Math.floor((vw - tw) / 2);
  const ty = Math.floor((vh - th) / 2);

  // Scale+translate from the source panel to the expanded rect
  const dx     = (sourceRect.x + sourceRect.w / 2) - (tx + tw / 2);
  const dy     = (sourceRect.y + sourceRect.h / 2) - (ty + th / 2);
  const scaleX = sourceRect.w / tw;
  const scaleY = sourceRect.h / th;
  const collapsedTransform = `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`;

  // Double-rAF so the first render lands at collapsed, second triggers the transition
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setPhase('open'))
    );
    return () => cancelAnimationFrame(id);
  }, []);

  const close = useCallback(() => {
    setContentVisible(false);
    setPhase('closing');
    setTimeout(onClose, 240);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const isOpen    = phase === 'open';
  const isClosing = phase === 'closing';

  const panelTransform  = (phase === 'entering' || isClosing) ? collapsedTransform : 'translate(0,0) scale(1,1)';
  const panelTransition = isClosing
    ? 'transform 240ms ease-in, opacity 240ms ease-in'
    : isOpen
      ? 'transform 240ms ease-out, opacity 240ms ease-out'
      : 'none';

  // ── Desktop horizontal gallery scroll ─────────────────────────────────────
  const galleryRef = useRef(null);
  const dragRef    = useRef(null);

  const onGalleryWheel = useCallback((e) => {
    e.preventDefault();
    if (galleryRef.current) galleryRef.current.scrollLeft += e.deltaY + e.deltaX;
  }, []);

  const onGalleryMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    dragRef.current = { startX: e.clientX, scrollLeft: galleryRef.current.scrollLeft };
    const onMove = (mv) => {
      if (!dragRef.current) return;
      galleryRef.current.scrollLeft = dragRef.current.scrollLeft - (mv.clientX - dragRef.current.startX);
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  const galleryH = th - TITLEBAR_H - META_H;

  const images = project.images && project.images.length > 0
    ? project.images
    : project.thumbnail ? [project.thumbnail] : [];
  const videos = project.videos || [];
  const hasMedia = images.length > 0 || videos.length > 0;

  // ── Mobile layout ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {/* Scrim — invisible on mobile (panel is full-screen) but handles backdrop */}
        <div
          style={{
            position:   'fixed',
            inset:      0,
            zIndex:     2000,
            background: 'rgba(10,10,10,0.55)',
            opacity:    isOpen ? 1 : 0,
            transition: isClosing ? 'opacity 240ms ease-in' : isOpen ? 'opacity 240ms ease-out' : 'none',
          }}
        />

        {/* Centered card */}
        <div
          onTransitionEnd={(e) => {
            if (e.propertyName === 'transform' && phase === 'open') setContentVisible(true);
          }}
          style={{
            position:        'fixed',
            left:            tx,
            top:             ty,
            width:           tw,
            height:          th,
            zIndex:          2001,
            background:      'rgba(10,10,10,0.92)',
            backdropFilter:  'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border:          '1px solid var(--panel-border)',
            display:         'flex',
            flexDirection:   'column',
            overflow:        'hidden',
            transform:       panelTransform,
            transformOrigin: 'center center',
            opacity:         phase === 'entering' ? 0 : 1,
            transition:      panelTransition,
            willChange:      'transform, opacity',
          }}
        >
          {/* Title bar */}
          <div style={{
            height:         TITLEBAR_H,
            minHeight:      TITLEBAR_H,
            flexShrink:     0,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            padding:        '0 16px',
            borderBottom:   '1px solid var(--panel-border)',
          }}>
            <span style={{ fontSize: '10px', letterSpacing: '0.08em', color: 'var(--text)' }}>
              {project.title}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); close(); }}
              style={{
                width:          22,
                height:         22,
                background:     'var(--close-btn)',
                border:         '1px solid var(--panel-border)',
                color:          'var(--text)',
                fontSize:       '14px',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                flexShrink:     0,
                padding:        0,
                cursor:         'pointer',
                lineHeight:     1,
                touchAction:    'manipulation',
              }}
            >
              ×
            </button>
          </div>

          {/* Scrollable content — fades in after expand animation */}
          <div
            style={{
              flex:      1,
              overflowY: 'auto',
              overflowX: 'hidden',
              WebkitOverflowScrolling: 'touch',
              opacity:    contentVisible ? 1 : 0,
              transition: contentVisible ? 'opacity 0.18s ease' : 'none',
            }}
          >
            {/* Meta */}
            <div style={{
              padding:      '20px 16px 16px',
              borderBottom: '1px solid var(--panel-border)',
            }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
                {project.title}
              </div>
              {[project.year, project.medium, project.type].filter(Boolean).map((val, i) => (
                <div key={i} style={{ fontSize: '11px', color: 'var(--panel-border)', marginBottom: '4px' }}>
                  {val}
                </div>
              ))}
              {project.description ? (
                <p style={{
                  fontSize:      '12px',
                  color:         'var(--text)',
                  lineHeight:    1.75,
                  margin:        '12px 0 0',
                  letterSpacing: '-0.01em',
                }}>
                  {project.description}
                </p>
              ) : null}
            </div>

            {/* Media — stacked full-width */}
            {hasMedia && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '10px 0 20px' }}>
                {images.map((src, i) => (
                  <img
                    key={`img-${i}`}
                    src={src}
                    alt=""
                    draggable={false}
                    style={{ width: '100%', display: 'block', objectFit: 'cover' }}
                  />
                ))}
                {videos.map((v, i) => {
                  const src = typeof v === 'string' ? v : v.src;
                  return <VideoPlayer key={`vid-${i}`} src={src} />;
                })}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // ── Desktop layout ─────────────────────────────────────────────────────────
  return (
    <>
      {/* Scrim */}
      <div
        onClick={close}
        style={{
          position:   'fixed',
          inset:      0,
          zIndex:     2000,
          background: 'rgba(10,10,10,0.55)',
          opacity:    isOpen ? 1 : 0,
          transition: isClosing ? 'opacity 240ms ease-in' : isOpen ? 'opacity 240ms ease-out' : 'none',
        }}
      />

      {/* Floating panel — always rendered at final rect, moved via transform */}
      <div
        onTransitionEnd={(e) => {
          if (e.propertyName === 'transform' && phase === 'open') setContentVisible(true);
        }}
        style={{
          position:        'fixed',
          left:            tx,
          top:             ty,
          width:           tw,
          height:          th,
          zIndex:          2001,
          background:      'rgba(10,10,10,0.5)',
          backdropFilter:  'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border:          '1px solid var(--panel-border)',
          display:         'flex',
          flexDirection:   'column',
          overflow:        'hidden',
          transform:       panelTransform,
          transformOrigin: 'center center',
          opacity:         phase === 'entering' ? 0 : 1,
          transition:      panelTransition,
          willChange:      'transform, opacity',
        }}
      >
        {/* Title bar */}
        <div style={{
          height:         TITLEBAR_H,
          minHeight:      TITLEBAR_H,
          flexShrink:     0,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '0 12px',
          borderBottom:   '1px solid var(--panel-border)',
        }}>
          <span style={{ fontSize: '9px', letterSpacing: '0.08em', color: 'var(--text)' }}>
            {project.title}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); close(); }}
            style={{
              width:          18,
              height:         18,
              background:     'var(--close-btn)',
              border:         '1px solid var(--panel-border)',
              color:          'var(--text)',
              fontSize:       '12px',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              flexShrink:     0,
              padding:        0,
              cursor:         'pointer',
              lineHeight:     1,
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--panel-border)'}
          >
            ×
          </button>
        </div>

        {/* Content — fades in after expand animation completes */}
        <div
          style={{
            flex:       1,
            display:    'flex',
            flexDirection: 'column',
            overflow:   'hidden',
            opacity:    contentVisible ? 1 : 0,
            transition: contentVisible ? 'opacity 0.18s ease' : 'none',
          }}
        >
          {/* Horizontal image gallery */}
          <div
            ref={galleryRef}
            className="gallery-scroll"
            onWheel={onGalleryWheel}
            onMouseDown={onGalleryMouseDown}
            style={{
              height:          galleryH,
              minHeight:       galleryH,
              flexShrink:      0,
              display:         'flex',
              flexDirection:   'row',
              alignItems:      'stretch',
              gap:             GALLERY_GAP,
              overflowX:       'scroll',
              overflowY:       'hidden',
              cursor:          'grab',
              scrollbarWidth:  'none',
              msOverflowStyle: 'none',
            }}
          >
            {hasMedia ? (
              <>
                {images.map((src, i) => (
                  <GalleryItem key={`img-${i}`} src={src} projectTitle={project.title}>
                    <img
                      src={src}
                      alt=""
                      draggable={false}
                      style={{ height: '100%', width: 'auto', display: 'block', objectFit: 'cover', userSelect: 'none' }}
                    />
                  </GalleryItem>
                ))}
                {videos.map((v, i) => {
                  const src = typeof v === 'string' ? v : v.src;
                  return (
                    <GalleryItem key={`vid-${i}`} src={src} projectTitle={project.title}>
                      <VideoPlayer src={src} />
                    </GalleryItem>
                  );
                })}
              </>
            ) : (
              <div style={{
                width:          '100%',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                fontSize:       '10px',
                color:          'var(--panel-border)',
                letterSpacing:  '0.05em',
              }}>
                No images
              </div>
            )}
          </div>

          {/* Metadata + description */}
          <div style={{
            height:        META_H,
            minHeight:     META_H,
            flexShrink:    0,
            display:       'flex',
            flexDirection: 'row',
            borderTop:     '1px solid var(--panel-border)',
          }}>
            {/* Left: metadata list */}
            <div style={{
              width:         220,
              minWidth:      220,
              padding:       '18px 20px',
              borderRight:   '1px solid var(--panel-border)',
              display:       'flex',
              flexDirection: 'column',
              gap:           '5px',
            }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                {project.title}
              </div>
              {[project.year, project.medium, project.type].filter(Boolean).map((val, i) => (
                <div key={i} style={{ fontSize: '10px', color: 'var(--panel-border)', letterSpacing: '0.01em' }}>
                  {val}
                </div>
              ))}
            </div>

            {/* Right: description */}
            <div style={{ flex: 1, padding: '18px 24px', display: 'flex', alignItems: 'flex-start' }}>
              <p style={{
                fontSize:      '11px',
                color:         'var(--text)',
                lineHeight:    1.75,
                margin:        0,
                letterSpacing: '-0.01em',
              }}>
                {project.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
