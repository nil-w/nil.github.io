"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePlugin = exports.revealProcessorCallback = void 0;
const promises_1 = require("fs/promises");
const path_1 = require("path");
const front_matter_1 = __importDefault(require("front-matter"));
const get_my_version_1 = require("./get-my-version");
async function revealProcessorCallback(file) {
    if (file.type === 'skip') {
        return;
    }
    const filename = getFilename(this, file);
    if (file.type === 'delete') {
        await (0, promises_1.rm)(filename);
        return;
    }
    if (file.type === 'update' || file.type === 'create') {
        if (file.params.ext !== 'md') {
            await (0, promises_1.mkdir)((0, path_1.dirname)(filename), { recursive: true });
            await (0, promises_1.copyFile)(file.source, filename);
            return;
        }
        const page = await file.read({ encoding: 'utf-8' });
        const { body, attributes } = (0, front_matter_1.default)(page.toString());
        const plugins = (0, exports.parsePlugin)(this.config.reveal?.plugins);
        await (0, promises_1.mkdir)((0, path_1.dirname)(filename), { recursive: true });
        await (0, promises_1.writeFile)(filename, createHtml((0, get_my_version_1.getMyVersion)(), body, { ...(this.config.reveal?.default ?? {}), ...(attributes ?? {}) }, this.config, plugins));
        return;
    }
    const _ = file.type;
}
exports.revealProcessorCallback = revealProcessorCallback;
const parsePlugin = (input) => {
    const parsed = typeof input === 'string' ? [input]
        : input == null ? []
            : input;
    if (!Array.isArray(parsed)) {
        throw new Error('`plugins` must be an array');
    }
    const plugins = getBundledPlugin((0, get_my_version_1.getMyVersion)());
    const invalidName = parsed.find((plugin) => plugins.find((p) => p.name === plugin || isPlugin(plugin)) === undefined);
    if (invalidName) {
        console.log(plugins,parsed,invalidName)
        throw new Error(`Invalid plugin name: ${invalidName}`);
    }
    return [
        ...plugins.filter((v) => parsed.includes(v.name) || v.force),
        ...parsed.filter(isPlugin),
    ];
};
exports.parsePlugin = parsePlugin;
const getFilename = (hexo, file) => (0, path_1.join)(hexo.public_dir, 'slide', file.params.name +
    '.' +
    (file.params.ext === 'md' ? 'html' : file.params.ext));
const isPlugin = (v) => v != null &&
    typeof v === 'object' &&
    typeof Reflect.get(v, 'name') === 'string' &&
    typeof Reflect.get(v, 'url') === 'string';
const getBundledPlugin = (version) => [...Plugins].map((plugin) => ({
    ...plugin,
    url: plugin.url + `?v=${version}`,
}));
const Plugins = [
    {
        force: true,
        name: 'RevealMarkdown',
        url: '/js/reveal.js/plugin/markdown/markdown.js',
    },
    { name: 'RevealHighlight', url: '/js/reveal.js/plugin/highlight/highlight.js' },
    { name: 'RevealSearch', url: '/js/reveal.js/plugin/search/search.js' },
    { name: 'RevealNotes', url: '/js/reveal.js/plugin/notes/notes.js' },
    { name: 'RevealMath', url: '/js/reveal.js/plugin/math/math.js' },
    { name: 'RevealMath.KaTeX', url: '/js/reveal.js/plugin/math/math.js' },
    { name: 'RevealZoom', url: '/js/reveal.js/plugin/zoom/zoom.js' },
    { name: 'RevealMermaid', url: '/js/reveal.js-mermaid-plugin/plugin/mermaid/mermaid.js' },
    { name: 'RevealChalkboard', url: '/js/reveal.js-plugins/chalkboard/plugin.js' },
    { name: 'RevealCustomControls', url: '/js/reveal.js-plugins/customcontrols/plugin.js' },
];
const createHtml = (version, content, slideConfig, config, plugins) => {
  return `
  <!doctype html>
  <html lang="${config.language}">
    <head>
      <meta charset="utf-8">
      <meta name="googlebot" content="noindex,indexifembedded" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">

      <title>${slideConfig.title || config.title || 'Hexo with reveal.js'}</title>

      <link rel="stylesheet" href="/js/reveal.js/dist/reset.css?v=${version}">
      <link rel="stylesheet" href="/js/reveal.js/dist/reveal.css?v=${version}">
      <link rel="stylesheet" href="/js/reveal.js/dist/theme/${slideConfig.theme || 'black'}.css?v=${version}">

      <!-- Theme used for syntax highlighted code -->
      <link rel="stylesheet" href="/js/reveal.js/plugin/highlight/monokai.css?v=${version}">

      ${config.reveal?.css_urls?.map((url) => `<link rel="stylesheet" href="${url}">`).join('') || ''}

      <style type="text/css">
          .fragment.blur {
            filter: blur(5px);
          }

          .fragment.blur.visible {
            filter: none;
          }

          #notescanvas {
            -webkit-backdrop-filter: unset;
            backdrop-filter: unset;
          }
      </style>

    </head>
    <body>
      <div class="reveal">
        <div class="slides">
          <section data-markdown
                data-auto-animate
                data-separator="^\r?\n----\r?\n$"
                data-separator-vertical="^\r?\n--\r?\n$"
                data-separator-notes="^Note:"
                data-charset="utf-8">
            <textarea data-template>
              ${content}
            </textarea>
          </section>
        </div>
      </div>

      <!-- Font awesome is required for the chalkboard plugin -->
      <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js"></script>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

      <script src="/js/reveal.js/dist/reveal.js?v=${version}"></script>
      ${plugins.map((plugin) => `<script src="${plugin.url}"></script>`).join('')}
      ${config.reveal?.js_urls?.map((url) => `<script src="${url}"></script>`).join('') || ''}
      <script type="module">
        Reveal.initialize({
          ...${JSON.stringify(Object.assign(config.reveal?.config || {},slideConfig?.config))},
          plugins: [${plugins.map((plugin) => `${plugin.name}`).join(', ')}],
        });
      </script>
    </body>
  </html>
  `
};
