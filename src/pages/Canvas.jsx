import { useState, useRef, useCallback, useEffect } from 'react';
import { projects } from '../data/projects';
import Panel from '../components/Panel';
import ExpandedPanel from '../components/ExpandedPanel';
import BackgroundVideo from '../components/BackgroundVideo';
import { useIsMobile } from '../hooks/useIsMobile';

// Canvas = viewport — all panels visible without scrolling
const CANVAS_W_MULT = 1;
const CANVAS_H_MULT = 1;
const NAV_H = 0;

// Dramatic size range: tiny (55px) → xlarge (310px)
// Weighted toward tiny/small for the dense Sub.global feel
const SIZE_TIERS = [
  { w: [55,  68],  h: [42,  52]  },  // tiny
  { w: [55,  68],  h: [42,  52]  },  // tiny
  { w: [55,  68],  h: [42,  52]  },  // tiny (extra weight)
  { w: [85,  115], h: [65,  88]  },  // small
  { w: [85,  115], h: [65,  88]  },  // small
  { w: [135, 170], h: [103, 130] },  // medium
  { w: [135, 170], h: [103, 130] },  // medium
  { w: [195, 245], h: [149, 187] },  // large
  { w: [255, 310], h: [195, 237] },  // xlarge
];

// Thumbnail crop positions — 13 variations so duplicates look distinct
const CROP_POSITIONS = [
  '50% 50%', '50% 15%', '50% 85%', '15% 50%', '85% 50%',
  '15% 15%', '85% 15%', '15% 85%', '85% 85%',
  '35% 30%', '65% 30%', '35% 70%', '65% 70%',
];

// Only show projects that have a thumbnail on the canvas
const CANVAS_PROJECTS = projects.filter(p => p.thumbnail);
const INSTANCES_PER_PROJECT = 5; // 6 projects × 5 = 30 panels

// Clear breathing room between the cluster and all four window edges
const EDGE_MARGIN = 60;

function getInitialLayouts(canvasW, canvasH) {
  // Build slots: each project repeated INSTANCES_PER_PROJECT times
  const slots = [];
  CANVAS_PROJECTS.forEach((project) => {
    for (let i = 0; i < INSTANCES_PER_PROJECT; i++) {
      slots.push({ projectId: project.id, instanceIdx: i });
    }
  });
  slots.sort(() => Math.random() - 0.5);

  const count  = slots.length;
  const zOrder = Array.from({ length: count }, (_, i) => i + 1)
    .sort(() => Math.random() - 0.5);

  // Loose 6×5 grid — one panel per cell ensures even coverage (compact).
  // Large jitter (±30% of cell) breaks the rigid structure (organic).
  // Rejection sampling within each cell's jitter range keeps panels separated.
  const COLS   = 6;
  const ROWS   = Math.ceil(count / COLS);
  const gridW  = canvasW - EDGE_MARGIN * 2;
  const gridH  = canvasH - EDGE_MARGIN * 2;
  const cellW  = gridW / COLS;
  const cellH  = gridH / ROWS;
  const MIN_GAP = 6;
  const placed  = [];

  // Shuffle which cell each slot gets so same-project duplicates scatter
  const cells = Array.from({ length: count }, (_, i) => i);
  cells.sort(() => Math.random() - 0.5);

  return slots.map(({ projectId, instanceIdx }, i) => {
    const tier = SIZE_TIERS[Math.floor(Math.random() * SIZE_TIERS.length)];
    const w = Math.floor(tier.w[0] + Math.random() * (tier.w[1] - tier.w[0]));
    const h = Math.floor(tier.h[0] + Math.random() * (tier.h[1] - tier.h[0]));

    const cellIdx = cells[i];
    const col = cellIdx % COLS;
    const row = Math.floor(cellIdx / COLS);
    const baseCX = EDGE_MARGIN + col * cellW + cellW / 2 - w / 2;
    const baseCY = EDGE_MARGIN + row * cellH + cellH / 2 - h / 2;

    // Try up to 35 jittered positions within this cell; take first clear one
    let x = Math.round(baseCX), y = Math.round(baseCY);
    for (let attempt = 0; attempt < 35; attempt++) {
      const jx = (Math.random() - 0.5) * cellW * 0.6;
      const jy = (Math.random() - 0.5) * cellH * 0.6;
      const cx = Math.max(EDGE_MARGIN, Math.min(Math.round(baseCX + jx), canvasW - EDGE_MARGIN - w));
      const cy = Math.max(EDGE_MARGIN, Math.min(Math.round(baseCY + jy), canvasH - EDGE_MARGIN - h));
      const clear = placed.every(p =>
        cx + w + MIN_GAP <= p.x ||
        cx >= p.x + p.w + MIN_GAP ||
        cy + h + MIN_GAP <= p.y ||
        cy >= p.y + p.h + MIN_GAP
      );
      x = cx; y = cy;
      if (clear) break;
    }
    placed.push({ x, y, w, h });

    const z     = zOrder[i];
    const depth = z <= count / 3 ? 'back' : z <= (count * 2) / 3 ? 'mid' : 'front';
    const crop  = CROP_POSITIONS[(instanceIdx * 3 + i) % CROP_POSITIONS.length];

    return {
      key: `${projectId}-${instanceIdx}`, // unique per panel instance
      id:  projectId,                     // project ID for lookup & expand
      x, y, w, h, z, depth, crop,
    };
  });
}

