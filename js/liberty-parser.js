/*
 * liberty-parser.js
 * Liberty (.lib) 语法解析器 + 分析模型层
 * 支持: NLDM (table_lookup) / CCS / ECSM 常见结构
 * 同时运行于浏览器 (window.Liberty) 与 Node (module.exports)
 *
 * v2: tokenizer 改用类型化数组 (Uint8Array/Int32Array) 平铺存储,
 *     避免百万级 token 对象分配; 新增 stripRaw / tokenCount。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Liberty = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ============================================================
   * 0. Token 类型常量与字符分类表
   * ============================================================ */
  var T_WORD = 0, T_STR = 1, T_LBRACE = 2, T_RBRACE = 3,
      T_LPAREN = 4, T_RPAREN = 5, T_COLON = 6, T_SEMI = 7, T_COMMA = 8;

  // 字符分类: 0=普通 1=空白 2=特殊符号 9=引号 10=反斜杠 11=斜杠
  var CH = new Uint8Array(128);
  (function () {
    var ws = [32, 9, 10, 13, 12, 11];
    for (var i = 0; i < ws.length; i++) CH[ws[i]] = 1;
    CH[123] = 2; CH[125] = 2; CH[40] = 2; CH[41] = 2;
    CH[58] = 2; CH[59] = 2; CH[44] = 2;
    CH[34] = 9;
    CH[92] = 10;
    CH[47] = 11;
  })();
  var SPECIAL_CODE = {};
  SPECIAL_CODE[123] = T_LBRACE; SPECIAL_CODE[125] = T_RBRACE;
  SPECIAL_CODE[40] = T_LPAREN; SPECIAL_CODE[41] = T_RPAREN;
  SPECIAL_CODE[58] = T_COLON; SPECIAL_CODE[59] = T_SEMI; SPECIAL_CODE[44] = T_COMMA;

  /* ============================================================
   * 1. Tokenizer (平铺数组输出)
   * ============================================================ */
  function tokenize(text) {
    var n = text.length;
    var cap = 1 << 16;
    var types = new Uint8Array(cap);
    var lines = new Int32Array(cap);
    var vals = new Array(cap);
    var count = 0;
    var i = 0, line = 1;

    function ensure() {
      if (count < cap) return;
      var ncap = cap * 2;
      var nt = new Uint8Array(ncap); nt.set(types.subarray(0, count)); types = nt;
      var nl = new Int32Array(ncap); nl.set(lines.subarray(0, count)); lines = nl;
      var nv = new Array(ncap);
      for (var k = 0; k < count; k++) nv[k] = vals[k];
      vals = nv; cap = ncap;
    }
    function push(t, v, ln) {
      ensure();
      types[count] = t; vals[count] = v; lines[count] = ln; count++;
    }

    while (i < n) {
      var c = text.charCodeAt(i);
      var k = c < 128 ? CH[c] : 0;

      if (k === 1) {                       // 空白
        if (c === 10) line++;
        i++;
        continue;
      }
      if (k === 2) {                       // 特殊符号
        push(SPECIAL_CODE[c], text[i], line);
        i++;
        continue;
      }
      if (k === 9) {                       // 字符串
        var j = i + 1, buf = '';
        while (j < n) {
          var cj = text.charCodeAt(j);
          if (cj === 34) break;
          if (cj === 92 && j + 1 < n) { buf += text[j + 1]; j += 2; }
          else { if (cj === 10) line++; buf += text[j]; j++; }
        }
        push(T_STR, buf, line);
        i = j + 1;
        continue;
      }
      if (k === 10) {                      // 反斜杠: 行续接?
        var m = i + 1;
        while (m < n) {
          var cm = text.charCodeAt(m);
          if (cm === 32 || cm === 9 || cm === 13) m++; else break;
        }
        if (m < n && text.charCodeAt(m) === 10) { i = m + 1; line++; continue; }
        // 非续接, 按普通字符进入词扫描
      }
      if (k === 11) {                      // 斜杠: 注释?
        var c1 = i + 1 < n ? text.charCodeAt(i + 1) : 0;
        if (c1 === 42) {                   // 块注释
          i += 2;
          while (i < n && !(text.charCodeAt(i) === 42 && i + 1 < n && text.charCodeAt(i + 1) === 47)) {
            if (text.charCodeAt(i) === 10) line++;
            i++;
          }
          i += 2;
          continue;
        }
        if (c1 === 47) {                   // 行注释
          while (i < n && text.charCodeAt(i) !== 10) i++;
          continue;
        }
        // 非注释, 按普通字符进入词扫描
      }

      // 词法单元
      var s = i;
      while (i < n) {
        var cc = text.charCodeAt(i);
        if (cc < 128) {
          var kk = CH[cc];
          if (kk === 1 || kk === 2 || kk === 9) break;
          if (kk === 11) {
            var nx = i + 1 < n ? text.charCodeAt(i + 1) : 0;
            if (nx === 42 || nx === 47) break;
          } else if (kk === 10) {
            var mm = i + 1;
            while (mm < n) {
              var cmm = text.charCodeAt(mm);
              if (cmm === 32 || cmm === 9 || cmm === 13) mm++; else break;
            }
            if (mm < n && text.charCodeAt(mm) === 10) break;
          }
        }
        i++;
      }
      if (i === s) { i++; continue; }      // 防御
      push(T_WORD, text.slice(s, i), line);
    }
    return { types: types, vals: vals, lines: lines, count: count };
  }

  /* ============================================================
   * 2. Parser (AST)
   * ============================================================ */
  function Parser(text) {
    var tk = tokenize(text);
    this.text = text;
    this.types = tk.types;
    this.vals = tk.vals;
    this.lines = tk.lines;
    this.n = tk.count;
    this.pos = 0;
    this.tokenCount = tk.count;
  }

  Parser.prototype.expect = function (t) {
    if (this.pos >= this.n || this.types[this.pos] !== t) {
      var got = this.pos < this.n ? this.vals[this.pos] : 'EOF';
      throw new Error('Liberty 解析错误: 期望 token ' + t + ' 但得到 "' + got +
        '" (第 ' + (this.pos < this.n ? this.lines[this.pos] : '?') + ' 行)');
    }
    this.pos++;
  };

  /* 从 pos+1 处的 '(' 扫描到匹配 ')', 返回其后一个 token 类型;
     用于区分 group 与带括号属性值 */
  Parser.prototype.tokenAfterMatchingParen = function () {
    var p = this.pos + 1;
    if (p >= this.n || this.types[p] !== T_LPAREN) return -1;
    var depth = 0;
    while (p < this.n) {
      var t = this.types[p];
      if (t === T_LPAREN) depth++;
      else if (t === T_RPAREN) {
        depth--;
        if (depth === 0) return (p + 1 < this.n) ? this.types[p + 1] : -1;
      }
      p++;
    }
    return -1;
  };

  /* 读取 '(' ... ')' 内的名称列表 (group 头用) */
  Parser.prototype.readNameItems = function () {
    var items = [];
    while (this.pos < this.n && this.types[this.pos] !== T_RPAREN) {
      if (this.types[this.pos] === T_COMMA) { this.pos++; continue; }
      items.push(this.vals[this.pos]);
      this.pos++;
    }
    return items;
  };

  Parser.prototype.parseValue = function () {
    if (this.pos >= this.n) return null;
    var t = this.types[this.pos];
    if (t === T_STR) {
      var v = this.vals[this.pos];
      this.pos++;
      return { s: v };
    }
    if (t === T_LPAREN) {
      this.pos++;
      var items = [];
      while (this.pos < this.n && this.types[this.pos] !== T_RPAREN) {
        var tt = this.types[this.pos];
        if (tt === T_COMMA || tt === T_SEMI) { this.pos++; continue; }
        var vv = this.vals[this.pos];
        this.pos++;
        items.push(tt === T_STR ? { s: vv } : { raw: vv });
      }
      this.expect(T_RPAREN);
      return { list: items };
    }
    var raw = this.vals[this.pos];
    this.pos++;
    return { raw: raw };
  };

  Parser.prototype.parseBody = function () {
    var node = { attrs: {}, groups: [], defines: [] };
    while (this.pos < this.n && this.types[this.pos] !== T_RBRACE) {
      if (this.types[this.pos] !== T_WORD) { this.pos++; continue; }
      var word = this.vals[this.pos];
      var after = this.pos + 1 < this.n ? this.types[this.pos + 1] : -1;

      if (word === 'define') {
        this.pos++;                       // define
        this.expect(T_LPAREN);
        var parts = [];
        while (this.pos < this.n && this.types[this.pos] !== T_RPAREN) {
          if (this.types[this.pos] === T_COMMA) { this.pos++; continue; }
          parts.push(this.vals[this.pos]);
          this.pos++;
        }
        this.expect(T_RPAREN);
        this.expect(T_SEMI);
        if (parts.length >= 3) {
          node.defines.push({ name: parts[0], attrType: parts[1], groupType: parts[2] });
        }
        continue;
      }

      if (after === T_LPAREN) {
        var follower = this.tokenAfterMatchingParen();
        if (follower === T_LBRACE) {
          // ---- group ----
          this.pos += 2;                  // word + (
          var items = this.readNameItems();
          this.expect(T_RPAREN);
          this.expect(T_LBRACE);
          var child = this.parseBody();
          child.type = word;
          // 组名可能是列表: statetable ("CK E SE","IQ") / ff (IQ, IQN)
          child.name = items.length ? items.join(', ') : null;
          node.groups.push(child);
        } else {
          // ---- 带括号属性值 ----
          this.pos++;                     // word
          node.attrs[word] = this.parseValue();
          this.expect(T_SEMI);
        }
      } else if (after === T_COLON) {
        this.pos += 2;                    // word + :
        node.attrs[word] = this.parseValue();
        this.expect(T_SEMI);
      } else {
        this.pos++;                       // 游离 token, 跳过
      }
    }
    this.expect(T_RBRACE);
    return node;
  };

  Parser.prototype.parse = function () {
    var libs = [];
    while (this.pos < this.n) {
      if (this.types[this.pos] === T_WORD &&
          this.pos + 1 < this.n && this.types[this.pos + 1] === T_LPAREN) {
        var word = this.vals[this.pos];
        this.pos += 2;                    // word + (
        var items = this.readNameItems();
        this.expect(T_RPAREN);
        this.expect(T_LBRACE);
        var body = this.parseBody();
        body.type = word;
        body.name = items.length ? items.join(', ') : null;
        libs.push(body);
      } else {
        this.pos++;
      }
    }
    return libs;
  };

  function parse(text) {
    return new Parser(text).parse();
  }

  /* ============================================================
   * 3. 值提取工具
   * ============================================================ */
  function valToString(v) {
    if (v == null) return null;
    if (typeof v === 'object') {
      if (v.s != null) return v.s;
      if (v.raw != null) return String(v.raw);
      if (v.list) return v.list.map(function (x) { return x.s != null ? x.s : x.raw; }).join(', ');
      return null;
    }
    return String(v);
  }

  function valToNumber(v) {
    if (v == null) return null;
    var s = valToString(v);
    if (s == null) return null;
    var m = String(s).match(/-?\d+(\.\d+)?([eE][-+]?\d+)?/);
    return m ? parseFloat(m[0]) : null;
  }

  function valToBool(v) {
    var s = valToString(v);
    return s === 'true' || s === '1';
  }

  // 数字列表: "0.1,0.2,0.3" -> [0.1,0.2,0.3]; 兼容多字符串列表形式
  function parseNumberList(v) {
    if (v == null) return [];
    var nums = [];
    function pushFrom(s) {
      String(s).split(/[\s,]+/).forEach(function (x) {
        if (!x.length) return;
        var f = Number(x);
        if (!isNaN(f)) nums.push(f);
      });
    }
    if (typeof v === 'object' && v.list) {
      v.list.forEach(function (x) { pushFrom(x.s != null ? x.s : (x.raw == null ? '' : x.raw)); });
    } else {
      pushFrom(valToString(v) || '');
    }
    return nums;
  }

  // 矩阵: values 属性 -> 二维数组; 单行且无 index_2 时为一维
  // values 既可以是单个含换行的大字符串, 也可以是 "row1", "row2", ... 列表
  function parseValueMatrix(v) {
    if (v == null) return null;
    var rows = [];
    function pushRows(s) {
      String(s).split(/\n/).forEach(function (r) { rows.push(r); });
    }
    if (typeof v === 'object' && v.list) {
      v.list.forEach(function (x) { pushRows(x.s != null ? x.s : (x.raw == null ? '' : x.raw)); });
    } else {
      var s = valToString(v);
      if (s == null) return null;
      pushRows(s);
    }
    rows = rows.map(function (r) { return r.trim(); }).filter(function (r) { return r.length; });
    if (rows.length === 0) return null;
    var matrix = rows.map(function (r) {
      return r.split(/[\s,]+/).filter(function (x) { return x.length; }).map(Number).filter(function (x) { return !isNaN(x); });
    });
    if (matrix.length === 1) return { dim: 1, data: matrix[0] };
    return { dim: 2, data: matrix };
  }

  // LUT 组 -> {index1, index2, values, dim}
  function parseLut(groupNode) {
    if (!groupNode || !groupNode.attrs) return null;
    var i1 = parseNumberList(groupNode.attrs['index_1']);
    var i2v = groupNode.attrs['index_2'];
    var i2 = i2v ? parseNumberList(i2v) : null;
    var v = parseValueMatrix(groupNode.attrs['values']);
    if (!v) return null;
    return {
      index1: i1,
      index2: i2 && i2.length ? i2 : null,
      values: v.data,
      dim: v.dim,
      template: groupNode.name || null
    };
  }

  /* ============================================================
   * 4. 分析模型
   * ============================================================ */
  function groupMap(groups) {
    var m = {};
    groups.forEach(function (g) {
      var key = g.type + '|' + (g.name || '');
      (m[key] = m[key] || []).push(g);
    });
    return m;
  }

  function analyzeTiming(tNode) {
    var tables = {};
    var scalars = {};
    Object.keys(tNode.attrs || {}).forEach(function (k) {
      if (k === 'index_1' || k === 'index_2' || k === 'values') return;
      scalars[k] = valToString(tNode.attrs[k]);
    });
    (tNode.groups || []).forEach(function (g) {
      if (g.type === 'cell_fall' || g.type === 'cell_rise' ||
        g.type === 'fall_transition' || g.type === 'rise_transition' ||
        g.type === 'fall_power' || g.type === 'rise_power') {
        tables[g.type] = parseLut(g);
      } else {
        tables[g.type + (g.name ? '(' + g.name + ')' : '')] = parseLut(g) || { raw: g };
      }
    });
    return {
      relatedPin: valToString(tNode.attrs['related_pin']),
      timingType: valToString(tNode.attrs['timing_type']),
      timingSense: valToString(tNode.attrs['timing_sense']),
      when: valToString(tNode.attrs['when']),
      sdfEdges: valToString(tNode.attrs['sdf_edges']),
      scalars: scalars,
      tables: tables
    };
  }

  function analyzePin(pNode) {
    var a = pNode.attrs || {};
    var gm = groupMap(pNode.groups || []);
    var timing = [];
    Object.keys(gm).forEach(function (k) {
      if (k.indexOf('timing|') === 0) gm[k].forEach(function (g) { timing.push(g); });
    });
    var internalPower = [];
    (gm['internal_power|'] || []).forEach(function (g) {
      var ip = {
        when: valToString(g.attrs['when']),
        relatedPin: valToString(g.attrs['related_pin']),
        powerLevel: valToString(g.attrs['power_level']),
        tables: {}
      };
      (g.groups || []).forEach(function (t) {
        if (t.type === 'rise_power' || t.type === 'fall_power') {
          ip.tables[t.type] = parseLut(t);
        }
      });
      Object.keys(g.attrs || {}).forEach(function (k) {
        if (k !== 'when' && k !== 'related_pin' && k !== 'power_level') {
          ip[k] = valToString(g.attrs[k]);
        }
      });
      internalPower.push(ip);
    });

    return {
      name: pNode.name,
      direction: valToString(a['direction']),
      capacitance: valToNumber(a['capacitance']),
      fallCapacitance: valToNumber(a['fall_capacitance']),
      riseCapacitance: valToNumber(a['rise_capacitance']),
      maxCapacitance: valToNumber(a['max_capacitance']),
      maxTransition: valToNumber(a['max_transition']),
      minTransition: valToNumber(a['min_transition']),
      function: valToString(a['function']),
      threeState: valToString(a['three_state']),
      nextState: valToString(a['nextstate']),
      clock: valToBool(a['clock']),
      minPulseWidthLow: valToNumber(a['min_pulse_width_low']),
      minPulseWidthHigh: valToNumber(a['min_pulse_width_high']),
      powerDown: valToString(a['power_down_function']),
      relatedPowerPin: valToString(a['related_power_pin']),
      relatedGroundPin: valToString(a['related_ground_pin']),
      internalPower: internalPower,
      timing: timing.map(analyzeTiming)
    };
  }

  function analyzeCell(cNode) {
    var a = cNode.attrs || {};
    var gm = groupMap(cNode.groups || []);
    var pins = [];
    var pgPins = [];
    Object.keys(gm).forEach(function (k) {
      if (k.indexOf('pin|') === 0) {
        gm[k].forEach(function (g) { pins.push(analyzePin(g)); });
      } else if (k.indexOf('pg_pin|') === 0) {
        gm[k].forEach(function (g) {
          pgPins.push({
            name: g.name,
            pgType: valToString(g.attrs['pg_type']),
            voltageName: valToString(g.attrs['voltage_name']),
            inputVoltage: valToNumber(g.attrs['input_voltage'])
          });
        });
      }
    });

    var cellLeakage = valToNumber(a['cell_leakage_power']);
    var leakageGroups = [];
    (gm['leakage_power|'] || []).forEach(function (g) {
      leakageGroups.push({
        when: valToString(g.attrs['when']),
        value: valToNumber(g.attrs['value']),
        relatedPgPin: valToString(g.attrs['related_pg_pin'])
      });
    });

    var ff = [], latch = [], statetable = [];
    Object.keys(gm).forEach(function (k) {
      if (k.indexOf('ff|') === 0) ff = ff.concat(gm[k]);
      if (k.indexOf('latch|') === 0) latch = latch.concat(gm[k]);
      if (k.indexOf('statetable|') === 0) statetable = statetable.concat(gm[k]);
    });
    var seqElements = [];
    ff.forEach(function (g) {
      seqElements.push({ kind: 'FF', name: g.name, attrs: flatAttrs(g.attrs) });
    });
    latch.forEach(function (g) {
      seqElements.push({ kind: 'LATCH', name: g.name, attrs: flatAttrs(g.attrs) });
    });

    return {
      name: cNode.name,
      area: valToNumber(a['area']),
      cellLeakage: cellLeakage,
      cellFootprint: valToString(a['cell_footprint']),
      dontUse: valToBool(a['dont_use']),
      dontTouch: valToBool(a['dont_touch']),
      driveStrength: valToNumber(a['drive_strength']),
      leakageGroups: leakageGroups,
      pins: pins,
      pgPins: pgPins,
      isSequential: ff.length > 0 || latch.length > 0,
      seqElements: seqElements,
      statetable: statetable.map(function (g) { return flatAttrs(g.attrs); })
    };
  }

  function flatAttrs(attrs) {
    var o = {};
    Object.keys(attrs || {}).forEach(function (k) { o[k] = valToString(attrs[k]); });
    return o;
  }

  function toModel(libNode) {
    var lib = Array.isArray(libNode) ? libNode[0] : libNode;
    if (!lib) return null;
    var gm = groupMap(lib.groups || []);

    var opconds = [];
    Object.keys(gm).forEach(function (k) {
      if (k.indexOf('operating_conditions|') === 0) {
        gm[k].forEach(function (g) {
          opconds.push({
            name: g.name,
            voltage: valToNumber(g.attrs['voltage']),
            temperature: valToNumber(g.attrs['temperature']),
            process: valToString(g.attrs['process']),
            treeType: valToString(g.attrs['tree_type'])
          });
        });
      }
    });

    var templates = {};
    Object.keys(gm).forEach(function (k) {
      if (k.indexOf('lu_table_template|') === 0) {
        gm[k].forEach(function (g) {
          templates[g.name] = {
            variable1: valToString(g.attrs['variable_1']),
            variable2: valToString(g.attrs['variable_2'])
          };
        });
      }
    });

    var cells = [];
    Object.keys(gm).forEach(function (k) {
      if (k.indexOf('cell|') === 0) {
        gm[k].forEach(function (g) { cells.push(analyzeCell(g)); });
      }
    });
    cells.sort(function (x, y) { return x.name < y.name ? -1 : 1; });

    var a = lib.attrs || {};
    var units = {
      time: valToString(a['time_unit']),
      voltage: valToString(a['voltage_unit']),
      current: valToString(a['current_unit']),
      capacitiveLoad: valToString(a['capacitive_load_unit']),
      pullingResistance: valToString(a['pulling_resistance_unit']),
      leakagePower: valToString(a['leakage_power_unit']),
      distance: valToString(a['distance_unit']),
      capacitance: valToString(a['capacitive_load_unit'])
    };
    if (a['capacitive_load_unit'] && a['capacitive_load_unit'].list) {
      units.capacitiveLoad = (a['capacitive_load_unit'].list[0] || {}).raw + ' ' +
        ((a['capacitive_load_unit'].list[1] || {}).s || '');
    }

    var defOpcond = valToString(a['default_operating_conditions']);
    var opcondMap = {};
    opconds.forEach(function (o) { opcondMap[o.name] = o; });

    return {
      name: lib.name,
      technology: valToString(a['technology']),
      delayModel: valToString(a['delay_model']),
      revision: valToNumber(a['revision']),
      date: valToString(a['date']),
      comment: valToString(a['comment']),
      busNamingStyle: valToString(a['bus_naming_style']),
      libraryFeatures: valToString(a['library_features']),
      units: units,
      nomVoltage: valToNumber(a['nom_voltage']),
      nomTemperature: valToNumber(a['nom_temperature']),
      nomProcess: valToString(a['nom_process']),
      defaultOpcond: defOpcond,
      defaultOpcondInfo: opcondMap[defOpcond] || null,
      operatingConditions: opconds,
      templates: templates,
      defines: lib.defines || [],
      attrs: flatAttrs(a),
      cells: cells
    };
  }

  /* 深拷贝并剔除 raw (AST) 引用, 用于 Worker 结构化克隆 / JSON 视图 */
  function stripRaw(obj) {
    if (obj == null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      var arr = [];
      for (var i = 0; i < obj.length; i++) arr.push(stripRaw(obj[i]));
      return arr;
    }
    var o = {};
    for (var k in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
      if (k === 'raw') continue;
      o[k] = stripRaw(obj[k]);
    }
    return o;
  }

  function parseAndAnalyze(text) {
    var p = new Parser(text);
    var libs = p.parse();
    var models = libs.map(toModel).filter(Boolean);
    return {
      libraries: models,
      library: models[0] || null,
      allNodes: libs,
      tokenCount: p.tokenCount
    };
  }

  return {
    parse: parse,
    parseAndAnalyze: parseAndAnalyze,
    toModel: toModel,
    tokenize: tokenize,
    stripRaw: stripRaw,
    parseLut: parseLut,
    parseNumberList: parseNumberList,
    parseValueMatrix: parseValueMatrix,
    valToString: valToString,
    valToNumber: valToNumber
  };
});
