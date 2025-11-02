const allCategories = ['necessary', 'functional', 'analytics', 'marketing'];

export function init(el) {
    
    const policyLink = el.getAttribute('policy-link');
    const message = el.getAttribute('message') || getText(el, 'message');
    const categories = el.getAttribute('categories')?.split(' ').map(c => c.trim()).filter(c => c) || allCategories;

    el.innerHTML = `
        <div class=-main>
            <div>
                <span class=-message>${message}</span>
                ${policyLink
                    ? `<a href="${policyLink}" target="_blank">${getText(el, 'policy')}</a>`
                    : ''}
            </div>
            <div class=-buttons>
                <button name="accept" class=-main>${getText(el, 'accept')}</button>
                <button name="decline">${getText(el, 'decline')}</button>
                <button name="settings">${getText(el, 'settings')}</button>
            </div>
        </div>
        <div class=-settings hidden>
            <div>${getText(el, 'message-settings')}</div>
            <div class=-categories>
                ${categories.map(c => `<label><input type=checkbox name="${c}" ${c==='necessary'?'checked disabled': ''}>${getText(el,c)}</label>`).join('')}
            </div>
            <div class=-buttons>
                <button name="save" class=-main>${getText(el,'save')}</button>
                <button name="back" type=button>${getText(el,'back')}</button>
            </div>
        </div>
    `;

    el.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        switch (button.name) {
            case 'accept': acceptAll(); break;
            case 'decline': necessaryOnly(); break;
            case 'save': save(); break;
            case 'settings': showSettings(); break;
            case 'back': hideSettings(); break;
        }
    });

    const showSettings = () => {
        el.querySelector('.-main').style.display = 'none';
        el.querySelector('.-settings').style.display = 'block';
        if (el.consent) {
            el.consent.necessary = true;
            el.querySelectorAll('.-categories input').forEach(c => c.checked = el.consent[c.name]);
        }
    };
    const hideSettings = () => {
        el.querySelector('.-settings').style.display = 'none';
        el.querySelector('.-main').style.display = 'block';
    };
    function save() {
        const consent = {};
        el.querySelectorAll('.-categories input').forEach(c => consent[c.name] = c.checked);
        el.setConsent(consent);
        el.hidePopover();
    }
    function acceptAll() {
        el.querySelectorAll('.-categories input').forEach(c => c.checked = true);
        save();
    }
    function necessaryOnly() {
        el.querySelectorAll('.-categories input').forEach(c => c.checked = c.name === 'necessary');
        save();
    }


    // wenn ausschliesslich notwendige cookies, dann nur akzeptieren anzeigen
    if (categories.length === 1 && categories[0] === 'necessary') {
        el.querySelector('[name="settings"]').style.display = 'none';
        el.querySelector('[name="decline"]').style.display = 'none';
        el.querySelector('.-message').textContent = el.getAttribute('message-necessary-only') || getText(el, 'message-necessary-only');
    }

}

function getText(el, key) {
    const lang = langOf(el);
    return translations[key][lang] ?? translations[key]['en'] ?? key;
}
function langOf(el) {
    return (el.closest('[lang]')?.getAttribute('lang') || navigator.language || 'en').substring(0,2);
}

