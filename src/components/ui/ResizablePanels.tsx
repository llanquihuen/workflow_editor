import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

interface PanelGroupProps {
  children: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

interface PanelProps {
  children: React.ReactNode;
  defaultSize?: number;
  minSize?: number;
  className?: string;
  id?: string;
}

interface PanelResizeHandleProps {
  children?: React.ReactNode;
  className?: string;
}

interface PanelGroupContextType {
  registerPanel: (id: string, defaultSize: number, minSize: number) => void;
  unregisterPanel: (id: string) => void;
  sizes: Record<string, number>;
  onDragStart: (e: React.MouseEvent, handleEl: HTMLElement) => void;
}

const PanelGroupContext = createContext<PanelGroupContextType | null>(null);

export function PanelGroup({ children, orientation = 'horizontal', className = '' }: PanelGroupProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sizes, setSizes] = useState<Record<string, number>>({});
  const sizesRef = useRef<Record<string, number>>({});
  const registeredPanels = useRef<Record<string, { defaultSize: number; minSize: number }>>({});

  const registerPanel = (id: string, defaultSize: number, minSize: number) => {
    registeredPanels.current[id] = { defaultSize, minSize };
    if (sizesRef.current[id] === undefined) {
      sizesRef.current[id] = defaultSize;
      setSizes(prev => ({ ...prev, [id]: defaultSize }));
    }
  };

  const unregisterPanel = (id: string) => {
    delete registeredPanels.current[id];
  };

  const onDragStart = (e: React.MouseEvent, handleEl: HTMLElement) => {
    e.preventDefault();
    const groupEl = containerRef.current;
    if (!groupEl) return;

    const panels = Array.from(groupEl.querySelectorAll('[data-panel]')) as HTMLElement[];
    
    // Find adjacent panels
    let prevPanel: HTMLElement | null = null;
    let nextPanel: HTMLElement | null = null;
    
    for (const panel of panels) {
      const position = panel.compareDocumentPosition(handleEl);
      if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
        if (!prevPanel || (panel.compareDocumentPosition(prevPanel) & Node.DOCUMENT_POSITION_PRECEDING)) {
          prevPanel = panel;
        }
      } else if (position & Node.DOCUMENT_POSITION_PRECEDING) {
        if (!nextPanel || (panel.compareDocumentPosition(nextPanel) & Node.DOCUMENT_POSITION_FOLLOWING)) {
          nextPanel = panel;
        }
      }
    }

    if (!prevPanel || !nextPanel) return;

    const prevId = prevPanel.getAttribute('data-panel-id')!;
    const nextId = nextPanel.getAttribute('data-panel-id')!;
    
    const prevMin = parseFloat(prevPanel.getAttribute('data-min-size') || '0');
    const nextMin = parseFloat(nextPanel.getAttribute('data-min-size') || '0');

    const containerRect = groupEl.getBoundingClientRect();
    const isHorizontal = orientation === 'horizontal';
    const containerSize = isHorizontal ? containerRect.width : containerRect.height;
    
    const prevStartSizePx = isHorizontal 
      ? prevPanel.getBoundingClientRect().width 
      : prevPanel.getBoundingClientRect().height;
    const nextStartSizePx = isHorizontal 
      ? nextPanel.getBoundingClientRect().width 
      : nextPanel.getBoundingClientRect().height;
    
    const prevStartPercent = (prevStartSizePx / containerSize) * 100;
    const nextStartPercent = (nextStartSizePx / containerSize) * 100;
    const startPos = isHorizontal ? e.clientX : e.clientY;

    let finalPrevPercent = prevStartPercent;
    let finalNextPercent = nextStartPercent;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const currentPos = isHorizontal ? moveEvent.clientX : moveEvent.clientY;
      const deltaPx = currentPos - startPos;
      const deltaPercent = (deltaPx / containerSize) * 100;

      let newPrev = prevStartPercent + deltaPercent;
      let newNext = nextStartPercent - deltaPercent;

      if (newPrev < prevMin) {
        newPrev = prevMin;
        newNext = prevStartPercent + nextStartPercent - prevMin;
      } else if (newNext < nextMin) {
        newNext = nextMin;
        newPrev = prevStartPercent + nextStartPercent - nextMin;
      }

      finalPrevPercent = newPrev;
      finalNextPercent = newNext;

      // Update DOM directly for smooth rendering (60fps)
      prevPanel!.style.flexGrow = String(newPrev);
      nextPanel!.style.flexGrow = String(newNext);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      // Commit changes to state
      sizesRef.current[prevId] = finalPrevPercent;
      sizesRef.current[nextId] = finalNextPercent;
      setSizes(prev => ({
        ...prev,
        [prevId]: finalPrevPercent,
        [nextId]: finalNextPercent
      }));
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <PanelGroupContext.Provider value={{ registerPanel, unregisterPanel, sizes, onDragStart }}>
      <div
        ref={containerRef}
        data-panel-group
        style={{
          display: 'flex',
          flexDirection: orientation === 'horizontal' ? 'row' : 'column',
          width: '100%',
          height: '100%',
          overflow: 'hidden'
        }}
        className={className}
      >
        {children}
      </div>
    </PanelGroupContext.Provider>
  );
}

export function Panel({ children, defaultSize = 50, minSize = 10, className = '', id: propId }: PanelProps) {
  const context = useContext(PanelGroupContext);
  if (!context) {
    throw new Error('Panel must be used inside a PanelGroup');
  }

  const generatedId = React.useId();
  const id = propId || generatedId;

  useEffect(() => {
    context.registerPanel(id, defaultSize, minSize);
    return () => {
      context.unregisterPanel(id);
    };
  }, [id, defaultSize, minSize]);

  const size = context.sizes[id] !== undefined ? context.sizes[id] : defaultSize;

  return (
    <div
      data-panel
      data-panel-id={id}
      data-min-size={minSize}
      style={{
        flexGrow: size,
        flexShrink: 1,
        flexBasis: '0px',
        overflow: 'hidden',
        position: 'relative'
      }}
      className={className}
    >
      {children}
    </div>
  );
}

export function PanelResizeHandle({ children, className = '' }: PanelResizeHandleProps) {
  const context = useContext(PanelGroupContext);
  if (!context) {
    throw new Error('PanelResizeHandle must be used inside a PanelGroup');
  }

  const handleRef = useRef<HTMLDivElement>(null);

  const onMouseDown = (e: React.MouseEvent) => {
    if (handleRef.current) {
      context.onDragStart(e, handleRef.current);
    }
  };

  return (
    <div
      ref={handleRef}
      data-panel-resize-handle
      onMouseDown={onMouseDown}
      className={className}
      style={{
        userSelect: 'none',
        touchAction: 'none'
      }}
    >
      {children}
    </div>
  );
}

// Export mapping to match the original package's names
export { PanelGroup as Group, PanelResizeHandle as Separator };
