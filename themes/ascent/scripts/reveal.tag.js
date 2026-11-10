"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.revealTagCallback = void 0;
const hexo_util_1 = require("hexo-util");
const revealTagCallback = ([name, width = "100%", height = 300]) => {
  const src = name.endsWith("/") ? `/slide/${name}` : `/slide/${name}.html`;
  return (0, hexo_util_1.htmlTag)(
    "div",
    { class: "hexo-reveal-embed" },
    (0, hexo_util_1.htmlTag)(
      "iframe",
      {
        src,
        allowfullscreen: true,
        loading: "lazy",
      },
      ""
    ),
    false
  );
};
exports.revealTagCallback = revealTagCallback;
