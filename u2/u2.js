
let cachedRepos = null;
export async function repos(){
    if (!cachedRepos) {
        cachedRepos = {};
        const data = await fetch(import.meta.url + '/../projects.json').then(res=>res.json());
        for (const category in data) {
            for (const repo in data[category]) {
                cachedRepos[category+'/'+repo] = data[category][repo];
            }
        }
    }
    return cachedRepos;
}

export async function latestUrl(url) {
    await repos();
    return url;
}


export function parseUrl(url){
    const matches = url.match(/(.+\/u2)(\@[^\/]+)?\/([^\/]*)\/([^\/]*)\/(.*)/);
    if (!matches) return;
    const [,before, vers, category, project, file] = matches;
    return {before, repo:category+'/'+project, vers, file};
}



/*
export async function importJs(repo, version=''){
    repo = repo+'.js';
    if (version==='latest') {
        const all = await repos();
        version = all[repo].release_latest.tag_name.replace('v','');
    }
    if (version) version = '@' + version;
    const url = import.meta.url + '/../../' + repo + version + '/' + repo;
    return import(url);
}

var x = await importJs('SelectorObserver');
console.log(x)
var xy = await importJs('dialog');
console.log(xy)
*/