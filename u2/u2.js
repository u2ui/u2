import { importCss } from "./utils.js";

window.u2 ??= Object.create(null);
u2.js = function(jsRepo){
    const file = import.meta.resolve('../js/'+jsRepo+'/'+jsRepo+'.js');
    return import(file);
}
u2.el = function(elRepo, options){
    const file = import.meta.resolve('../el/'+elRepo+'/'+elRepo+'.js');
    const css = import.meta.resolve('../el/'+elRepo+'/'+elRepo+'.css');
    importCss(css, options);
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


