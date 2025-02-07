//import {$range} from '../../range.js';
import * as state from '../../events.js';


Rte.ui.setItem('ai', {
    icon: 'smart-toy',
    labels: { en: 'Magic-Editor' },
    async click() {

        const activeRte = state.active;
        const original = activeRte.innerHTML;

        const dEl = document.createElement('dialog');
        dEl.className = 'u2RteAiDialog';
        dEl.innerHTML = `
            <h2>Magic-Editor</h2>
            <form class=-promptForm>
                <label style="display:block; text-align:center; margin-bottom:1rem">
                    Anweisung: 
                    <input name=prompt autofocus list=u2RteAiList placeholder="Schlüsselwörter fett">
                    <button name=run>run</button>
                    <datalist id=u2RteAiList>
                        <option value="Korrigiere">
                        <option value="Erweitere">
                        <option value="Fahre fort">
                        <option value="Fasse zusammen">
                        <option value="Lorem Ipsum, 2 Paragraphen">
                    </datalist>
                </label>
            </form>
            <div class=-views>
                <div>
                    <h2>Original</h2>
                    <div class="-textBox">${original}</div>
                </div>
                <div>
                    <h2>Bearbeitet</h2>
                    <div class="-textBox -result" contenteditable></div>
                </div>
                <div>
                    <h2>Unterschied</h2>
                    <div class="-textBox -diff"></div>
                </div>
            </div>
            <style>
            .u2RteAiDialog {
                width: 100%;
                max-width: none;
                max-height: none;
                height: auto;
                border: none;

                & ins { background: #dfd; text-decoration: none; }
                & del { background: #fdd; text-decoration: none; }
                & .-views { display:flex; gap:1rem; min-height:10rem; flex-wrap:wrap }
                & .-views > div { flex:1 1 35rem; display:flex; flex-direction:column; }
                & .-views > div > h2 { flex:0 0 auto; margin:0;}

                & .-textBox { border:1px solid; padding:.5rem; flex:1 1 auto; box-shadow: 0 0 1rem #0003; max-height: 30rem; overflow:auto; }
                & .-buttons { display:flex; flex-wrap:wrap; justify-content:end; gap:1em; margin-top:1rem }
            }
            </style>
            <div u2-focusgroup class=-buttons>
                <button type="button" class=-ok disabled>Übernehmen</button>
                <button type="button" class=-cancel>Abbrechen</button>
            </div>
        `;
        
        

        const btnOk = dEl.querySelector('.-ok');
        const btnCancel = dEl.querySelector('.-cancel');


        dEl.querySelector('.-promptForm').onsubmit = async e => {
            e.preventDefault();
            
            dEl.querySelector('.-result').innerHTML = 'loading...';
            dEl.querySelector('.-diff').innerHTML = 'loading...';
            dEl.querySelector('.-promptForm').inert = true;

            const prompt = dEl.querySelector('[name=prompt]').value;
            dEl.querySelector('.-result').innerHTML = await request(prompt, original);

            await showDiff();

            btnOk.disabled = false;
            dEl.querySelector('.-promptForm').inert = false;
            btnOk.focus();
        };
        dEl.querySelector('.-result').addEventListener('input', async e => {
            showDiff();
        });

        async function showDiff(){
            const edited = dEl.querySelector('.-result').innerHTML;
            const lib = await import('https://cdn.jsdelivr.net/npm/htmldiff-js@1.0.5/+esm');
            const HtmlDiff = lib.default.default;
            dEl.querySelector('.-diff').innerHTML = HtmlDiff.execute(original, edited);
        }

        btnOk.onclick = () => {
            activeRte.innerHTML = dEl.querySelector('.-result').innerHTML;
            dEl.close();
        };
        btnCancel.onclick = () => dEl.close();

        document.body.append(dEl);
        dEl.showModal();
        dEl.onclose = () => dEl.remove();

    },
    shortcut:'m'
});



const endpoint = 'https://api.groq.com/openai/v1/chat/completions'
const apiKey = "xxx";
//const model = "llama3-8b-8192";
const model = "llama3-70b-8192";

async function request(prompt, text) {
    const body = {
        model,
        stream: false,
        messages: [{
                role: "system",
                content: `You are a text editor (html).
                Return only the full(!) edited text without any explanations!

                Example 1:\n
                Prompt: You're a stupid bloke.\n
                Text: Friendlier\n
                Answer: We seem to have different perspectives.\n

                Example 2:\n
                Prompt: Fahre fort\n
                Text: Es war einmal ein\n
                Answer: Es war einmal ein kleines Mädchen.\n

                Example 3:\n
                Prompt: Ausführlicher\n
                Text: Ein Pinsel ist zum malen\n
                Answer: Ein Pinsel ist ein Werkzeug, das zum Auftragen von Farbe verwendet wird. Er besteht aus einem Griff und Borsten, die die Farbe halten und auf eine Oberfläche übertragen.\n

                Example 4:\n
                Prompt: Schlüsselwörter fett\n
                Text: Ein Pinsel ist zum malen\n
                Answer: Ein <strong>Pinsel</strong> ist zum <strong>malen</strong>\n
                `,
            },{
                role: "user",
                content: `Prompt: ${prompt}\nText: ${text}`,
            }],
    };
    const result = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(body),
    }).then(response => response.json());

    return result.choices[0].message.content;
}
