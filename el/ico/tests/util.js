import 'https://agsek.github.io/monoto-fonts-ofl/vendors/fontkit.js';


const fontUrls = {};
for (let sheet of document.styleSheets) {
    for (let rule of sheet.rules) {
        if (rule instanceof CSSFontFaceRule) {
            let family = rule.style.getPropertyValue('font-family');
            family = familyTrim(family);
            let fullSrc = rule.style.getPropertyValue('src');
            let src = fullSrc.match(/url\(([^)]*)\)/)[1].replace(/^"/,'').replace(/"$/,'');
            fontUrls[family] = src;
        }
    }
}

function familyTrim(family){
    return family.trim().replace(/^['"]/,'').replace(/['"]$/,'');
}
function fontToUrl(family){
    family = familyTrim(family);
    return fontUrls[family];
}

document.fonts.forEach(function(font){
    console.log(font)
});

window.ligaturesFromFamily = async function(family){
    var url = fontToUrl(family)
    return await getLigatures(url);
}




async function getLigatures(fontUrl){
    var font = await getFontObject(fontUrl);
    let lookupList = font.GSUB.lookupList.toArray();
    let lookupListIndexes = font.GSUB.featureList[0].feature.lookupListIndexes;
    const ligatures = {};
    lookupListIndexes.forEach(index => {
        let subTable = lookupList[index].subTables[0];
        let leadingCharacters = [];
        if (!subTable.coverage.rangeRecords) return;
        subTable.coverage.rangeRecords.forEach((coverage) => {
            for (let i = coverage.start; i <= coverage.end; i++) {
                let character = font.stringsForGlyph(i)[0];
                leadingCharacters.push(character);
            }
        });
        let ligatureSets = subTable.ligatureSets.toArray();
        ligatureSets.forEach((ligatureSet, ligatureSetIndex) => {
            let leadingCharacter = leadingCharacters[ligatureSetIndex];
            ligatureSet.forEach(ligature => {
                let character = font.stringsForGlyph(ligature.glyph)[0];
                if (character==null) return;
                let characterCode = character.charCodeAt(0).toString(16).toUpperCase();
                let ligatureText = ligature.components.map(x => font.stringsForGlyph(x)[0]).join('');
                ligatureText = leadingCharacter + ligatureText;
                ligatures[ligatureText] = {
                    leadingCharacter
                }
            });
        });
    });

    lookupListIndexes.forEach( index => {
        let lookupObject = lookupList[index];
        console.log(`lookup ${index}:`, lookupObject);

        let subtable = lookupObject.subTables[0];
        let ligatureSets = subtable.ligatureSets.toArray(); // note the .toArray() here too
        let ligatureSet_1 = ligatureSets[0];
        console.log(`ligature sets:`, ligatureSet_1);

        let ligature_1 = ligatureSet_1[0];
        console.log(`first ligature:`, ligature_1);

        let target = ligature_1.components;
        console.log(`targets: `, target.map(gid => font.getGlyph(gid)));

        let replacement = ligature_1.glyph;
        console.log(`replacement: `, font.getGlyph(replacement));
    });

    return ligatures;
}
function getFontObject(fontPath) {
    return  new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', fontPath);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function() {
            if (this.readyState === 4 && this.status === 200) {
                var fkBlob = this.response,
                    fkBuffer = new Buffer(fkBlob),
                    fontInfo;
                fontInfo = fontkit.create(fkBuffer);
                resolve(fontInfo);
            } else {
                reject(Error(xhr.statusText));
            }
        };
        xhr.onerror = function(error) {
            reject(Error('An error occured: ' + error.message));
        };
        xhr.send();
    });
}
