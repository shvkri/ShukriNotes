const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('src/public/index.html', 'utf8');
const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;

let m;
while ((m = scriptRegex.exec(html)) !== null) {
    const code = m[1];
    if (code.includes('async function applySettings')) {
        const createFake = () => {
            const el = {
                style: {},
                classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
                addEventListener: () => {},
                removeEventListener: () => {},
                querySelectorAll: () => [],
                appendChild: (c) => c,
                removeChild: (c) => c,
                insertBefore: (a, b) => a,
                cloneNode: () => createFake(),
                innerHTML: '',
                textContent: '',
                value: '',
                dataset: {},
                focus: () => {},
                blur: () => {},
                contains: () => false,
                children: []
            };
            el.querySelector = () => el;
            el.closest = () => el;
            el.parentElement = el;
            return el;
        };
        const fakeElement = createFake();

        const sandbox = {
            console,
            setTimeout,
            clearTimeout,
            setInterval,
            clearInterval,
            requestAnimationFrame: fn => fn(),
            localStorage: { getItem: () => null, setItem: () => {} },
            window: { 
                addEventListener: () => {}, 
                removeEventListener: () => {},
                matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })
            },
            document: {
                getElementById: id => createFake(),
                querySelector: s => createFake(),
                querySelectorAll: s => [createFake()],
                createElement: tag => createFake(),
                createDocumentFragment: () => createFake(),
                addEventListener: () => {},
                removeEventListener: () => {},
                documentElement: { style: { setProperty: () => {} }, dataset: {} },
                body: fakeElement
            },
            fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({ notes: [], tags: [], heatmap: {} }) }),
            marked: {
                Renderer: function() { 
                    return {
                        table: function() {},
                        code: function() {},
                        link: function() {},
                        image: function() {}
                    }; 
                },
                setOptions: () => {},
                parse: (s) => s
            },
            DOMPurify: {
                sanitize: (s) => s
            },
            hljs: {
                highlightElement: () => {}
            },
            IntersectionObserver: function() {
                this.observe = () => {};
                this.unobserve = () => {};
                this.disconnect = () => {};
            },
            ResizeObserver: function() {
                this.observe = () => {};
                this.unobserve = () => {};
                this.disconnect = () => {};
            },
            Intl: Intl,
            Date: Date,
            Math: Math,
            JSON: JSON,
            RegExp: RegExp,
            Array: Array,
            Object: Object,
            String: String,
            Number: Number,
            Boolean: Boolean,
            Map: Map,
            Set: Set,
            Promise: Promise,
            Error: Error,
            DataTransfer: function() { this.items = { add: () => {} }; this.files = []; },
            FormData: function() { this.append = () => {}; this.has = () => false; },
            FileReader: function() { this.readAsDataURL = () => {}; }
        };
        sandbox.window.window = sandbox.window;
        Object.assign(sandbox.window, sandbox);

        try {
            const testRunner = `
                ;console.log("Testing updateSettingsModalControls...");
                try { updateSettingsModalControls(); console.log("updateSettingsModalControls: SUCCESS"); } catch(e) { console.error("updateSettingsModalControls: ERROR:", e.message, e.stack); }
                console.log("Testing applySettings...");
                try { applySettings(); console.log("applySettings: SUCCESS"); } catch(e) { console.error("applySettings: ERROR:", e.message); }
                console.log("Testing initializeSettings...");
                try { initializeSettings(); console.log("initializeSettings: SUCCESS"); } catch(e) { console.error("initializeSettings: ERROR:", e.message); }
                console.log("Testing applyFeatureVisibilitySettings...");
                try { applyFeatureVisibilitySettings(); console.log("applyFeatureVisibilitySettings: SUCCESS"); } catch(e) { console.error("applyFeatureVisibilitySettings: ERROR:", e.message); }
                console.log("Testing initializeThemeColor...");
                try { initializeThemeColor(); console.log("initializeThemeColor: SUCCESS"); } catch(e) { console.error("initializeThemeColor: ERROR:", e.message); }
                console.log("Testing renderNotes...");
                try { renderNotes([]); console.log("renderNotes: SUCCESS"); } catch(e) { console.error("renderNotes: ERROR:", e.message); }
            `;
            const script = new vm.Script(code + testRunner);
            const context = vm.createContext(sandbox);
            script.runInContext(context);
        } catch (err) {
            console.error('Execution Error:', err);
        }
    }
}
