import { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle, memo } from 'react';

// TITLEBAR_H is now computed per-panel from width — see inside component
const DRAG_THRESH  = 5;
const DRAG_LERP    = 0.75;
const FRICTION     = 0.78;
const MAX_SPEED    = 2;
const MIN_VELOCITY = 0.05;

const DEPTH_STYLE = {
  back:  { filter: 'blur(0.5px) brightness(0.7)', opacity: 0.75, boxShadow: 'none' },
  mid:   { filter: 'brightness(0.85)',             opacity: 1,    boxShadow: 'none' },
  front: { filter: 'none',                         opacity: 1,    boxShadow: '0 2px 20px rgba(0,0,0,0.5)' },
};

const Panel = forwardRef(function Panel({
  panelKey,
  project,
  x,
  y,
  width,
  height,
  zIndex,
  depth,
  crop,
  isDimmed,
  onBringToFront,
  onClick,
}, ref) {
  const divRef       = useRef(null);
  const posRef       = useRef({ x, y });
  const isMovingRef  = useRef(false);   // sync flag for setParallax gate
  const parallaxRef  = useRef({ x: 0, y: 0 }); // last applied parallax offset

  const dragTargetRef = useRef({ x, y });
  const panelVelRef   = useRef([]);
  const dragRafRef    = useRef(null);
  const inertiaRef    = useRef(null);

  const [displayPos,  setDisplayPos]  = useState({ x, y });
  const [isDragging,  setIsDragging]  = useState(false);
  const [isInertia,   setIsInertia]   = useState(false);
  const [isHovered,   setIsHovered]   = useState(false);

  // ── Imperative handle — Canvas calls this from its RAF loop directly ───────
  // Bypasses React state entirely: no re-render, pure DOM write.
  useImperativeHandle(ref, () => ({
    setParallax(px, py) {
      if (isMovingRef.current || !divRef.current) return;
      parallaxRef.current = { x: px, y: py };
      divRef.current.style.transform =
        `translate3d(${posRef.current.x + px}px, ${posRef.current.y + py}px, 0)`;
    },
  }), []);

  const stopAll = useCallback(() => {
    if (dragRafRef.current)   { cancelAnimationFrame(dragRafRef.current);   dragRafRef.current  = null; }
    if (inertiaRef.current)   { cancelAnimationFrame(inertiaRef.current);   inertiaRef.current  = null; }
  }, []);

  useEffect(() => () => stopAll(), [stopAll]);

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    stopAll();
    setIsInertia(false);
    isMovingRef.current = true;
    onBringToFront(panelKey);

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    // posRef stays in logical coords throughout. parallaxRef is frozen here
    // (isMovingRef=true gates setParallax) and added to every DOM write so
    // the panel never loses its parallax offset during drag or inertia.
    const startPosX    = posRef.current.x;
    const startPosY    = posRef.current.y;
    let   dragStarted  = false;

    panelVelRef.current   = [];
    dragTargetRef.current = { x: startPosX, y: startPosY };

    const dragTick = () => {
      const cur = posRef.current;
      const tgt = dragTargetRef.current;
      const nx  = cur.x + (tgt.x - cur.x) * DRAG_LERP;
      const ny  = cur.y + (tgt.y - cur.y) * DRAG_LERP;
      posRef.current = { x: nx, y: ny };

      // Write logical + frozen parallax — panel tracks cursor with no pop
      if (divRef.current) {
        divRef.current.style.transform =
          `translate3d(${nx + parallaxRef.current.x}px, ${ny + parallaxRef.current.y}px, 0)`;
      }

      panelVelRef.current.push({ x: nx, y: ny, t: performance.now() });
      if (panelVelRef.current.length > 6) panelVelRef.current.shift();

      dragRafRef.current = requestAnimationFrame(dragTick);
    };

    const onMove = (e) => {
      const dx = e.clientX - startClientX;
      const dy = e.clientY - startClientY;

      if (!dragStarted) {
        if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESH) return;
        dragStarted = true;
        setIsDragging(true);
        dragRafRef.current = requestAnimationFrame(dragTick);
      }
      dragTargetRef.current = { x: startPosX + dx, y: startPosY + dy };
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);

      if (dragRafRef.current) { cancelAnimationFrame(dragRafRef.current); dragRafRef.current = null; }
      setIsDragging(false);

      if (!dragStarted) {
        isMovingRef.current = false;
        onClick(panelKey);
        return;
      }

      // Velocity from panel position history
      let vx = 0, vy = 0;
      const h = panelVelRef.current;
      if (h.length >= 2) {
        const tail = h.slice(-4);
        const dt   = tail[tail.length - 1].t - tail[0].t;
        if (dt > 0 && dt < 200) {
          const pxPerFrame = 1000 / 60;
          vx = ((tail[tail.length - 1].x - tail[0].x) / dt) * pxPerFrame;
          vy = ((tail[tail.length - 1].y - tail[0].y) / dt) * pxPerFrame;
        }
      }

      const speed = Math.sqrt(vx * vx + vy * vy);
      if (speed > MAX_SPEED) { vx = (vx / speed) * MAX_SPEED; vy = (vy / speed) * MAX_SPEED; }

      if (speed < MIN_VELOCITY) {
        isMovingRef.current = false;
        // Store visual position so React renders the same value the parallax
        // RAF will write — eliminates the pop when parallax resumes.
        setDisplayPos({
          x: posRef.current.x + parallaxRef.current.x,
          y: posRef.current.y + parallaxRef.current.y,
        });
        return;
      }

      setIsInertia(true);
      const step = () => {
        vx *= FRICTION;
        vy *= FRICTION;
        posRef.current = { x: posRef.current.x + vx, y: posRef.current.y + vy };

        if (divRef.current) {
          divRef.current.style.transform =
            `translate3d(${posRef.current.x + parallaxRef.current.x}px, ${posRef.current.y + parallaxRef.current.y}px, 0)`;
        }

        if (Math.abs(vx) < MIN_VELOCITY && Math.abs(vy) < MIN_VELOCITY) {
          isMovingRef.current = false;
          setIsInertia(false);
          setDisplayPos({
            x: posRef.current.x + parallaxRef.current.x,
            y: posRef.current.y + parallaxRef.current.y,
          });
          inertiaRef.current = null;
          return;
        }
        inertiaRef.current = requestAnimationFrame(step);
      };
      inertiaRef.current = requestAnimationFrame(step);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
  }, [project.id, onBringToFront, onClick, stopAll]);

  // Scale chrome with panel width so tiny panels look distant, large panels look close
  const titlebarH = Math.round(Math.max(12, Math.min(20, width * 0.18)));
  const fontSize  = Math.max(5,  Math.min(8,  Math.round(width * 0.07)));
  const btnSize   = Math.max(4,  Math.min(7,  Math.round(width * 0.06)));

  const isMoving   = isDragging || isInertia;
  // During drag/inertia: full front-layer treatment. Otherwise: assigned depth layer.
  const activeDepth = isMoving ? 'front' : (depth || 'mid');
  const ds          = DEPTH_STYLE[activeDepth];
  const opacity     = isDimmed ? 0.2 : ds.opacity;

  return (
    <div
      ref={divRef}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position:             'absolute',
        left:                 0,
        top:                  0,
        width,
        height,
        zIndex,
        border:               'none',
        background:           'rgba(10,10,10,0.4)',
        backdropFilter:       'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        opacity,
        filter:               ds.filter,
        boxShadow:            ds.boxShadow,
        // Inline transform only sets initial position or after inertia settles.
        // During drag/inertia, DOM is written directly — this value is stale but
        // overwritten each frame before the browser paints.
        transform:            `translate3d(${displayPos.x}px, ${displayPos.y}px, 0)`,
        transition:           isMoving ? 'none' : 'opacity 0.25s, filter 0.25s',
        willChange:           isMoving ? 'transform' : 'auto',
        touchAction:          'none',
        cursor:               isDragging ? 'grabbing' : 'grab',
        userSelect:           'none',
        display:              'flex',
        flexDirection:        'column',
      }}
    >
      <div style={{
        height:         titlebarH,
        minHeight:      titlebarH,
        background:     'transparent',
        borderBottom:   'none',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        `0 ${Math.round(titlebarH * 0.3)}px`,
        fontSize:       fontSize,
        letterSpacing:  '0.05em',
        color:          'var(--text)',
      }}>
        <span>{project.shortTitle || project.title}</span>
        <div style={{ width: btnSize, height: btnSize, background: 'var(--close-btn)', flexShrink: 0 }} />
      </div>

      <div style={{
        flex:           1,
        overflow:       'hidden',
        background:     'transparent',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
      }}>
        {project.thumbnail ? (
          <img
            src={project.thumbnail}
            alt={project.title}
            draggable={false}
            style={{
              width:          '100%',
              height:         '100%',
              objectFit:      'cover',
              objectPosition: crop || '50% 50%',
              display:        'block',
              filter:         (!isMoving && isHovered) ? 'invert(1)' : 'none',
              pointerEvents:  isMoving ? 'none' : 'auto',
            }}
          />
        ) : (
          <span style={{ fontSize: '8px', color: 'var(--panel-border)', pointerEvents: 'none' }}>
            {project.medium}
          </span>
        )}
      </div>
    </div>
  );
});

// Prevent re-renders when parent re-renders with same props
export default memo(Panel);
