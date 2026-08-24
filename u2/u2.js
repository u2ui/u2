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
/** The promise is the cache — caching the object handed a still-empty one to concurrent callers. */
export function repos(){
    return cachedRepos ??= fetch(import.meta.url + '/../projects.json')
        .then(res => res.json())
        .then(data => {
            const flat = {};
            for (const category in data) {
                for (const repo in data[category]) flat[category+'/'+repo] = data[category][repo];
            }
            return flat;
        });
}