function getMobileLayouts(vw) {
  const slots = [];
  CANVAS_PROJECTS.forEach((project) => {
    for (let i = 0; i < INSTANCES_PER_PROJECT; i++) {
      slots.push({ projectId: project.id, instanceIdx: i });
    }
  });
  slots.sort(() => Math.random() - 0.5);

  const GAP     = 8;
  const TOP_PAD = 88; // clear fixed logo/nav
  const COL_W   = Math.floor((vw - GAP * 3) / 2);
  const col0X   = GAP;
  const col1X   = GAP * 2 + COL_W;
  const colTops = [TOP_PAD, TOP_PAD];

  return slots.map(({ projectId, instanceIdx }, i) => {
    // Place into shorter column
    const col    = colTops[0] <= colTops[1] ? 0 : 1;
    const baseX  = col === 0 ? col0X : col1X;

    // Slight horizontal stagger for organic feel (can overlap neighbor a little)
    const stagger = Math.round((Math.random() - 0.5) * 12);
    const x = Math.max(0, Math.min(baseX + stagger, vw - COL_W));

    // Random aspect ratio between 0.6 and 1.1
    const aspectRatio = 0.6 + Math.random() * 0.5;
    const w = COL_W;
    const h = Math.round(w * aspectRatio);
    const y = colTops[col];

    colTops[col] += h + GAP;

    const z     = i + 1;
    const tier  = i % 3;
    const depth = tier === 0 ? 'back' : tier === 1 ? 'mid' : 'front';
    const crop  = CROP_POSITIONS[(instanceIdx * 3 + i) % CROP_POSITIONS.length];

    return {
      key: `${projectId}-${instanceIdx}`,
      id: projectId,
      x, y, w, h, z, depth, crop,
    };
  });
}

// Parallax magnitude (pixels) per depth layer — back barely drifts, front shifts noticeably
const DEPTH_PARALLAX = { back: 4, mid: 12, front: 28 };
const LERP = 0.06;

const DEPTH_STYLE = {
  back:  { filter: 'blur(0.5px) brightness(0.7)', opacity: 0.75 },
  mid:   { filter: 'brightness(0.85)',             opacity: 1    },
  front: { filter: 'none',                         opacity: 1    },
};

