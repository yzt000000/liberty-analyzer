/* liberty-worker-src.js
 * Worker 逻辑源码 (字符串形式, 单一数据源)。
 *
 * 为什么用字符串 + Blob 而不是独立的 worker 文件:
 *   部分托管平台的网关会挂起 Worker 内部的 importScripts 子资源请求
 *   (不报错也不返回, 导致解析永远等待)。把解析器源码与本逻辑拼接成
 *   一个自包含 Blob 来创建 Worker, 不发起任何子资源请求, 彻底规避。
 *
 * 加载顺序: 必须在 app.js 之前加载 (由 index.html 的内联资源加载器注入)。
 */
window.LIBERTY_WORKER_SRC = [
  'self.onmessage = function (e) {',
  '  var d = e.data || {};',
  '  if (d.cmd !== "parse" || typeof d.text !== "string") return;',
  '  var t0 = (self.performance && performance.now()) ? performance.now() : Date.now();',
  '  try {',
  '    var res = Liberty.parseAndAnalyze(d.text);',
  '    var libs = (res.libraries || []).map(Liberty.stripRaw);',
  '    var ms = (self.performance && performance.now()) ? performance.now() : Date.now() - t0;',
  '    self.postMessage({ id: d.id, ok: true, libraries: libs, tokenCount: res.tokenCount || 0, ms: Math.round(ms) });',
  '  } catch (err) {',
  '    self.postMessage({ id: d.id, ok: false, error: String(err && err.message ? err.message : err) });',
  '  }',
  '};'
].join('\n');
