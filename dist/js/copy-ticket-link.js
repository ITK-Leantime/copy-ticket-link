/**
 * CopyTicketLink — adds a small "copy link" button to Leantime's ticket modal
 * that copies a context-free URL like `${baseUrl}/#/tickets/showTicket/{id}`.
 *
 * Why: Leantime's ticket modal opens via hash routing. When a ticket is opened
 * from a contextual page (e.g. `/ProjectOverview/ProjectOverview?view=...`),
 * the current URL becomes `<contextual path>#/tickets/showTicket/14`. Sharing
 * that URL forces the recipient to first load the contextual view before the
 * modal can open — usually unwanted. This button copies the plain root-anchored
 * variant `<origin>/#/tickets/showTicket/14`, which opens the modal directly
 * from the frontpage.
 *
 * Hook: `window.hashchange`. When the hash matches a ticket-showTicket route,
 * we wait for nyroModal's `.nyroModalCont` wrapper to appear in the DOM and
 * inject the button into it (idempotently, in case the modal re-renders).
 *
 * The button is positioned via CSS (`copy-ticket-link.css`); we just append it
 * to the wrapper.
 */
(function () {
  'use strict';

  const TICKET_HASH_PATTERN = /^#\/tickets\/showTicket\/(\d+)/;
  const MODAL_SELECTOR = '.nyroModalCont';
  // Anchor inside the modal: the "Created by … | Last Updated: …" <small>
  // that the ticket template floats to the top-right. Prepending the button
  // there makes it ride the same float without overlapping anything else.
  // Falls back to the broader content wrapper if the small isn't rendered
  // (defensive — shouldn't happen for the ticket modal).
  const ANCHOR_SELECTOR = '.nyroModalLink > div > small:first-of-type';
  const BUTTON_CLASS = 'copy-ticket-link-btn';
  const FEEDBACK_DURATION_MS = 1500;

  // Translated strings emitted by register.php into a window-scoped object.
  // English fallbacks cover the (unlikely) case where the plugin's JS is
  // loaded before register.php's inline script runs, or in a context where
  // i18n hasn't been wired up.
  function t(key, fallback) {
    const bag = window.copyTicketLinkI18n || {};
    return (bag && bag[key]) || fallback;
  }


  function getTicketIdFromHash() {
    const m = (window.location.hash || '').match(TICKET_HASH_PATTERN);
    return m ? m[1] : null;
  }

  function buildPlainTicketUrl(ticketId) {
    const base = (
      (window.leantime && window.leantime.appUrl) ||
      window.location.origin
    ).replace(/\/$/, '');
    return base + '/#/tickets/showTicket/' + ticketId;
  }

  async function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        // fall through to fallback
      }
    }
    // Fallback for older browsers / non-HTTPS contexts where the async
    // clipboard API is unavailable.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (e) {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }

  /**
   * Briefly swap the Tippy content to a success/error label after a copy
   * attempt. We update the tooltip rather than the visible label so the
   * button doesn't reflow on click.
   */
  function flashFeedback(button, success) {
    button.classList.add(success ? 'is-success' : 'is-error');
    const tip = button._tippy;
    const previousContent = tip
      ? tip.props.content
      : button.getAttribute('data-tippy-content');
    const feedbackText = success
      ? t('copied', 'Copied!')
      : t('copyFailed', 'Copy failed');
    if (tip) {
      tip.setContent(feedbackText);
      tip.show();
    }
    setTimeout(() => {
      button.classList.remove('is-success', 'is-error');
      if (tip) {
        tip.setContent(previousContent);
        // If the user has moved their pointer away by now, hide the bubble;
        // otherwise let Tippy's own mouseleave handling take it.
        if (!button.matches(':hover')) tip.hide();
      }
    }, FEEDBACK_DURATION_MS);
  }

  function buildButton(ticketId) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = BUTTON_CLASS;
    const tooltip = t('copyLinkTooltip', 'Copy link to ticket');
    button.setAttribute('aria-label', tooltip);
    // Tippy is initialized globally on `[data-tippy-content]` by Leantime
    // (see public/assets/js/app/app.js + modals.js). Using the same data
    // attribute gives us the snappy hover-popover Leantime uses elsewhere,
    // rather than the ~600ms-delay native HTML title tooltip.
    button.setAttribute('data-tippy-content', tooltip);

    // Font Awesome 4/5 link glyph — Leantime ships FA so this is always
    // available. The visible label sits beside it; the icon is decorative
    // so it gets aria-hidden, the label carries the accessible text.
    const icon = document.createElement('i');
    icon.className = 'fa fa-link';
    icon.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'copy-ticket-link-btn__label';
    label.textContent = t('copyLink', 'Copy link');
    button.appendChild(icon);
    button.appendChild(label);

    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const ok = await copyToClipboard(buildPlainTicketUrl(ticketId));
      flashFeedback(button, ok);
    });
    return button;
  }

  function ensureButtonPresent(ticketId) {
    const modal = document.querySelector(MODAL_SELECTOR);
    if (!modal) return;
    if (modal.querySelector('.' + BUTTON_CLASS)) return;
    const anchor = modal.querySelector(ANCHOR_SELECTOR);
    if (!anchor) return; // wait for the ticket template to render
    const button = buildButton(ticketId);
    anchor.insertBefore(button, anchor.firstChild);
    // Initialize Tippy on the freshly-inserted button. modals.js already ran
    // its own `tippy('[data-tippy-content]')` pass in `afterShowCont` before
    // we got here, so we have to wire ours up explicitly.
    if (typeof window.tippy === 'function') {
      window.tippy(button);
    }
  }

  /**
   * Keeps a persistent MutationObserver running while a ticket hash is
   * active. nyroModal renders the wrapper first and then wipes its content
   * area when the iframe finishes loading, so a one-shot injection gets
   * blown away. Re-injecting whenever the button is missing also covers
   * subsequent modal re-renders (e.g. switching between tabs inside the
   * modal) without needing to hook nyroModal's private lifecycle events.
   *
   * Mutations that don't change the button's presence are no-ops:
   * `ensureButtonPresent` returns immediately if our button is already
   * mounted. The append itself triggers exactly one extra mutation cycle,
   * after which the observer goes quiet until something else churns the DOM.
   */
  let injectionObserver = null;
  let activeTicketId = null;

  function startInjectionWatch(ticketId) {
    activeTicketId = ticketId;
    ensureButtonPresent(ticketId);
    if (injectionObserver) return;
    injectionObserver = new MutationObserver(() => {
      if (activeTicketId) ensureButtonPresent(activeTicketId);
    });
    injectionObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function stopInjectionWatch() {
    activeTicketId = null;
    if (injectionObserver) {
      injectionObserver.disconnect();
      injectionObserver = null;
    }
  }

  function handleHashChange() {
    const ticketId = getTicketIdFromHash();
    if (ticketId) {
      startInjectionWatch(ticketId);
    } else {
      stopInjectionWatch();
    }
  }

  // Initial check covers landing on a `#/tickets/showTicket/N` URL directly
  // (the modals.js core handler runs on DOMContentLoaded, so we want to be
  // ready by then too).
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleHashChange);
  } else {
    handleHashChange();
  }
  window.addEventListener('hashchange', handleHashChange);
})();
