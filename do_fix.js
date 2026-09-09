const fs = require('fs');

let html = fs.readFileSync('src/public/index.html', 'utf8');

// 1. Remove Background Setting Group
html = html.replace(/<div class='setting-group'>\s*<h4>Background<\/h4>[\s\S]*?(?=<div class='setting-group'>\s*<h4>Surface<\/h4>)/, '');

// 2. Remove Surface Setting Group
html = html.replace(/<div class='setting-group'>\s*<h4>Surface<\/h4>[\s\S]*?(?=<div class='setting-group'>\s*<h4>Image Paste Upload<\/h4>)/, '');

// 3. Move attachments-tab-btn to the bottom of right-sidebar
const filesBtnRegex = /\s*<button id="attachments-tab-btn"[\s\S]*?<\/button>\s*/;
const filesBtnMatch = html.match(filesBtnRegex);

if (filesBtnMatch) {
    let filesBtnHtml = filesBtnMatch[0].trim();
    
    // Check if it already has margin style
    if (!filesBtnHtml.includes('margin-top: auto')) {
        filesBtnHtml = filesBtnHtml.replace('class="sidebar-tab-btn"', 'class="sidebar-tab-btn" style="margin-top: auto; margin-bottom: 0;"');
    }
    
    // Remove from current position
    html = html.replace(filesBtnRegex, '\n\t\t');
    
    // Look for right-sidebar and insert before its closing tag
    const rightSidebarRegex = /(<aside id='right-sidebar'>[\s\S]*?<\/div>)\s*<\/aside>/;
    html = html.replace(rightSidebarRegex, `$1\n\t\t${filesBtnHtml}\n\t</aside>`);
}

// 4. Clean JS

html = html.replace(/surfaceColor:\s*'[^']+',\s*surfaceColorDark:\s*'[^']+',\s*surfaceOpacity:\s*1,\s*backgroundOpacity:\s*1,\s*backgroundImage:\s*'[^']+',\s*backgroundBlur:\s*0,/g, '');

const variablesToRemove = [
    'bgImageUrl', 'bgImageUpload', 'bgBlurSlider', 'clearBgBtn', 'bgOpacitySlider',
    'surfaceColorPickerInput', 'surfaceHexColorInput', 'surfaceOpacitySlider', 'restoreSurfaceBtn', 'restoreBgBtn'
];

variablesToRemove.forEach(v => {
    html = html.replace(new RegExp(`\\s*const ${v}\\s*=\\s*document\\.getElementById\\('${v.replace(/([A-Z])/g, "-$1").toLowerCase()}'\\);|\\s*const ${v}\\s*=\\s*document\\.getElementById\\('[a-z-]+'\\);`, 'gi'), '');
});

// We need a more targeted regex for variables to be safe.
html = html.replace(/\s*const bgImageUrl = document\.getElementById\('bg-image-url'\);/, '');
html = html.replace(/\s*const bgImageUpload = document\.getElementById\('bg-image-upload'\);/, '');
html = html.replace(/\s*const bgBlurSlider = document\.getElementById\('bg-blur-slider'\);/, '');
html = html.replace(/\s*const clearBgBtn = document\.getElementById\('clear-bg-btn'\);/, '');
html = html.replace(/\s*const bgOpacitySlider = document\.getElementById\('bg-opacity-slider'\);/, '');
html = html.replace(/\s*const surfaceColorPickerInput = document\.getElementById\('surface-color-picker-input'\);/, '');
html = html.replace(/\s*const surfaceHexColorInput = document\.getElementById\('surface-hex-color-input'\);/, '');
html = html.replace(/\s*const surfaceOpacitySlider = document\.getElementById\('surface-opacity-slider'\);/, '');
html = html.replace(/\s*const restoreSurfaceBtn = document\.getElementById\('restore-surface-defaults-btn'\);/, '');
html = html.replace(/\s*const restoreBgBtn = document\.getElementById\('restore-bg-btn'\);/, '');

html = html.replace(/\s*const baseSurfaceColor = [\s\S]*?document\.documentElement\.style\.setProperty\('--bg-opacity', settings\.backgroundOpacity\);/g, '');

html = html.replace(/\s*const currentSurfaceColor = isDarkMode \? settings\.surfaceColorDark : settings\.surfaceColor;\s*document\.getElementById\('surface-opacity-slider'\)\.value = settings\.surfaceOpacity;\s*document\.getElementById\('surface-color-picker-preview'\)\.style\.backgroundColor = currentSurfaceColor;\s*document\.getElementById\('surface-hex-color-input'\)\.value = currentSurfaceColor;\s*document\.getElementById\('surface-color-picker-input'\)\.value = currentSurfaceColor;/g, '');
html = html.replace(/\s*bgOpacitySlider\.value = settings\.backgroundOpacity;\s*bgImageUrl\.value = settings\.backgroundImage\.startsWith\('data:'\) \? '' : settings\.backgroundImage; \/\/ \?\?\?base64\s*bgBlurSlider\.value = settings\.backgroundBlur;/g, '');

const listeners = [
    'bgOpacitySlider', 'bgImageUrl', 'bgImageUpload', 'bgBlurSlider', 'clearBgBtn', 'restoreBgBtn',
    'surfaceOpacitySlider', 'surfaceColorPickerInput', 'surfaceHexColorInput', 'restoreSurfaceBtn'
];

listeners.forEach(id => {
    const regex = new RegExp(`\\s*${id}\\.addEventListener\\([\\s\\S]*?applySettings\\(\\);(?:\\s*\\}\\s*\\}\\);|\\s*\\}\\);)`, 'g');
    html = html.replace(regex, '');
});

html = html.replace(/\s*body\.custom-background\s*\{[\s\S]*?body\.custom-background::before\s*\{[\s\S]*?\n\s*\}/g, '');
html = html.replace(/#app-layout-container\.glass-effect,\s*\.auth-form\s*\n\s*body\[data-theme='dark'\] #app-layout-container\.glass-effect,\s*body\[data-theme='dark'\] \.auth-form\s*/, '');

fs.writeFileSync('src/public/index.html', html, 'utf8');
