import React from 'react';
import { ensureTelegramMiniAppFullscreen } from '../../lib/telegramMiniApp';

export function useTelegramMapInteractionMode(enabled = true) {
  React.useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    ensureTelegramMiniAppFullscreen();
  }, [enabled]);
}
