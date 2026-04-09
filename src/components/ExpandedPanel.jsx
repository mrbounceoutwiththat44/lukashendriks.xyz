import { useState, useEffect, useRef, useCallback } from 'react';
import VideoPlayer from './VideoPlayer';
import Img from './Img';
import { useIsMobile } from '../hooks/useIsMobile';

const OVERLAY_LERP = 0.18;
const TITLEBAR_H   = 28;
const META_H       = 148;

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

  // Scale+translate from source panel to expanded rect
  const dx     = (sourceRect.x + sourceRect.w / 2) - (tx + tw / 2);
  const dy     = (sourceRect.y + sourceRect.h / 2) - (ty + th / 2);
  const scaleX = sourceRect.w / tw;
  const scaleY = sourceRect.h / th;
  const collapsedTransform = `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`;

  // Double-rAF so first render lands at collapsed, second triggers the transition
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

  // ── Desktop gallery — unified mouse tracking ───────────────────────────────
  const galleryRef     = useRef(null);
  const dragRef        = useRef(null);
  const overlayRef     = useRef(null);
  const overlayTarget  = useRef({ x: 0, y: 0 });
  const overlayCurrent = useRef({ x: 0, y: 0 });
  const overlayRafRef  = useRef(null);
  // Each entry: { el: DOMNode, title: string, filename: string }
  const itemInfoRef    = useRef([]);
  const lastItemIdx    = useRef(-1);
  const [labelVisible, setLabelVisible] = useState(false);
  const [labelText,    setLabelText]    = useState({ title: '', filename: '' });

  const stopOverlayRaf = useCallback(() => {
    if (overlayRafRef.current) { cancelAnimationFrame(overlayRafRef.current); overlayRafRef.current = null; }
  }, []);

  useEffect(() => () => stopOverlayRaf(), [stopOverlayRaf]);

  const startOverlayRaf = useCallback(() => {
    const tick = () => {
      const cur = overlayCurrent.current;
      const tgt = overlayTarget.current;
      const nx = cur.x + (tgt.x - cur.x) * OVERLAY_LERP;
      const ny = cur.y + (tgt.y - cur.y) * OVERLAY_LERP;
      overlayCurrent.current = { x: nx, y: ny };
      if (overlayRef.current) {
        overlayRef.current.style.transform = `translate3d(${nx}px, ${ny}px, 0)`;
      }
      overlayRafRef.current = requestAnimationFrame(tick);
    };
    overlayRafRef.current = requestAnimationFrame(tick);
  }, []);

  const clampToGallery = useCallback((lx, ly) => {
    const rect = galleryRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(lx + 16, rect.width  - 160)),
      y: Math.max(0, Math.min(ly + 16, rect.height -  36)),
    };
  }, []);

  // Shared item detection — call from both mouseenter and mousemove
  const detectItem = useCallback((clientX) => {
    const items = itemInfoRef.current;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item?.el) continue;
      const ir = item.el.getBoundingClientRect();
      if (clientX >= ir.left && clientX < ir.right) {
        // Only trigger a re-render when crossing into a different item
        if (i !== lastItemIdx.current) {
          lastItemIdx.current = i;
          setLabelText({ title: item.title, filename: item.filename });
        }
        return;
      }
    }
  }, []);

  const onGalleryMouseEnter = useCallback((e) => {
    const rect = galleryRef.current.getBoundingClientRect();
    const snap = clampToGallery(e.clientX - rect.left, e.clientY - rect.top);
    overlayCurrent.current = snap;
    overlayTarget.current  = snap;
    lastItemIdx.current    = -1; // force text update on first enter
    detectItem(e.clientX);
    setLabelVisible(true);
    startOverlayRaf();
  }, [clampToGallery, detectItem, startOverlayRaf]);

  const onGalleryMouseLeave = useCallback(() => {
    stopOverlayRaf();
    setLabelVisible(false);
    lastItemIdx.current = -1;
  }, [stopOverlayRaf]);

  const onGalleryMouseMove = useCallback((e) => {
    const rect = galleryRef.current.getBoundingClientRect();
    overlayTarget.current = clampToGallery(e.clientX - rect.left, e.clientY - rect.top);
    detectItem(e.clientX);
  }, [clampToGallery, detectItem]);

  const onGalleryWheel = useCallback((e) => {
    e.preventDefault();
    if (galleryRef.current) galleryRef.current.scrollLeft += e.deltaY + e.deltaX;
  }, []);

  // Drag cursor flipped imperatively — avoids a React re-render per drag start/end
  const onGalleryMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (galleryRef.current) galleryRef.current.style.cursor = 'grabbing';
    dragRef.current = { startX: e.clientX, scrollLeft: galleryRef.current.scrollLeft };
    const onMove = (mv) => {
      if (!dragRef.current) return;
      galleryRef.current.scrollLeft = dragRef.current.scrollLeft - (mv.clientX - dragRef.current.startX);
    };
    const onUp = () => {
      dragRef.current = null;
      if (galleryRef.current) galleryRef.current.style.cursor = 'none';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  const galleryH = th - TITLEBAR_H - META_H;
  const images   = project.images?.length > 0 ? project.images : (project.thumbnail ? [project.thumbnail] : []);
  const videos   = project.videos || [];
  const hasMedia = images.length > 0 || videos.length > 0;

  // ── Mobile layout ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
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
        <div
          onTransitionEnd={(e) => {
            if (e.propertyName === 'transform' && phase === 'open') setContentVisible(true);
          }}
          style={{
            position:             'fixed',
            left:                 tx,
            top:                  ty,
            width:                tw,
            height:               th,
            zIndex:               2001,
            background:           'rgba(10,10,10,0.92)',
            backdropFilter:       'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border:               '1px solid var(--panel-border)',
            display:              'flex',
            flexDirection:        'column',
            overflow:             'hidden',
            transform:            panelTransform,
            transformOrigin:      'center center',
            opacity:              phase === 'entering' ? 0 : 1,
            transition:           panelTransition,
            willChange:           'transform, opacity',
          }}
        >
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
            >×</button>
          </div>
          <div
            style={{
              flex:                    1,
              overflowY:               'auto',
              overflowX:               'hidden',
              WebkitOverflowScrolling: 'touch',
              opacity:                 contentVisible ? 1 : 0,
              transition:              contentVisible ? 'opacity 0.18s ease' : 'none',
            }}
          >
            <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--panel-border)' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
                {project.title}
              </div>
              {[project.year, project.medium, project.type].filter(Boolean).map((val, i) => (
                <div key={i} style={{ fontSize: '11px', color: 'var(--panel-border)', marginBottom: '4px' }}>
                  {val}
                </div>
              ))}
              {project.description && (
                <p style={{ fontSize: '12px', color: 'var(--text)', lineHeight: 1.75, margin: '12px 0 0', letterSpacing: '-0.01em' }}>
                  {project.description}
                </p>
              )}
            </div>
            {hasMedia && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '10px 0 20px' }}>
                {images.map((src, i) => (
                  <Img
                    key={`img-${i}`}
                    src={src}
                    alt=""
                    draggable={false}
                    loading="lazy"
                    decoding="async"
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

      {/* Floating panel */}
      <div
        onTransitionEnd={(e) => {
          if (e.propertyName === 'transform' && phase === 'open') setContentVisible(true);
        }}
        style={{
          position:             'fixed',
          left:                 tx,
          top:                  ty,
          width:                tw,
          height:               th,
          zIndex:               2001,
          background:           'rgba(10,10,10,0.5)',
          backdropFilter:       'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border:               '1px solid var(--panel-border)',
          display:              'flex',
          flexDirection:        'column',
          overflow:             'hidden',
          transform:            panelTransform,
          transformOrigin:      'center center',
          opacity:              phase === 'entering' ? 0 : 1,
          transition:           panelTransition,
          willChange:           'transform, opacity',
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
          >×</button>
        </div>

        {/* Content */}
        <div
          style={{
            flex:          1,
            display:       'flex',
            flexDirection: 'column',
            overflow:      'hidden',
            opacity:       contentVisible ? 1 : 0,
            transition:    contentVisible ? 'opacity 0.18s ease' : 'none',
          }}
        >
          {/* Gallery wrapper — position:relative so the overlay is anchored to
              the visible area, not the scroll content inside */}
          <div style={{ position: 'relative', height: galleryH, minHeight: galleryH, flexShrink: 0 }}>
            <div
              ref={galleryRef}
              className="gallery-scroll"
              onWheel={onGalleryWheel}
              onMouseDown={onGalleryMouseDown}
              onMouseMove={onGalleryMouseMove}
              onMouseEnter={onGalleryMouseEnter}
              onMouseLeave={onGalleryMouseLeave}
              style={{
                position:        'absolute',
                inset:           0,
                display:         'flex',
                flexDirection:   'row',
                alignItems:      'stretch',
                overflowX:       'scroll',
                overflowY:       'hidden',
                cursor:          'none',
                scrollbarWidth:  'none',
                msOverflowStyle: 'none',
              }}
            >
              {hasMedia ? (
                <>
                  {images.map((src, i) => {
                    const filename = src.split('/').pop().replace(/\.[^.]+$/, '');
                    return (
                      <div
                        key={`img-${i}`}
                        ref={el => { if (el) itemInfoRef.current[i] = { el, title: project.title, filename }; }}
                        style={{ height: '100%', flexShrink: 0, overflow: 'hidden' }}
                      >
                        <Img
                          src={src}
                          alt=""
                          draggable={false}
                          loading="lazy"
                          decoding="async"
                          pictureStyle={{ display: 'block', height: '100%', width: 'max-content' }}
                          style={{ height: '100%', width: 'auto', display: 'block', objectFit: 'cover', userSelect: 'none' }}
                        />
                      </div>
                    );
                  })}
                  {videos.map((v, i) => {
                    const src = typeof v === 'string' ? v : v.src;
                    const filename = src.split('/').pop().replace(/\.[^.]+$/, '');
                    const idx = images.length + i;
                    return (
                      <div
                        key={`vid-${i}`}
                        ref={el => { if (el) itemInfoRef.current[idx] = { el, title: project.title, filename }; }}
                        style={{ height: '100%', flexShrink: 0, overflow: 'hidden' }}
                      >
                        <VideoPlayer src={src} />
                      </div>
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

            {/* Single label — follows cursor, updates text when crossing items.
                Anchored to the wrapper (not scroll content) so it never scrolls away. */}
            {labelVisible && (
              <div
                ref={overlayRef}
                style={{
                  position:      'absolute',
                  left:          0,
                  top:           0,
                  transform:     `translate3d(${overlayCurrent.current.x}px, ${overlayCurrent.current.y}px, 0)`,
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
                <div>{labelText.title}</div>
                <div>{labelText.filename}</div>
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
            <div style={{ flex: 1, padding: '18px 24px', display: 'flex', alignItems: 'flex-start' }}>
              <p style={{ fontSize: '11px', color: 'var(--text)', lineHeight: 1.75, margin: 0, letterSpacing: '-0.01em' }}>
                {project.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
