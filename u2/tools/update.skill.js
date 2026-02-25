// deno run -A --unstable ./u2/tools/update.skill.js

import * as fs from 'https://deno.land/std@0.100.0/fs/mod.ts';

let base = import.meta.resolve('../../');
base = base.replace(/file:\/\/\//, '/');

const categories = ['attr', 'class', 'el', 'css', 'js'];

async function generateSkillMd() {
    const repos = {};
    
    for (const category of categories) {
        repos[category] = {};
        try {
            for await (const entry of Deno.readDir(base + category)) {
                if (!entry.isDirectory) continue;
                const name = entry.name;
                
                const readmePath = `${base}${category}/${name}/README.md`;
                let description = '';
                try {
                    const readme = await Deno.readTextFile(readmePath);
                    description = readme.split('\n')[1] || '';
                } catch (e) {}
                
                repos[category][name] = {
                    name,
                    description,
                    beta: description.includes('beta'),
                    deprecated: description.includes('deprecated'),
                };
            }
        } catch (e) {
            console.log(`Category ${category} not found or empty`);
        }
    }
    
    const content = generateSkillContent(repos);
    await Deno.writeTextFile(base + "SKILL.md", content);
    console.log("SKILL.md written!");
}

function generateSkillContent(repos) {
    return dedent(`
        # u2 Framework

        Modular web component framework.
        https://github.com/u2ui/u2


        ## Categories

        **\`attr/\`** - Add behavior via HTML attributes
        ${generateCategoryModules(repos, 'attr')}

        **\`class/\`** - CSS-only utilities via class names
        ${generateCategoryModules(repos, 'class')}

        **\`el/\`** - Custom HTML elements (Web Components)
        ${generateCategoryModules(repos, 'el')}

        **\`css/\`** - Global CSS utilities
        ${generateCategoryModules(repos, 'css')}

        **\`js/\`** - JavaScript ES modules
        ${generateCategoryModules(repos, 'js')}

        **Naming:** \`<u2-{name}>\`, \`.u2-{name}\`, \`[u2-{name}]\`

        **Module details:** Each module has its own README at \`https://raw.githubusercontent.com/u2ui/u2/main/{category}/{name}/README.md\` with usage examples, API docs, and demos.

        ## Installation

        **Prototyping (auto-loads all):**
        \`\`\`html
        <script type=module async src="https://cdn.jsdelivr.net/gh/u2ui/u2@main/u2/auto.js"></script>
        \`\`\`

        ## CSS

        auto.js also loads: css/base/base.css, css/classless/variables.css, css/classless/classless.css

        Sets sensible defaults — do not re-implement these when base is loaded:

        - \`box-sizing: border-box\` everywhere
        - Fluid \`font-size: calc(12.5px + .25vw)\` on \`html\`
        - \`body { margin: auto; display: flow-root }\` — child margins don't bleed out
        - \`interpolate-size: allow-keywords\` — enables \`height: auto\` transitions
        - \`@view-transition { navigation: auto }\` — free page transitions
        - \`hyphens: auto\` with sensible limits
        - \`img/svg/video/canvas\` → \`max-inline-size: 100%; object-fit: cover; block-size: auto\`
        - \`video/audio/iframe\` → \`inline-size: 100%\`
        - Tables: \`border-collapse: collapse; font-variant-numeric: tabular-nums\`
        - \`nav a { text-decoration: none }\`, \`nav li { list-style: none }\`
        - Form elements get \`font: inherit\`, unified padding, border
        - \`dialog/[popover]\` fade in/out via \`transition + @starting-style\` — no JS needed
        - \`[inert], :disabled { opacity: .4 }\`
        - \`.btn\` — link styled as button, \`display: inline-block\`, no underline


        The only thing you normally set: \`--color\`

        \`\`\`css
        html {
            --color: #207acc; /* primary color — everything else derives from this */
        }
        \`\`\`

        All other color tokens are **automatically computed** via \`color-mix()\` and \`oklch()\` from \`--color\`:

        \`\`\`css
        /* tints / shades — auto-derived, override only if needed */
        --color-lightest  /* color-mix(--color, #fff 97%) */
        --color-lighter   /* color-mix(--color, #fff 85%) */
        --color-light     /* color-mix(--color, #fff 50%) */
        --color-dark      /* color-mix(--color, #000 30%) */
        --color-darker    /* color-mix(--color, #000 60%) */
        --color-darkest   /* color-mix(--color, #000 87%) */

        /* semantic — auto light/dark mode */
        --color-bg        /* light: --color-lightest  /  dark: --color-darkest  */
        --color-text      /* light: --color-darkest   /  dark: --color-lightest */
        --color-area      /* light: --color-lighter   /  dark: --color-darker   */
        --color-line      /* = --color-text */

        /* gray — derived from --color hue, desaturated */
        --gray, --gray-lighter, --gray-light, --gray-dark, --gray-darker

        /* full palette — hue-rotated from --color's lightness/chroma */
        --red, --orange, --yellow, --lime, --green, --cyan, --blue, --purple, --pink
        \`\`\`

        \`--accent\` defaults to \`--color\` but can be set independently for e.g. focus rings.


    `).trim() + '\n';
}

function generateCategoryModules(repos, category) {
    const modules = repos[category];
    if (!modules || Object.keys(modules).length === 0) return '';
    
    return '\n' + Object.values(modules)
        .sort((a, b) => a.name.localeCompare(b.name)) // Alphabetisch sortieren
        .map(mod => {
            let line = `- **${mod.name}**`;
            if (mod.description) line += ` - ${mod.description}`;
            if (mod.beta) line += ' *(beta)*';
            if (mod.deprecated) line += ' *(deprecated)*';
            return line;
        })
        .join('\n');
}

function dedent(text) {
    text = trimLines(text);
    const lines = text.split('\n');
    const secondLine = lines[0];
    if (!secondLine) return text;
    const indent = secondLine.match(/^\s*/)[0];
    if (indent.length === 0) return text;
    return lines.map(line => line.replace(new RegExp(`^${indent}`), '')).join('\n').trim();
}

function trimLines(text) {
    const lines = text.split('\n');
    while (1) {
        const line = lines[0];
        if (line == null) break;
        if (line.match(/^\s*$/)) lines.shift();
        else break;
    }
    return lines.join('\n');
}

generateSkillMd();