function MobilePanel({ layout, project, isDimmed, onClick }) {
  const ds = DEPTH_STYLE[layout.depth] || DEPTH_STYLE.mid;
  return (
    <div
      onClick={() => onClick(layout.key)}
      style={{
        position:             'absolute',
        left:                 layout.x,
        top:                  layout.y,
        width:                layout.w,
        height:               layout.h,
        zIndex:               layout.z,
        background:           'rgba(10,10,10,0.4)',
        backdropFilter:       'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        opacity:              isDimmed ? 0.2 : ds.opacity,
        filter:               ds.filter,
        display:              'flex',
        flexDirection:        'column',
        cursor:               'pointer',
        touchAction:          'manipulation',
      }}
    >
      <div style={{
        height:        14,
        minHeight:     14,
        flexShrink:    0,
        display:       'flex',
        alignItems:    'center',
        padding:       '0 5px',
        fontSize:      7,
        letterSpacing: '0.05em',
        color:         'var(--text)',
      }}>
        <span>{project.shortTitle || project.title}</span>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {project.thumbnail ? (
          <img
            src={project.thumbnail}
            alt={project.title}
            draggable={false}
            style={{
              width:          '100%',
              height:         '100%',
              objectFit:      'cover',
              objectPosition: layout.crop || '50% 50%',
              display:        'block',
              userSelect:     'none',
            }}
          />
        ) : (
          <div style={{
            width:          '100%',
            height:         '100%',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       7,
            color:          'var(--panel-border)',
          }}>
            {project.medium}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Canvas() {
  const isMobile = useIsMobile();

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const viewH = vh - NAV_H;
  const canvasW = Math.floor(vw * CANVAS_W_MULT);
  const canvasH = Math.floor(viewH * CANVAS_H_MULT);

  const [desktopLayouts, setDesktopLayouts] = useState(() => getInitialLayouts(canvasW, canvasH));
  const [mobileLayouts] = useState(() => getMobileLayouts(vw));
  const maxZ = useRef(desktopLayouts.reduce((m, l) => Math.max(m, l.z), 0));

  // Pan starts at origin — the dense cluster is already in the viewport
  const panOffset = useRef({ x: 0, y: 0 });
  const panDrag   = useRef(null);
  const [panState, setPanState] = useState({ x: 0, y: 0 });

  // Imperative handles for direct parallax DOM writes — no re-renders
  const panelHandles = useRef(new Map());

  // Keep a ref to layouts so callbacks don't need layouts in their dep arrays
  const layoutsRef = useRef(desktopLayouts);
  useEffect(() => { layoutsRef.current = desktopLayouts; }, [desktopLayouts]);

  // Parallax — mouse position tracked in refs, applied via imperative DOM writes
  const mouseTarget  = useRef({ x: 0, y: 0 });
  const mouseCurrent = useRef({ x: 0, y: 0 });
  const rafId = useRef(null);

  useEffect(() => {
    if (isMobile) return;

    const onMouseMove = (e) => {
      mouseTarget.current = {
        x: (e.clientX / window.innerWidth  - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      };
    };
    window.addEventListener('mousemove', onMouseMove);

    const tick = () => {
      const cur = mouseCurrent.current;
      const tgt = mouseTarget.current;
      const nx = cur.x + (tgt.x - cur.x) * LERP;
      const ny = cur.y + (tgt.y - cur.y) * LERP;
      if (Math.abs(nx - cur.x) > 0.0002 || Math.abs(ny - cur.y) > 0.0002) {
        mouseCurrent.current = { x: nx, y: ny };
        // Push parallax directly to each panel — no React state, no re-renders
        panelHandles.current.forEach((handle, key) => {
          const layout = layoutsRef.current.find((l) => l.key === key);
          if (!layout) return;
          const factor = DEPTH_PARALLAX[layout.depth] ?? DEPTH_PARALLAX.mid;
          handle.setParallax(nx * factor, ny * factor);
        });
      }
      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(rafId.current);
    };
  }, [isMobile]);

  // Canvas pan — mousedown on background
  const handleCanvasMouseDown = useCallback((e) => {
    if (isMobile) return;
    if (e.button !== 0) return;
    panDrag.current = {
      startX: e.clientX + panOffset.current.x,
      startY: e.clientY + panOffset.current.y,
    };

    const maxPanX = canvasW - vw;
    const maxPanY = canvasH - viewH;

    const onMove = (e) => {
      const x = Math.max(0, Math.min(panDrag.current.startX - e.clientX, maxPanX));
      const y = Math.max(0, Math.min(panDrag.current.startY - e.clientY, maxPanY));
      panOffset.current = { x, y };
      setPanState({ x, y });
    };
    const onUp = () => {
      panDrag.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [isMobile, canvasW, canvasH, vw, vh]);

  const [expandedId, setExpandedId] = useState(null);
  const [expandedSourceRect, setExpandedSourceRect] = useState(null);
  const totalZ = maxZ.current;

  const bringToFront = useCallback((panelKey) => {
    maxZ.current += 1;
    setDesktopLayouts((prev) =>
      prev.map((l) => l.key === panelKey ? { ...l, z: maxZ.current, depth: 'front' } : l)
    );
  }, []);

  const handlePanelClick = useCallback((panelKey) => {
    const layout = layoutsRef.current.find((l) => l.key === panelKey);
    if (!layout) return;
    const factor = DEPTH_PARALLAX[layout.depth] ?? DEPTH_PARALLAX.mid;
    const px = mouseCurrent.current.x * factor;
    const py = mouseCurrent.current.y * factor;
    setExpandedSourceRect({
      x: layout.x - panOffset.current.x + px,
      y: NAV_H + layout.y - panOffset.current.y + py,
      w: layout.w,
      h: layout.h,
    });
    setExpandedId(layout.id);
  }, [totalZ]);

  // Mobile scroll container ref for computing viewport-relative panel positions
  const mobileScrollRef = useRef(null);

  const handleMobilePanelClick = useCallback((panelKey) => {
    const layout = mobileLayouts.find((l) => l.key === panelKey);
    if (!layout) return;
    const scrollTop = mobileScrollRef.current ? mobileScrollRef.current.scrollTop : 0;
    setExpandedSourceRect({
      x: layout.x,
      y: layout.y - scrollTop,
      w: layout.w,
      h: layout.h,
    });
    setExpandedId(layout.id);
  }, [mobileLayouts]);

  const handleClose = useCallback(() => {
    setExpandedId(null);
    setExpandedSourceRect(null);
  }, []);

  const expandedProject = projects.find((p) => p.id === expandedId) || null;

  // ── Mobile render ──────────────────────────────────────────────────────────
  if (isMobile) {
    const mobileCanvasH = mobileLayouts.reduce((m, l) => Math.max(m, l.y + l.h), 0) + 60;
    return (
      <div
        ref={mobileScrollRef}
        style={{
          position:   'fixed',
          inset:      0,
          overflowY:  'auto',
          overflowX:  'hidden',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div style={{ position: 'relative', width: '100%', height: mobileCanvasH }}>
          {mobileLayouts.map((layout) => {
            const project = projects.find((p) => p.id === layout.id);
            if (!project) return null;
            return (
              <MobilePanel
                key={layout.key}
                layout={layout}
                project={project}
                isDimmed={expandedId !== null && expandedId !== layout.id}
                onClick={handleMobilePanelClick}
              />
            );
          })}
        </div>

        {expandedId && expandedProject && (
          <ExpandedPanel
            project={expandedProject}
            sourceRect={expandedSourceRect}
            onClose={handleClose}
          />
        )}
      </div>
    );
  }

  // ── Desktop render ─────────────────────────────────────────────────────────
  return (
    // Viewport window
    <div
      style={{
        position: 'fixed',
        inset: 0,
        top: NAV_H,
        overflow: 'hidden',
        cursor: panDrag.current ? 'grabbing' : 'inherit',
      }}
      onMouseDown={handleCanvasMouseDown}
    >
      <BackgroundVideo />

      {/* Pannable canvas */}
      <div
        style={{
          position: 'absolute',
          width: canvasW,
          height: canvasH,
          transform: `translate(${-panState.x}px, ${-panState.y}px)`,
          willChange: 'transform',
        }}
      >
        {desktopLayouts.map((layout) => {
          const project = projects.find((p) => p.id === layout.id);
          if (!project) return null;

          return (
            <Panel
              key={layout.key}
              panelKey={layout.key}
              ref={(handle) => {
                if (handle) panelHandles.current.set(layout.key, handle);
                else panelHandles.current.delete(layout.key);
              }}
              project={project}
              x={layout.x}
              y={layout.y}
              width={layout.w}
              height={layout.h}
              zIndex={layout.z}
              depth={layout.depth}
              crop={layout.crop}
              isDimmed={expandedId !== null && expandedId !== layout.id}
              onBringToFront={bringToFront}
              onClick={handlePanelClick}
            />
          );
        })}
      </div>

      {expandedId && expandedProject && (
        <ExpandedPanel
          project={expandedProject}
          sourceRect={expandedSourceRect}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
