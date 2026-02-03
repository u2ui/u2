// deno run -A --unstable ./u2/tools/update.repos.json.js

const repos = {};

import * as fs from 'https://deno.land/std@0.100.0/fs/mod.ts';

let base = import.meta.resolve('../../');
base = base.replace(/file:\/\/\//, '/');
//const base = './u2/';

['attr', 'class', 'el', 'css', 'js', 'theme'].forEach(async category=>{
    repos[category] = {};
    for await (const entry of Deno.readDir(base+category)) {
        if (!entry.isDirectory) continue;
        const name = entry.name;
        const data = await writeReadMe(category, entry);

        const css = fs.existsSync(`${base}${category}/${name}/${name}.css`);
        const js = fs.existsSync(`${base}${category}/${name}/${name}.js`);
        repos[category][name] = {
            name,
            description: data.description,
            beta: data.description.includes('beta'),
            deprecated: data.description.includes('deprecated'),
            css, // todo: only set if not default for category
            js,
        };
    }

    // bug: hier wird bei jeder kategorie überschrieben
    // todo: sollte nur einmal am ende gemacht werden
    const str = JSON.stringify(repos, null, '  ');
    const write = Deno.writeTextFile(base+"u2/projects.json", str);

    write.then(() => console.log("File written!"));

});

console.log(repos);

async function writeReadMe(category, entry) {
    const readme = base+category+'/'+entry.name+'/README.md';
    await fs.ensureFile(readme);
    let text = await Deno.readTextFile(readme);
    text = text.trim();

    const parts = {};

    // split by h2 headings
    const rawParts = text.split(/[\n^]#{1,2} /);
    const intro = rawParts.shift();

    for (let part of rawParts) {
        const lines = part.split('\n');
        let firstLine = lines[0];
        let content = lines.slice(1).join('\n').trim();
        let title = firstLine.replaceAll('#', '').trim();
        parts[title] = content;
    }

    // tmp:
    delete parts.Demo;

    parts.Usage = await UsagePart(category, entry);
    parts.Install = installPart(category, entry);
    parts.Demos = await demoPart(category, entry);
    parts.About = aboutPart();


    const orderedParts = {};
    if (parts.Features) orderedParts.Features = parts.Features;
    if (parts.Usage) orderedParts.Usage = parts.Usage;
    if (parts.API) orderedParts.API = parts.API;
    if (parts.Install) orderedParts.Install = parts.Install;
    if (parts.Demos) orderedParts.Demos = parts.Demos;
    for (let key of Object.keys(parts)) {
        if (orderedParts[key]) continue;
        if (key === 'About') continue;
        if (key === 'Thanks') continue;
        orderedParts[key] = parts[key];
    }
    if (parts.About) orderedParts.About = parts.About;
    if (parts.Thanks) orderedParts.Thanks = parts.Thanks;

    // // remove first 2 lines from into
    // //let githubData = reposData.get(item);
    // let introContent = intro.split('\n').slice(2).join('\n').trim();
    // let content = dedent(`
    //     # ${repoH1(item)}
    //     ${githubData?.description}

    //     ${introContent}
    //     `)+'\n\n';
    let content = intro.trim()+'\n\n';

    Object.entries(orderedParts).forEach(([key, value])=>{
        if (value) content += `## ${key}\n\n${value}\n\n`;
    })

    Deno.writeTextFile(readme, content);
    return {description: intro.split('\n')[1]??''};
}



async function UsagePart(category, entry){
    const name = entry.name;

    if (category === 'theme') return '';
    if (category === 'css') return '';

    let code = null
    try {
        code = await Deno.readTextFile(base+''+category+'/'+name+'/tests/minimal.html');
    } catch(e) {
        console.log(e)
    }
    if (code) code = code.split('<body>')[1];


    let content = '';

    if (code) {
        let js = code.split(/<script[^>]*>/)?.[1]?.split?.('<\/script>')?.[0];
        if (js) {
            content += '```js\n'+dedent(js).trim()+'\n```\n\n';
        }

        let html = code.split(/<section[^>]*>/)[1].split('<\/section>')[0];
        if (html) {
            html = dedent(html);
            content += '```html\n'+html+'\n```\n\n';
        }

        let css = code.split(/<style[^>]*>/)?.[1]?.split?.('<\/style>')?.[0];
        if (css) {
            content += '```css\n'+dedent(css).trim()+'\n```\n\n';
        }
    }

    // if (name.endsWith('.js')) {
    //     // let version = reposData.get(entry.name)?.release_latest.tag_name;
    //     // version = version ? version.replace('v','') : 'x.x.x';
    //     // let docUrl = `https://doc.deno.land/../../../${name}@${version}/${blankName}.js`;
    //     let docUrl = `https://doc.deno.land/../../../${name}@x/${blankName}.js`;
    //     content += '[doc]('+docUrl+')  \n';
    // }

    return content.trim();

}


function installPart(category, entry) {
    const name = entry.name;
    const baseUrl = 'https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/'+category+'/'+name+'/';

    let html = '';
    if (category === 'el') {
        html = dedent(`
        <link href="${baseUrl}${name}.css" rel=stylesheet>
        <script src="${baseUrl}${name}.js" type=module async></script>`);
    }
    if (category === 'class') {
        html = `<link href="${baseUrl}${name}.css" rel=stylesheet>`;
    }
    if (category === 'attr') {
        html = `<script src="${baseUrl}${name}.js" type=module async></script>`;
    }
    if (category === 'js') {
        const js = `import * as module from "${baseUrl}${name}.js"`;
        return '```js\n'+js+'\n```';
    }
    return html ? '```html\n'+html+'\n```' : null;
}

// function repoH1(name){
//     const blankName = name.replace(/\.[^.]+$/, '');
//     if (name.endsWith('.el')) return `&lt;u2-${blankName}&gt; - element`;
//     if (name.endsWith('.class')) return `.u2-${blankName} - class`;
//     if (name.endsWith('.attr')) return `[u2-${blankName}] - attribute`;
//     return name;
// }

async function demoPart(category, entry){
    try {
        let tests = [];
        for await (const test of Deno.readDir(base+`${category}/${entry.name}/tests/`)) tests.push(test);

        tests = tests.filter(test=>test.isFile && test.name.endsWith('.html'));
        return tests.map(test=>{

            return `[${test.name}](http://gcdn.li/u2ui/u2@main/${category}/${entry.name}/tests/${test.name})  `

            //return `[${test.name}](https://raw.githack.com/u2ui/${entry.name}/main/tests/${test.name})  `

            // alternatives:
            // https://gitcdn.link/
            // https://cdn.statically.io/gh/u2ui/ico.el/main/tests/ico-directory.html
            // https://gitcdn.link/repo/u2ui/ico.el/main/tests/ico-directory.html
            // https://www.gitcdn.xyz/repo/u2ui/ico.el/main/tests/ico-directory.html
            // https://ghcdn.rawgit.org/u2ui/ico.el/main/tests/ico-directory.html
            // https://combinatronics.com/u2ui/ico.el/main/tests/ico-directory.html
            //return 'https://htmlpreview.github.io/?' + encodeURI(`https://github.com/u2ui/${entry.name}/blob/main/tests/${test.name}  `);
        }).join('\n');
    } catch(e) {
        //console.log(e)
    }
}
function aboutPart(){
    return dedent(`
        - MIT License, Copyright (c) 2022 <u2> (like all repositories in this organization) <br>
        - Suggestions, ideas, finding bugs and making pull requests make us very happy. ♥
        `);
}


/* helpers */
function dedent(text) {
    text = trimLines(text);
    const lines = text.split('\n');
    const secondLine = lines[0];
    if (!secondLine) return text;
    const indent = secondLine.match(/^\s*/)[0];
    if (indent.length === 0) return text;
    return lines.map(line=>line.replace(new RegExp(`^${indent}`), '')).join('\n').trim();
}
function trimLines(text){
    const lines = text.split('\n');
    while(1) {
        const line = lines[0];
        if (line==null) break;
        if (line.match(/^\s*$/)) lines.shift();
        else break;
    }
    return lines.join('\n');
}
