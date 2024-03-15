// zzz deno run -A --unstable .\update.repos.json.js
// with username / password:
// deno run -A --unstable ./u2/tools\update.repos.json.js nuxodin yourtoken

/*
let username = Deno.args[0];
let token = Deno.args[1];

if (!username) console.error('GITHUB_USERNAME not set');
if (!token) console.error('GITHUB_TOKEN not set');

let url = 'https://api.github.com/orgs/u2ui/repos?per_page=100';
let headers = new Headers();
headers.append('Authorization', 'Basic ' + btoa(username + ":" + token));

const repos = await fetch(url, {method:'GET', headers}).then(res => res.json());

var data = [];
var reposData = new Map();
for await (let repo of repos) {
    let releasesUrl = repo.releases_url.replace('{/id}','?per_page=1');
    const releases = await fetch(releasesUrl, {method:'GET', headers}).then(res=>res.json());
    const release = releases[0];
    if (!releases[0]) {
        console.warn('no release found for ' + repo.name);
        continue;
    }
    const obj = {
        pushed_at:        repo.pushed_at,
        name:             repo.name,
        description:      repo.description,
        open_issues:      repo.open_issues,
        stargazers_count: repo.stargazers_count,
        release_latest:{
            tag_name:     release.tag_name,
            published_at: release.published_at,
        }
    }

    reposData.set(repo.name, obj);
    data.push(obj)
}

var str = JSON.stringify(data, null, '  ');
const write = Deno.writeTextFile("./u2/repos.json", str);
write.then(() => console.log("File written!"));
*/

// automate contents

import * as fs from 'https://deno.land/std@0.100.0/fs/mod.ts';

const base = './u2/';

['attr', 'class', 'el', 'css'].forEach(async category=>{
    for await (const entry of Deno.readDir(base+category)) {
        if (!entry.isDirectory) continue;
        writeReadMe(category, entry);
    }
    //writeReadMeCategory(entry);
});


async function writeReadMe(category, entry) {
console.log(category, entry.name)
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

    // todo: remove old readme
    // await Deno.remove(readme+'.old');

    Deno.writeTextFile(readme, content);
}






async function UsagePart(category, entry){
    const name = entry.name;

    let code = null
    try {
        code = await Deno.readTextFile('./u2/'+category+'/'+name+'/tests/minimal.html');
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

        let html = code.split('<section>')[1].split('<\/section>')[0];
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

    // let version = reposData.get(entry.name)?.release_latest.tag_name;
    // version = version ? version.replace('v','') : 'x.x.x';
    const baseUrl = 'https://cdn.jsdelivr.net/gh/u2ui/u2@x.x.x/'+category+'/'+name+'/';

    let html = '';
    if (category === 'el') {
        html = dedent(`
        <link href="${baseUrl}${name}.min.css" rel=stylesheet>
        <script src="${baseUrl}${name}.min.js" type=module></script>`);
    }
    if (category === 'class') {
        html = `<link href="${baseUrl}${name}.min.css" rel=stylesheet>`;
    }
    if (category === 'attr') {
        html = `<script src="${baseUrl}${name}.min.js" type=module></script>`;
    }
    if (name.endsWith('.js')) {
        const js = `import * as module from "${baseUrl}${name}.min.js"`;
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
        for await (const test of Deno.readDir(`./u2/${category}/${entry.name}/tests/`)) tests.push(test);

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
