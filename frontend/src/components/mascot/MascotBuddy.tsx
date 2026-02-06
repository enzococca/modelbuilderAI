import { useState, useEffect, useCallback, useRef } from 'react';

const SPRITES = Array.from({ length: 12 }, (_, i) => {
  const names = [
    'flag-shield', 'flag-run', 'mandolin', 'wave',
    'slide', 'peace', 'soccer', 'coffee',
    'flag-dance', 'flag-walk', 'sack', 'pizza',
  ];
  return `/mascot/mascot-${String(i + 1).padStart(2, '0')}-${names[i]}.png`;
});

type Edge = 'left' | 'right' | 'bottom';

interface MascotState {
  sprite: string;
  edge: Edge;
  position: number; // % along the chosen edge
  visible: boolean;
}

const SHOW_INTERVAL_MIN = 25_000;  // min ms between appearances
const SHOW_INTERVAL_MAX = 60_000;  // max ms between appearances
const DISPLAY_DURATION = 6_000;    // how long mascot stays visible

export function MascotBuddy() {
  const [mascot, setMascot] = useState<MascotState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const showMascot = useCallback(() => {
    const sprite = SPRITES[Math.floor(Math.random() * SPRITES.length)];
    const edges: Edge[] = ['left', 'right', 'bottom'];
    const edge = edges[Math.floor(Math.random() * edges.length)];
    const position = 15 + Math.random() * 70; // 15-85% to avoid corners

    setMascot({ sprite, edge, position, visible: false });

    // Animate in after a tick
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setMascot(prev => prev ? { ...prev, visible: true } : null);
      });
    });

    // Animate out after duration
    setTimeout(() => {
      setMascot(prev => prev ? { ...prev, visible: false } : null);
      // Remove from DOM after animation
      setTimeout(() => setMascot(null), 600);
    }, DISPLAY_DURATION);
  }, []);

  const scheduleNext = useCallback(() => {
    const delay = SHOW_INTERVAL_MIN + Math.random() * (SHOW_INTERVAL_MAX - SHOW_INTERVAL_MIN);
    timerRef.current = setTimeout(() => {
      showMascot();
      scheduleNext();
    }, delay);
  }, [showMascot]);

  useEffect(() => {
    // First appearance after a short delay
    timerRef.current = setTimeout(() => {
      showMascot();
      scheduleNext();
    }, 8000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [showMascot, scheduleNext]);

  if (!mascot) return null;

  const style = getPositionStyle(mascot);

  return (
    <div
      className="fixed z-[9999] pointer-events-none transition-all duration-500 ease-in-out"
      style={style}
    >
      <img
        src={mascot.sprite}
        alt="Gennaro mascot"
        className="h-20 w-auto drop-shadow-lg select-none"
        style={{
          animation: mascot.visible ? 'mascot-bob 2s ease-in-out infinite' : undefined,
          transform: mascot.edge === 'right' ? 'scaleX(-1)' : undefined,
        }}
        draggable={false}
      />
    </div>
  );
}

function getPositionStyle(m: MascotState): React.CSSProperties {
  const offset = m.visible ? 0 : -100; // px off-screen when hidden

  switch (m.edge) {
    case 'left':
      return {
        left: m.visible ? 8 : -100,
        top: `${m.position}%`,
        transform: 'translateY(-50%)',
        opacity: m.visible ? 1 : 0,
      };
    case 'right':
      return {
        right: m.visible ? 8 : -100,
        top: `${m.position}%`,
        transform: 'translateY(-50%)',
        opacity: m.visible ? 1 : 0,
      };
    case 'bottom':
      return {
        bottom: m.visible ? 8 : -100,
        left: `${m.position}%`,
        transform: 'translateX(-50%)',
        opacity: m.visible ? 1 : 0,
      };
  }
}
