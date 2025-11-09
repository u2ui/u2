/* this is a input for ai prompts or a menu for pre-selected prompts, to help write in a textarea, or contenteditable */
/* usage:
<label>
    <textarea></textarea>
    <u2-ai-texter endpoint="/api"></u2-ai-texter> <!-- this will create an input where the user can insert ist prompts -->
</label>

// for a specific textarea, save prompts using localStorage
<textarea id=test></textarea>
<u2-ai-texter endpoint="/api" for="#test" safe></u2-ai-texter> <!-- this will create an combobox where saved prompts can be selected, they are saved using the id as identifier -->

<u2-ai-texter endpoint="/api" for="#test" safe="my-global-prompts"></u2-ai-texter> <!-- this will create an combobox where saved prompts can be selected, they are saved using the save-attribute-value as identifier -->

or for every textarea, using predefined prompts
<u2-ai-texter endpoint="/api" for="textarea">
    <menu>
        <button value="prompt1">prompt 1</button>
        <button value="prompt1">prompt 2</button>
    </menu>
</u2-ai-texter>
*/

import {Placer} from '../../../../js/Placer/Placer.js';

class Texter extends HTMLElement {
    constructor() {
        super();  // Ruft den Konstruktor der Basisklasse auf
        this.attachShadow({mode: 'open'}); // Erstellt ein Shadow DOM
        this.placer = new Placer(this, { x:'center', y:'after', margin:-5 });
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    border: 1px solid currentColor;
                    position: absolute;
                    padding:0;
                    border-radius: .5em;
                }
                :host(:focus-within) {
                    outline: .4em solid blue;
                }
                form {
                    display:flex;
                }
                input {
                    outline:none;
                    flex: 1 1 auto;
                    border:0;
                    padding: .5em;
                }
                button {
                    all: unset;
                    display:flex;
                    align-items:center;
                    padding: .4em;
                }
            </style>
            <form>
                <slot>
                    <input placeholder="Make the text more unique...">
                </slot>
                <button>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z"></path></svg>
                </button>
            </form>
        `;
        this.setAttribute('popover', 'manual');
        this.shadowRoot.querySelector('form').addEventListener('submit', (event) => {
            event.preventDefault();
            this.request(this.shadowRoot.querySelector('input').value);
        });
    }
    showFor(element) {
        this.currentTarget = element;
        this.showPopover();
        this.placer.toElement(element);
        this.placer.followElement(element);
    }
    hide() {
        this.hidePopover();
    }

    async request(prompt) {
        const target = this.currentTarget;

        const text = target.value != null ? target.value : target.innerHTML;

        const body = {
            model: "llama3-70b-8192",
            stream: false,
            messages: [{
                    role: "system",
                    content: `You are a text editor. Return only the full(!) edited text without any explanations!

                    Example 1:\n
                    Prompt: You're a stupid bloke.\n
                    Text: friendlier\n
                    Answer: We seem to have different perspectives.\n

                    Example 2:\n
                    Prompt: Es war einmal ein\n
                    Text: schreib weiter\n
                    Answer: Es war einmal ein kleines Mädchen.\n
                    `,
                },{
                    role: "user",
                    content: `Prompt: ${prompt}\nText: ${text}`,
                }],
        };

        const endpoint = this.getAttribute('api');
        const apiKey = this.getAttribute('api-key');

        const result = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(body),
        }).then(response => response.json());

        console.log(result);

        const value = result.choices[0].message.content;

        target[target.value != null ? 'value' : 'innerHTML'] = value;
    }
}

customElements.define('u2-ai-texter', Texter);



addEventListener('focusin', ({target}) => {

    if (target.matches('u2-ai-texter')) return;

    document.querySelectorAll('u2-ai-texter').forEach(texter => {
        if (!target.matches) return;
        if (target.matches(texter.getAttribute('for'))) {
            texter.showFor(target);
        } else {
            const texter = target.parentNode.querySelector(':scope > u2-ai-texter');
            if (texter) {
                texter.showFor(target);
            }
        }
    });
});