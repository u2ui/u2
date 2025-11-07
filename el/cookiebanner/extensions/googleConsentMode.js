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
defaultConsent.wait_for_update = 700;
gtag('consent', 'default', defaultConsent);


function updateConsent(consent) {
    Object.entries(googleConsentMap).forEach(([key, value]) => {
        gtag('consent', 'update', {
            [key]: consent[value] ? 'granted' : 'denied'
        });
    });
    console.log('updateConsent for google-consent-mode', Object.entries(googleConsentMap).map(([key, value]) => [key, consent[value]]));
}


(window.u2ConsentHandlers ??= []).push(updateConsent);