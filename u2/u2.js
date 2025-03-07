

window.u2 ??= Object.create(null);
window.u2.js = function(jsRepo){
    const file = import.meta.resolve('../js/'+jsRepo+'/'+jsRepo+'.js');
    return import(file);
}


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


