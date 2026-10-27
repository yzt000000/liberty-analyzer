/* ============================================================
 * Liberty 库分析器 — 主应用
 * ============================================================ */
(function () {
  'use strict';

  /* ---------- 开源库目录 ---------- */
  /* 远程条目均经存在性验证 (HTTP 200)。下载时按 镜像链 依次尝试:
     原始地址(raw, 带 CORS) -> ghproxy.net(国内镜像) -> GitHub API(base64) */
  var ORFS = 'https://raw.githubusercontent.com/The-OpenROAD-Project/OpenROAD-flow-scripts/master/flow/platforms/';
  var CATALOG = [
    /* ---- Nangate45 (45nm) ---- */
    {
      id: 'nangate45',
      group: 'Nangate45 (45nm)',
      name: 'Nangate45 typical (45nm 开源库)',
      desc: '135 cells · NLDM · 1.1V/25C · 经典 OpenROAD 教学库',
      node: 'NangateOpenCellLibrary',
      bundled: 'libs/NangateOpenCellLibrary_typical.lib',
      url: ORFS + 'nangate45/lib/NangateOpenCellLibrary_typical.lib'
    },
    /* ---- ASAP7 (7nm FinFET) ---- */
    {
      id: 'asap7',
      group: 'ASAP7 (7nm FinFET)',
      name: 'ASAP7 SIMPLE/RVT/TT (7nm FinFET)',
      desc: '56 cells · NLDM · 0.7V/25C · 预测性 7nm PDK（本地内置）',
      node: 'asap7sc7p5t_SIMPLE_RVT_TT_nldm_211120',
      bundled: 'libs/asap7sc7p5t_SIMPLE_RVT_TT_nldm_211120.lib'
    },
    /* ---- SkyWater 130nm ---- */
    {
      id: 'sky130hd',
      group: 'SkyWater 130nm',
      name: 'sky130_fd_sc_hd TT 025C 1v80 (130nm 高密度)',
      desc: '428 cells · NLDM · 1.8V/25C · 开源 PDK 标准单元库',
      node: 'sky130_fd_sc_hd__tt_025C_1v80',
      bundled: 'libs/sky130_fd_sc_hd__tt_025C_1v80.lib',
      url: ORFS + 'sky130hd/lib/sky130_fd_sc_hd__tt_025C_1v80.lib'
    },
    {
      id: 'sky130hs_tt100',
      group: 'SkyWater 130nm',
      name: 'sky130_fd_sc_hs TT 100C 1v80 (130nm 高速, 100C)',
      desc: '高速库 · TT corner · 1.8V/100C · 35 MB · 可与 hd 库对比速度等级与温度',
      node: 'sky130_fd_sc_hs__tt_100C_1v80',
      bundled: null,
      url: ORFS + 'sky130hs/lib/sky130_fd_sc_hs__tt_100C_1v80.lib'
    },
    {
      id: 'sky130io',
      group: 'SkyWater 130nm',
      name: 'SkyWater sky130 IO (dummy_io)',
      desc: 'IO 占位单元库 · inout 方向示例 · 130nm',
      node: 'sky130_io_dummy_tt',
      bundled: null,
      url: ORFS + 'sky130hd/lib/sky130_dummy_io.lib'
    },
    /* ---- IHP 130nm (sg13g2) ---- */
    {
      id: 'ihp_std_typ',
      group: 'IHP 130nm (sg13g2)',
      name: 'sg13g2 stdcell typ 1.20V 25C (IHP 130nm 典型)',
      desc: '标准单元 · typical corner · 1.20V/25C · 1.6 MB · 开源 BiCMOS PDK',
      node: 'sg13g2_stdcell_typ_1p20V_25C',
      bundled: null,
      url: ORFS + 'ihp-sg13g2/lib/sg13g2_stdcell_typ_1p20V_25C.lib'
    },
    {
      id: 'ihp_std_fast',
      group: 'IHP 130nm (sg13g2)',
      name: 'sg13g2 stdcell fast 1.32V -40C (IHP 130nm 快角)',
      desc: '标准单元 · fast corner · 1.32V/-40C · 1.6 MB · 可与 typical/slow 对比 PVT',
      node: 'sg13g2_stdcell_fast_1p32V_m40C',
      bundled: null,
      url: ORFS + 'ihp-sg13g2/lib/sg13g2_stdcell_fast_1p32V_m40C.lib'
    },
    {
      id: 'ihp_std_slow',
      group: 'IHP 130nm (sg13g2)',
      name: 'sg13g2 stdcell slow 1.08V 125C (IHP 130nm 慢角)',
      desc: '标准单元 · slow corner · 1.08V/125C · 1.6 MB · 可与 typical/fast 对比 PVT',
      node: 'sg13g2_stdcell_slow_1p08V_125C',
      bundled: null,
      url: ORFS + 'ihp-sg13g2/lib/sg13g2_stdcell_slow_1p08V_125C.lib'
    },
    {
      id: 'ihp_io_typ',
      group: 'IHP 130nm (sg13g2)',
      name: 'sg13g2 IO typ 1.20V 3.3V 25C (IHP 130nm IO 库)',
      desc: 'IO 单元 · typical · 1.20V(core)/3.3V(IO) · 190 KB · inout 方向示例',
      node: 'sg13g2_io_typ_1p2V_3p3V_25C',
      bundled: null,
      url: ORFS + 'ihp-sg13g2/lib/sg13g2_io_typ_1p2V_3p3V_25C.lib'
    },
    /* ---- GF 2nm 教学库 (gt2n) — 5 种 VT 对比 ---- */
    {
      id: 'gt2_elvt',
      group: 'GF 2nm 教学库 (gt2n, 多 VT)',
      name: 'gt2 6t w13 ELVT TT 0.7V 25C (极低 VT)',
      desc: '极低阈值电压 · 0.7V/25C · 1.1 MB · 可与其他 VT 对比延迟/漏电',
      node: 'gt2_6t_w13_elvt_tt_0p7v25c',
      bundled: null,
      url: ORFS + 'gt2n/lib/gt2_6t_w13_elvt_tt_0p7v25c.lib'
    },
    {
      id: 'gt2_lvt',
      group: 'GF 2nm 教学库 (gt2n, 多 VT)',
      name: 'gt2 6t w13 LVT TT 0.7V 25C (低 VT)',
      desc: '低阈值电压 · 0.7V/25C · 1.1 MB',
      node: 'gt2_6t_w13_lvt_tt_0p7v25c',
      bundled: null,
      url: ORFS + 'gt2n/lib/gt2_6t_w13_lvt_tt_0p7v25c.lib'
    },
    {
      id: 'gt2_svt',
      group: 'GF 2nm 教学库 (gt2n, 多 VT)',
      name: 'gt2 6t w13 SVT TT 0.7V 25C (标准 VT)',
      desc: '标准阈值电压 · 0.7V/25C · 1.1 MB',
      node: 'gt2_6t_w13_svt_tt_0p7v25c',
      bundled: null,
      url: ORFS + 'gt2n/lib/gt2_6t_w13_svt_tt_0p7v25c.lib'
    },
    {
      id: 'gt2_hvt',
      group: 'GF 2nm 教学库 (gt2n, 多 VT)',
      name: 'gt2 6t w13 HVT TT 0.7V 25C (高 VT)',
      desc: '高阈值电压 · 0.7V/25C · 1.1 MB',
      node: 'gt2_6t_w13_hvt_tt_0p7v25c',
      bundled: null,
      url: ORFS + 'gt2n/lib/gt2_6t_w13_hvt_tt_0p7v25c.lib'
    },
    {
      id: 'gt2_ulvt',
      group: 'GF 2nm 教学库 (gt2n, 多 VT)',
      name: 'gt2 6t w13 ULVT TT 0.7V 25C (超高 VT)',
      desc: '超低阈值电压 · 0.7V/25C · 1.1 MB · 速度最快但漏电最高',
      node: 'gt2_6t_w13_ulvt_tt_0p7v25c',
      bundled: null,
      url: ORFS + 'gt2n/lib/gt2_6t_w13_ulvt_tt_0p7v25c.lib'
    },
    /* ---- GF 180nm (gf180mcu, .lib.gz) ---- */
    {
      id: 'gf180_7t_tt',
      group: 'GF 180nm (gf180mcu, .lib.gz)',
      name: 'gf180mcu 7t5v0 TT 025C 3v30 (180nm 典型)',
      desc: '7 track · typical · 3.3V/25C · 3 MB gz · 需浏览器支持解压',
      node: 'gf180mcu_fd_sc_mcu7t5v0__tt_025C_3v30',
      bundled: null,
      url: ORFS + 'gf180/lib/gf180mcu_fd_sc_mcu7t5v0__tt_025C_3v30.lib.gz',
      gz: true
    },
    {
      id: 'gf180_7t_ss',
      group: 'GF 180nm (gf180mcu, .lib.gz)',
      name: 'gf180mcu 7t5v0 SS 125C 3v00 (180nm 慢角)',
      desc: '7 track · slow · 3.0V/125C · 3 MB gz · 可与 typical/fast 对比',
      node: 'gf180mcu_fd_sc_mcu7t5v0__ss_125C_3v00',
      bundled: null,
      url: ORFS + 'gf180/lib/gf180mcu_fd_sc_mcu7t5v0__ss_125C_3v00.lib.gz',
      gz: true
    },
    {
      id: 'gf180_7t_ff',
      group: 'GF 180nm (gf180mcu, .lib.gz)',
      name: 'gf180mcu 7t5v0 FF n40C 3v60 (180nm 快角)',
      desc: '7 track · fast · 3.6V/-40C · 3 MB gz · 可与 typical/slow 对比',
      node: 'gf180mcu_fd_sc_mcu7t5v0__ff_n40C_3v60',
      bundled: null,
      url: ORFS + 'gf180/lib/gf180mcu_fd_sc_mcu7t5v0__ff_n40C_3v60.lib.gz',
      gz: true
    },
    /* ---- 存储器宏 (fakeram45) ---- */
    {
      id: 'fakeram45',
      group: '存储器宏 (fakeram45)',
      name: 'FakeRAM45 512x64 (存储器宏)',
      desc: 'memory 组结构 · blackbox 时序 · 45nm',
      node: 'fakeram45_512x64',
      bundled: null,
      url: ORFS + 'nangate45/lib/fakeram45_512x64.lib'
    },
    {
      id: 'fakeram45b',
      group: '存储器宏 (fakeram45)',
      name: 'FakeRAM45 1024x32 (存储器宏)',
      desc: 'memory 组结构 · 更大容量 · 45nm',
      node: 'fakeram45_1024x32',
      bundled: null,
      url: ORFS + 'nangate45/lib/fakeram45_1024x32.lib'
    },
    {
      id: 'fakeram45_128x64',
      group: '存储器宏 (fakeram45)',
      name: 'FakeRAM45 128x64 (存储器宏)',
      desc: 'memory 组结构 · 128 行 × 64 位 · 45nm',
      node: 'fakeram45_128x64',
      bundled: null,
      url: ORFS + 'nangate45/lib/fakeram45_128x64.lib'
    },
    {
      id: 'fakeram45_256x64',
      group: '存储器宏 (fakeram45)',
      name: 'FakeRAM45 256x64 (存储器宏)',
      desc: 'memory 组结构 · 256 行 × 64 位 · 45nm',
      node: 'fakeram45_256x64',
      bundled: null,
      url: ORFS + 'nangate45/lib/fakeram45_256x64.lib'
    },
    {
      id: 'fakeram45_64x64',
      group: '存储器宏 (fakeram45)',
      name: 'FakeRAM45 64x64 (存储器宏)',
      desc: 'memory 组结构 · 64 行 × 64 位 · 45nm · 小容量',
      node: 'fakeram45_64x64',
      bundled: null,
      url: ORFS + 'nangate45/lib/fakeram45_64x64.lib'
    }
  ];

  /* ---------- 状态 ---------- */
  var state = {
    libs: [],            // {id, name, fileName, source, size, model, rawText}
    loadedCatalog: {},   // 已加载的目录条目 id -> true (持久记忆, 不依赖库名匹配)
    activeId: null,
    tab: 'overview',
    selectedCell: null,
    cellFilter: { search: '', type: 'all', sort: 'name' },
    page: 0,
    pageSize: 100,
    lut: { cell: null, pin: null, arc: 0, table: 'cell_rise', mode: 'heatmap' },
    charts: {},           // echarts 实例
    compare: { items: [], lut: { pin: null, rel: null, table: null, load: 0.05 } }
  };

  var PAGE_SIZE = 100;

  /* ---------- 工具 ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function escRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function fmtNum(v, d) {
    if (v == null || isNaN(v)) return '—';
    if (d != null) return Number(v).toFixed(d);
    var a = Math.abs(v);
    if (a !== 0 && (a >= 1e5 || a < 1e-4)) return v.toExponential(3);
    return String(parseFloat(v.toFixed(6)));
  }
  function fmtInt(v) { return v == null ? '—' : v.toLocaleString('en-US'); }
  function unitOf(u) {
    if (!u) return '';
    return String(u).replace(/^\s*1\s*/, '').trim();
  }
  function activeLib() {
    for (var i = 0; i < state.libs.length; i++) if (state.libs[i].id === state.activeId) return state.libs[i];
    return null;
  }
  function toast(msg, type) {
    var t = $('toast');
    t.textContent = msg;
    t.className = 'toast' + (type ? ' ' + type : '');
    t.style.display = 'block';
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.style.display = 'none'; }, 3600);
  }
  function showLoading(text) {
    loadBase = text || '正在处理…';
    loadStart = Date.now();
    $('loadingText').textContent = loadBase + '（已用 0 s）';
    $('loadingMask').style.display = 'flex';
    $('btnCancelLoad').style.display = 'inline-flex';
    clearInterval(loadTimer);
    loadTimer = setInterval(function () {
      var s = Math.round((Date.now() - loadStart) / 1000);
      $('loadingText').textContent = loadBase + '（已用 ' + s + ' s，可点击取消）';
    }, 500);
  }
  function hideLoading() {
    clearInterval(loadTimer);
    loadTimer = null;
    $('loadingMask').style.display = 'none';
    $('btnCancelLoad').style.display = 'none';
  }
  function nextTick(fn) { setTimeout(fn, 30); }

  /* 同源资源查询串: ?v=<版本号>[&<地址栏 query>]
     - 版本号 (window.CACHE_VERSION, 由 index.html 内联加载器设置):
       CDN 边缘节点可能缓存旧文件且各节点不一致, 版本号变化强制回源站;
     - 地址栏 query (如分享链接的 sharecode): 门禁平台要求每个请求携带 */
  function shareQs() {
    var v = window.CACHE_VERSION || '';
    var s = window.location.search || '';
    var parts = [];
    if (v) parts.push('v=' + v);
    if (s) parts.push(s.slice(1));
    return parts.length ? '?' + parts.join('&') : '';
  }
  /* 相对路径 -> 同源绝对路径 + 版本号与 query */
  function sameOriginUrl(u) {
    if (!/^https?:/i.test(u)) {
      return location.origin + '/' + String(u).replace(/^\/+/, '') + shareQs();
    }
    return u;
  }

  /* ============================================================
   * 库加载 (Blob 自包含 Worker 解析 + 同步回退)
   * ============================================================ */
  var libSeq = 0;
  var worker = null, workerPromise = null, workerDead = false, parseSeq = 0, pendingParse = null;
  var loadTimer = null, loadBase = '', loadStart = 0;
  var fetchAbort = null;
  var WORKER_TIMEOUT_MS = 20000;

  /* 获取 Blob Worker: 解析器源码 + Worker 逻辑拼接成自包含脚本,
     不发起任何子资源请求 (规避托管网关对 importScripts 的挂起) */
  function acquireWorker() {
    if (workerDead) return Promise.resolve(null);
    if (worker) return Promise.resolve(worker);
    if (workerPromise) return workerPromise;
    var logic = window.LIBERTY_WORKER_SRC;
    if (!logic) { workerDead = true; return Promise.resolve(null); }
    workerPromise = fetch('js/liberty-parser.js' + shareQs()).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).then(function (parserSrc) {
      var src = parserSrc + '\n;\n' + logic;
      var blob = new Blob([src], { type: 'application/javascript' });
      var url = URL.createObjectURL(blob);
      var w = new Worker(url);
      w._blobUrl = url;
      w.onerror = function () {
        workerDead = true;
        destroyWorker(w);
        if (pendingParse) {
          var p = pendingParse;
          pendingParse = null;
          p.reject(new Error('__WORKER_FAILED__'));
        }
      };
      worker = w;
      return w;
    }).catch(function () {
      workerDead = true;
      workerPromise = null;
      return null;
    });
    return workerPromise;
  }

  function destroyWorker(w) {
    try { w.terminate(); } catch (e) { /* noop */ }
    if (w._blobUrl) {
      try { URL.revokeObjectURL(w._blobUrl); } catch (e) { /* noop */ }
      w._blobUrl = null;
    }
  }

  function parseSync(text) {
    var t0 = performance.now();
    var res = Liberty.parseAndAnalyze(text);
    var libs = (res.libraries || []).map(Liberty.stripRaw);
    return { libraries: libs, tokenCount: res.tokenCount || 0, ms: performance.now() - t0 };
  }

  /* 返回 Promise; 优先 Worker (不阻塞 UI), 不可用/超时回退主线程同步解析 */
  function parseText(text) {
    return acquireWorker().then(function (w) {
      if (!w) return parseSync(text);
      return new Promise(function (resolve, reject) {
        var id = ++parseSeq;
        pendingParse = { reject: reject };
        var timer = setTimeout(function () {
          // 超时保护: Worker 无响应 (如环境不支持), 终止并回退
          if (!pendingParse) return;
          var p = pendingParse;
          pendingParse = null;
          workerDead = true;
          destroyWorker(w);
          worker = null;
          workerPromise = null;
          p.reject(new Error('__WORKER_TIMEOUT__'));
        }, WORKER_TIMEOUT_MS);
        w.onmessage = function (e) {
          var d = e.data || {};
          if (d.id !== id) return;
          clearTimeout(timer);
          pendingParse = null;
          if (d.ok) {
            resolve({ libraries: d.libraries, tokenCount: d.tokenCount, ms: d.ms });
          } else {
            reject(new Error(d.error));
          }
        };
        try {
          w.postMessage({ cmd: 'parse', id: id, text: text });
        } catch (e) {
          clearTimeout(timer);
          pendingParse = null;
          workerDead = true;
          destroyWorker(w);
          worker = null;
          workerPromise = null;
          reject(new Error('__WORKER_FAILED__'));
        }
      });
    });
  }

  function cancelLoading() {
    if (fetchAbort) {
      try { fetchAbort.abort(); } catch (e) { /* noop */ }
      fetchAbort = null;
    }
    if (pendingParse) {
      var p = pendingParse;
      pendingParse = null;
      if (worker) {
        workerDead = false;   // 用户主动取消不算 worker 故障
        destroyWorker(worker);
        worker = null;
        workerPromise = null;
      }
      p.reject(new Error('__CANCELLED__'));
    }
    hideLoading();
    toast('已取消');
  }

  function addLibrary(fileName, text, source, catalogId) {
    var sizeMB = text.length / 1e6;
    if (sizeMB > 30) {
      toast('文件较大（' + sizeMB.toFixed(0) + ' MB），解析可能需要较长时间', 'error');
    }
    showLoading('正在解析 ' + fileName + '（' + sizeMB.toFixed(1) + ' MB）…');
    nextTick(function () {
      parseText(text).then(function (r) {
        hideLoading();
        var libs = r.libraries || [];
        if (!libs.length) { toast('未在文件中找到 library 定义', 'error'); return; }
        var entry = {
          id: 'lib' + (++libSeq),
          name: libs[0].name,
          fileName: fileName,
          source: source || '上传',
          size: text.length,
          parseMs: Math.round(r.ms || 0),
          tokens: r.tokenCount || 0,
          model: libs[0],
          rawText: text
        };
        state.libs.push(entry);
        refreshLibSelector();
        try {
          setActiveLib(entry.id);
        } catch (e2) {
          console.error(e2);
          toast('数据已解析，但渲染出错: ' + e2.message, 'error');
        }
        if (catalogId) markCatalogLoaded(catalogId);
        toast('已加载 ' + entry.name + '（' + entry.parseMs + ' ms，' +
          (entry.tokens / 1000).toFixed(0) + 'K tokens）', 'success');
      }).catch(function (e) {
        if (String(e.message) === '__CANCELLED__') return;   // 用户取消, 不提示
        if (String(e.message) === '__WORKER_FAILED__' || String(e.message) === '__WORKER_TIMEOUT__') {
          // Worker 不可用或超时 -> 同步回退重试一次
          var why = String(e.message) === '__WORKER_TIMEOUT__' ? '（后台线程无响应，已回退主线程）' : '';
          try {
            var r2 = parseSync(text);
            var libs2 = r2.libraries || [];
            if (!libs2.length) { hideLoading(); toast('未在文件中找到 library 定义', 'error'); return; }
            hideLoading();
            var entry2 = {
              id: 'lib' + (++libSeq),
              name: libs2[0].name,
              fileName: fileName,
              source: source || '上传',
              size: text.length,
              parseMs: Math.round(r2.ms),
              tokens: r2.tokenCount,
              model: libs2[0],
              rawText: text
            };
            state.libs.push(entry2);
            refreshLibSelector();
            try {
              setActiveLib(entry2.id);
            } catch (e3) {
              console.error(e3);
              toast('数据已解析，但渲染出错: ' + e3.message, 'error');
            }
            if (catalogId) markCatalogLoaded(catalogId);
            toast('已加载 ' + entry2.name + '（' + entry2.parseMs + ' ms）' + why, 'success');
            return;
          } catch (e2) {
            hideLoading();
            toast('解析失败: ' + e2.message, 'error');
            return;
          }
        }
        hideLoading();
        toast('解析失败: ' + e.message, 'error');
      });
    });
  }

  function refreshLibSelector() {
    var sel = $('libSelector');
    sel.innerHTML = '';
    state.libs.forEach(function (l) {
      var o = document.createElement('option');
      o.value = l.id;
      o.textContent = l.name + '  (' + l.model.cells.length + ' cells)';
      sel.appendChild(o);
    });
    sel.disabled = state.libs.length === 0;
    if (state.activeId) sel.value = state.activeId;
    updateLibMeta();
  }

  function updateLibMeta() {
    var l = activeLib();
    var meta = $('libMeta');
    if (!l) { meta.textContent = ''; return; }
    meta.textContent = l.model.cells.length + ' cells · ' +
      (l.size / 1e6).toFixed(1) + ' MB · ' + l.parseMs + ' ms' +
      (l.tokens ? ' · ' + (l.tokens / 1000).toFixed(0) + 'K tokens' : '') +
      ' · ' + l.source;
  }

  function setActiveLib(id) {
    state.activeId = id;
    state.selectedCell = null;
    state.page = 0;
    state.lut = { cell: null, pin: null, arc: 0, table: 'cell_rise', mode: 'heatmap' };
    $('libSelector').value = id;
    updateLibMeta();
    enableControls(true);
    renderAll();
  }

  function enableControls(on) {
    $('cellSearch').disabled = !on;
    $('cellTypeFilter').disabled = !on;
    $('cellSort').disabled = !on;
  }

  /* ---------- 加载入口 ---------- */
  function loadBundled(item) {
    showLoading('正在加载 ' + item.name + ' …');
    nextTick(function () {
      fetchAbort = ('AbortController' in window) ? new AbortController() : null;
      fetch(item.bundled + shareQs(), fetchAbort ? { signal: fetchAbort.signal } : undefined).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      }).then(function (text) {
        fetchAbort = null;
        addLibrary(item.bundled.split('/').pop(), text, '内置库', item.id);
      }).catch(function (e) {
        fetchAbort = null;
        if (e && e.name === 'AbortError') return;   // 用户取消
        hideLoading();
        var msg = '加载失败: ' + e.message;
        if (/Failed to fetch|NetworkError|load failed/i.test(e.message || '')) {
          msg += '（若通过 file:// 直接打开，浏览器会拦截 .lib 请求，请先用本地 HTTP 服务器启动，见 README）';
        }
        toast(msg, 'error');
      });
    });
  }

  function loadFromUrl(item) {
    showLoading('正在下载 ' + item.name + ' …');
    nextTick(function () {
      var fetchPromise = item.gz ? fetchGzWithMirrors(item.url) : fetchWithMirrors(item.url);
      fetchPromise.then(function (text) {
        addLibrary(item.url.split('/').pop().replace(/\.gz$/i, ''), text, '网络下载', item.id);
      }).catch(function (e) {
        if (e && e.name === 'AbortError') return;    // 用户取消
        hideLoading();
        var msg = '下载失败: ' + e.message;
        if (item.gz && /DecompressionStream|gzip/i.test(e.message || '')) {
          msg += '（当前浏览器不支持 gzip 解压，请用 Chrome 80+ / Firefox 65+ / Safari 16.4+，或手动下载解压后用「上传 .lib」加载）';
        } else if (/Failed to fetch|NetworkError|load failed/i.test(e.message || '')) {
          msg += '（网络不可达或跨域被拦截；国内网络会自动尝试 ghproxy / GitHub API 镜像，也可手动下载后用「上传 .lib」加载）';
        }
        toast(msg, 'error');
      });
    });
  }

  /* gzip 解压 (浏览器原生 DecompressionStream, Chrome80+/FF65+/Safari16.4+) */
  function gunzipArrayBuffer(buffer) {
    if (typeof DecompressionStream === 'undefined') {
      return Promise.reject(new Error('DecompressionStream 不支持'));
    }
    try {
      var ds = new DecompressionStream('gzip');
      var writer = ds.writable.getWriter();
      writer.write(buffer);
      writer.close();
      return new Response(ds.readable).text();
    } catch (e) {
      return Promise.reject(new Error('gzip 解压失败: ' + e.message));
    }
  }

  /* .lib.gz 专用下载: raw -> ghproxy (不走 GitHub API, 避免 base64+gz 双重解码) */
  function fetchGzWithMirrors(url) {
    var m = String(url).match(/^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/);
    var urls = m ? [url, 'https://ghproxy.net/' + url] : [url];
    var idx = 0;
    function attempt() {
      if (idx >= urls.length) {
        return Promise.reject(new Error('所有镜像均失败（' + urls.length + ' 个地址）'));
      }
      var u = urls[idx++];
      if (fetchAbort) { try { fetchAbort.abort(); } catch (e) { /* noop */ } }
      fetchAbort = ('AbortController' in window) ? new AbortController() : null;
      return fetch(u, fetchAbort ? { signal: fetchAbort.signal } : undefined).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status + ' @ ' + shortUrl(u));
        return r.arrayBuffer();
      }).then(function (buf) {
        fetchAbort = null;
        return gunzipArrayBuffer(buf);
      }).catch(function (e) {
        if (e && e.name === 'AbortError') throw e;
        return attempt();
      });
    }
    return attempt().then(function (text) {
      return text;
    });
  }

  /* 多镜像下载链: 原始地址 -> ghproxy.net -> GitHub API(base64) */
  function mirrorUrls(ghUrl) {
    ghUrl = sameOriginUrl(ghUrl);   // 相对路径按同源处理并携带 query
    var m = String(ghUrl).match(/^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/);
    if (!m) return [ghUrl];
    var api = 'https://api.github.com/repos/' + m[1] + '/' + m[2] + '/contents/' + m[4] + '?ref=' + m[3];
    return [ghUrl, 'https://ghproxy.net/' + ghUrl, api];
  }

  function fetchWithMirrors(url) {
    var urls = mirrorUrls(url);
    var idx = 0;
    function attempt() {
      if (idx >= urls.length) {
        return Promise.reject(new Error('所有镜像均失败（' + urls.length + ' 个地址）'));
      }
      var u = urls[idx++];
      if (fetchAbort) { try { fetchAbort.abort(); } catch (e) { /* noop */ } }
      fetchAbort = ('AbortController' in window) ? new AbortController() : null;
      return fetch(u, fetchAbort ? { signal: fetchAbort.signal } : undefined).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status + ' @ ' + shortUrl(u));
        var ct = r.headers.get('content-type') || '';
        if (u.indexOf('api.github.com') >= 0 || ct.indexOf('application/json') >= 0) {
          return r.json().then(function (j) {
            if (j && j.content) {
              return { text: b64ToUtf8(j.content), from: 'GitHub API' };
            }
            throw new Error('API 未返回内容（文件可能超过 1MB）@ ' + shortUrl(u));
          });
        }
        return r.text().then(function (t) { return { text: t, from: shortUrl(u) }; });
      }).then(function (out) {
        fetchAbort = null;
        return out;
      }).catch(function (e) {
        if (e && e.name === 'AbortError') throw e;
        return attempt();   // 尝试下一个镜像
      });
    }
    return attempt().then(function (out) {
      if (out.from && out.from !== shortUrl(urls[0])) {
        toast('已通过镜像 ' + out.from + ' 下载', 'success');
      }
      return out.text;
    });
  }

  function shortUrl(u) {
    return String(u).replace(/^https?:\/\//, '').slice(0, 48);
  }

  function b64ToUtf8(b64) {
    var bin = atob(String(b64).replace(/\s/g, ''));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    try {
      return new TextDecoder('utf-8').decode(bytes);
    } catch (e) {
      var s = '';
      for (var j = 0; j < bytes.length; j++) s += String.fromCharCode(bytes[j]);
      return s;
    }
  }

  function loadFiles(files) {
    Array.prototype.forEach.call(files, function (f) {
      showLoading('正在读取并解析 ' + f.name + ' …');
      var reader = new FileReader();
      reader.onload = function () {
        var text = String(reader.result || '');
        addLibrary(f.name, text, '上传');
      };
      reader.onerror = function () {
        hideLoading();
        toast('读取文件失败: ' + f.name, 'error');
      };
      reader.readAsText(f);
    });
  }

  function markCatalogLoaded(id) {
    if (!id) return;
    state.loadedCatalog[id] = true;
    var el = document.querySelector('.catalog-item[data-id="' + id + '"]');
    if (el) {
      el.classList.add('loaded');
      var btn = el.querySelector('button');
      if (btn) { btn.textContent = '已加载'; btn.disabled = true; }
    }
  }

  /* 把当前库的原始文本保存为 .lib 文件 (下载到浏览器默认目录) */
  function saveCurrentLib() {
    var l = activeLib();
    if (!l) { toast('请先加载一个库', 'error'); return; }
    var name = (l.model.name || l.fileName || 'library') + '.lib';
    downloadText(l.rawText, name, false);   // .lib 不加 BOM, 避免破坏解析器
    toast('已保存 ' + name + '（浏览器下载目录）', 'success');
  }

  /* ============================================================
   * 渲染: 总控
   * ============================================================ */
  function renderAll() {
    renderCellList();
    renderOverview();
    renderCellDetail();
    renderLutPanel();
    renderComparePanel();
  }

  /* ============================================================
   * 库概览
   * ============================================================ */
  function libStats(lib) {
    var totalPins = 0, totalArcs = 0, totalLuts = 0, seq = 0, withArea = 0, leakSum = 0, leakCnt = 0;
    lib.cells.forEach(function (c) {
      totalPins += c.pins.length;
      if (c.isSequential) seq++;
      if (c.area != null) { withArea++; }
      if (c.cellLeakage != null) { leakSum += c.cellLeakage; leakCnt++; }
      c.pins.forEach(function (p) {
        p.timing.forEach(function (t) {
          totalArcs++;
          Object.keys(t.tables).forEach(function (k) {
            var tb = t.tables[k];
            if (tb && tb.index1) totalLuts++;
          });
        });
      });
    });
    return {
      cells: lib.cells.length, pins: totalPins, arcs: totalArcs, luts: totalLuts,
      seq: seq, withArea: withArea, avgLeak: leakCnt ? leakSum / leakCnt : null
    };
  }

  function renderOverview() {
    var lib = activeLib();
    var wrap = $('overviewContent');
    var welcome = $('welcomePanel');
    if (!lib) {
      welcome.style.display = 'block';
      wrap.innerHTML = '';
      return;
    }
    welcome.style.display = 'none';
    var m = lib.model;
    var st = libStats(m);
    var u = m.units;
    var op = m.defaultOpcondInfo || m.operatingConditions[0] || null;

    var html = '';
    /* 统计卡片 */
    html += '<div class="stat-cards">' +
      statCard('单元总数', fmtInt(st.cells), m.name) +
      statCard('引脚总数', fmtInt(st.pins), '平均 ' + (st.cells ? (st.pins / st.cells).toFixed(1) : '0') + ' pin/cell') +
      statCard('时序弧', fmtInt(st.arcs), 'timing arcs') +
      statCard('查找表 LUT', fmtInt(st.luts), 'delay/trans/power') +
      statCard('时序单元', fmtInt(st.seq), 'FF / LATCH') +
      statCard('平均漏电', st.avgLeak == null ? '—' : fmtNum(st.avgLeak) + ' ' + unitOf(u.leakagePower), unitOf(u.leakagePower) + ' 单位') +
      '</div>';

    html += '<div class="ov-grid">';

    /* 库基本信息 */
    html += card('库级属性', tableHtml([
      ['库名', '<span class="badge">' + esc(m.name) + '</span>'],
      ['工艺 technology', esc(m.technology || '—')],
      ['延迟模型 delay_model', esc(m.delayModel || '—')],
      ['版本 revision', m.revision == null ? '—' : fmtNum(m.revision, 3)],
      ['日期 date', esc(m.date || '—')],
      ['默认工作条件', esc(m.defaultOpcond || '—')],
      ['标称电压 / 温度', (m.nomVoltage != null ? m.nomVoltage + ' V' : '—') + ' / ' + (m.nomTemperature != null ? m.nomTemperature + ' °C' : '—')],
      ['总线命名风格', esc(m.busNamingStyle || '—')],
      ['library_features', esc(m.libraryFeatures || '—')]
    ]));

    /* 单位 */
    html += card('单位定义 units', tableHtml([
      ['时间 time_unit', esc(u.time || '—')],
      ['电压 voltage_unit', esc(u.voltage || '—')],
      ['负载电容 capacitive_load_unit', esc(u.capacitiveLoad || '—')],
      ['漏电功耗 leakage_power_unit', esc(u.leakagePower || '—')],
      ['上拉电阻 pulling_resistance_unit', esc(u.pullingResistance || '—')],
      ['电流 current_unit', esc(u.current || '—')]
    ]));

    /* 工作条件 */
    var ocRows = m.operatingConditions.map(function (o) {
      return ['<span class="badge ' + (m.defaultOpcond === o.name ? 'green' : 'gray') + '">' + esc(o.name) + '</span>' +
        (m.defaultOpcond === o.name ? ' <small>(默认)</small>' : ''),
        (o.voltage != null ? o.voltage + ' V' : '—') + ' · ' + (o.temperature != null ? o.temperature + ' °C' : '—') +
        (o.process ? ' · ' + esc(o.process) : '')];
    });
    html += card('工作条件 operating_conditions', ocRows.length ? tableHtml(ocRows) :
      '<p class="muted">未定义 operating_conditions</p>');

    /* LUT 模板 */
    var tplRows = Object.keys(m.templates).map(function (k) {
      return ['<span class="badge purple">' + esc(k) + '</span>',
        esc(m.templates[k].variable1 || '—') + (m.templates[k].variable2 ? '<br>' + esc(m.templates[k].variable2) : '')];
    });
    html += card('LUT 模板 lu_table_template', tplRows.length ? tableHtml(tplRows) :
      '<p class="muted">未定义 lu_table_template</p>');

    /* 面积分布 */
    html += '<div class="card wide"><div class="card-head">面积分布 (µm²)' +
      '<span class="head-extra">' + fmtInt(st.withArea) + ' 个单元含 area 属性</span></div>' +
      '<div class="card-body"><div class="chart-box" id="chartAreaHist"></div></div></div>';

    /* 漏电 Top10 */
    html += '<div class="card wide"><div class="card-head">静态漏电 Top 10' +
      '<span class="head-extra">单位: ' + esc(unitOf(u.leakagePower) || '—') + '</span></div>' +
      '<div class="card-body"><div class="chart-box" id="chartLeakTop"></div></div></div>';

    /* define */
    if (m.defines.length) {
      var chips = m.defines.map(function (d) {
        return '<span class="badge gray mono" title="' + esc(d.groupType) + '">' + esc(d.name) + '</span>';
      }).join(' ');
      html += '<div class="card wide"><div class="card-head">define 属性声明 (' + m.defines.length + ')</div>' +
        '<div class="card-body" style="line-height:2.1">' + chips + '</div></div>';
    }

    html += '</div>';
    wrap.innerHTML = html;

    drawAreaHistogram(m);
    drawLeakTop(m);
  }

  function statCard(label, value, sub) {
    return '<div class="stat-card"><div class="stat-label">' + label + '</div>' +
      '<div class="stat-value">' + value + '</div><div class="stat-sub">' + (sub || '') + '</div></div>';
  }
  function card(title, body) {
    return '<div class="card"><div class="card-head">' + title + '</div><div class="card-body">' + body + '</div></div>';
  }
  function tableHtml(rows) {
    var s = '<table class="kv-table">';
    rows.forEach(function (r) { s += '<tr><th>' + r[0] + '</th><td>' + r[1] + '</td></tr>'; });
    return s + '</table>';
  }

  /* 安全初始化图表: 释放旧实例 + 异常兜底 */
  function safeInit(id) {
    var el = $(id);
    if (!el || !window.echarts) return null;
    try {
      var old = echarts.getInstanceByDom(el);
      if (old) old.dispose();
      return echarts.init(el);
    } catch (e) {
      return null;
    }
  }

  function drawAreaHistogram(m) {
    var el = $('chartAreaHist');
    if (!el) return;
    var areas = m.cells.map(function (c) { return c.area; }).filter(function (a) { return a != null; });
    if (!areas.length) { el.innerHTML = '<p class="muted">无 area 数据</p>'; return; }
    var min = Math.min.apply(null, areas), max = Math.max.apply(null, areas);
    var useLog = max / Math.max(min, 1e-12) > 50;
    var bins = 24, counts = new Array(bins).fill(0);
    var lo = useLog ? Math.log10(Math.max(min, 1e-9)) : min;
    var hi = useLog ? Math.log10(max) : max;
    var span = (hi - lo) || 1;
    areas.forEach(function (a) {
      var v = useLog ? Math.log10(Math.max(a, 1e-9)) : a;
      var idx = Math.floor((v - lo) / span * bins);
      if (idx < 0) idx = 0; if (idx >= bins) idx = bins - 1;
      counts[idx]++;
    });
    var cats = counts.map(function (_, i) {
      var a = lo + span * i / bins, b = lo + span * (i + 1) / bins;
      if (useLog) return Math.pow(10, a).toExponential(0) + '~' + Math.pow(10, b).toExponential(0);
      return a.toFixed(2);
    });
    var chart = safeInit('chartAreaHist');
    if (!chart) { el.innerHTML = '<p class="muted">图表渲染失败</p>'; return; }
    state.charts.areaHist = chart;
    chart.setOption({
      grid: { left: 46, right: 14, top: 18, bottom: 44 },
      tooltip: { trigger: 'axis', formatter: function (ps) { return '面积 ' + ps[0].name + '<br>单元数: <b>' + ps[0].value + '</b>'; } },
      xAxis: { type: 'category', data: cats, axisLabel: { fontSize: 9, rotate: 45, color: '#64748b' }, name: useLog ? '面积(对数)' : '面积', nameLocation: 'middle', nameGap: 30 },
      yAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#64748b' }, splitLine: { lineStyle: { color: '#eef2f7' } } },
      series: [{ type: 'bar', data: counts, itemStyle: { color: '#3b82f6', borderRadius: [3, 3, 0, 0] }, barMaxWidth: 26 }]
    });
  }

  function drawLeakTop(m) {
    var el = $('chartLeakTop');
    if (!el) return;
    var cells = m.cells.filter(function (c) { return c.cellLeakage != null; })
      .sort(function (a, b) { return b.cellLeakage - a.cellLeakage; }).slice(0, 10);
    if (!cells.length) { el.innerHTML = '<p class="muted">无 cell_leakage_power 数据</p>'; return; }
    var chart = safeInit('chartLeakTop');
    if (!chart) { el.innerHTML = '<p class="muted">图表渲染失败</p>'; return; }
    state.charts.leakTop = chart;
    chart.setOption({
      grid: { left: 130, right: 46, top: 10, bottom: 26 },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: function (ps) { return '<b>' + esc(ps[0].name) + '</b><br>漏电: ' + fmtNum(ps[0].value) + ' ' + esc(unitOf(m.units.leakagePower)); } },
      xAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#64748b' }, splitLine: { lineStyle: { color: '#eef2f7' } } },
      yAxis: { type: 'category', inverse: true, data: cells.map(function (c) { return c.name; }), axisLabel: { fontSize: 10, color: '#475569', fontFamily: 'monospace' } },
      series: [{ type: 'bar', data: cells.map(function (c) { return c.cellLeakage; }), itemStyle: { color: '#f59e0b', borderRadius: [0, 3, 3, 0] }, barMaxWidth: 16, label: { show: true, position: 'right', fontSize: 9.5, color: '#64748b', formatter: function (p) { return fmtNum(p.value); } } }]
    });
  }

  /* ============================================================
   * 单元列表
   * ============================================================ */
  function filteredCells() {
    var lib = activeLib();
    if (!lib) return [];
    var f = state.cellFilter;
    var arr = lib.model.cells.filter(function (c) {
      if (f.search && c.name.toLowerCase().indexOf(f.search.toLowerCase()) < 0) return false;
      if (f.type === 'seq' && !c.isSequential) return false;
      if (f.type === 'comb' && c.isSequential) return false;
      return true;
    });
    arr.sort(function (a, b) {
      if (f.sort === 'area') return (b.area || 0) - (a.area || 0);
      if (f.sort === 'leak') return (b.cellLeakage || 0) - (a.cellLeakage || 0);
      if (f.sort === 'pins') return b.pins.length - a.pins.length;
      return a.name < b.name ? -1 : 1;
    });
    return arr;
  }

  function renderCellList() {
    var lib = activeLib();
    var list = $('cellList');
    var badge = $('cellCountBadge');
    if (!lib) {
      badge.textContent = '0';
      list.innerHTML = '<div class="empty-hint"><div class="empty-icon">📚</div><p>尚未加载库</p>' +
        '<p class="empty-sub">点击右上角 <b>下载开源库</b> 获取内置库<br>或 <b>上传 .lib</b> 解析本地文件</p></div>';
      $('cellPager').style.display = 'none';
      return;
    }
    var arr = filteredCells();
    badge.textContent = arr.length + ' / ' + lib.model.cells.length;
    var pages = Math.max(1, Math.ceil(arr.length / PAGE_SIZE));
    if (state.page >= pages) state.page = pages - 1;
    var slice = arr.slice(state.page * PAGE_SIZE, (state.page + 1) * PAGE_SIZE);

    var html = '';
    slice.forEach(function (c) {
      html += '<div class="cell-item' + (state.selectedCell === c.name ? ' active' : '') + '" data-cell="' + esc(c.name) + '">' +
        '<span class="cell-item-name">' + esc(c.name) + '</span>' +
        (c.isSequential ? '<span class="tag tag-seq">SEQ</span>' : '') +
        (c.dontUse ? '<span class="tag tag-dontuse">DONT_USE</span>' : '') +
        '<span class="cell-item-area">' + (c.area != null ? fmtNum(c.area, 3) : '—') + '</span>' +
        '</div>';
    });
    list.innerHTML = html || '<div class="empty-hint"><p>没有匹配的单元</p></div>';

    var pager = $('cellPager');
    if (pages > 1) {
      pager.style.display = 'flex';
      $('pageInfo').textContent = (state.page + 1) + ' / ' + pages + ' 页';
      $('btnPrevPage').disabled = state.page === 0;
      $('btnNextPage').disabled = state.page >= pages - 1;
    } else {
      pager.style.display = 'none';
    }
  }

  /* ============================================================
   * 单元详情
   * ============================================================ */
  function dirBadge(d) {
    if (d === 'input') return '<span class="badge">input</span>';
    if (d === 'output') return '<span class="badge green">output</span>';
    if (d === 'inout') return '<span class="badge amber">inout</span>';
    return '<span class="badge gray">' + esc(d || '—') + '</span>';
  }

  function renderCellDetail() {
    var lib = activeLib();
    var wrap = $('cellDetailContent');
    var hint = $('cellEmptyHint');
    if (!lib || !state.selectedCell) {
      hint.style.display = 'flex';
      wrap.innerHTML = '';
      return;
    }
    hint.style.display = 'none';
    var cell = null;
    for (var i = 0; i < lib.model.cells.length; i++) {
      if (lib.model.cells[i].name === state.selectedCell) { cell = lib.model.cells[i]; break; }
    }
    if (!cell) { wrap.innerHTML = '<div class="empty-hint"><p>未找到单元</p></div>'; return; }
    var m = lib.model;

    var html = '';
    /* 头部 */
    html += '<div class="cell-detail-head"><div class="cell-detail-name">' + esc(cell.name) +
      (cell.isSequential ? '<span class="badge purple">时序单元</span>' : '<span class="badge green">组合逻辑</span>') +
      (cell.dontUse ? '<span class="badge amber">dont_use</span>' : '') +
      '</div><div class="cell-detail-attrs">' +
      cellAttr('面积 area', cell.area != null ? fmtNum(cell.area) + ' µm²' : '—') +
      cellAttr('漏电 cell_leakage', cell.cellLeakage != null ? fmtNum(cell.cellLeakage) + ' ' + unitOf(m.units.leakagePower) : '—') +
      cellAttr('引脚数', cell.pins.length) +
      cellAttr('PG pin', cell.pgPins.length) +
      cellAttr('cell_footprint', cell.cellFootprint || '—') +
      cellAttr('drive_strength', cell.driveStrength != null ? cell.driveStrength : '—') +
      '</div>' +
      '<div class="cell-detail-actions"><button class="btn btn-primary btn-sm" id="btnAddCmp">加入对比</button></div></div>';

    /* 引脚 */
    html += '<div class="detail-section"><div class="detail-section-title">引脚与时序弧 Pins / Timing Arcs (' + cell.pins.length + ')</div>';
    cell.pins.forEach(function (p, pi) {
      html += '<div class="pin-block" data-pin="' + esc(p.name) + '">' +
        '<div class="pin-block-head"><span class="caret">▶</span>' +
        '<span class="pin-block-name">' + esc(p.name) + '</span>' + dirBadge(p.direction) +
        (p.clock ? '<span class="badge amber">clock</span>' : '') +
        (p.capacitance != null ? '<span class="badge gray mono">C=' + fmtNum(p.capacitance) + '</span>' : '') +
        (p.function ? '<span class="fn-expr">' + esc(p.function) + '</span>' : '') +
        '<span style="flex:1"></span>' +
        (p.timing.length ? '<span class="badge gray">' + p.timing.length + ' arcs</span>' : '') +
        '</div><div class="pin-block-body">' +
        pinAttrsTable(p, m) + arcBlocks(p, pi, cell.name) +
        '</div></div>';
    });
    html += '</div>';

    /* 内部功耗 */
    var hasIP = cell.pins.some(function (p) { return p.internalPower.length; });
    if (hasIP) {
      html += '<div class="detail-section"><div class="detail-section-title">内部功耗 internal_power</div><div class="table-wrap"><table class="data-table">' +
        '<tr><th>Pin</th><th>related_pin</th><th>when</th><th>表</th></tr>';
      cell.pins.forEach(function (p) {
      p.internalPower.forEach(function (ip) {
        var tabs = Object.keys(ip.tables).map(function (k) {
          var t = ip.tables[k];
          return lutChip(cell.name, p.name, null, k, t, true);
        }).join('');
          html += '<tr><td>' + esc(p.name) + '</td><td>' + esc(ip.relatedPin || '—') + '</td>' +
            '<td class="wrap">' + (ip.when ? '<span class="when-expr">' + esc(ip.when) + '</span>' : '—') + '</td>' +
            '<td>' + (tabs || '—') + '</td></tr>';
        });
      });
      html += '</table></div></div>';
    }

    /* 泄漏功耗 */
    if (cell.leakageGroups.length) {
      html += '<div class="detail-section"><div class="detail-section-title">条件泄漏功耗 leakage_power</div><div class="table-wrap"><table class="data-table">' +
        '<tr><th>when</th><th>value (' + esc(unitOf(m.units.leakagePower)) + ')</th></tr>';
      cell.leakageGroups.forEach(function (lg) {
        html += '<tr><td class="wrap">' + (lg.when ? '<span class="when-expr">' + esc(lg.when) + '</span>' : '—') + '</td>' +
          '<td>' + fmtNum(lg.value) + '</td></tr>';
      });
      html += '</table></div></div>';
    }

    /* 时序元素 */
    if (cell.seqElements.length || cell.statetable.length) {
      html += '<div class="detail-section"><div class="detail-section-title">时序元素 FF / LATCH / statetable</div><div class="table-wrap"><table class="data-table">';
      cell.seqElements.forEach(function (se) {
        html += '<tr><td><span class="badge purple">' + se.kind + '</span> ' + esc(se.name || '') + '</td><td class="wrap">' +
          Object.keys(se.attrs).map(function (k) {
            return '<b>' + esc(k) + '</b>: ' + esc(se.attrs[k]);
          }).join('<br>') + '</td></tr>';
      });
      cell.statetable.forEach(function (st) {
        html += '<tr><td><span class="badge amber">statetable</span></td><td class="wrap">' +
          Object.keys(st).map(function (k) { return '<b>' + esc(k) + '</b>: ' + esc(st[k]); }).join('<br>') + '</td></tr>';
      });
      html += '</table></div></div>';
    }

    /* PG pins */
    if (cell.pgPins.length) {
      html += '<div class="detail-section"><div class="detail-section-title">电源地引脚 pg_pin</div><div class="table-wrap"><table class="data-table">' +
        '<tr><th>名称</th><th>pg_type</th><th>voltage_name</th></tr>';
      cell.pgPins.forEach(function (pg) {
        html += '<tr><td>' + esc(pg.name) + '</td><td>' + esc(pg.pgType || '—') + '</td><td>' + esc(pg.voltageName || '—') + '</td></tr>';
      });
      html += '</table></div></div>';
    }

    /* 原始 Liberty 源码 */
    html += '<div class="detail-section"><div class="detail-section-title">原始 Liberty 片段</div>' +
      '<div class="src-view" id="cellSrcView">正在提取源码…</div></div>';

    /* JSON 树 (模型层, raw AST 已在 Worker 中剔除) */
    html += '<div class="detail-section"><div class="detail-section-title">解析结果 (模型 JSON)</div>' +
      '<div class="json-tree" id="cellJsonView"></div></div>';

    wrap.innerHTML = html;

    // 填充源码与 JSON
    var src = extractCellSource(lib.rawText, cell.name);
    $('cellSrcView').textContent = src || '（未能定位源码片段）';
    $('cellJsonView').textContent = JSON.stringify(cell, null, 1);

    // pin 展开交互
    Array.prototype.forEach.call(wrap.querySelectorAll('.pin-block-head'), function (head) {
      head.addEventListener('click', function () {
        head.parentElement.classList.toggle('open');
      });
    });
    // 加入对比按钮
    var addCmpBtn = $('btnAddCmp');
    if (addCmpBtn) {
      addCmpBtn.addEventListener('click', function () {
        addCompareItem(state.activeId, cell.name);
      });
    }
    // LUT chip 点击
    Array.prototype.forEach.call(wrap.querySelectorAll('.lut-chip'), function (chip) {
      chip.addEventListener('click', function (e) {
        e.stopPropagation();
        var direct = null;
        if (chip.dataset.ip === '1') {
          var lib2 = activeLib();
          if (lib2) {
            for (var ci = 0; ci < lib2.model.cells.length; ci++) {
              if (lib2.model.cells[ci].name !== chip.dataset.cell) continue;
              var pins = lib2.model.cells[ci].pins;
              for (var pi2 = 0; pi2 < pins.length; pi2++) {
                if (pins[pi2].name !== chip.dataset.pin) continue;
                for (var ii = 0; ii < pins[pi2].internalPower.length; ii++) {
                  var ip2 = pins[pi2].internalPower[ii];
                  if (ip2.tables[chip.dataset.table]) {
                    direct = { lut: ip2.tables[chip.dataset.table], relatedPin: ip2.relatedPin, when: ip2.when };
                    break;
                  }
                }
              }
            }
          }
        }
        openLut(chip.dataset.cell, chip.dataset.pin,
          chip.dataset.arc ? parseInt(chip.dataset.arc, 10) : 0, chip.dataset.table, direct);
      });
    });
  }

  function cellAttr(k, v) {
    return '<div class="cell-attr"><span class="k">' + esc(k) + '</span><span class="v">' + v + '</span></div>';
  }

  function pinAttrsTable(p, m) {
    var rows = [
      ['方向 direction', dirBadge(p.direction)],
      ['电容 capacitance', p.capacitance != null ? fmtNum(p.capacitance) + ' ' + esc(unitOf(m.units.capacitiveLoad)) : '—'],
      ['下降/上升电容', (p.fallCapacitance != null || p.riseCapacitance != null) ? fmtNum(p.fallCapacitance) + ' / ' + fmtNum(p.riseCapacitance) : '—'],
      ['最大电容 max_capacitance', p.maxCapacitance != null ? fmtNum(p.maxCapacitance) + ' ' + esc(unitOf(m.units.capacitiveLoad)) : '—'],
      ['最大跳变 max_transition', p.maxTransition != null ? fmtNum(p.maxTransition) + ' ' + esc(unitOf(m.units.time)) : '—'],
      ['功能 function', p.function ? '<span class="fn-expr">' + esc(p.function) + '</span>' : '—'],
      ['三态 three_state', p.threeState ? '<span class="fn-expr">' + esc(p.threeState) + '</span>' : '—'],
      ['次态 nextstate', p.nextState ? '<span class="fn-expr">' + esc(p.nextState) + '</span>' : '—'],
      ['时钟 clock', p.clock ? '<span class="badge amber">true</span>' : 'false'],
      ['最小脉宽 low/high', (p.minPulseWidthLow != null || p.minPulseWidthHigh != null) ? fmtNum(p.minPulseWidthLow) + ' / ' + fmtNum(p.minPulseWidthHigh) : '—']
    ];
    return '<table class="data-table">' + rows.map(function (r) {
      return '<tr><th style="width:170px;background:var(--panel-2)">' + r[0] + '</th><td class="wrap">' + r[1] + '</td></tr>';
    }).join('') + '</table>';
  }

  function lutChip(cellName, pinName, arcIdx, tableKey, lut, isIp) {
    var dim = lut && lut.index1 ? (lut.index2 ? lut.index1.length + '×' + lut.index2.length : lut.index1.length + ' (1D)') : '';
    return '<span class="lut-chip" data-cell="' + esc(cellName) + '" data-pin="' + esc(pinName) + '"' +
      ' data-arc="' + (arcIdx == null ? '' : arcIdx) + '" data-table="' + esc(tableKey) + '"' +
      (isIp ? ' data-ip="1"' : '') + '>' +
      esc(tableKey) + '<span class="dim">' + dim + '</span></span>';
  }

  function arcBlocks(p, pinIdx, cellName) {
    if (!p.timing.length) return '';
    var html = '<div style="margin-top:8px">';
    p.timing.forEach(function (t, ai) {
      html += '<div class="arc-block"><div class="arc-head">' +
        '<span class="arc-rel">' + esc(p.name) + ' ← ' + esc(t.relatedPin || '?') + '</span>' +
        '<span class="badge gray">' + esc(t.timingType || '—') + '</span>' +
        (t.timingSense ? '<span class="badge gray">' + esc(t.timingSense) + '</span>' : '') +
        (t.when ? '<span class="when-expr">when: ' + esc(t.when) + '</span>' : '') +
        '</div><div class="arc-tables">';
      Object.keys(t.tables).forEach(function (k) {
        var tb = t.tables[k];
        if (tb && tb.index1) html += lutChip(cellName, p.name, ai, k, tb);
      });
      if (!Object.keys(t.tables).some(function (k) { return t.tables[k] && t.tables[k].index1; })) {
        html += '<span class="muted">该时序弧无 LUT 表</span>';
      }
      html += '</div></div>';
    });
    return html + '</div>';
  }

  /* ============================================================
   * LUT 图表
   * ============================================================ */
  function openLut(cellName, pinName, arcIdx, tableKey, direct) {
    state.lut = {
      cell: cellName, pin: pinName, arc: arcIdx || 0, table: tableKey,
      mode: state.lut.mode || 'heatmap', direct: direct || null
    };
    switchTab('lut');
    renderLutPanel();
  }

  function currentLutSelection() {
    var lib = activeLib();
    if (!lib) return null;
    var cell = null, pin = null, arc = null, table = null;
    for (var i = 0; i < lib.model.cells.length; i++) {
      if (lib.model.cells[i].name === state.lut.cell) { cell = lib.model.cells[i]; break; }
    }
    if (!cell) {
      // 默认: 第一个有时序弧的 cell
      for (var j = 0; j < lib.model.cells.length; j++) {
        var c = lib.model.cells[j];
        for (var k = 0; k < c.pins.length; k++) {
          if (c.pins[k].timing.length) { cell = c; state.lut.cell = c.name; break; }
        }
        if (cell) break;
      }
    }
    if (!cell) return null;
    for (var p = 0; p < cell.pins.length; p++) {
      if (cell.pins[p].name === state.lut.pin) { pin = cell.pins[p]; break; }
    }
    if (!pin) {
      for (var q = 0; q < cell.pins.length; q++) {
        if (cell.pins[q].timing.length || cell.pins[q].internalPower.length) { pin = cell.pins[q]; state.lut.pin = pin.name; break; }
      }
    }
    if (!pin) return null;

    // internal_power 直达表
    if (state.lut.direct && state.lut.direct.lut) {
      return {
        lib: lib, cell: cell, pin: pin,
        arc: {
          relatedPin: state.lut.direct.relatedPin || null,
          timingType: 'internal_power',
          timingSense: null,
          when: state.lut.direct.when || null,
          tables: {}
        },
        table: state.lut.direct.lut,
        direct: true
      };
    }

    if (!pin.timing.length) return null;
    if (!pin.timing[state.lut.arc]) state.lut.arc = 0;
    arc = pin.timing[state.lut.arc];
    if (!arc) return null;
    table = arc.tables[state.lut.table];
    if (!table) {
      var keys = Object.keys(arc.tables).filter(function (k) { return arc.tables[k] && arc.tables[k].index1; });
      if (!keys.length) return null;
      state.lut.table = keys[0];
      table = arc.tables[state.lut.table];
    }
    return { lib: lib, cell: cell, pin: pin, arc: arc, table: table };
  }

  function renderLutPanel() {
    var sel = currentLutSelection();
    var hint = $('lutEmptyHint');
    var wrap = $('lutChartWrap');
    var toolbar = $('lutToolbar');
    if (!sel) {
      hint.style.display = 'flex';
      hint.querySelector('p').textContent = activeLib() ? '所选单元没有可用的 LUT 查找表' : '请先加载库';
      wrap.style.display = 'none';
      toolbar.style.opacity = activeLib() ? 1 : .5;
      return;
    }
    hint.style.display = 'none';
    wrap.style.display = 'block';
    toolbar.style.opacity = 1;

    // 填充选择器
    fillSelect($('lutCell'), sel.lib.model.cells.map(function (c) { return c.name; }), sel.cell.name);
    var pinsWithArc = sel.cell.pins.filter(function (p) { return p.timing.length || p.internalPower.length; });
    fillSelect($('lutPin'), pinsWithArc.map(function (p) { return p.name; }), sel.pin.name);
    var arcLabels = sel.pin.timing.map(function (t, i) {
      return i + ': ' + sel.pin.name + ' ← ' + (t.relatedPin || '?') + ' [' + (t.timingType || '?') + ']';
    });
    if (!arcLabels.length) arcLabels = ['0: (internal_power)'];
    fillSelect($('lutArc'), arcLabels, arcLabels[state.lut.arc] || arcLabels[0]);
    var tableKeys;
    if (sel.direct) {
      tableKeys = [state.lut.table];
    } else {
      tableKeys = Object.keys(sel.arc.tables).filter(function (k) { return sel.arc.tables[k] && sel.arc.tables[k].index1; });
    }
    fillSelect($('lutTable'), tableKeys, state.lut.table);

    // 头部
    var u = sel.lib.model.units;
    var dim = sel.table.index2 ? sel.table.index1.length + ' × ' + sel.table.index2.length : sel.table.index1.length + ' (一维)';
    $('lutChartHead').innerHTML =
      '<span class="lut-chart-title">' + esc(sel.cell.name) + ' / ' + esc(sel.pin.name) + ' / ' + esc(state.lut.table) + '</span>' +
      '<span class="lut-chart-sub">' + esc(sel.pin.name) + ' ← ' + esc(sel.arc.relatedPin || '?') +
      ' · ' + esc(sel.arc.timingType || '') + (sel.arc.timingSense ? ' · ' + esc(sel.arc.timingSense) : '') +
      ' · 维度 ' + dim + ' · 模板 ' + esc(sel.table.template || '—') +
      ' · 单位 ' + esc(unitOf(u.time)) + ' · 负载单位 ' + esc(unitOf(u.capacitiveLoad)) + '</span>';

    drawLutChart(sel);
    renderLutMatrix(sel);
  }

  function fillSelect(sel, values, current) {
    sel.innerHTML = values.map(function (v) {
      return '<option value="' + esc(v) + '"' + (v === current ? ' selected' : '') + '>' + esc(v) + '</option>';
    }).join('');
  }

  function disposeChart(key) {
    if (state.charts[key]) { state.charts[key].dispose(); delete state.charts[key]; }
  }

  function drawLutChart(sel) {
    var el = $('chartHolder');
    disposeChart('lut');
    if (!window.echarts) { el.innerHTML = '<p class="muted">ECharts 未加载</p>'; return; }
    var t = sel.table;
    var capUnit = unitOf(sel.lib.model.units.capacitiveLoad) || 'pf';
    var timeUnit = unitOf(sel.lib.model.units.time) || 'ns';
    var chart = safeInit('chartHolder');
    if (!chart) { el.innerHTML = '<p class="muted">图表渲染失败</p>'; return; }
    state.charts.lut = chart;

    if (t.dim === 2 && t.index2) {
      var data = [];
      var flat = [];
      for (var i = 0; i < t.index1.length; i++) {
        for (var j = 0; j < t.index2.length; j++) {
          var v = (t.values[i] && t.values[i][j] != null) ? t.values[i][j] : null;
          if (v == null) continue;
          data.push([j, i, v]);
          flat.push(v);
        }
      }
      var vmin = Math.min.apply(null, flat), vmax = Math.max.apply(null, flat);
      var useSurface = state.lut.mode === 'surface' && glLoaded && hasGl();
      var surfaceOk = false;
      if (useSurface) {
        try {
          var sdata = [];
          for (var i2 = 0; i2 < t.index1.length; i2++) {
            for (var j2 = 0; j2 < t.index2.length; j2++) {
              var v2 = (t.values[i2] && t.values[i2][j2] != null) ? t.values[i2][j2] : null;
              if (v2 == null) continue;
              sdata.push([t.index2[j2], t.index1[i2], v2]);
            }
          }
          chart.setOption({
            tooltip: {
              formatter: function (p) {
                return '负载 ' + fmtNum(p.value[0]) + ' ' + capUnit + '<br>跳变 ' + fmtNum(p.value[1]) + ' ' + timeUnit +
                  '<br><b>' + state.lut.table + '</b>: ' + fmtNum(p.value[2]) + ' ' + timeUnit;
              }
            },
            xAxis3D: { type: 'value', name: '负载 C (' + capUnit + ')', nameTextStyle: { color: '#475569' }, axisLabel: { color: '#64748b' }, splitLine: { lineStyle: { color: '#eef2f7' } } },
            yAxis3D: { type: 'value', name: '输入跳变 (' + timeUnit + ')', nameTextStyle: { color: '#475569' }, axisLabel: { color: '#64748b' }, splitLine: { lineStyle: { color: '#eef2f7' } } },
            zAxis3D: { type: 'value', name: state.lut.table + ' (' + timeUnit + ')', nameTextStyle: { color: '#475569' }, axisLabel: { color: '#64748b' }, splitLine: { lineStyle: { color: '#eef2f7' } } },
            grid3D: {
              viewControl: { autoRotate: true, autoRotateSpeed: 8 },
              boxWidth: 120, boxDepth: 90,
              axisLine: { lineStyle: { color: '#cbd5e1' } },
              axisPointer: { lineStyle: { color: '#2563eb' } },
              environment: '#f8fafc'
            },
            visualMap: {
              min: vmin, max: vmax, calculable: true, dimension: 2,
              inRange: { color: ['#313695', '#4575b4', '#74add1', '#fee090', '#f46d43', '#a50026'] },
              textStyle: { color: '#475569' },
              left: 10, top: 'middle'
            },
            series: [{
              type: 'surface',
              data: sdata,
              shading: 'realistic',
              realisticMaterial: { roughness: .55, metalness: 0 },
              wireframe: { show: true, lineStyle: { color: 'rgba(100,116,139,.35)' } },
              itemStyle: { opacity: .96 }
            }]
          });
          surfaceOk = true;
        } catch (e) {
          surfaceOk = false;
          toast('3D 渲染不可用，已回退为热力图', 'error');
        }
      }
      if (!surfaceOk && state.lut.mode === 'surface') {
        toast('当前环境不支持 WebGL，已回退为热力图', 'error');
      }
      if (!surfaceOk) {
        chart.setOption({
          grid: { left: 70, right: 20, top: 16, bottom: 58 },
          tooltip: {
            formatter: function (p) {
              var i1 = t.index1[p.value[1]], i2 = t.index2[p.value[0]];
              return '输入跳变: <b>' + fmtNum(i1) + '</b> ' + timeUnit + '<br>负载: <b>' + fmtNum(i2) + '</b> ' + capUnit +
                '<br>' + state.lut.table + ': <b>' + fmtNum(p.value[2]) + '</b> ' + timeUnit;
            }
          },
          xAxis: {
            type: 'category', data: t.index2.map(function (v) { return fmtNum(v); }),
            name: '负载 C (' + capUnit + ')', nameLocation: 'middle', nameGap: 34,
            axisLabel: { fontSize: 9.5, color: '#64748b', rotate: 40 },
            splitLine: { show: true, lineStyle: { color: '#f1f5f9' } }
          },
          yAxis: {
            type: 'category', data: t.index1.map(function (v) { return fmtNum(v); }),
            name: '输入跳变 (' + timeUnit + ')', nameLocation: 'middle', nameGap: 46,
            axisLabel: { fontSize: 9.5, color: '#64748b' },
            splitLine: { show: true, lineStyle: { color: '#f1f5f9' } }
          },
          visualMap: {
            min: vmin, max: vmax, calculable: true, realtime: false,
            orient: 'horizontal', left: 'center', bottom: 0, itemWidth: 12, itemHeight: 110,
            precision: 3,
            text: [fmtNum(vmax), fmtNum(vmin)],
            textStyle: { color: '#475569', fontSize: 10 },
            inRange: { color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#fee090', '#f46d43', '#a50026'] }
          },
          series: [{
            type: 'heatmap',
            data: data,
            label: {
              show: t.index1.length * t.index2.length <= 64,
              fontSize: 8.5, color: '#1e293b',
              formatter: function (p) { return fmtNum(p.value[2]); }
            },
            itemStyle: { borderColor: '#fff', borderWidth: 1, borderRadius: 2 },
            emphasis: { itemStyle: { borderColor: '#0f172a', borderWidth: 1.5 } }
          }]
        });
      }
    } else {
      // 一维表
      var d1 = t.index1.map(function (v, i) { return [v, t.values[i]]; });
      chart.setOption({
        grid: { left: 64, right: 24, top: 22, bottom: 46 },
        tooltip: {
          trigger: 'axis',
          formatter: function (ps) {
            return '输入跳变: <b>' + fmtNum(ps[0].value[0]) + '</b> ' + timeUnit + '<br>' +
              state.lut.table + ': <b>' + fmtNum(ps[0].value[1]) + '</b> ' + timeUnit;
          }
        },
        xAxis: { type: 'value', name: '输入跳变 (' + timeUnit + ')', nameLocation: 'middle', nameGap: 28, axisLabel: { fontSize: 10, color: '#64748b' }, splitLine: { lineStyle: { color: '#eef2f7' } } },
        yAxis: { type: 'value', name: state.lut.table + ' (' + timeUnit + ')', axisLabel: { fontSize: 10, color: '#64748b' }, splitLine: { lineStyle: { color: '#eef2f7' } } },
        series: [{
          type: 'line', data: d1, smooth: .25, symbolSize: 7,
          lineStyle: { color: '#2563eb', width: 2.2 },
          itemStyle: { color: '#2563eb' },
          areaStyle: { color: 'rgba(37,99,235,.08)' },
          markPoint: {
            data: [
              { type: 'min', name: '最小' }, { type: 'max', name: '最大' }
            ],
            label: { fontSize: 9.5, color: '#fff' }
          }
        }]
      });
    }
    window.addEventListener('resize', chart.resize);
  }

  function hasGl() {
    try {
      var c = document.createElement('canvas');
      return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
    } catch (e) { return false; }
  }

  /* echarts-gl 懒加载: 仅在用户请求 3D 曲面时注入脚本 */
  var glLoaded = false, glLoading = false, glQueue = [];
  function ensureGl(cb) {
    if (glLoaded) { cb(true); return; }
    glQueue.push(cb);
    if (glLoading) return;
    glLoading = true;
    var done = function (ok) {
      glLoading = false;
      var q = glQueue; glQueue = [];
      q.forEach(function (f) { f(ok); });
    };
    var s = document.createElement('script');
    s.src = 'vendor/echarts-gl.min.js' + shareQs();
    s.onload = function () { glLoaded = true; done(true); };
    s.onerror = function () { done(false); };
    document.head.appendChild(s);
    // 兜底: 8s 未加载完成视为失败
    setTimeout(function () { if (glLoading) done(false); }, 8000);
  }

  function renderLutMatrix(sel) {
    var t = sel.table;
    var wrap = $('lutMatrixWrap');
    var html = '<div class="lut-section-title" style="font-size:12px;font-weight:700;margin:4px 0 8px">原始数据矩阵</div>';
    if (t.dim === 2 && t.index2) {
      html += '<table class="matrix-table"><tr><th>跳变 \\ 负载</th>' +
        t.index2.map(function (v) { return '<th>' + fmtNum(v) + '</th>'; }).join('') + '</tr>';
      var flat = [];
      t.values.forEach(function (r) { r.forEach(function (v) { if (v != null) flat.push(v); }); });
      var mn = Math.min.apply(null, flat), mx = Math.max.apply(null, flat);
      t.index1.forEach(function (i1v, i) {
        html += '<tr><th>' + fmtNum(i1v) + '</th>' +
          t.index2.map(function (_, j) {
            var v = t.values[i] ? t.values[i][j] : null;
            if (v == null) return '<td>—</td>';
            var cls = v === mx ? ' class="max"' : (v === mn ? ' class="min"' : '');
            return '<td' + cls + '>' + fmtNum(v) + '</td>';
          }).join('') + '</tr>';
      });
      html += '</table>';
      html += '<p style="font-size:11px;color:var(--muted);margin-top:6px">绿色 = 最小值 ' + fmtNum(mn) + ' · 红色 = 最大值 ' + fmtNum(mx) + '</p>';
    } else {
      html += '<table class="matrix-table"><tr><th>输入跳变</th><th>' + esc(state.lut.table) + '</th></tr>' +
        t.index1.map(function (v, i) {
          return '<tr><th>' + fmtNum(v) + '</th><td>' + fmtNum(t.values[i]) + '</td></tr>';
        }).join('') + '</table>';
    }
    wrap.innerHTML = html;
  }

  function exportLutCsv() {
    var sel = currentLutSelection();
    if (!sel) { toast('没有可导出的查找表', 'error'); return; }
    var t = sel.table;
    var lines = [];
    if (t.dim === 2 && t.index2) {
      lines.push(['transition\\load'].concat(t.index2).join(','));
      t.index1.forEach(function (i1v, i) {
        lines.push([i1v].concat(t.index2.map(function (_, j) { return t.values[i] ? t.values[i][j] : ''; })).join(','));
      });
    } else {
      lines.push('transition,' + state.lut.table);
      t.index1.forEach(function (v, i) { lines.push(v + ',' + t.values[i]); });
    }
    var name = sel.cell.name + '__' + sel.pin.name + '__' + state.lut.table + '.csv';
    downloadText(lines.join('\n'), name);
    toast('已导出 ' + name, 'success');
  }

  function exportCellListCsv() {
    var lib = activeLib();
    if (!lib) return;
    var rows = [['cell', 'type', 'area', 'cell_leakage_power', 'num_pins', 'pg_pins', 'num_arcs', 'dont_use']];
    lib.model.cells.forEach(function (c) {
      var arcs = 0;
      c.pins.forEach(function (p) { arcs += p.timing.length; });
      rows.push([c.name, c.isSequential ? 'sequential' : 'combinational', c.area, c.cellLeakage, c.pins.length, c.pgPins.length, arcs, c.dontUse]);
    });
    downloadText(rows.map(function (r) { return r.join(','); }).join('\n'), lib.name + '__cells.csv');
    toast('已导出单元列表 CSV', 'success');
  }

  function downloadText(text, name, bom) {
    var data = (bom === false ? text : '\ufeff' + text);
    var blob = new Blob([data], { type: 'application/octet-stream' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ============================================================
   * 单元对比 (库内 / 跨库)
   * ============================================================ */
  function findLibById(id) {
    for (var i = 0; i < state.libs.length; i++) if (state.libs[i].id === id) return state.libs[i];
    return null;
  }
  function findCell(lib, name) {
    if (!lib) return null;
    for (var i = 0; i < lib.model.cells.length; i++) if (lib.model.cells[i].name === name) return lib.model.cells[i];
    return null;
  }

  function addCompareItem(libId, cellName) {
    if (!libId || !cellName) return;
    var dup = state.compare.items.some(function (it) { return it.libId === libId && it.cellName === cellName; });
    if (dup) { toast('该单元已在对比列表中', 'error'); return; }
    if (state.compare.items.length >= 8) { toast('对比列表最多 8 项，请先移除部分', 'error'); return; }
    state.compare.items.push({ libId: libId, cellName: cellName });
    toast('已加入对比（' + state.compare.items.length + ' 项）', 'success');
    renderComparePanel();
    switchTab('compare');
  }
  function removeCompareItem(idx) {
    state.compare.items.splice(idx, 1);
    renderComparePanel();
  }
  function clearCompare() {
    state.compare.items = [];
    state.compare.lut = { pin: null, rel: null, table: null, load: 0.05 };
    renderComparePanel();
  }

  function cmpItems() {
    return state.compare.items.map(function (it) {
      var lib = findLibById(it.libId);
      var cell = findCell(lib, it.cellName);
      return { lib: lib, cell: cell, libId: it.libId, cellName: it.cellName };
    }).filter(function (x) { return x.lib && x.cell; });
  }

  function renderComparePanel() {
    var hint = $('cmpEmptyHint');
    var content = $('compareContent');
    var items = cmpItems();
    if (!items.length) {
      hint.style.display = 'flex';
      content.style.display = 'none';
      fillCompareAddSelectors();
      return;
    }
    hint.style.display = 'none';
    content.style.display = 'block';

    $('cmpCount').textContent = items.length + ' 项';
    fillCompareAddSelectors();

    /* chips */
    var chipsHtml = items.map(function (it, i) {
      return '<span class="cmp-chip">' + esc(it.lib.name) + ' / ' + esc(it.cell.name) +
        '<span class="cmp-chip-x" data-idx="' + i + '">×</span></span>';
    }).join('');
    $('cmpChips').innerHTML = chipsHtml;
    Array.prototype.forEach.call($('cmpChips').querySelectorAll('.cmp-chip-x'), function (x) {
      x.addEventListener('click', function () { removeCompareItem(parseInt(x.dataset.idx, 10)); });
    });

    renderCompareAttr(items);
    renderComparePins(items);
    renderCompareArcs(items);
    renderCompareLut(items);
  }

  function fillCompareAddSelectors() {
    var libSel = $('cmpLib');
    if (!libSel) return;
    libSel.innerHTML = state.libs.map(function (l) {
      return '<option value="' + l.id + '"' + (l.id === state.activeId ? ' selected' : '') + '>' + esc(l.name) + '</option>';
    }).join('');
    var libId = libSel.value;
    var lib = findLibById(libId);
    var cellSel = $('cmpCell');
    if (!lib) { cellSel.innerHTML = ''; return; }
    cellSel.innerHTML = lib.model.cells.map(function (c) {
      return '<option value="' + esc(c.name) + '">' + esc(c.name) + '</option>';
    }).join('');
  }

  function cmpCellLabel(it) {
    return esc(it.cell.name) + '<br><span class="cmp-lib-sub">' + esc(it.lib.name) + '</span>';
  }

  function renderCompareAttr(items) {
    var rows = [
      ['库名', function (it) { return esc(it.lib.name); }],
      ['cell 名', function (it) { return '<span class="mono">' + esc(it.cell.name) + '</span>'; }],
      ['面积 area', function (it) { return it.cell.area != null ? fmtNum(it.cell.area, 4) : '—'; }],
      ['漏电 cell_leakage', function (it) { return it.cell.cellLeakage != null ? fmtNum(it.cell.cellLeakage, 4) : '—'; }],
      ['类型', function (it) { return it.cell.isSequential ? '时序' : '组合'; }],
      ['引脚数', function (it) { return it.cell.pins.length; }],
      ['PG pin 数', function (it) { return it.cell.pgPins.length; }],
      ['时序弧数', function (it) { var n = 0; it.cell.pins.forEach(function (p) { n += p.timing.length; }); return n; }],
      ['drive_strength', function (it) { return it.cell.driveStrength != null ? it.cell.driveStrength : '—'; }],
      ['cell_footprint', function (it) { return esc(it.cell.cellFootprint || '—'); }],
      ['dont_use', function (it) { return it.cell.dontUse ? 'true' : 'false'; }],
      ['dont_touch', function (it) { return it.cell.dontTouch ? 'true' : 'false'; }],
      ['leakage_groups', function (it) { return it.cell.leakageGroups.length; }],
      ['seq_elements', function (it) { return it.cell.seqElements.length; }],
      ['标称电压 V', function (it) { return it.lib.model.nomVoltage != null ? it.lib.model.nomVoltage : '—'; }],
      ['标称温度 °C', function (it) { return it.lib.model.nomTemperature != null ? it.lib.model.nomTemperature : '—'; }],
      ['time_unit', function (it) { return esc(it.lib.model.units.time || '—'); }],
      ['负载单位', function (it) { return esc(it.lib.model.units.capacitiveLoad || '—'); }]
    ];
    var html = '<table class="data-table cmp-table"><tr><th>属性</th>';
    items.forEach(function (it) { html += '<th>' + cmpCellLabel(it) + '</th>'; });
    html += '</tr>';
    rows.forEach(function (r) {
      var vals = items.map(r[1]);
      var allSame = vals.length > 1 && vals.every(function (v) { return String(v) === String(vals[0]); });
      html += '<tr><th>' + esc(r[0]) + '</th>';
      vals.forEach(function (v) {
        var cls = vals.length > 1 ? (allSame ? ' class="cmp-same"' : ' class="cmp-diff"') : '';
        html += '<td' + cls + '>' + v + '</td>';
      });
      html += '</tr>';
    });
    html += '</table>';
    $('cmpAttrWrap').innerHTML = html;
  }

  function renderComparePins(items) {
    var pinSet = {};
    items.forEach(function (it) {
      it.cell.pins.forEach(function (p) { pinSet[p.name] = true; });
    });
    var pinNames = Object.keys(pinSet).sort();
    if (!pinNames.length) { $('cmpPinWrap').innerHTML = '<p class="muted">无引脚</p>'; return; }
    var html = '<table class="data-table cmp-table"><tr><th>Pin</th>';
    items.forEach(function (it) { html += '<th>' + cmpCellLabel(it) + '</th>'; });
    html += '</tr>';
    pinNames.forEach(function (pn) {
      html += '<tr><th>' + esc(pn) + '</th>';
      items.forEach(function (it) {
        var p = null;
        for (var i = 0; i < it.cell.pins.length; i++) if (it.cell.pins[i].name === pn) { p = it.cell.pins[i]; break; }
        if (!p) { html += '<td class="cmp-miss">—</td>'; return; }
        var info = dirBadge(p.direction) +
          (p.clock ? ' <span class="badge amber">clk</span>' : '') +
          (p.function ? ' <span class="fn-expr">' + esc(p.function) + '</span>' : '') +
          (p.capacitance != null ? ' <span class="badge gray mono">C=' + fmtNum(p.capacitance) + '</span>' : '');
        html += '<td>' + info + '</td>';
      });
      html += '</tr>';
    });
    html += '</table>';
    $('cmpPinWrap').innerHTML = html;
  }

  function renderCompareArcs(items) {
    var arcSet = {};
    items.forEach(function (it) {
      it.cell.pins.forEach(function (p) {
        p.timing.forEach(function (t) {
          var key = p.name + ' ← ' + (t.relatedPin || '?');
          arcSet[key] = true;
        });
      });
    });
    var keys = Object.keys(arcSet).sort();
    if (!keys.length) { $('cmpArcWrap').innerHTML = '<p class="muted">无时序弧</p>'; return; }
    var html = '<table class="data-table cmp-table"><tr><th>时序弧</th>';
    items.forEach(function (it) { html += '<th>' + cmpCellLabel(it) + '</th>'; });
    html += '</tr>';
    keys.forEach(function (k) {
      var parts = k.split(' ← ');
      var pinName = parts[0], relName = parts[1];
      html += '<tr><th>' + esc(pinName) + ' ← ' + esc(relName) + '</th>';
      items.forEach(function (it) {
        var arc = null;
        for (var i = 0; i < it.cell.pins.length; i++) {
          if (it.cell.pins[i].name !== pinName) continue;
          for (var j = 0; j < it.cell.pins[i].timing.length; j++) {
            if (it.cell.pins[i].timing[j].relatedPin === relName) { arc = it.cell.pins[i].timing[j]; break; }
          }
        }
        if (!arc) { html += '<td class="cmp-miss">—</td>'; return; }
        var tabs = Object.keys(arc.tables).filter(function (kk) { return arc.tables[kk] && arc.tables[kk].index1; });
        html += '<td><span class="badge gray">' + esc(arc.timingType || '—') + '</span>' +
          (arc.timingSense ? ' <span class="badge gray">' + esc(arc.timingSense) + '</span>' : '') +
          ' <span class="badge purple mono">' + tabs.length + ' 表</span></td>';
      });
      html += '</tr>';
    });
    html += '</table>';
    $('cmpArcWrap').innerHTML = html;
  }

  /* 收集所有对比项共有的 pin / related_pin / table 选项 */
  function cmpLutOptions(items) {
    var pinSet = {}, relSet = {}, tabSet = {};
    items.forEach(function (it) {
      it.cell.pins.forEach(function (p) {
        if (!p.timing.length) return;
        pinSet[p.name] = true;
        p.timing.forEach(function (t) {
          relSet[t.relatedPin || '?'] = true;
          Object.keys(t.tables).forEach(function (k) { if (t.tables[k] && t.tables[k].index1) tabSet[k] = true; });
        });
      });
    });
    return { pins: Object.keys(pinSet).sort(), rels: Object.keys(relSet).sort(), tables: Object.keys(tabSet).sort() };
  }

  function findCmpLut(it, pinName, relName, tableName) {
    for (var i = 0; i < it.cell.pins.length; i++) {
      if (it.cell.pins[i].name !== pinName) continue;
      var p = it.cell.pins[i];
      for (var j = 0; j < p.timing.length; j++) {
        if (p.timing[j].relatedPin !== relName) continue;
        var tb = p.timing[j].tables[tableName];
        if (tb && tb.index1) return { arc: p.timing[j], table: tb };
      }
    }
    return null;
  }

  /* 一维线性插值: 在 xs/ys 中找 x 对应的 y */
  function interp1(xs, ys, x) {
    var n = xs.length;
    if (!n) return null;
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    for (var i = 0; i < n - 1; i++) {
      if (x >= xs[i] && x <= xs[i + 1]) {
        var t = (x - xs[i]) / (xs[i + 1] - xs[i]);
        return ys[i] + t * (ys[i + 1] - ys[i]);
      }
    }
    return ys[n - 1];
  }

  /* 对二维 LUT 在固定负载处插值, 返回 transition -> value 一维曲线 */
  function lutSliceAtLoad(table, load) {
    if (!table || !table.index1 || !table.index2) return null;
    var trans = table.index1;
    var loads = table.index2;
    var out = [];
    for (var i = 0; i < trans.length; i++) {
      var row = table.values[i];
      if (!row) { out.push(null); continue; }
      var v = interp1(loads, row, load);
      out.push(v);
    }
    return { trans: trans, vals: out };
  }

  function renderCompareLut(items) {
    var opts = cmpLutOptions(items);
    var pinSel = $('cmpLutPin'), relSel = $('cmpLutRel'), tabSel = $('cmpLutTable');
    fillSelect(pinSel, opts.pins, state.compare.lut.pin || opts.pins[0]);
    fillSelect(relSel, opts.rels, state.compare.lut.rel || opts.rels[0]);
    fillSelect(tabSel, opts.tables, state.compare.lut.table || opts.tables[0]);
    state.compare.lut.pin = pinSel.value;
    state.compare.lut.rel = relSel.value;
    state.compare.lut.table = tabSel.value;
    drawCompareLutChart(items);
  }

  var CMP_COLORS = ['#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#0ea5e9', '#db2777', '#16a34a'];

  function drawCompareLutChart() {
    var items = cmpItems();
    var el = $('cmpChartHolder');
    if (!el) return;
    disposeChart('cmpLut');
    if (!window.echarts || !items.length) { el.innerHTML = '<p class="muted">无数据</p>'; return; }
    var pinName = state.compare.lut.pin, relName = state.compare.lut.rel, tableName = state.compare.lut.table;
    var load = parseFloat($('cmpLutLoad').value) || 0;
    if (!pinName || !relName || !tableName) { el.innerHTML = '<p class="muted">请选择 pin / related_pin / 查找表</p>'; return; }

    var series = [];
    var allTrans = [];
    var legend = [];
    items.forEach(function (it, idx) {
      var r = findCmpLut(it, pinName, relName, tableName);
      if (!r) return;
      var slice = lutSliceAtLoad(r.table, load);
      if (!slice) return;
      var data = [];
      for (var i = 0; i < slice.trans.length; i++) {
        if (slice.vals[i] == null) continue;
        data.push([slice.trans[i], slice.vals[i]]);
        if (allTrans.indexOf(slice.trans[i]) < 0) allTrans.push(slice.trans[i]);
      }
      var label = it.cell.name + ' @ ' + it.lib.name;
      legend.push(label);
      series.push({
        name: label,
        type: 'line',
        data: data,
        smooth: .2,
        symbolSize: 6,
        lineStyle: { color: CMP_COLORS[idx % CMP_COLORS.length], width: 2.2 },
        itemStyle: { color: CMP_COLORS[idx % CMP_COLORS.length] }
      });
    });

    if (!series.length) {
      el.innerHTML = '<p class="muted">所选 pin/related_pin/表 在对比项中无匹配的 LUT</p>';
      $('cmpLutNote').textContent = '';
      return;
    }

    var refLib = items[0].lib;
    var timeUnit = unitOf(refLib.model.units.time) || 'ns';
    var capUnit = unitOf(refLib.model.units.capacitiveLoad) || 'pf';
    $('cmpLutNote').textContent = '负载 = ' + fmtNum(load) + ' ' + capUnit + ' · ' + series.length + ' 条曲线 · X: 输入跳变 ' + timeUnit + ' · Y: ' + tableName + ' ' + timeUnit;

    var chart = safeInit('cmpChartHolder');
    if (!chart) { el.innerHTML = '<p class="muted">图表渲染失败</p>'; return; }
    state.charts.cmpLut = chart;
    chart.setOption({
      grid: { left: 70, right: 24, top: 50, bottom: 56 },
      legend: { data: legend, top: 6, textStyle: { fontSize: 11, color: '#475569' }, type: 'scroll' },
      tooltip: {
        trigger: 'axis',
        formatter: function (ps) {
          var s = '输入跳变: <b>' + fmtNum(ps[0].value[0]) + '</b> ' + timeUnit + '<br>负载: ' + fmtNum(load) + ' ' + capUnit;
          ps.forEach(function (p) { s += '<br>' + p.marker + esc(p.seriesName) + ': <b>' + fmtNum(p.value[1]) + '</b> ' + timeUnit; });
          return s;
        }
      },
      xAxis: { type: 'value', name: '输入跳变 (' + timeUnit + ')', nameLocation: 'middle', nameGap: 28, axisLabel: { fontSize: 10, color: '#64748b' }, splitLine: { lineStyle: { color: '#eef2f7' } } },
      yAxis: { type: 'value', name: tableName + ' (' + timeUnit + ')', axisLabel: { fontSize: 10, color: '#64748b' }, splitLine: { lineStyle: { color: '#eef2f7' } } },
      series: series
    });
    window.addEventListener('resize', chart.resize);
  }

  /* ============================================================
   * 源码提取 / JSON 清洗
   * ============================================================ */
  function extractCellSource(rawText, cellName) {
    var re = new RegExp('cell\\s*\\(\\s*(?:"' + escRe(cellName) + '"|' + escRe(cellName) + ')\\s*\\)');
    var m = re.exec(rawText);
    if (!m) return null;
    var i = rawText.indexOf('{', m.index);
    if (i < 0) return null;
    var depth = 0, inStr = false, start = m.index;
    for (; i < rawText.length; i++) {
      var c = rawText[i];
      if (inStr) {
        if (c === '\\') i++;
        else if (c === '"') inStr = false;
        continue;
      }
      if (c === '"') { inStr = true; continue; }
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) return rawText.slice(start, i + 1);
      }
    }
    return rawText.slice(start);
  }

  /* ============================================================
   * Tab / 事件绑定
   * ============================================================ */
  function switchTab(name) {
    state.tab = name;
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (t) {
      t.classList.toggle('active', t.dataset.tab === name);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.tab-panel'), function (p) {
      p.classList.toggle('active', p.id === 'panel-' + name);
    });
    // LUT 面板从隐藏变为可见时, 重算图表尺寸
    if (name === 'lut' && state.charts.lut) {
      try { state.charts.lut.resize(); } catch (e) { /* noop */ }
    }
    if (name === 'compare' && state.charts.cmpLut) {
      try { state.charts.cmpLut.resize(); } catch (e) { /* noop */ }
    }
  }

  function bindEvents() {
    // tabs
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (t) {
      t.addEventListener('click', function () { switchTab(t.dataset.tab); });
    });

    // 库选择
    $('libSelector').addEventListener('change', function () {
      setActiveLib(this.value);
    });

    // 上传
    $('btnUpload').addEventListener('click', function () { $('fileInput').click(); });
    $('fileInput').addEventListener('change', function () { if (this.files.length) loadFiles(this.files); this.value = ''; });

    // 保存当前库为 .lib
    $('btnSaveLib').addEventListener('click', saveCurrentLib);

    // 下载模态框
    $('btnDownload').addEventListener('click', openDownloadModal);
    $('btnCloseModal').addEventListener('click', closeDownloadModal);
    $('downloadModal').addEventListener('click', function (e) { if (e.target === this) closeDownloadModal(); });
    $('btnFetchUrl').addEventListener('click', function () {
      var url = $('customUrl').value.trim();
      if (!url) { toast('请输入 URL', 'error'); return; }
      var name = $('customName').value.trim() || url.split('/').pop();
      $('downloadStatus').textContent = '正在抓取 ' + url + ' …';
      loadFromUrl({ id: 'custom-' + Date.now(), name: name, url: url });
      closeDownloadModal();
    });

    // 单元搜索 / 过滤 / 排序
    $('cellSearch').addEventListener('input', function () {
      state.cellFilter.search = this.value; state.page = 0; renderCellList();
    });
    $('cellTypeFilter').addEventListener('change', function () {
      state.cellFilter.type = this.value; state.page = 0; renderCellList();
    });
    $('cellSort').addEventListener('change', function () {
      state.cellFilter.sort = this.value; state.page = 0; renderCellList();
    });
    $('btnPrevPage').addEventListener('click', function () { state.page--; renderCellList(); });
    $('btnNextPage').addEventListener('click', function () { state.page++; renderCellList(); });

    // 单元列表点击
    $('cellList').addEventListener('click', function (e) {
      var item = e.target.closest ? e.target.closest('.cell-item') : null;
      if (!item) return;
      state.selectedCell = item.dataset.cell;
      state.lut.cell = state.selectedCell;
      renderCellList();
      renderCellDetail();
      switchTab('cell');
    });

    // LUT 选择器
    $('lutCell').addEventListener('change', function () {
      state.lut.cell = this.value; state.lut.pin = null; state.lut.arc = 0;
      state.lut.direct = null;
      renderLutPanel();
    });
    $('lutPin').addEventListener('change', function () {
      state.lut.pin = this.value; state.lut.arc = 0; state.lut.direct = null; renderLutPanel();
    });
    $('lutArc').addEventListener('change', function () {
      state.lut.arc = parseInt(String(this.value).split(':')[0], 10) || 0;
      state.lut.direct = null;
      renderLutPanel();
    });
    $('lutTable').addEventListener('change', function () {
      state.lut.table = this.value; renderLutPanel();
    });

    // LUT 动作
    $('btnLutHeatmap').addEventListener('click', function () {
      state.lut.mode = 'heatmap'; renderLutPanel();
    });
    $('btnLutSurface').addEventListener('click', function () {
      if (!hasGl()) {
        state.lut.mode = 'heatmap';
        renderLutPanel();
        toast('当前环境不支持 WebGL，已回退为热力图', 'error');
        return;
      }
      state.lut.mode = 'surface';
      if (glLoaded) { renderLutPanel(); return; }
      toast('正在加载 3D 组件…');
      ensureGl(function (ok) {
        if (!ok) {
          state.lut.mode = 'heatmap';
          toast('3D 组件加载失败，已回退为热力图', 'error');
        }
        renderLutPanel();
      });
    });
    $('btnLutCsv').addEventListener('click', exportLutCsv);

    // 对比面板
    $('cmpLib').addEventListener('change', function () { fillCompareAddSelectors(); });
    $('btnCmpAdd').addEventListener('click', function () {
      var libId = $('cmpLib').value;
      var cellName = $('cmpCell').value;
      if (!libId || !cellName) { toast('请先选择库与 cell', 'error'); return; }
      addCompareItem(libId, cellName);
    });
    $('btnCmpClear').addEventListener('click', clearCompare);
    $('cmpLutPin').addEventListener('change', function () { state.compare.lut.pin = this.value; drawCompareLutChart(); });
    $('cmpLutRel').addEventListener('change', function () { state.compare.lut.rel = this.value; drawCompareLutChart(); });
    $('cmpLutTable').addEventListener('change', function () { state.compare.lut.table = this.value; drawCompareLutChart(); });
    $('cmpLutLoad').addEventListener('input', function () { state.compare.lut.load = parseFloat(this.value) || 0; drawCompareLutChart(); });

    // 取消加载
    $('btnCancelLoad').addEventListener('click', cancelLoading);

    // 窗口缩放
    window.addEventListener('resize', function () {
      Object.keys(state.charts).forEach(function (k) {
        try { state.charts[k].resize(); } catch (e) { /* noop */ }
      });
    });
  }

  /* ---------- 下载模态框 ---------- */
  function openDownloadModal() {
    var list = $('catalogList');
    /* 按 group 分组渲染 */
    var groups = [];
    var groupMap = {};
    CATALOG.forEach(function (item) {
      var g = item.group || '其它';
      if (!groupMap[g]) { groupMap[g] = []; groups.push(g); }
      groupMap[g].push(item);
    });
    var html = '';
    groups.forEach(function (g) {
      html += '<div class="catalog-group"><div class="catalog-group-title">' + esc(g) +
        ' <span class="catalog-group-count">' + groupMap[g].length + '</span></div>';
      groupMap[g].forEach(function (item) {
        var loaded = !!state.loadedCatalog[item.id] ||
          state.libs.some(function (l) { return l.model.name === item.node; });
        if (loaded) state.loadedCatalog[item.id] = true;
        html += '<div class="catalog-item' + (loaded ? ' loaded' : '') + '" data-id="' + item.id + '">' +
          '<div class="catalog-info"><div class="catalog-name">' + esc(item.name) +
          (loaded ? '<span class="badge green">已加载</span>' : '') +
          (item.gz ? '<span class="badge amber">gz</span>' : '') +
          '</div>' +
          '<div class="catalog-desc">' + esc(item.desc) + '</div>' +
          '<div class="catalog-node">library: ' + esc(item.node) + ' · ' + esc(item.bundled || item.url) + '</div></div>' +
          (loaded
            ? '<button class="btn btn-sm" disabled>已加载</button>'
            : (item.bundled
              ? '<button class="btn btn-primary btn-sm" data-act="bundled">本地加载</button>'
              : '<button class="btn btn-primary btn-sm" data-act="url">下载</button>')) +
          '</div>';
      });
      html += '</div>';
    });
    list.innerHTML = html;
    Array.prototype.forEach.call(list.querySelectorAll('button'), function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.parentElement.dataset.id;
        var item = CATALOG.filter(function (x) { return x.id === id; })[0];
        if (btn.dataset.act === 'bundled') loadBundled(item);
        else loadFromUrl(item);
        closeDownloadModal();
      });
    });
    $('downloadModal').style.display = 'flex';
  }
  function closeDownloadModal() { $('downloadModal').style.display = 'none'; }

  /* ============================================================
   * 启动
   * ============================================================ */
  function init() {
    bindEvents();
    // 图表引擎 (echarts) 体积大且可能晚于主程序到达 —— 到达后自动重绘当前面板
    window.addEventListener('echartsready', function () {
      var lib = activeLib();
      if (!lib) return;
      if (state.tab === 'overview') renderOverview();
      else if (state.tab === 'lut') renderLutPanel();
      else if (state.tab === 'compare') drawCompareLutChart();
    });
    // 尝试通过 file:// 检测并提示
    if (location.protocol === 'file:') {
      toast('提示: file:// 模式下无法加载内置库文件，请用本地 HTTP 服务器启动（见 README）', 'error');
    }
    // 接收生成器送回的 .lib 文本 (sessionStorage 暂存)
    pickupPendingLib();
  }

  function pickupPendingLib() {
    try {
      var text = sessionStorage.getItem('__gen_lib__');
      if (!text) return;
      var name = sessionStorage.getItem('__gen_lib_name__') || 'generated.lib';
      sessionStorage.removeItem('__gen_lib__');
      sessionStorage.removeItem('__gen_lib_name__');
      addLibrary(name, text, '生成器送回');
    } catch (e) { /* sessionStorage 不可用时静默 */ }
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