const translations = {
    'message': {
        'de': 'Diese Website verwendet Cookies, um die Benutzererfahrung zu verbessern.',
        'en': 'This website uses cookies to enhance the user experience.',
        'fr': 'Ce site utilise des cookies pour améliorer l\'expérience utilisateur.',
        'es': 'Este sitio web utiliza cookies para mejorar la experiencia del usuario.',
        'it': 'Questo sito utilizza i cookie per migliorare l\'esperienza utente.',
        'pt': 'Este site utiliza cookies para melhorar a experiência do usuário.',
        'nl': 'Deze website gebruikt cookies om de gebruikerservaring te verbeteren.',
        'pl': 'Ta strona używa plików cookie, aby poprawić doświadczenie użytkownika.',
        'sv': 'Denna webbplats använder cookies för att förbättra användarupplevelsen.',
        'da': 'Denne hjemmeside bruger cookies for at forbedre brugeroplevelsen.',
        'no': 'Dette nettstedet bruker informasjonskapsler for å forbedre brukeropplevelsen.',
        'fi': 'Tämä verkkosivusto käyttää evästeitä parantaakseen käyttökokemusta.',
        'cs': 'Tato webová stránka používá soubory cookie ke zlepšení uživatelského zážitku.',
        'hu': 'Ez a weboldal sütiket használ a felhasználói élmény javítása érdekében.',
        'ro': 'Acest site folosește cookie-uri pentru a îmbunătăți experiența utilizatorului.',
        'el': 'Αυτός ο ιστότοπος χρησιμοποιεί cookies για να βελτιώσει την εμπειρία του χρήστη.',
        'tr': 'Bu web sitesi, kullanıcı deneyimini geliştirmek için çerezler kullanır.',
        'ru': 'Этот сайт использует файлы cookie для улучшения пользовательского опыта.',
        'uk': 'Цей веб-сайт використовує файли cookie для покращення користувацького досвіду.',
        'ja': 'このウェブサイトは、ユーザーエクスペリエンスを向上させるためにCookieを使用しています。',
        'zh': '本网站使用Cookie来增强用户体验。',
        'ko': '이 웹사이트는 사용자 경험을 향상시키기 위해 쿠키를 사용합니다.',
        'ar': 'يستخدم هذا الموقع ملفات تعريف الارتباط لتحسين تجربة المستخدم.',
    },
    'message-necessary-only': {
        'de': 'Diese Website verwendet nur für den Betrieb notwendige Cookies.',
        'en': 'This website uses only necessary cookies for operation.',
        'fr': 'Ce site utilise uniquement les cookies nécessaires au fonctionnement.',
        'es': 'Este sitio web utiliza solo cookies necesarias para su funcionamiento.',
        'it': 'Questo sito utilizza solo i cookie necessari per il funzionamento.',
        'pt': 'Este site utiliza apenas cookies necessários para o funcionamento.',
        'nl': 'Deze website gebruikt alleen noodzakelijke cookies voor de werking.',
        'pl': 'Ta strona używa tylko niezbędnych plików cookie do działania.',
        'sv': 'Denna webbplats använder endast nödvändiga cookies för drift.',
        'da': 'Denne hjemmeside bruger kun nødvendige cookies til drift.',
        'no': 'Dette nettstedet bruker bare nødvendige informasjonskapsler for drift.',
        'fi': 'Tämä verkkosivusto käyttää vain toiminnan kannalta välttämättömiä evästeitä.',
        'cs': 'Tato webová stránka používá pouze nezbytné soubory cookie pro provoz.',
        'hu': 'Ez a weboldal csak a működéshez szükséges sütiket használja.',
        'ro': 'Acest site folosește doar cookie-uri necesare pentru funcționare.',
        'el': 'Αυτός ο ιστότοπος χρησιμοποιεί μόνο απαραίτητα cookies για τη λειτουργία.',
        'tr': 'Bu web sitesi yalnızca işletim için gerekli çerezleri kullanır.',
        'ru': 'Этот сайт использует только необходимые файлы cookie для работы.',
        'uk': 'Цей веб-сайт використовує лише необхідні файли cookie для роботи.',
        'ja': 'このウェブサイトは、運用に必要なCookieのみを使用しています。',
        'zh': '本网站仅使用必要的Cookie来运营。',
        'ko': '이 웹사이트는 운영에 필요한 쿠키만 사용합니다.',
        'ar': 'يستخدم هذا الموقع فقط ملفات تعريف الارتباط الضرورية للتشغيل.',
    },
    'message-settings': {
        'de': 'Wählen Sie aus, welche Cookies verwendet werden sollen.',
        'en': 'Select which cookies should be used.',
        'fr': 'Sélectionnez les cookies à utiliser.',
        'es': 'Seleccione qué cookies deben utilizarse.',
        'it': 'Seleziona quali cookie devono essere utilizzati.',
        'pt': 'Selecione quais cookies devem ser utilizados.',
        'nl': 'Selecteer welke cookies moeten worden gebruikt.',
        'pl': 'Wybierz, które pliki cookie mają być używane.',
        'sv': 'Välj vilka cookies som ska användas.',
        'da': 'Vælg hvilke cookies der skal bruges.',
        'no': 'Velg hvilke informasjonskapsler som skal brukes.',
        'fi': 'Valitse, mitä evästeitä käytetään.',
        'cs': 'Vyberte, které soubory cookie mají být použity.',
        'hu': 'Válassza ki, mely sütiket szeretné használni.',
        'ro': 'Selectați ce cookie-uri trebuie utilizate.',
        'el': 'Επιλέξτε ποια cookies θα χρησιμοποιηθούν.',
        'tr': 'Hangi çerezlerin kullanılacağını seçin.',
        'ru': 'Выберите, какие файлы cookie следует использовать.',
        'uk': 'Виберіть, які файли cookie слід використовувати.',
        'ja': '使用するCookieを選択してください。',
        'zh': '选择应使用哪些Cookie。',
        'ko': '사용할 쿠키를 선택하세요.',
        'ar': 'حدد ملفات تعريف الارتباط التي يجب استخدامها.',
    },
    'accept': {
        'de': 'Alle akzeptieren',
        'en': 'Accept all',
        'fr': 'Tout accepter',
        'es': 'Aceptar todo',
        'it': 'Accetta tutto',
        'pt': 'Aceitar tudo',
        'nl': 'Alles accepteren',
        'pl': 'Akceptuj wszystkie',
        'sv': 'Acceptera alla',
        'da': 'Accepter alle',
        'no': 'Aksepter alle',
        'fi': 'Hyväksy kaikki',
        'cs': 'Přijmout vše',
        'hu': 'Összes elfogadása',
        'ro': 'Acceptă tot',
        'el': 'Αποδοχή όλων',
        'tr': 'Tümünü kabul et',
        'ru': 'Принять все',
        'uk': 'Прийняти всі',
        'ja': 'すべて受け入れる',
        'zh': '接受全部',
        'ko': '모두 수락',
        'ar': 'قبول الكل',
    },
    'decline': {
        'de': 'Nur Notwendige',
        'en': 'Necessary Only',
        'fr': 'Nécessaires uniquement',
        'es': 'Solo necesarias',
        'it': 'Solo necessari',
        'pt': 'Apenas necessários',
        'nl': 'Alleen noodzakelijke',
        'pl': 'Tylko niezbędne',
        'sv': 'Endast nödvändiga',
        'da': 'Kun nødvendige',
        'no': 'Bare nødvendige',
        'fi': 'Vain välttämättömät',
        'cs': 'Pouze nezbytné',
        'hu': 'Csak szükségesek',
        'ro': 'Doar necesare',
        'el': 'Μόνο απαραίτητα',
        'tr': 'Yalnızca gerekli',
        'ru': 'Только необходимые',
        'uk': 'Тільки необхідні',
        'ja': '必要なもののみ',
        'zh': '仅必要的',
        'ko': '필수 항목만',
        'ar': 'الضروري فقط',
    },
    'policy': {
        'de': 'Datenschutzerklärung',
        'en': 'Privacy Policy',
        'fr': 'Politique de confidentialité',
        'es': 'Política de privacidad',
        'it': 'Informativa sulla privacy',
        'pt': 'Política de Privacidade',
        'nl': 'Privacybeleid',
        'pl': 'Polityka prywatności',
        'sv': 'Integritetspolicy',
        'da': 'Privatlivspolitik',
        'no': 'Personvernpolicy',
        'fi': 'Tietosuojakäytäntö',
        'cs': 'Zásady ochrany osobních údajů',
        'hu': 'Adatvédelmi irányelvek',
        'ro': 'Politica de confidențialitate',
        'el': 'Πολιτική Απορρήτου',
        'tr': 'Gizlilik Politikası',
        'ru': 'Политика конфиденциальности',
        'uk': 'Політика конфіденційності',
        'ja': 'プライバシーポリシー',
        'zh': '隐私政策',
        'ko': '개인정보 처리방침',
        'ar': 'سياسة الخصوصية',
    },
    'settings': {
        'de': 'Einstellungen...',
        'en': 'Settings...',
        'fr': 'Paramètres...',
        'es': 'Configuración...',
        'it': 'Impostazioni...',
        'pt': 'Configurações...',
        'nl': 'Instellingen...',
        'pl': 'Ustawienia...',
        'sv': 'Inställningar...',
        'da': 'Indstillinger...',
        'no': 'Innstillinger...',
        'fi': 'Asetukset...',
        'cs': 'Nastavení...',
        'hu': 'Beállítások...',
        'ro': 'Setări...',
        'el': 'Ρυθμίσεις...',
        'tr': 'Ayarlar...',
        'ru': 'Настройки...',
        'uk': 'Налаштування...',
        'ja': '設定...',
        'zh': '设置...',
        'ko': '설정...',
        'ar': 'إعدادات...',
    },
    'save': {
        'de': 'Speichern',
        'en': 'Save',
        'fr': 'Enregistrer',
        'es': 'Guardar',
        'it': 'Salva',
        'pt': 'Salvar',
        'nl': 'Opslaan',
        'pl': 'Zapisz',
        'sv': 'Spara',
        'da': 'Gem',
        'no': 'Lagre',
        'fi': 'Tallenna',
        'cs': 'Uložit',
        'hu': 'Mentés',
        'ro': 'Salvează',
        'el': 'Αποθήκευση',
        'tr': 'Kaydet',
        'ru': 'Сохранить',
        'uk': 'Зберегти',
        'ja': '保存',
        'zh': '保存',
        'ko': '저장',
        'ar': 'حفظ',
    },
    'back': {
        'de': 'Zurück',
        'en': 'Back',
        'fr': 'Retour',
        'es': 'Volver',
        'it': 'Indietro',
        'pt': 'Voltar',
        'nl': 'Terug',
        'pl': 'Wstecz',
        'sv': 'Tillbaka',
        'da': 'Tilbage',
        'no': 'Tilbake',
        'fi': 'Takaisin',
        'cs': 'Zpět',
        'hu': 'Vissza',
        'ro': 'Înapoi',
        'el': 'Πίσω',
        'tr': 'Geri',
        'ru': 'Назад',
        'uk': 'Назад',
        'ja': '戻る',
        'zh': '返回',
        'ko': '뒤로',
        'ar': 'رجوع',
    },
    'necessary': {
        'de': 'Erforderlich',
        'en': 'Necessary',
        'fr': 'Nécessaires',
        'es': 'Necesarias',
        'it': 'Necessari',
        'pt': 'Necessários',
        'nl': 'Noodzakelijk',
        'pl': 'Niezbędne',
        'sv': 'Nödvändiga',
        'da': 'Nødvendige',
        'no': 'Nødvendige',
        'fi': 'Välttämättömät',
        'cs': 'Nezbytné',
        'hu': 'Szükséges',
        'ro': 'Necesare',
        'el': 'Απαραίτητα',
        'tr': 'Gerekli',
        'ru': 'Необходимые',
        'uk': 'Необхідні',
        'ja': '必須',
        'zh': '必要的',
        'ko': '필수',
        'ar': 'ضرورية',
    },
    'functional': {
        'de': 'Personalisierung',
        'en': 'Personalization',
        'fr': 'Personnalisation',
        'es': 'Personalización',
        'it': 'Personalizzazione',
        'pt': 'Personalização',
        'nl': 'Personalisatie',
        'pl': 'Personalizacja',
        'sv': 'Personalisering',
        'da': 'Personalisering',
        'no': 'Personalisering',
        'fi': 'Personointi',
        'cs': 'Personalizace',
        'hu': 'Személyre szabás',
        'ro': 'Personalizare',
        'el': 'Εξατομίκευση',
        'tr': 'Kişiselleştirme',
        'ru': 'Персонализация',
        'uk': 'Персоналізація',
        'ja': 'パーソナライゼーション',
        'zh': '个性化',
        'ko': '개인화',
        'ar': 'التخصيص',
    },
    'analytics': {
        'de': 'Analyse',
        'en': 'Analytics',
        'fr': 'Analytiques',
        'es': 'Analíticas',
        'it': 'Analitici',
        'pt': 'Análise',
        'nl': 'Analytics',
        'pl': 'Analityka',
        'sv': 'Analys',
        'da': 'Analyse',
        'no': 'Analyse',
        'fi': 'Analytiikka',
        'cs': 'Analytika',
        'hu': 'Elemzés',
        'ro': 'Analiză',
        'el': 'Αναλυτικά',
        'tr': 'Analitik',
        'ru': 'Аналитика',
        'uk': 'Аналітика',
        'ja': '分析',
        'zh': '分析',
        'ko': '분석',
        'ar': 'التحليلات',
    },
    'marketing': {
        'de': 'Marketing',
        'en': 'Marketing',
        'fr': 'Marketing',
        'es': 'Marketing',
        'it': 'Marketing',
        'pt': 'Marketing',
        'nl': 'Marketing',
        'pl': 'Marketing',
        'sv': 'Marknadsföring',
        'da': 'Marketing',
        'no': 'Markedsføring',
        'fi': 'Markkinointi',
        'cs': 'Marketing',
        'hu': 'Marketing',
        'ro': 'Marketing',
        'el': 'Μάρκετινγκ',
        'tr': 'Pazarlama',
        'ru': 'Маркетинг',
        'uk': 'Маркетинг',
        'ja': 'マーケティング',
        'zh': '营销',
        'ko': '마케팅',
        'ar': 'التسويق',
    },
};