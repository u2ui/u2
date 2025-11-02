// Cookie Banner
// consent gilt momentan für gesamten Domain

class U2CookieBanner extends HTMLElement {
  constructor() {
    super();
    this.popover = "manual";
    this.id = "u2Cookiebanner";
    this.consent = {};
  }

  async show() {
    const { init } = await import('./ui.js');
    init(this);
    this.showPopover();
  }

  connectedCallback() {
    const data = getCookie();
    if (!data) {
      this.show();
    } else {
      this.consent = data;
      this.emitConsent();
    }
  }

  emitConsent(isUpdate) {
    document.dispatchEvent(new CustomEvent('u2-cookiebanner-consent', {detail: {isUpdate, consent: this.consent}, bubbles: true, cancelable: true}));
  }

  setConsent(consent) {
    this.consent = consent;
    setCookie(this.consent, 365);
    this.emitConsent(true);
  }
}

// Helpers
function setCookie(value, days) {
  document.cookie = `u2-cookiebanner=${JSON.stringify(value)};max-age=${days * 86400};path=/;SameSite=Lax;Secure`;
}
function getCookie() {
  try {
    const cookieValue = document.cookie.split('; ').find(c => c.startsWith('u2-cookiebanner='))?.split('=')[1];
    return cookieValue ? JSON.parse(cookieValue) : null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

customElements.define('u2-cookiebanner', U2CookieBanner);



// Google Consent Mode v2
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments)};
gtag('js', new Date());


const googleConsentMap = {
    'ad_storage': 'marketing',
    'analytics_storage': 'analytics',
    'ad_user_data': 'marketing',
    'ad_personalization': 'marketing',
    'functionality_storage': 'necessary',
    'personalization_storage': 'functional',
    'security_storage': 'necessary'
};

const defaultConsent = {};
Object.entries(googleConsentMap).forEach(([key, value]) => {
  defaultConsent[key] = value === 'necessary' ? 'granted' : 'denied';
});
defaultConsent.wait_for_update = 500;
gtag('consent', 'default', defaultConsent);

document.addEventListener('u2-cookiebanner-consent', ({detail: {consent}}) => {
    Object.entries(googleConsentMap).forEach(([key, value]) => {
        gtag('consent', 'update', {
            [key]: consent[value] ? 'granted' : 'denied'
        });
    });
});


// bekannte Daten löschen
document.addEventListener('u2-cookiebanner-consent', async ({detail: {consent, isUpdate}}) => {
    if (!isUpdate) return;
    const { cookies, localStorage, sessionStorage } = await import('./knownItems.js');
    Object.entries(cookies).forEach(([cookie, { category }]) => {
        if (!consent[category]) {
            document.cookie = cookie + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        }
    });
    Object.entries(localStorage).forEach(([key, { category }]) => {
        if (!consent[category]) {
            window.localStorage.removeItem(key);
        }
    });
    Object.entries(sessionStorage).forEach(([key, { category }]) => {
        if (!consent[category]) {
            window.sessionStorage.removeItem(key);
        }
    });
});