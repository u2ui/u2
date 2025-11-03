// Cookie Banner
// consent gilt momentan für gesamten Domain

window.u2CookiebannerInitialConsent = null;

class U2CookieBanner extends HTMLElement {
  constructor() {
    super();
    this.popover = "manual";
    this.id = "u2Cookiebanner";
    this.consent = {};
  }

  show() {
    import('./ui.js').then(ui => ui.init(this));
    this.showPopover();
  }

  connectedCallback() {
    const data = getCookie();
    if (!data) this.show();
    else {
      this.consent = data;
      if (!window.u2CookiebannerInitialConsent) {
        window.u2CookiebannerInitialConsent = data;
        queueMicrotask(()=>this.emitConsent());
      }
    }
  }

  emitConsent(isUpdate) {
    dispatchEvent(new CustomEvent('u2-cookiebanner-consent', {detail: {isUpdate, consent: this.consent}}));
  }

  setConsent(consent) {
    this.consent = consent;
    setCookie(this.consent);
    this.emitConsent(true);
    this.hidePopover();
  }
}


// Helpers
function setCookie(value) {
  document.cookie = `u2-cookiebanner=${JSON.stringify(value)};max-age=${365 * 86400};path=/;SameSite=Lax;Secure`;
}
function getCookie() {
  try {
    const cookieValue = document.cookie.split('; ').find(c => c.startsWith('u2-cookiebanner='))?.split('=')[1];
    return cookieValue ? JSON.parse(cookieValue) : null;
  } catch (error) {
    console.error(error);
    return null; // todo: kann weg, da sonst null oder undefined? zurückgegeben wird.
  }
}

customElements.define('u2-cookiebanner', U2CookieBanner);



// load scripts based on consent
// todo: SelectorObserver verwenden
const alternativeCategories = {
  // own
  'necessary': 'necessary', // also Cookiebot
  'functional': 'functional', // also Usercentrics
  'analytics': 'analytics', // also Usercentrics
  'marketing': 'marketing', // also Cookiebot
  // Cookiebot
  'preferences': 'functional',
  'statistics': 'analytics',
  'ignore': null,
  // Usercentrics / andere Labels
  'essential': 'necessary',
  // OneTrust (ID-basiert, unsicher ob Zuordnung stimmt)
  'C0001': 'necessary',
  'C0002': 'analytics',
  'C0003': 'functional',
  'C0004': 'marketing',
};

window.addEventListener('u2-cookiebanner-consent', ({ detail: { consent } }) => {
  setTimeout(() => { // needed for type=module?
    document.querySelectorAll('script[type="text/plain"]').forEach(script => {
      let value = script.dataset.cookieconsent || script.dataset.uc || script.dataset.category;
      if (!value) return;
      value = value.toLowerCase();

      const category = alternativeCategories[value];
      if (!category) {
        console.warn(`u2-cookiebanner: Unknown category ${value}`, script);
        return;
      }
      if (consent[category]) {
        const newScript = document.createElement('script');
        if (script.src) newScript.src = script.src;
        else newScript.textContent = script.textContent;
        newScript.type = 'text/javascript';
        script.parentNode.replaceChild(newScript, script);
      }
    });
  }, 10);
});


// Bekannte Daten löschen
// todo: Wildcards berücksichtigen
// todo: cookies besser löschen
addEventListener('u2-cookiebanner-consent', async ({detail: {consent, isUpdate}}) => {
    if (!isUpdate) return;

    function deleteCookie(name) {
      const domains = [
        '', 
        `.${window.location.hostname}`,
        window.location.hostname
      ];
      const paths = ['/', ''];
      domains.forEach(domain => {
        paths.forEach(path => {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}${domain ? `; domain=${domain}` : ''}`;
        });
      });
    }

    const { cookies, localStorage, sessionStorage } = await import('./knownItems.js');
    Object.entries(cookies).forEach(([cookie, { category }]) => {
        if (!consent[category]) deleteCookie(cookie);
    });
    Object.entries(localStorage).forEach(([key, { category }]) => {
        if (!consent[category]) window.localStorage.removeItem(key);
    });
    Object.entries(sessionStorage).forEach(([key, { category }]) => {
        if (!consent[category]) window.sessionStorage.removeItem(key);
    });
});