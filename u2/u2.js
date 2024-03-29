
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

        // data.forEach(repo=>{
        //     cachedRepos[repo.name] = repo;
        // });
    }
    return cachedRepos;
}

export async function latestUrl(url) {
    await repos();
    return latestUrlCached(url);
    /*
    url = new URL(url).toString();
    const {repo, before, file} = parseUrl(url);
    if (!reps[repo]) return;
    let vers = reps[repo].release_latest.tag_name.replace('v','');
    return before + repo + '@' + vers + '/' + file;
    */
}

export function latestUrlCached(url) { // messy, but makes it easier
    if (!url) return;
    url = new URL(url).toString();
    const {repo, before, file} = parseUrl(url);
    if (!cachedRepos[repo]) {
        console.log('Repo "' + repo + '" not found');
        //throw new Error('Repo "' + repo + '" not found');
        return;
    }
    let vers = cachedRepos[repo].release_latest.tag_name.replace('v','');
    return before + repo + '@' + vers + '/' + file;
}

export function parseUrl(url){
    const matches = url.match(/(.+u2ui\/)([^@\/]+)(\@[^\/]+)?\/(.*)/);
    if (!matches) return;
    const [,before, repo, vers, file] = matches;
    return {before, repo, vers, file};
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