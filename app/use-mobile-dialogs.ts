'use client';

import { useEffect, useRef } from 'react';

/** Keep sheets inside Safari's visible area and return to the same place on close. */
export function useMobileDialogs(open: boolean, onClose: () => void) {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => {
      document.documentElement.style.setProperty(
        '--visible-height',
        `${viewport?.height ?? window.innerHeight}px`,
      );
      document.documentElement.style.setProperty('--visible-top', `${viewport?.offsetTop ?? 0}px`);
      const editing = document.activeElement?.matches('input,textarea,select');
      document.body.classList.toggle(
        'keyboard-open',
        !!editing && window.innerHeight - (viewport?.height ?? window.innerHeight) > 120,
      );
    };
    update();
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    return () => {
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
      document.body.classList.remove('keyboard-open');
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    if (!dialog) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const scrollY = window.scrollY;
    const previousStyle = document.body.getAttribute('style');
    const background = Array.from(document.querySelector('main')?.children ?? []).filter(
      (el) => !el.contains(dialog),
    ) as HTMLElement[];
    const inertBefore = background.map((el) => el.hasAttribute('inert'));
    background.forEach((el) => {
      el.setAttribute('inert', '');
    });
    Object.assign(document.body.style, {
      position: 'fixed',
      top: `-${scrollY}px`,
      width: '100%',
      overflow: 'hidden',
    });
    const focusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),summary,iframe,[tabindex="0"]',
        ),
      ).filter((el) => el.getClientRects().length);
    focusable()[0]?.focus({ preventScroll: true });
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close.current();
      }
      if (event.key !== 'Tab') return;
      const targets = focusable();
      const first = targets[0],
        last = targets.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      background.forEach((el, index) => {
        if (!inertBefore[index]) el.removeAttribute('inert');
      });
      if (previousStyle === null) document.body.removeAttribute('style');
      else document.body.setAttribute('style', previousStyle);
      window.scrollTo({ top: scrollY, behavior: 'instant' });
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open]);
}
