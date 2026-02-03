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

        Modular web component framework. Lightweight, CDN-first, each module works standalone.

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

        ## Installation

        **Prototyping (auto-loads all):**
        \`\`\`html
        <script type=module async src="https://cdn.jsdelivr.net/gh/u2ui/u2@main/u2/auto.js"></script>
        \`\`\`

        **Production (individual modules):**
        \`\`\`html
        <!-- Custom Elements -->
        <link href="https://cdn.jsdelivr.net/gh/u2ui/u2@main/el/{name}/{name}.css" rel=stylesheet>
        <script src="https://cdn.jsdelivr.net/gh/u2ui/u2@main/el/{name}/{name}.js" type=module async></script>

        <!-- CSS Classes -->
        <link href="https://cdn.jsdelivr.net/gh/u2ui/u2@main/class/{name}/{name}.css" rel=stylesheet>

        <!-- Attributes -->
        <script src="https://cdn.jsdelivr.net/gh/u2ui/u2@main/attr/{name}/{name}.js" type=module async></script>

        <!-- JS Modules -->
        <script type=module>
        import * as module from "https://cdn.jsdelivr.net/gh/u2ui/u2@main/js/{name}/{name}.js"
        </script>
        \`\`\`

        **Version pinning:** Replace \`@main\` with \`@x.x.x\` (e.g., \`@1.2.3\`) for production to lock to a specific version.

        **Naming:** \`<u2-{name}>\`, \`.u2-{name}\`, \`[u2-{name}]\`

        **Modules marked** *(beta)* or *(deprecated)* in descriptions.

        **Module details:** Each module has its own README at \`/{category}/{name}/README.md\` with usage examples, API docs, and demos.

        https://github.com/u2ui/u2
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