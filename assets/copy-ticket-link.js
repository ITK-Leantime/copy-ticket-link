(function () {
  'use strict';

  const TICKET_HASH_PATTERN = /^#\/tickets\/showTicket\/(\d+)/;
  const MODAL_SELECTOR = '.nyroModalCont';
  // The "Created by … | Last Updated" line. Anchor on its `tw-float-right`
  // class rather than `:first-of-type`: subtasks render a parent-breadcrumb
  // <small> ahead of this one, which would otherwise capture the button and
  // push it to the top-left of the modal.
  const ANCHOR_SELECTOR = '.nyroModalLink > div > small.tw-float-right';
  const BUTTON_CLASS = 'copy-ticket-link-btn';
  const TEXTAREA_CLASS = 'copy-ticket-textarea';
  const FEEDBACK_DURATION_MS = 1500;

  /**
   * Look up a translated string with English fallback.
   * @param {string} key
   * @param {string} fallback
   * @returns {string}
   */
  function t(key, fallback) {
    const bag = window.copyTicketLinkI18n || {};
    return (bag && bag[key]) || fallback;
  }

  /**
   * Extract a ticket id from the current location hash.
   * @returns {string|null}
   */
  function getTicketIdFromHash() {
    const m = (window.location.hash || '').match(TICKET_HASH_PATTERN);
    return m ? m[1] : null;
  }

  /**
   * Build a context-free `<origin>/#/tickets/showTicket/<id>` URL.
   * @param {string} ticketId
   * @returns {string}
   */
  function buildPlainTicketUrl(ticketId) {
    const base = (
      (window.leantime && window.leantime.appUrl) ||
      window.location.origin
    ).replace(/\/$/, '');
    return base + '/#/tickets/showTicket/' + ticketId;
  }

  /**
   * Copy text to the clipboard, falling back to execCommand on legacy browsers.
   * @param {string} text
   * @returns {Promise<boolean>}
   */
  async function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.error(err);
      }
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.className = TEXTAREA_CLASS;
    document.body.appendChild(ta);
    ta.select();
    let ok;
    try {
      ok = document.execCommand('copy');
    } catch (err) {
      console.error(err);
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }

  /**
   * Briefly swap the Tippy content to a success/error label.
   * @param {HTMLButtonElement} button
   * @param {boolean} success
   * @returns {void}
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
        if (!button.matches(':hover')) tip.hide();
      }
    }, FEEDBACK_DURATION_MS);
  }

  /**
   * Build the copy-link button element.
   * @param {string} ticketId
   * @returns {HTMLButtonElement}
   */
  function buildButton(ticketId) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = BUTTON_CLASS;
    const tooltip = t('copyLinkTooltip', 'Copy direct link to ticket');
    button.setAttribute('aria-label', tooltip);
    button.setAttribute('data-tippy-content', tooltip);

    const icon = document.createElement('i');
    icon.className = 'fa fa-link';
    icon.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'copy-ticket-link-btn__label';
    label.textContent = t('copyLink', 'Copy direct link');
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

  /**
   * Inject the button into the open modal if it isn't already there.
   * @param {string} ticketId
   * @returns {void}
   */
  function ensureButtonPresent(ticketId) {
    const modal = document.querySelector(MODAL_SELECTOR);
    if (!modal) return;
    if (modal.querySelector('.' + BUTTON_CLASS)) return;
    const anchor = modal.querySelector(ANCHOR_SELECTOR);
    if (!anchor) return;
    const button = buildButton(ticketId);
    anchor.insertBefore(button, anchor.firstChild);
    if (typeof window.tippy === 'function') {
      window.tippy(button);
    }
  }

  let injectionObserver = null;
  let activeTicketId = null;

  /**
   * Start re-injecting the button on every DOM mutation while a ticket is open.
   * @param {string} ticketId
   * @returns {void}
   */
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

  /**
   * Stop the injection observer.
   * @returns {void}
   */
  function stopInjectionWatch() {
    activeTicketId = null;
    if (injectionObserver) {
      injectionObserver.disconnect();
      injectionObserver = null;
    }
  }

  /**
   * Start or stop the injection watch based on the current hash.
   * @returns {void}
   */
  function handleHashChange() {
    const ticketId = getTicketIdFromHash();
    if (ticketId) {
      startInjectionWatch(ticketId);
    } else {
      stopInjectionWatch();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleHashChange);
  } else {
    handleHashChange();
  }
  window.addEventListener('hashchange', handleHashChange);
})();
