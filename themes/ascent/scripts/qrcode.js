const { encodeURL, escapeHTML } = require('hexo-util');
const { resolve } = require('url');

const PostAsset = hexo.model('PostAsset');

const { revealGeneratorCallback } = require('./reveal.generator');
const { revealProcessorCallback } = require('./reveal.processor');
const { revealTagCallback } = require('./reveal.tag');


/**
* demo链接 或 其他内容 生成二维码
* @example {% demo_qrcode 'example-copy.html' 120 120 %}
*/
hexo.extend.tag.register('qrcode', function (args = [], content) {
  const [ slug, width = 120, height = 120, foreground = '#000000', background = '#ffffff' ] = args;
  if (!slug) return;

  const asset = PostAsset.findOne({slug});

  let link = slug;

  if (asset) {
    link = encodeURL(resolve(hexo.config.url, resolve(hexo.config.root, asset.path)));
  };



  return `<div class="article-qrcode" data-qr="${link}" data-width="${width}" data-height="${height}" data-foreground="${foreground}" data-background="${background}"></div>`;
}, {ends: false});




/**
* video 标签
* @example {% video 'example-copy.mp4' 120 120 autoplay %}
*/
hexo.extend.tag.register('video', function (args = [],content) {
  const [ src,width = '100%',height='500px',autoplay='autoplay' ] = args;
  if (!src) return;

  let link = src;



  return `<div style="display:flex;justify-content: center;">
    <div>
      <video width="${width}" height="${height}" src="${link}"  ${autoplay && autoplay=='autoplay' ? 'autoplay muted loop ' : ''}></video>
      <div style="text-align: center;user-select: none;">视频：${content}</div>
    </div>
  </div>`;
}, {ends: true});





/**
* imgview 标签
* @example {% video 'example-copy.mp4' 120 120 autoplay %}
*/
hexo.extend.tag.register('imgview', function (args = [],content) {
  const [ src,width = '100%',height='500px',alt='' ] = args;
  if (!src) return;

  let link = src;

  return `<div style="display:flex;justify-content: center;">
    <div>
      <img width="${width}" height="${height}" src="${link}"  alt="${alt}"  style="text-align: center;"></img>
      <div style="text-align: center;user-select: none;">图片：${content}</div>
    </div>
  </div>`;
}, {ends: true});



/**
* imgview 标签
* @example {% video 'example-copy.mp4' 120 120 autoplay %}
*/
hexo.extend.tag.register('css', function (args = [],content) {
  if (!content) return;

  return `<style type="text/css">${content}
  </style>`;
}, {ends: true});


hexo.extend.tag.register('reveal', revealTagCallback);
hexo.extend.processor.register('slides/*name.*ext', revealProcessorCallback);
hexo.extend.generator.register('reveal', revealGeneratorCallback);
