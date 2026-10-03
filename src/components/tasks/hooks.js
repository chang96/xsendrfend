import { useEffect, useRef, useState } from "react";
import { currentDay, getTasksState, runCleanup, selectView, subscribeTasks } from "../../utils/tasksStore";

// Live planner view; recomputes when data changes and when the day rolls over
export function usePlanner() {
    const [s, setS] = useState(getTasksState());
    const [tick, setTick] = useState(0);
    const dayRef = useRef(currentDay());

    useEffect(() => subscribeTasks(setS), []);
    useEffect(() => {
        runCleanup();
        const t = setInterval(() => {
            const d = currentDay();
            if (d !== dayRef.current) {
                dayRef.current = d;
                runCleanup();
            }
            setTick((x) => x + 1);
        }, 60 * 1000);
        return () => clearInterval(t);
    }, []);

    // eslint-disable-next-line no-unused-vars
    const _tick = tick; // re-render every minute so the day/carry badges stay current
    return selectView(s, Date.now());
}

// Pointer-driven drag-to-reorder for one vertical list.
// Usage: const sort = useSortable(ids, onCommit); <div ref={sort.ref(id)} style={sort.style(id)}> ... <Handle {...sort.handle(id)} />
export function useSortable(ids, onCommit) {
    const nodes = useRef({});
    const [drag, setDrag] = useState(null); // { id, from, to, dy, rects, startY }
    const dragRef = useRef(null);
    dragRef.current = drag;

    useEffect(() => {
        if (!drag) return undefined;
        const move = (e) => {
            const d = dragRef.current;
            if (!d) return;
            const dy = e.clientY - d.startY;
            const r = d.rects[d.from];
            const center = r.top + r.height / 2 + dy;
            // new index = how many other rows the dragged row's center has passed
            let to = 0;
            d.rects.forEach((rect, idx) => {
                if (idx !== d.from && center > rect.top + rect.height / 2) to++;
            });
            setDrag({ ...d, dy, to });
        };
        const up = () => {
            const d = dragRef.current;
            setDrag(null);
            if (d && d.to !== d.from) {
                const next = [...ids];
                const [moved] = next.splice(d.from, 1);
                next.splice(d.to, 0, moved);
                onCommit(next);
            }
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        window.addEventListener("pointercancel", up);
        return () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            window.removeEventListener("pointercancel", up);
        };
    }, [drag && drag.id]); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        dragging: drag ? drag.id : null,
        ref: (id) => (el) => { if (el) nodes.current[id] = el; else delete nodes.current[id]; },
        handle: (id) => ({
            onPointerDown: (e) => {
                if (e.button !== undefined && e.button !== 0) return;
                e.preventDefault();
                e.stopPropagation();
                const rects = ids.map((i) => (nodes.current[i] ? nodes.current[i].getBoundingClientRect() : { top: 0, height: 0 }));
                const from = ids.indexOf(id);
                if (from < 0) return;
                setDrag({ id, from, to: from, dy: 0, rects, startY: e.clientY });
            },
        }),
        style: (id) => {
            if (!drag) return undefined;
            const i = ids.indexOf(id);
            if (id === drag.id) {
                return { transform: `translateY(${drag.dy}px) scale(1.02)`, zIndex: 20, position: "relative", boxShadow: "0 12px 30px -10px rgba(0,0,0,0.8)", transition: "box-shadow 0.2s" };
            }
            const r = drag.rects[drag.from];
            const gap = drag.rects.length > 1 ? Math.max(0, (drag.rects[1].top - drag.rects[0].top - drag.rects[0].height)) : 8;
            const shift = r.height + gap;
            let y = 0;
            if (drag.from < drag.to && i > drag.from && i <= drag.to) y = -shift;
            if (drag.from > drag.to && i < drag.from && i >= drag.to) y = shift;
            return { transform: `translateY(${y}px)`, transition: "transform 0.2s cubic-bezier(0.2,0.8,0.2,1)" };
        },
    };
}

// Swipe left to delete, tap to open. Returns props for the moving layer + state for the red backdrop.
export function useSwipe({ onTap, onDelete, disabled }) {
    const start = useRef(null);
    const [dx, setDx] = useState(0);
    const [leaving, setLeaving] = useState(false);
    const THRESHOLD = 90;

    const props = {
        onPointerDown: (e) => {
            if (disabled || (e.button !== undefined && e.button !== 0)) return;
            start.current = { x: e.clientX, y: e.clientY, swiping: false, moved: false, id: e.pointerId };
        },
        onPointerMove: (e) => {
            const s = start.current;
            if (!s) return;
            const mx = e.clientX - s.x, my = e.clientY - s.y;
            if (!s.swiping && Math.abs(mx) > 8 && Math.abs(mx) > Math.abs(my) * 1.3 && mx < 0) {
                s.swiping = true;
                try { e.currentTarget.setPointerCapture(s.id); } catch (err) {}
            }
            if (Math.abs(mx) > 6 || Math.abs(my) > 6) s.moved = true;
            if (s.swiping) setDx(Math.min(0, mx));
        },
        onPointerUp: () => {
            const s = start.current;
            start.current = null;
            if (!s) return;
            if (s.swiping) {
                if (dx < -THRESHOLD) {
                    setLeaving(true);
                    setTimeout(() => { onDelete(); setLeaving(false); setDx(0); }, 200);
                } else setDx(0);
            } else if (!s.moved && onTap) onTap();
        },
        onPointerCancel: () => { start.current = null; setDx(0); },
    };
    return {
        props,
        dx,
        leaving,
        armed: dx < -THRESHOLD,
        style: dx ? { transform: `translateX(${dx}px)`, transition: "none" } : { transition: "transform 0.25s cubic-bezier(0.2,0.8,0.2,1)" },
    };
}
