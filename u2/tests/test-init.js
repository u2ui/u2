/*
import 'https://cdn.jsdelivr.net/gh/nuxodin/lazyfill/mod.min.js';
import 'https://cdn.jsdelivr.net/gh/nuxodin/lazyfill/htmlfills.min.js';
import 'https://cdn.jsdelivr.net/gh/nuxodin/cleanup.js/mod.min.js'
*/

document.head.insertAdjacentHTML(
    'afterend',`
<style>
button[onclick] {
    text-align: left;
    --line-height:1.3em;
    padding-inline: .75em;
    padding-block: .5em;
    margin-inline: 0;
    margin-block: .5em;
}
button[onclick]::after {
    content: attr(onclick);
    display: block;
    font-size: .7rem;
    font-family:monospace;
    opacity:.8;
}
:is(style,script)[contenteditable] {
    display:block;
}
u2-code {
    margin-block: 2em;
    max-height: 40em;
    font-size:13.5px;
    border:1px solid #ccc;
    padding:1em;
    box-shadow: 0 0 10px rgba(0,0,0,.1);    
}
</style>
`);





// theme switch 

const {theme} = await fetch(import.meta.resolve('../projects.json')).then(r => r.json());

const themeDiv = document.createElement('div');
document.body.append(themeDiv);


const shadow = themeDiv.attachShadow({mode:'open'});
shadow.innerHTML = `
<div style="position:fixed; bottom:10px; right:10px">
    <select id=theme>
        ${Object.keys(theme).map(name => `<option>${name}</option>`).join('\n')}
    </select>
    <br>
    <label>
        Dark mode
        <input type=checkbox id=darkLight>
    </label>
    <details hidden>
        <summary>Style AI</summary>
        <label>
            <input id=prompt style="width:100%">
        </label>
    </details>
</div>
`;

shadow.getElementById('darkLight').onchange = e => {
    const scheme = e.target.checked ? 'dark' : 'light';
    document.documentElement.style.colorScheme = scheme;
    document.documentElement.setAttribute('data-theme', scheme);
    document.documentElement.setAttribute('u2-skin', scheme);
}


const link = document.createElement('link');
link.rel = 'stylesheet';
shadow.getElementById('theme').oninput = e => {
    const name = e.target.value;
    link.href = import.meta.resolve(`../../theme/${name}/theme.css`);
    styleEl.remove();
    document.head.append(link);
    shadow.getElementById('prompt').closest('details').hidden = false;
}


const styleEl = document.createElement('style');
shadow.getElementById('prompt').onchange = async e => {
    console.log(e.target.value)
    const prompt = e.target.value;
    const text = themeDiv.innerHTML;
    const css = await request(prompt, text);

    link.remove();
    styleEl.innerHTML = css;
    document.head.append(styleEl);
}

const endpoint = 'https://api.groq.com/openai/v1/chat/completions'
const apiKey = "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";
const model = "llama3-70b-8192";
async function request(prompt, text) {
    const css = styleEl.parentNode ? styleEl.innerHTML : await fetch(link.href).then(r => r.text());

    const body = {
        model,
        stream: false,
        messages: [
            {
                role: "system",
                content: `You are a Designer, who is very familiar with CSS. Edit the following CSS to meet the user's requirements. Complete CSS without explanations! Your answer will be automatically inserted into a style tag. It replaces the provided CSS. Make an effort, you have the whole week to do it.
                ${css}`,
            },{
                role: "user",
                content: `${prompt}`,
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
 
    let newCss = result.choices[0].message.content;
    newCss = newCss.replace(/[\s\S]*?```/, '').replace(/```[\s\S]*?/, '');
    console.log(newCss)

    return newCss;
}