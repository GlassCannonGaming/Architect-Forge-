import React, { useRef } from 'react';
import { StudioWindowId, StudioWindowState } from '../game/rules';

interface StudioWindowFrameProps {
  windowState: StudioWindowState;
  badgeText?: string;
  onFocus: (id: StudioWindowId) => void;
  onMove: (id: StudioWindowId, nextX: number, nextY: number) => void;
  onResize: (id: StudioWindowId, nextWidth: number, nextHeight: number) => void;
  onToggleMinimize: (id: StudioWindowId) => void;
  onToggleMaximize: (id: StudioWindowId) => void;
  onClose: (id: StudioWindowId) => void;
  children: React.ReactNode;
}

export const StudioWindowFrame: React.FC<StudioWindowFrameProps> = ({
  windowState,
  badgeText,
  onFocus,
  onMove,
  onResize,
  onToggleMinimize,
  onToggleMaximize,
  onClose,
  children
}) => {
  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const resizeRef = useRef<{
    startX: number;
    startY: number;
    originW: number;
    originH: number;
  } | null>(null);

  if (!windowState.isOpen) {
    return null;
  }

  const handleHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Ignore clicks on window control buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    e.preventDefault();
    onFocus(windowState.id);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: windowState.x,
      originY: windowState.y
    };

    const handlePointerMove = (moveEvt: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = moveEvt.clientX - dragRef.current.startX;
      const dy = moveEvt.clientY - dragRef.current.startY;
      onMove(
        windowState.id,
        dragRef.current.originX + dx,
        dragRef.current.originY + dy
      );
    };

    const handlePointerUp = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onFocus(windowState.id);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originW: windowState.width,
      originH: windowState.height
    };

    const handlePointerMove = (moveEvt: PointerEvent) => {
      if (!resizeRef.current) return;
      const dw = moveEvt.clientX - resizeRef.current.startX;
      const dh = moveEvt.clientY - resizeRef.current.startY;
      onResize(
        windowState.id,
        resizeRef.current.originW + dw,
        resizeRef.current.originH + dh
      );
    };

    const handlePointerUp = () => {
      resizeRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const style: React.CSSProperties = windowState.isMaximized
    ? {
        left: '24px',
        top: '64px',
        width: 'calc(100vw - 48px)',
        height: 'calc(100vh - 96px)',
        zIndex: windowState.zIndex
      }
    : {
        left: `${windowState.x}px`,
        top: `${windowState.y}px`,
        width: `${windowState.width}px`,
        height: windowState.isMinimized ? 'auto' : `${windowState.height}px`,
        zIndex: windowState.zIndex
      };

  return (
    <section
      role="region"
      aria-label={windowState.title}
      data-testid={`studio-window-${windowState.id}`}
      onMouseDown={() => onFocus(windowState.id)}
      style={style}
      className="studio-dark-window fixed pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-3xl shadow-2xl text-slate-100 flex flex-col overflow-hidden transition-shadow"
    >
      {/* Draggable Window Title Bar (Dark Mode) */}
      <div
        data-testid={`window-titlebar-${windowState.id}`}
        onPointerDown={handleHeaderPointerDown}
        onDoubleClick={() => onToggleMaximize(windowState.id)}
        className="cursor-move select-none bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 px-3 py-1.5 flex items-center justify-between gap-2 shrink-0"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Drag Grip Dots */}
          <span className="text-slate-500 text-xs font-bold tracking-tighter" title="Drag to move window">
            ⋮⋮
          </span>
          <span className="w-2 h-2 rounded-full bg-[#10b981] shrink-0" />
          <span className="text-xs font-extrabold tracking-tight text-slate-100 truncate">
            {windowState.title}
          </span>
          {badgeText && (
            <span className="px-2 py-0.5 rounded-full bg-sky-950/90 text-sky-300 border border-sky-700/60 text-[10px] font-bold shrink-0">
              {badgeText}
            </span>
          )}
        </div>

        {/* Window Action Controls: Minimize, Maximize/Restore, Close */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            aria-label={`Minimize ${windowState.title}`}
            title={windowState.isMinimized ? 'Restore Window' : 'Minimize Window'}
            onClick={() => onToggleMinimize(windowState.id)}
            className="w-5 h-5 rounded-full bg-amber-950/90 hover:bg-amber-900 text-amber-200 text-[10px] font-extrabold flex items-center justify-center border border-amber-700/70"
          >
            {windowState.isMinimized ? '▲' : '—'}
          </button>
          <button
            type="button"
            aria-label={`Maximize ${windowState.title}`}
            title={windowState.isMaximized ? 'Restore Window Size' : 'Maximize Window'}
            onClick={() => onToggleMaximize(windowState.id)}
            className="w-5 h-5 rounded-full bg-sky-950/90 hover:bg-sky-900 text-sky-200 text-[10px] font-extrabold flex items-center justify-center border border-sky-700/70"
          >
            {windowState.isMaximized ? '❐' : '□'}
          </button>
          <button
            type="button"
            aria-label={`Close ${windowState.title}`}
            title="Close Window (Re-open from top Window Bar)"
            onClick={() => onClose(windowState.id)}
            className="w-5 h-5 rounded-full bg-rose-950/90 hover:bg-rose-900 text-rose-200 text-[10px] font-extrabold flex items-center justify-center border border-rose-700/70"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Window Content Body */}
      {!windowState.isMinimized && (
        <div className="flex-1 overflow-y-auto p-3 relative text-slate-100">{children}</div>
      )}

      {/* Bottom-Right Resize Grip Handle */}
      {!windowState.isMinimized && !windowState.isMaximized && (
        <div
          data-testid={`window-resize-${windowState.id}`}
          onPointerDown={handleResizePointerDown}
          title="Drag to resize window"
          className="absolute bottom-0.5 right-1 w-4 h-4 cursor-nwse-resize text-[10px] text-slate-500 hover:text-sky-400 flex items-center justify-center select-none"
        >
          ◢
        </div>
      )}
    </section>
  );
};

