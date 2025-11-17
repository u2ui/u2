// Track loaded icons for combining into a single SVG sprite
const iconRegistry = new Map();

/**
 * Get all unique icon sources that have been loaded
 * @returns {Array<string>} Array of unique icon source URLs
 */
function getAllIconSources() {
    return Array.from(iconRegistry.keys());
}

document.addEventListener('u2-ico-loaded', (e) => {
    const icoElement = e.composedPath()[0];
    const icoDir = getComputedStyle(icoElement).getPropertyValue('--u2-ico-dir').trim();
    const iconName = icoElement.getAttribute('icon');
    if (!iconName || !icoDir || icoDir.includes('.svg#')) return;
    const svgElement = icoElement.querySelector('svg');
    if (!svgElement) return;
    iconRegistry.has(icoDir) || iconRegistry.set(icoDir, new Map());
    iconRegistry.get(icoDir).set(iconName, svgElement.outerHTML);    
});

/**
 * Generates and returns a combined SVG sprite containing all loaded icons as individual SVGs
 * @param {string} icoDir - The icon directory to generate the sprite for
 * @param {string} [prefix=''] - Optional prefix to add to all icon IDs
 * @returns {string} Combined SVG sprite as a string
 */
function generateCombinedSvg(icoDir, prefix = '') {
    if (!iconRegistry.has(icoDir) || iconRegistry.get(icoDir).size === 0) {
        console.warn(`No icons found for directory: ${icoDir}`);
        return '';
    }
    const icons = iconRegistry.get(icoDir);
    let sprite = '<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">\n';
    for (const [name, svg] of icons) {
        const prefixedSvg = svg.replace(/<svg([^>]*)>/, `<svg id="${prefix}${name}"$1>`).replace(/>\s+</g, '><');
        sprite += `  ${prefixedSvg}\n`;
    }
    sprite += '</svg>';
    return sprite;
}

/**
 * Outputs the combined SVG sprite to the console for easy copying
 * @param {string} icoDir - The icon directory to output the sprite for
 */
function outputCombinedSvgToConsole(icoDir) {
    const combinedSvg = generateCombinedSvg(icoDir);
    if (combinedSvg) {
        console.log(`%cCombined SVG Sprite for ${icoDir}:`, 'font-weight: bold; color: #4CAF50;');
        console.log(combinedSvg);
        console.log(`%cUsage: --u2-ico-dir:'/path/to/your/sprite.svg#icon-name'`, 'font-weight: bold;');
        console.log(`%cNote: You can also use --u2-ico-dir:'/path/to/your/sprite.svg#{prefix}{icon}' with a custom prefix`, 'font-style: italic;');
    }
}

// Export functions for manual control if needed
window.u2IcoDebug = {
    getIconRegistry: () => iconRegistry,
    getAllIconSources,
    generateCombinedSvg,
    outputCombinedSvgToConsole,
    
    /**
     * Automatically output all registered icon sets to the console
     */
    outputAllCombinedSvgs: () => {
        for (const [dir] of iconRegistry) {
            outputCombinedSvgToConsole(dir);
        }
        if (iconRegistry.size === 0) {
            console.log('No icons have been loaded yet. Call u2IcoDebug.outputAllCombinedSvgs() to output all registered icon sets to the console.');
        }
    }
};

// Auto-output combined SVGs when the page is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Small delay to ensure all icons are loaded
        setTimeout(window.u2IcoDebug.outputAllCombinedSvgs, 1000);
    });
} else {
    setTimeout(window.u2IcoDebug.outputAllCombinedSvgs, 1000);
}