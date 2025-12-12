import { useEffect, useRef } from 'react';

interface SwipeGestureOptions {
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  threshold?: number; // минимальное расстояние для свайпа в пикселях
  velocityThreshold?: number; // минимальная скорость для свайпа
}

export function useSwipeGesture(options: SwipeGestureOptions) {
  const { onSwipeRight, onSwipeLeft, threshold = 50, velocityThreshold = 0.3 } = options;
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const deltaTime = Date.now() - touchStartRef.current.time;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const velocity = distance / deltaTime;

      // Проверяем, что это горизонтальный свайп (не вертикальный)
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold && velocity > velocityThreshold) {
        if (deltaX > 0 && onSwipeRight) {
          // Свайп вправо
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          // Свайп влево
          onSwipeLeft();
        }
      }

      touchStartRef.current = null;
    };

    const element = elementRef.current || document.body;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipeRight, onSwipeLeft, threshold, velocityThreshold]);

  return elementRef;
}

