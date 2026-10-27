/*
 * liberty-gen.js
 * Liberty (.lib) 文件生成器 — 全部逻辑
 *
 * 模块清单 (均挂载 window.LibGen):
 *   Model            数据模型与工厂函数
 *   Serializer       LibrarySpec → .lib 文本
 *   BoolEst          布尔表达式解析 + 线性延迟估算
 *   RefSampler       参考库加载与 LUT 采样缩放
 *   LutSource        LUT 三来源统一入口 (paste/ref/bool)
 *   Highlighter      .lib 文本语法高亮
 *   Validator        字段 + 维度 + 自洽性校验
 *   Form             表单 DOM ↔ 模型双向绑定
 *   Preview          预览区渲染 (debounce + 虚拟滚动)
 *   Controller       主控制器 (生成/下载/送回)
 *
 * 复用: js/liberty-parser.js (window.Liberty) 做参考库解析与自洽性校验
 *      js/liberty-worker-src.js (window.LIBERTY_WORKER_SRC) 做后台解析
 *
 * 风格: ES5 / IIFE / 'use strict' / var / function / 中文注释 / camelCase
 */
(function (root) {
  'use strict';
  var LibGen = root.LibGen = root.LibGen || {};

  /* ============================================================
   * T1. Model — 数据模型与工厂函数
   * 字段名对齐 liberty-parser.js 的 analyze* 输出
   * ============================================================ */
  var Model = (function () {
    function createLibrarySpec() {
      return {
        libraryName: '',
        technology: 'cmos',
        delayModel: 'table_lookup',
        revision: null,
        date: null,
        nomProcess: '1.0',
        nomVoltage: 1.0,
        nomTemperature: 25,
        defaultOpcond: null,
        timeUnit: '1ns',
        voltageUnit: '1V',
        currentUnit: '1mA',
        capacitiveLoadUnit: '1.0,pf',
        pullingResistanceUnit: '1kohm',
        leakagePowerUnit: '1pW',
        busNamingStyle: '%s[%d]',
        voltageMap: [
          { name: 'VDD', value: 1.0 },
          { name: 'GND', value: 0.0 }
        ],
        defines: [],
        templates: [
          { name: 'delay_template', variable1: 'input_net_transition', variable2: 'total_output_net_capacitance' }
        ],
        operatingConditions: [],
        cells: []
      };
    }

    function createCellSpec(name) {
      return {
        name: name || '',
        area: null,
        cellLeakage: null,
        cellFootprint: null,
        driveStrength: null,
        dontUse: false,
        isSequential: false,
        pgPins: [
          { name: 'VDD', pgType: 'primary_power', voltageName: 'VDD' },
          { name: 'GND', pgType: 'primary_ground', voltageName: 'GND' }
        ],
        pins: [],
        leakageGroups: [],
        seqElements: []
      };
    }

    function createPinSpec(name) {
      return {
        name: name || '',
        direction: 'input',
        capacitance: null,
        riseCapacitance: null,
        fallCapacitance: null,
        maxCapacitance: null,
        maxTransition: null,
        function: null,
        threeState: null,
        clock: false,
        timing: [],
        internalPower: []
      };
    }

    function createTimingArcSpec() {
      return {
        relatedPin: '',
        timingType: 'combinational',
        timingSense: 'non_unate',
        when: null,
        tables: {
          cellRise: createLutSpec(),
          cellFall: createLutSpec(),
          riseTrans: createLutSpec(),
          fallTrans: createLutSpec()
        },
        ccs: null
      };
    }

    function createLutSpec() {
      return {
        source: 'bool',
        index1: null,
        index2: null,
        values: null,
        template: 'delay_template',
        sourcePaste: { index1Text: '', index2Text: '', valuesText: '' },
        sourceRef: { refCellName: '', arcPin: '', arcRelated: '', tableType: 'cellRise', delayScale: 1, capScale: 1, powerScale: 1 },
        sourceBool: { expr: '', drive: 1 },
        warning: null
      };
    }

    function createPowerSpec() {
      return {
        relatedPin: '',
        risePower: createLutSpec(),
        fallPower: createLutSpec()
      };
    }

    function createLeakageSpec() {
      return { when: null, value: null };
    }

    function createSeqSpec(kind) {
      return { kind: kind || 'FF', q: 'Q', qn: 'QN', clockedOn: '', nextState: '' };
    }

    return {
      createLibrarySpec: createLibrarySpec,
      createCellSpec: createCellSpec,
      createPinSpec: createPinSpec,
      createTimingArcSpec: createTimingArcSpec,
      createLutSpec: createLutSpec,
      createPowerSpec: createPowerSpec,
      createLeakageSpec: createLeakageSpec,
      createSeqSpec: createSeqSpec
    };
  })();
  LibGen.Model = Model;

  /* ============================================================
   * T2. Serializer — LibrarySpec → .lib 文本
   * ============================================================ */
  var Serializer = (function () {
    var INDENT = '  ';

    function formatNumber(n) {
      if (n == null || n === '') return '';
      if (typeof n !== 'number') n = Number(n);
      if (!isFinite(n)) return String(n);
      var s;
      if (n === 0) s = '0';
      else if (Math.abs(n) < 1e-4 || Math.abs(n) >= 1e6) s = n.toExponential(4);
      else s = n.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
      return s;
    }

    function escStr(s) { return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }

    function line(indent, text) { return indent + text + '\n'; }

    function attrScalar(indent, key, val) {
      if (val == null || val === '') return '';
      return line(indent, key + ' : ' + val + ';');
    }
    function attrStr(indent, key, val) {
      if (val == null || val === '') return '';
      return line(indent, key + ' : "' + escStr(val) + '";');
    }
    function attrNum(indent, key, val) {
      if (val == null || val === '') return '';
      var n = formatNumber(val);
      if (!n) return '';
      return line(indent, key + ' : ' + n + ';');
    }
    function attrBool(indent, key, val) {
      if (!val) return '';
      return line(indent, key + ' : true;');
    }

    function formatValues(matrix, indent) {
      if (!matrix || !matrix.length) return '';
      var parts = [];
      for (var i = 0; i < matrix.length; i++) {
        var cells = [];
        for (var j = 0; j < matrix[i].length; j++) cells.push(formatNumber(matrix[i][j]));
        parts.push('"' + cells.join(', ') + '"');
      }
      /* Nangate 风格: values ("row1", \  "row2", ...); 带括号属性值, 行续接 \ */
      var body = parts.join(', \\\n' + indent + '  ');
      return line(indent, 'values (' + body + ');');
    }

    function formatIndex(arr, indent, key) {
      if (!arr || !arr.length) return '';
      var nums = [];
      for (var i = 0; i < arr.length; i++) nums.push(formatNumber(arr[i]));
      return line(indent, key + ' : (' + nums.join(', ') + ');');
    }

    function serializeLut(lut, groupType, indent) {
      if (!lut) return '';
      var out = line(indent, groupType + '(' + (lut.template || 'delay_template') + ') {');
      var i2 = indent + INDENT;
      out += formatIndex(lut.index1, i2, 'index_1');
      out += formatIndex(lut.index2, i2, 'index_2');
      if (lut.values && lut.values.length) {
        out += formatValues(lut.values, i2);
      }
      out += line(indent, '}');
      return out;
    }

    var TABLE_GROUP_NAMES = {
      cellRise: 'cell_rise', cellFall: 'cell_fall',
      riseTrans: 'rise_transition', fallTrans: 'fall_transition'
    };

    function serializeTiming(arc, indent) {
      var out = line(indent, 'timing() {');
      var i2 = indent + INDENT;
      out += attrStr(i2, 'related_pin', arc.relatedPin);
      out += attrScalar(i2, 'timing_type', arc.timingType);
      out += attrScalar(i2, 'timing_sense', arc.timingSense);
      out += attrStr(i2, 'when', arc.when);
      if (arc.tables) {
        for (var k in arc.tables) {
          if (!arc.tables.hasOwnProperty(k)) continue;
          var lut = arc.tables[k];
          if (!lut || !lut.values || !lut.values.length) continue;
          out += serializeLut(lut, TABLE_GROUP_NAMES[k] || k, i2);
        }
      }
      if (arc.ccs) {
        out += serializeCcs(arc.ccs, i2);
      }
      out += line(indent, '}');
      return out;
    }

    function serializeCcs(ccs, indent) {
      var out = line(indent, 'ccs_timing() {');
      var i2 = indent + INDENT;
      if (ccs.outputCurrentRise) out += serializeLut(ccs.outputCurrentRise, 'output_current_rise', i2);
      if (ccs.outputCurrentFall) out += serializeLut(ccs.outputCurrentFall, 'output_current_fall', i2);
      out += line(indent, '}');
      return out;
    }

    function serializePower(power, indent) {
      var out = line(indent, 'internal_power() {');
      var i2 = indent + INDENT;
      out += attrStr(i2, 'related_pin', power.relatedPin);
      if (power.risePower && power.risePower.values) out += serializeLut(power.risePower, 'rise_power', i2);
      if (power.fallPower && power.fallPower.values) out += serializeLut(power.fallPower, 'fall_power', i2);
      out += line(indent, '}');
      return out;
    }

    function serializePin(pin, indent) {
      var out = line(indent, 'pin(' + pin.name + ') {');
      var i2 = indent + INDENT;
      out += attrScalar(i2, 'direction', pin.direction);
      out += attrNum(i2, 'capacitance', pin.capacitance);
      out += attrNum(i2, 'rise_capacitance', pin.riseCapacitance);
      out += attrNum(i2, 'fall_capacitance', pin.fallCapacitance);
      out += attrNum(i2, 'max_capacitance', pin.maxCapacitance);
      out += attrNum(i2, 'max_transition', pin.maxTransition);
      out += attrStr(i2, 'function', pin.function);
      out += attrStr(i2, 'three_state', pin.threeState);
      out += attrBool(i2, 'clock', pin.clock);
      for (var i = 0; i < pin.timing.length; i++) out += serializeTiming(pin.timing[i], i2);
      for (var j = 0; j < pin.internalPower.length; j++) out += serializePower(pin.internalPower[j], i2);
      out += line(indent, '}');
      return out;
    }

    function serializePgPin(pg, indent) {
      var out = line(indent, 'pg_pin(' + pg.name + ') {');
      var i2 = indent + INDENT;
      out += attrScalar(i2, 'pg_type', pg.pgType);
      out += attrStr(i2, 'voltage_name', pg.voltageName);
      out += line(indent, '}');
      return out;
    }

    function serializeSeq(seq, indent) {
      var head = seq.kind === 'FF' ? 'ff' : 'latch';
      var out = line(indent, head + '(' + seq.q + ', ' + seq.qn + ') {');
      var i2 = indent + INDENT;
      out += attrStr(i2, 'clocked_on', seq.clockedOn);
      out += attrStr(i2, 'next_state', seq.nextState);
      out += line(indent, '}');
      return out;
    }

    function serializeLeakage(lk, indent) {
      var out = line(indent, 'leakage_power() {');
      var i2 = indent + INDENT;
      out += attrStr(i2, 'when', lk.when);
      out += attrNum(i2, 'value', lk.value);
      out += line(indent, '}');
      return out;
    }

    function serializeCell(cell, indent) {
      var out = line(indent, 'cell(' + cell.name + ') {');
      var i2 = indent + INDENT;
      out += attrNum(i2, 'area', cell.area);
      out += attrNum(i2, 'cell_leakage_power', cell.cellLeakage);
      out += attrStr(i2, 'cell_footprint', cell.cellFootprint);
      out += attrNum(i2, 'drive_strength', cell.driveStrength);
      out += attrBool(i2, 'dont_use', cell.dontUse);
      for (var i = 0; i < cell.pgPins.length; i++) out += serializePgPin(cell.pgPins[i], i2);
      if (cell.isSequential) {
        for (var s = 0; s < cell.seqElements.length; s++) out += serializeSeq(cell.seqElements[s], i2);
      }
      for (var p = 0; p < cell.pins.length; p++) out += serializePin(cell.pins[p], i2);
      for (var l = 0; l < cell.leakageGroups.length; l++) out += serializeLeakage(cell.leakageGroups[l], i2);
      out += line(indent, '}');
      return out;
    }

    function serialize(spec) {
      if (!spec || !spec.libraryName) throw new Error('library 名称必填');
      var out = '';
      out += 'library(' + spec.libraryName + ') {\n';
      var i1 = INDENT;
      out += attrStr(i1, 'technology', spec.technology);
      out += attrScalar(i1, 'delay_model', spec.delayModel);
      if (spec.revision != null && spec.revision !== '') out += attrNum(i1, 'revision', spec.revision);
      out += attrStr(i1, 'date', spec.date);
      out += attrScalar(i1, 'nom_process', spec.nomProcess);
      out += attrNum(i1, 'nom_voltage', spec.nomVoltage);
      out += attrNum(i1, 'nom_temperature', spec.nomTemperature);
      out += attrStr(i1, 'default_operating_conditions', spec.defaultOpcond);
      out += attrScalar(i1, 'time_unit', spec.timeUnit);
      out += attrScalar(i1, 'voltage_unit', spec.voltageUnit);
      out += attrScalar(i1, 'current_unit', spec.currentUnit);
      if (spec.capacitiveLoadUnit) out += line(i1, 'capacitive_load_unit(' + spec.capacitiveLoadUnit + ');');
      out += attrScalar(i1, 'pulling_resistance_unit', spec.pullingResistanceUnit);
      out += attrScalar(i1, 'leakage_power_unit', spec.leakagePowerUnit);
      out += attrStr(i1, 'bus_naming_style', spec.busNamingStyle);

      if (spec.voltageMap && spec.voltageMap.length) {
        var parts = [];
        for (var v = 0; v < spec.voltageMap.length; v++) {
          parts.push(spec.voltageMap[v].name + ', ' + formatNumber(spec.voltageMap[v].value));
        }
        out += line(i1, 'voltage_map(' + parts.join(', ') + ');');
      }

      for (var d = 0; d < spec.defines.length; d++) {
        var df = spec.defines[d];
        out += line(i1, 'define(' + df.name + ', ' + df.attrType + ', ' + df.groupType + ');');
      }

      for (var t = 0; t < spec.templates.length; t++) {
        var tp = spec.templates[t];
        out += line(i1, 'lu_table_template(' + tp.name + ') {');
        out += attrStr(i1 + INDENT, 'variable_1', tp.variable1);
        out += attrStr(i1 + INDENT, 'variable_2', tp.variable2);
        out += line(i1, '}');
      }

      for (var o = 0; o < spec.operatingConditions.length; o++) {
        var oc = spec.operatingConditions[o];
        out += line(i1, 'operating_conditions(' + oc.name + ') {');
        var oi = i1 + INDENT;
        out += attrScalar(oi, 'process', oc.process);
        out += attrNum(oi, 'voltage', oc.voltage);
        out += attrNum(oi, 'temperature', oc.temperature);
        out += attrScalar(oi, 'tree_type', oc.treeType);
        out += line(i1, '}');
      }

      for (var c = 0; c < spec.cells.length; c++) out += serializeCell(spec.cells[c], i1);

      out += '}\n';
      return { text: out, cellCount: spec.cells.length };
    }

    return { serialize: serialize, formatNumber: formatNumber };
  })();
  LibGen.Serializer = Serializer;

  /* ============================================================
   * T3. BoolEst — 布尔表达式递归下降解析 + 线性延迟估算
   * ============================================================ */
  var BoolEst = (function () {
    var COEFF = { base: 0.05, k1: 0.02, k2: 0.5, tbase: 0.03, k3: 0.3 };
    var DEF_INDEX1 = [0.1, 0.2, 0.4, 0.8, 1.5];
    var DEF_INDEX2 = [0.005, 0.02, 0.05, 0.1, 0.2];

    function tokenizeBool(expr) {
      var tokens = [];
      var i = 0, n = expr.length;
      while (i < n) {
        var c = expr.charAt(i);
        if (c === ' ' || c === '\t') { i++; continue; }
        if (c === '!' || c === '&' || c === '|' || c === '^' || c === '*' ||
            c === '(' || c === ')') {
          tokens.push({ type: 'op', val: c }); i++; continue;
        }
        if (c === '1' && expr.charAt(i + 1) === "'" && expr.charAt(i + 2) === 'b') {
          tokens.push({ type: 'const', val: expr.slice(i, i + 4) }); i += 4; continue;
        }
        if (/[a-zA-Z_]/.test(c)) {
          var s = i;
          while (i < n && /[a-zA-Z0-9_]/.test(expr.charAt(i))) i++;
          tokens.push({ type: 'var', val: expr.slice(s, i) }); continue;
        }
        tokens.push({ type: 'unknown', val: c }); i++;
      }
      return tokens;
    }

    function Parser(tokens) { this.toks = tokens; this.pos = 0; this.err = null; }
    Parser.prototype.peek = function () { return this.toks[this.pos]; };
    Parser.prototype.next = function () { return this.toks[this.pos++]; };
    Parser.prototype.parseOr = function () {
      var left = this.parseAnd();
      while (this.peek() && this.peek().val === '|') {
        this.next();
        left = { op: 'or', left: left, right: this.parseAnd() };
      }
      return left;
    };
    Parser.prototype.parseAnd = function () {
      var left = this.parseXor();
      while (this.peek() && (this.peek().val === '&' || this.peek().val === '*')) {
        this.next();
        left = { op: 'and', left: left, right: this.parseXor() };
      }
      return left;
    };
    Parser.prototype.parseXor = function () {
      var left = this.parseNot();
      while (this.peek() && this.peek().val === '^') {
        this.next();
        left = { op: 'xor', left: left, right: this.parseNot() };
      }
      return left;
    };
    Parser.prototype.parseNot = function () {
      if (this.peek() && this.peek().val === '!') {
        this.next();
        return { op: 'not', left: this.parseNot() };
      }
      return this.parsePrimary();
    };
    Parser.prototype.parsePrimary = function () {
      var t = this.peek();
      if (!t) { this.err = '表达式不完整'; return null; }
      if (t.val === '(') {
        this.next();
        var e = this.parseOr();
        if (this.peek() && this.peek().val === ')') this.next();
        else this.err = '缺少右括号';
        return e;
      }
      if (t.type === 'var') { this.next(); return { op: 'var', name: t.val }; }
      if (t.type === 'const') { this.next(); return { op: 'const', name: t.val }; }
      if (t.type === 'unknown') { this.err = '不支持字符: ' + t.val; this.next(); return null; }
      this.next();
      return null;
    };

    function parse(expr) {
      if (!expr || !expr.trim()) return { ok: false, ast: null, error: '空表达式' };
      var tokens = tokenizeBool(expr);
      var unknown = null;
      for (var i = 0; i < tokens.length; i++) {
        if (tokens[i].type === 'unknown') { unknown = tokens[i].val; break; }
      }
      if (unknown) return { ok: false, ast: null, error: '不支持字符: ' + unknown };
      var p = new Parser(tokens);
      var ast = p.parseOr();
      if (p.err) return { ok: false, ast: null, error: p.err };
      return { ok: true, ast: ast, error: null };
    }

    function estimateFanout(ast) {
      if (!ast) return 1;
      if (ast.op === 'var' || ast.op === 'const') return 1;
      if (ast.op === 'not') return estimateFanout(ast.left);
      if (ast.op === 'and' || ast.op === 'or' || ast.op === 'xor') {
        return estimateFanout(ast.left) + estimateFanout(ast.right);
      }
      return 1;
    }

    function countInputs(ast) {
      var set = {};
      function walk(n) {
        if (!n) return;
        if (n.op === 'var') set[n.name] = true;
        else if (n.op === 'not') walk(n.left);
        else if (n.left || n.right) { walk(n.left); walk(n.right); }
      }
      walk(ast);
      return Object.keys(set).length;
    }

    function estimate(ast, drive, opts) {
      opts = opts || {};
      var idx1 = opts.index1 || DEF_INDEX1.slice();
      var idx2 = opts.index2 || DEF_INDEX2.slice();
      var d = drive && drive > 0 ? drive : 1;
      var fanout = estimateFanout(ast);
      var nin = countInputs(ast);
      var inv = ast && ast.op === 'not';
      var k = COEFF;
      var baseDelay = k.base + k.k1 * fanout;
      var baseTrans = k.tbase;

      function buildTable(isTrans) {
        var rows = [];
        for (var i = 0; i < idx1.length; i++) {
          var row = [];
          for (var j = 0; j < idx2.length; j++) {
            var v;
            if (isTrans) v = baseTrans + k.k3 * idx2[j] / d + 0.02 * idx1[i];
            else v = baseDelay + k.k2 * idx2[j] / d + 0.04 * idx1[i];
            row.push(Math.round(v * 1e6) / 1e6);
          }
          rows.push(row);
        }
        return rows;
      }

      function lut(template) {
        return {
          source: 'bool', index1: idx1.slice(), index2: idx2.slice(),
          values: buildTable(false), template: template || 'delay_template'
        };
      }
      function lutTrans(template) {
        return {
          source: 'bool', index1: idx1.slice(), index2: idx2.slice(),
          values: buildTable(true), template: template || 'delay_template'
        };
      }
      return {
        cellRise: lut(), cellFall: lut(),
        riseTrans: lutTrans(), fallTrans: lutTrans()
      };
    }

    return {
      parse: parse, estimate: estimate, estimateFanout: estimateFanout,
      DEF_INDEX1: DEF_INDEX1, DEF_INDEX2: DEF_INDEX2, COEFF: COEFF
    };
  })();
  LibGen.BoolEst = BoolEst;

  /* ============================================================
   * T4. RefSampler — 参考库加载与 LUT 采样缩放
   * ============================================================ */
  var RefSampler = (function () {
    function loadRef(text) {
      try {
        var res = Liberty.parseAndAnalyze(text);
        var lib = res.library;
        if (!lib) return { ok: false, lib: null, error: '未找到 library 定义' };
        return { ok: true, lib: lib, error: null };
      } catch (e) {
        return { ok: false, lib: null, error: String(e.message || e) };
      }
    }

    function listRefCells(refLib) {
      if (!refLib || !refLib.cells) return [];
      var arr = [];
      for (var i = 0; i < refLib.cells.length; i++) arr.push(refLib.cells[i].name);
      return arr;
    }

    function findRefCell(refLib, name) {
      if (!refLib || !refLib.cells) return null;
      for (var i = 0; i < refLib.cells.length; i++) {
        if (refLib.cells[i].name === name) return refLib.cells[i];
      }
      return null;
    }

    function listRefArcs(refCell) {
      var arcs = [];
      if (!refCell || !refCell.pins) return arcs;
      for (var i = 0; i < refCell.pins.length; i++) {
        var p = refCell.pins[i];
        for (var j = 0; j < p.timing.length; j++) {
          var t = p.timing[j];
          var tableTypes = [];
          if (t.tables) {
            for (var k in t.tables) {
              if (t.tables.hasOwnProperty(k) && t.tables[k]) tableTypes.push(k);
            }
          }
          arcs.push({
            pin: p.name, relatedPin: t.relatedPin,
            timingType: t.timingType, tableTypes: tableTypes
          });
        }
      }
      return arcs;
    }

    var TABLE_KEY_MAP = {
      cellRise: 'cell_rise', cellFall: 'cell_fall',
      riseTrans: 'rise_transition', fallTrans: 'fall_transition',
      risePower: 'rise_power', fallPower: 'fall_power'
    };

    function sample(refCell, selector, scales) {
      scales = scales || {};
      var delayScale = scales.delayScale != null ? scales.delayScale : 1;
      var capScale = scales.capScale != null ? scales.capScale : 1;
      var powerScale = scales.powerScale != null ? scales.powerScale : 1;

      var pin = null;
      for (var i = 0; i < refCell.pins.length; i++) {
        if (refCell.pins[i].name === selector.pin) { pin = refCell.pins[i]; break; }
      }
      if (!pin) throw new Error('参考数据不可用: pin 不存在');
      var arc = null;
      for (var j = 0; j < pin.timing.length; j++) {
        if (pin.timing[j].relatedPin === selector.relatedPin) { arc = pin.timing[j]; break; }
      }
      if (!arc) throw new Error('参考数据不可用: 弧不存在');
      var refLut = arc.tables[selector.tableType];
      if (!refLut) throw new Error('参考数据不可用: 表不存在');

      var isPower = selector.tableType === 'risePower' || selector.tableType === 'fallPower';
      var scale = isPower ? powerScale : delayScale;

      var newIndex1 = refLut.index1 ? refLut.index1.slice() : null;
      var newIndex2 = refLut.index2 ? refLut.index2.map(function (c) { return c * capScale; }) : null;
      var newValues;
      if (refLut.values) {
        newValues = refLut.values.map(function (row) {
          return row.map(function (v) { return v * scale; });
        });
      }
      return {
        source: 'ref', index1: newIndex1, index2: newIndex2,
        values: newValues, template: refLut.template || 'delay_template'
      };
    }

    /* 把 parser 的 cell 模型转成可编辑 CellSpec (用于从参考库导入 cell 改写) */
    var REF_TABLE_KEYS = {
      'cell_rise': 'cellRise', 'cell_fall': 'cellFall',
      'rise_transition': 'riseTrans', 'fall_transition': 'fallTrans'
    };

    function lutFromRef(refLut) {
      var lut = Model.createLutSpec();
      lut.source = 'paste';
      lut.index1 = refLut.index1 ? refLut.index1.slice() : null;
      lut.index2 = refLut.index2 ? refLut.index2.slice() : null;
      var vals = refLut.values;
      if (vals) {
        /* parser 对单行 LUT 返回一维数组, 规范化为二维 (1×n) */
        if (vals.length && !Array.isArray(vals[0])) vals = [vals];
        lut.values = vals.map(function (r) { return Array.isArray(r) ? r.slice() : [r]; });
      } else {
        lut.values = null;
      }
      lut.template = refLut.template || 'delay_template';
      if (refLut.index1) lut.sourcePaste.index1Text = refLut.index1.join(', ');
      if (refLut.index2) lut.sourcePaste.index2Text = refLut.index2.join(', ');
      if (lut.values) lut.sourcePaste.valuesText = lut.values.map(function (r) { return r.join(', '); }).join('\n');
      return lut;
    }

    function timingFromRef(refTiming) {
      var arc = Model.createTimingArcSpec();
      arc.relatedPin = refTiming.relatedPin || '';
      arc.timingType = refTiming.timingType || 'combinational';
      arc.timingSense = refTiming.timingSense || 'non_unate';
      arc.when = refTiming.when || null;
      arc.tables = { cellRise: null, cellFall: null, riseTrans: null, fallTrans: null };
      if (refTiming.tables) {
        for (var k in refTiming.tables) {
          if (!refTiming.tables.hasOwnProperty(k)) continue;
          var mapped = REF_TABLE_KEYS[k];
          if (mapped && refTiming.tables[k]) arc.tables[mapped] = lutFromRef(refTiming.tables[k]);
        }
      }
      if (!arc.tables.cellRise) arc.tables.cellRise = Model.createLutSpec();
      if (!arc.tables.cellFall) arc.tables.cellFall = Model.createLutSpec();
      if (!arc.tables.riseTrans) arc.tables.riseTrans = Model.createLutSpec();
      if (!arc.tables.fallTrans) arc.tables.fallTrans = Model.createLutSpec();
      return arc;
    }

    function pinFromRef(refPin) {
      var pin = Model.createPinSpec(refPin.name || '');
      pin.direction = refPin.direction || 'input';
      pin.capacitance = refPin.capacitance;
      pin.riseCapacitance = refPin.riseCapacitance;
      pin.fallCapacitance = refPin.fallCapacitance;
      pin.maxCapacitance = refPin.maxCapacitance;
      pin.maxTransition = refPin.maxTransition;
      pin.function = refPin.function;
      pin.threeState = refPin.threeState;
      pin.clock = refPin.clock;
      pin.timing = (refPin.timing || []).map(timingFromRef);
      pin.internalPower = (refPin.internalPower || []).map(function (ip) {
        var p = Model.createPowerSpec();
        p.relatedPin = ip.relatedPin || '';
        if (ip.tables && ip.tables['rise_power']) p.risePower = lutFromRef(ip.tables['rise_power']);
        if (ip.tables && ip.tables['fall_power']) p.fallPower = lutFromRef(ip.tables['fall_power']);
        return p;
      });
      return pin;
    }

    function cellToSpec(refCell) {
      var cell = Model.createCellSpec(refCell.name || '');
      cell.area = refCell.area;
      cell.cellLeakage = refCell.cellLeakage;
      cell.cellFootprint = refCell.cellFootprint;
      cell.driveStrength = refCell.driveStrength;
      cell.dontUse = refCell.dontUse;
      cell.isSequential = refCell.isSequential;
      cell.pgPins = (refCell.pgPins || []).map(function (pg) {
        return { name: pg.name, pgType: pg.pgType, voltageName: pg.voltageName };
      });
      if (!cell.pgPins.length) {
        cell.pgPins.push({ name: 'VDD', pgType: 'primary_power', voltageName: 'VDD' });
        cell.pgPins.push({ name: 'GND', pgType: 'primary_ground', voltageName: 'GND' });
      }
      cell.pins = (refCell.pins || []).map(pinFromRef);
      cell.leakageGroups = (refCell.leakageGroups || []).map(function (lk) {
        return { when: lk.when, value: lk.value };
      });
      if (cell.isSequential) {
        cell.seqElements = (refCell.seqElements || []).map(function (se) {
          var s = Model.createSeqSpec(se.kind || 'FF');
          var parts = (se.name || '').split(',').map(function (x) { return x.trim(); });
          s.q = parts[0] || 'Q';
          s.qn = parts[1] || 'QN';
          s.clockedOn = (se.attrs && se.attrs.clocked_on) || '';
          s.nextState = (se.attrs && se.attrs.next_state) || '';
          return s;
        });
        if (!cell.seqElements.length) cell.seqElements.push(Model.createSeqSpec('FF'));
      }
      return cell;
    }

    return {
      loadRef: loadRef, listRefCells: listRefCells, listRefArcs: listRefArcs,
      findRefCell: findRefCell, sample: sample, TABLE_KEY_MAP: TABLE_KEY_MAP,
      cellToSpec: cellToSpec
    };
  })();
  LibGen.RefSampler = RefSampler;

  /* ============================================================
   * T5. LutSource — 三来源统一入口
   * ============================================================ */
  var LutSource = (function () {
    function resolve(lutSpec, ctx) {
      ctx = ctx || {};
      var src = lutSpec.source || 'bool';
      if (src === 'paste') {
        var sp = lutSpec.sourcePaste || {};
        var i1 = Liberty.parseNumberList(sp.index1Text || '');
        var i2 = Liberty.parseNumberList(sp.index2Text || '');
        var m = Liberty.parseValueMatrix(sp.valuesText || '');
        lutSpec.index1 = i1.length ? i1 : null;
        lutSpec.index2 = i2.length ? i2 : null;
        lutSpec.values = (m && m.data) ? m.data : null;
        lutSpec.warning = null;
        return lutSpec;
      }
      if (src === 'ref') {
        var sr = lutSpec.sourceRef || {};
        if (!ctx.refLib) { lutSpec.warning = '未加载参考库'; return lutSpec; }
        var refCell = RefSampler.findRefCell(ctx.refLib, sr.refCellName);
        if (!refCell) { lutSpec.warning = '参考 cell 不存在'; return lutSpec; }
        try {
          var r = RefSampler.sample(refCell, {
            pin: sr.arcPin, relatedPin: sr.arcRelated, tableType: sr.tableType
          }, { delayScale: sr.delayScale, capScale: sr.capScale, powerScale: sr.powerScale });
          lutSpec.index1 = r.index1; lutSpec.index2 = r.index2; lutSpec.values = r.values;
          lutSpec.template = r.template;
          lutSpec.warning = null;
        } catch (e) {
          lutSpec.warning = String(e.message || e);
        }
        return lutSpec;
      }
      if (src === 'bool') {
        var sb = lutSpec.sourceBool || {};
        var expr = sb.expr || (ctx.pin && ctx.pin.function) || '';
        var drive = sb.drive || (ctx.cell && ctx.cell.driveStrength) || 1;
        var r2 = BoolEst.parse(expr);
        if (!r2.ok || !r2.ast) {
          lutSpec.index1 = BoolEst.DEF_INDEX1.slice();
          lutSpec.index2 = BoolEst.DEF_INDEX2.slice();
          lutSpec.values = BoolEst.estimate({ op: 'var', name: 'X' }, drive).cellRise.values;
          lutSpec.warning = '布尔表达式无效(' + (r2.error || '空') + ')，已用通用默认表';
          return lutSpec;
        }
        var tabs = BoolEst.estimate(r2.ast, drive);
        lutSpec.index1 = tabs.cellRise.index1;
        lutSpec.index2 = tabs.cellRise.index2;
        lutSpec.values = tabs.cellRise.values;
        lutSpec.warning = null;
        return lutSpec;
      }
      return lutSpec;
    }

    function resolveAllTables(arc, ctx) {
      if (!arc.tables) return;
      for (var k in arc.tables) {
        if (arc.tables.hasOwnProperty(k)) {
          resolve(arc.tables[k], ctx);
        }
      }
    }

    return { resolve: resolve, resolveAllTables: resolveAllTables };
  })();
  LibGen.LutSource = LutSource;

  /* ============================================================
   * T6. Highlighter — .lib 语法高亮
   * ============================================================ */
  var Highlighter = (function () {
    var KEYWORDS = {
      library: 1, cell: 1, pin: 1, pg_pin: 1, timing: 1, lu_table_template: 1,
      operating_conditions: 1, internal_power: 1, leakage_power: 1, ff: 1, latch: 1,
      statetable: 1, ccs_timing: 1, define: 1, voltage_map: 1, bus: 1, type: 1,
      memory: 1, ecsm: 1, output_current_rise: 1, output_current_fall: 1,
      cell_rise: 1, cell_fall: 1, rise_transition: 1, fall_transition: 1,
      rise_power: 1, fall_power: 1, ccsn_first_stage: 1, ccsn_last_stage: 1
    };

    function escapeHtml(s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function scan(text) {
      var tokens = [];
      var i = 0, n = text.length;
      while (i < n) {
        var c = text.charAt(i);
        if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
          var s = i;
          while (i < n && /[\s]/.test(text.charAt(i))) i++;
          tokens.push({ cls: 'ws', text: text.slice(s, i) }); continue;
        }
        if (c === '/' && text.charAt(i + 1) === '*') {
          var s2 = i; i += 2;
          while (i < n && !(text.charAt(i) === '*' && text.charAt(i + 1) === '/')) i++;
          i += 2;
          tokens.push({ cls: 'cmt', text: text.slice(s2, i) }); continue;
        }
        if (c === '/' && text.charAt(i + 1) === '/') {
          var s3 = i;
          while (i < n && text.charAt(i) !== '\n') i++;
          tokens.push({ cls: 'cmt', text: text.slice(s3, i) }); continue;
        }
        if (c === '"') {
          var s4 = i; i++;
          while (i < n && text.charAt(i) !== '"') { if (text.charAt(i) === '\\') i++; i++; }
          i++;
          tokens.push({ cls: 'str', text: text.slice(s4, i) }); continue;
        }
        if (c === '{' || c === '}' || c === '(' || c === ')') {
          tokens.push({ cls: 'brk', text: c }); i++; continue;
        }
        if (/[a-zA-Z_]/.test(c)) {
          var s5 = i;
          while (i < n && /[a-zA-Z0-9_]/.test(text.charAt(i))) i++;
          var w = text.slice(s5, i);
          tokens.push({ cls: (KEYWORDS[w] ? 'kw' : 'ident'), text: w }); continue;
        }
        if (/[0-9.\-+]/.test(c) && /[0-9]/.test(text.charAt(i + 1) || c)) {
          var s6 = i;
          while (i < n && /[0-9.eE+\-]/.test(text.charAt(i))) i++;
          tokens.push({ cls: 'num', text: text.slice(s6, i) }); continue;
        }
        tokens.push({ cls: 'punct', text: c }); i++;
      }
      return tokens;
    }

    function highlight(text, opts) {
      opts = opts || {};
      var maxLines = opts.maxLines || 0;
      if (maxLines && text.length) {
        var lineCount = 0;
        for (var k = 0; k < text.length; k++) if (text.charAt(k) === '\n') lineCount++;
        if (lineCount > maxLines) {
          var cut = 0, lc = 0;
          while (cut < text.length && lc < maxLines) { if (text.charAt(cut) === '\n') lc++; cut++; }
          text = text.slice(0, cut);
          var partial = highlight(text, { maxLines: 0 });
          return { html: partial.html + '<div class="tok-trunc">… 已截断 …</div>', truncated: true };
        }
      }
      var tokens = scan(text);
      var html = '';
      for (var i = 0; i < tokens.length; i++) {
        var t = tokens[i];
        if (t.cls === 'ws' || t.cls === 'punct') { html += escapeHtml(t.text); continue; }
        html += '<span class="tok-' + t.cls + '">' + escapeHtml(t.text) + '</span>';
      }
      return { html: html, truncated: false };
    }

    return { highlight: highlight, escapeHtml: escapeHtml };
  })();
  LibGen.Highlighter = Highlighter;

  /* ============================================================
   * T7. Validator — 字段 + 维度 + 自洽性校验
   * ============================================================ */
  var Validator = (function () {
    function err(level, field, msg) { return { level: level, field: field, msg: msg }; }

    function validateLutDim(lut, ctx) {
      var errs = [];
      if (!lut) return errs;
      if (!lut.values || !lut.values.length) {
        if (lut.index1 || lut.index2) errs.push(err('error', ctx, 'values 缺失但有 index'));
        return errs;
      }
      var rows = lut.values.length;
      var cols = lut.values[0] ? lut.values[0].length : 0;
      if (lut.index1 && lut.index1.length && rows !== lut.index1.length) {
        errs.push(err('error', ctx, 'values 行数(' + rows + ') != index_1 长度(' + lut.index1.length + ')'));
      }
      if (lut.index2 && lut.index2.length && cols !== lut.index2.length) {
        errs.push(err('error', ctx, 'values 列数(' + cols + ') != index_2 长度(' + lut.index2.length + ')'));
      }
      return errs;
    }

    function validateSpec(spec) {
      var errors = [];
      if (!spec) return { ok: false, errors: [err('error', 'spec', 'spec 为空')] };
      if (!spec.libraryName) errors.push(err('error', 'libraryName', 'library 名称必填'));
      if (!spec.delayModel) errors.push(err('error', 'delayModel', 'delay_model 必填'));
      if (!spec.timeUnit) errors.push(err('error', 'timeUnit', 'time_unit 必填'));

      if (spec.defaultOpcond) {
        var found = false;
        for (var i = 0; i < spec.operatingConditions.length; i++) {
          if (spec.operatingConditions[i].name === spec.defaultOpcond) { found = true; break; }
        }
        if (!found) errors.push(err('error', 'defaultOpcond', 'default_operating_conditions 引用不存在'));
      }

      for (var c = 0; c < spec.cells.length; c++) {
        var cell = spec.cells[c];
        var cctx = 'cells[' + c + ']';
        if (!cell.name) errors.push(err('error', cctx + '.name', 'cell 名称必填'));
        if (!cell.pins.length) errors.push(err('error', cctx + '.pins', 'cell 至少需要 1 个 pin'));
        if (cell.isSequential) {
          for (var se = 0; se < cell.seqElements.length; se++) {
            if (!cell.seqElements[se].clockedOn)
              errors.push(err('error', cctx + '.seq', 'FF/LATCH 须指定 clocked_on'));
          }
        }
        var pinNames = {};
        for (var p = 0; p < cell.pins.length; p++) {
          var pin = cell.pins[p];
          var pctx = cctx + '.pins[' + p + ']';
          if (!pin.name) errors.push(err('error', pctx + '.name', 'pin 名称必填'));
          pinNames[pin.name] = true;
          if (!pin.direction) errors.push(err('error', pctx + '.direction', 'pin direction 必选'));
          for (var t = 0; t < pin.timing.length; t++) {
            var arc = pin.timing[t];
            var tctx = pctx + '.timing[' + t + ']';
            if (!arc.relatedPin) errors.push(err('error', tctx + '.relatedPin', 'related_pin 必填'));
            else if (!pinNames[arc.relatedPin] && !pinNames[pin.name]) {
              errors.push(err('warn', tctx + '.relatedPin', 'related_pin "' + arc.relatedPin + '" 未在本 cell 已扫描 pin 中找到（可能后定义）'));
            }
            if (arc.tables) {
              for (var k in arc.tables) {
                if (arc.tables.hasOwnProperty(k)) {
                  var e2 = validateLutDim(arc.tables[k], tctx + '.tables.' + k);
                  for (var e3 = 0; e3 < e2.length; e3++) errors.push(e2[e3]);
                }
              }
            }
          }
        }
      }
      return { ok: errors.length === 0, errors: errors };
    }

    /* 异步自洽性校验: 主线程解析 (setTimeout 让 UI 先刷新 loading)。
       生成文本规模可控 (通常 <2MB), 主线程解析 <300ms 可接受。
       不内联 parser 源码到 Worker 以避免跨线程加载复杂性。 */
    function validateSelfConsistency(text) {
      return new Promise(function (resolve) {
        setTimeout(function () {
          try {
            var res = Liberty.parseAndAnalyze(text);
            if (res && res.library) resolve({ ok: true, error: null });
            else resolve({ ok: false, error: '未解析出 library' });
          } catch (e) {
            resolve({ ok: false, error: String(e.message || e) });
          }
        }, 30);
      });
    }

    return {
      validateSpec: validateSpec, validateLutDim: validateLutDim,
      validateSelfConsistency: validateSelfConsistency
    };
  })();
  LibGen.Validator = Validator;

  /* ============================================================
   * T9. Form — 表单 DOM ↔ 模型双向绑定
   * ============================================================ */
  var Form = (function () {
    function el(tag, cls, txt) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (txt != null) e.textContent = txt;
      return e;
    }
    function debounce(fn, ms) {
      var t = null;
      return function () {
        var args = arguments, self = this;
        clearTimeout(t);
        t = setTimeout(function () { fn.apply(self, args); }, ms || 100);
      };
    }

    function bind(root, spec, callbacks) {
      root.innerHTML = '';
      var cb = callbacks || {};
      var container = el('div', 'gen-form-inner');
      root.appendChild(container);
      renderHead(container, spec, cb);
      renderTemplates(container, spec, cb);
      renderOpconds(container, spec, cb);
      renderCells(container, spec, cb);
    }

    function section(parent, title, bodyFn) {
      var sec = el('div', 'gen-section');
      var h = el('div', 'gen-section-head', title);
      var body = el('div', 'gen-section-body');
      sec.appendChild(h); sec.appendChild(body);
      parent.appendChild(sec);
      h.addEventListener('click', function () {
        body.style.display = body.style.display === 'none' ? '' : 'none';
      });
      bodyFn(body);
      return sec;
    }

    function field(parent, label, input) {
      var row = el('div', 'gen-field');
      row.appendChild(el('label', 'gen-label', label));
      row.appendChild(input);
      parent.appendChild(row);
      return row;
    }

    function textInput(val, onInput) {
      var i = el('input', 'gen-input');
      i.type = 'text';
      if (val != null) i.value = val;
      var d = debounce(onInput, 100);
      i.addEventListener('input', function () { d(i.value); });
      return i;
    }
    function numInput(val, onInput) {
      var i = el('input', 'gen-input');
      i.type = 'text';
      if (val != null) i.value = val;
      var d = debounce(onInput, 100);
      i.addEventListener('input', function () { d(i.value); });
      return i;
    }
    function selectInput(val, options, onChange) {
      var s = el('select', 'gen-select');
      for (var i = 0; i < options.length; i++) {
        var o = el('option');
        o.value = options[i].value; o.textContent = options[i].label || options[i].value;
        if (val === options[i].value) o.selected = true;
        s.appendChild(o);
      }
      s.addEventListener('change', function () { onChange(s.value); });
      return s;
    }
    function textareaInput(val, onInput, rows) {
      var t = el('textarea', 'gen-textarea');
      t.rows = rows || 4;
      if (val != null) t.value = val;
      var d = debounce(onInput, 150);
      t.addEventListener('input', function () { d(t.value); });
      return t;
    }
    function btn(label, cls, onClick) {
      var b = el('button', 'btn ' + (cls || 'btn-ghost'), label);
      b.type = 'button';
      b.addEventListener('click', onClick);
      return b;
    }

    function renderHead(parent, spec, cb) {
      section(parent, '库头属性', function (body) {
        field(body, 'library 名称', textInput(spec.libraryName, function (v) { spec.libraryName = v; cb.onChange && cb.onChange(); }));
        field(body, 'technology', textInput(spec.technology, function (v) { spec.technology = v; cb.onChange && cb.onChange(); }));
        field(body, 'delay_model', textInput(spec.delayModel, function (v) { spec.delayModel = v; cb.onChange && cb.onChange(); }));
        field(body, 'revision', numInput(spec.revision, function (v) { spec.revision = v; cb.onChange && cb.onChange(); }));
        field(body, 'date', textInput(spec.date, function (v) { spec.date = v; cb.onChange && cb.onChange(); }));
        field(body, 'nom_process', textInput(spec.nomProcess, function (v) { spec.nomProcess = v; cb.onChange && cb.onChange(); }));
        field(body, 'nom_voltage', numInput(spec.nomVoltage, function (v) { spec.nomVoltage = v; cb.onChange && cb.onChange(); }));
        field(body, 'nom_temperature', numInput(spec.nomTemperature, function (v) { spec.nomTemperature = v; cb.onChange && cb.onChange(); }));
        field(body, 'time_unit', textInput(spec.timeUnit, function (v) { spec.timeUnit = v; cb.onChange && cb.onChange(); }));
        field(body, 'voltage_unit', textInput(spec.voltageUnit, function (v) { spec.voltageUnit = v; cb.onChange && cb.onChange(); }));
        field(body, 'current_unit', textInput(spec.currentUnit, function (v) { spec.currentUnit = v; cb.onChange && cb.onChange(); }));
        field(body, 'capacitive_load_unit', textInput(spec.capacitiveLoadUnit, function (v) { spec.capacitiveLoadUnit = v; cb.onChange && cb.onChange(); }));
        field(body, 'leakage_power_unit', textInput(spec.leakagePowerUnit, function (v) { spec.leakagePowerUnit = v; cb.onChange && cb.onChange(); }));
        field(body, 'bus_naming_style', textInput(spec.busNamingStyle, function (v) { spec.busNamingStyle = v; cb.onChange && cb.onChange(); }));
        field(body, 'default_operating_conditions', textInput(spec.defaultOpcond, function (v) { spec.defaultOpcond = v; cb.onChange && cb.onChange(); }));

        var vmSec = el('div', 'gen-subsection');
        vmSec.appendChild(el('div', 'gen-subhead', 'voltage_map'));
        var vmList = el('div', 'gen-vm-list');
        vmSec.appendChild(vmList);
        function renderVm() {
          vmList.innerHTML = '';
          for (var i = 0; i < spec.voltageMap.length; i++) {
            (function (idx) {
              var row = el('div', 'gen-vm-row');
              row.appendChild(textInput(spec.voltageMap[idx].name, function (v) { spec.voltageMap[idx].name = v; cb.onChange && cb.onChange(); }));
              row.appendChild(numInput(spec.voltageMap[idx].value, function (v) { spec.voltageMap[idx].value = v; cb.onChange && cb.onChange(); }));
              row.appendChild(btn('删除', 'btn-ghost', function () { spec.voltageMap.splice(idx, 1); renderVm(); cb.onChange && cb.onChange(); }));
              vmList.appendChild(row);
            })(i);
          }
        }
        renderVm();
        vmSec.appendChild(btn('+ 添加 voltage_map', 'btn-ghost', function () { spec.voltageMap.push({ name: '', value: 0 }); renderVm(); cb.onChange && cb.onChange(); }));
        body.appendChild(vmSec);
      });
    }

    function renderTemplates(parent, spec, cb) {
      section(parent, 'lu_table_template', function (body) {
        for (var i = 0; i < spec.templates.length; i++) {
          (function (idx) {
            var row = el('div', 'gen-tpl-row');
            row.appendChild(el('span', 'gen-tpl-idx', '#' + (idx + 1)));
            row.appendChild(textInput(spec.templates[idx].name, function (v) { spec.templates[idx].name = v; cb.onChange && cb.onChange(); }));
            row.appendChild(textInput(spec.templates[idx].variable1, function (v) { spec.templates[idx].variable1 = v; cb.onChange && cb.onChange(); }));
            row.appendChild(textInput(spec.templates[idx].variable2, function (v) { spec.templates[idx].variable2 = v; cb.onChange && cb.onChange(); }));
            row.appendChild(btn('删除', 'btn-ghost', function () { spec.templates.splice(idx, 1); bind.redraw && bind.redraw(); }));
            body.appendChild(row);
          })(i);
        }
        body.appendChild(btn('+ 添加 template', 'btn-ghost', function () {
          spec.templates.push({ name: 'template_' + (spec.templates.length + 1), variable1: '', variable2: '' });
          cb.rerender && cb.rerender();
        }));
      });
    }

    function renderOpconds(parent, spec, cb) {
      section(parent, 'operating_conditions', function (body) {
        for (var i = 0; i < spec.operatingConditions.length; i++) {
          (function (idx) {
            var row = el('div', 'gen-opcond-row');
            row.appendChild(textInput(spec.operatingConditions[idx].name, function (v) { spec.operatingConditions[idx].name = v; cb.onChange && cb.onChange(); }));
            row.appendChild(textInput(spec.operatingConditions[idx].process, function (v) { spec.operatingConditions[idx].process = v; cb.onChange && cb.onChange(); }));
            row.appendChild(numInput(spec.operatingConditions[idx].voltage, function (v) { spec.operatingConditions[idx].voltage = v; cb.onChange && cb.onChange(); }));
            row.appendChild(numInput(spec.operatingConditions[idx].temperature, function (v) { spec.operatingConditions[idx].temperature = v; cb.onChange && cb.onChange(); }));
            row.appendChild(btn('删除', 'btn-ghost', function () { spec.operatingConditions.splice(idx, 1); cb.rerender && cb.rerender(); }));
            body.appendChild(row);
          })(i);
        }
        body.appendChild(btn('+ 添加 operating_conditions', 'btn-ghost', function () {
          spec.operatingConditions.push({ name: 'OC_' + (spec.operatingConditions.length + 1), process: '1.0', voltage: 1.0, temperature: 25, treeType: 'balloon' });
          cb.rerender && cb.rerender();
        }));
      });
    }

    function renderCells(parent, spec, cb) {
      var cellsSec = section(parent, 'cell 列表 (' + spec.cells.length + ')', function (body) {});
      var body = cellsSec.querySelector('.gen-section-body');
      function redraw() {
        body.innerHTML = '';
        cellsSec.querySelector('.gen-section-head').textContent = 'cell 列表 (' + spec.cells.length + ')';
        for (var i = 0; i < spec.cells.length; i++) {
          renderCell(body, spec, i, cb, redraw);
        }
        body.appendChild(btn('+ 添加 cell', 'btn-primary', function () {
          spec.cells.push(Model.createCellSpec('CELL_' + (spec.cells.length + 1)));
          redraw();
          cb.onChange && cb.onChange();
        }));
      }
      redraw();
    }

    function renderCell(parent, spec, idx, cb, redrawCells) {
      var cell = spec.cells[idx];
      var card = el('div', 'gen-cell-card');
      var head = el('div', 'gen-cell-head', 'cell #' + (idx + 1) + ': ' + (cell.name || '(未命名)'));
      head.appendChild(btn('删除 cell', 'btn-ghost', function () { spec.cells.splice(idx, 1); redrawCells(); cb.onChange && cb.onChange(); }));
      card.appendChild(head);
      var body = el('div', 'gen-cell-body');
      card.appendChild(body);

      field(body, 'name', textInput(cell.name, function (v) { cell.name = v; head.firstChild.textContent = 'cell #' + (idx + 1) + ': ' + (v || '(未命名)'); cb.onChange && cb.onChange(); }));
      field(body, 'area', numInput(cell.area, function (v) { cell.area = v; cb.onChange && cb.onChange(); }));
      field(body, 'cell_leakage_power', numInput(cell.cellLeakage, function (v) { cell.cellLeakage = v; cb.onChange && cb.onChange(); }));
      field(body, 'drive_strength', numInput(cell.driveStrength, function (v) { cell.driveStrength = v; cb.onChange && cb.onChange(); }));
      field(body, 'cell_footprint', textInput(cell.cellFootprint, function (v) { cell.cellFootprint = v; cb.onChange && cb.onChange(); }));
      field(body, 'dont_use', selectInput(cell.dontUse ? 'true' : 'false', [{ value: 'false', label: 'false' }, { value: 'true', label: 'true' }], function (v) { cell.dontUse = v === 'true'; cb.onChange && cb.onChange(); }));
      field(body, '类型', selectInput(cell.isSequential ? 'seq' : 'comb', [{ value: 'comb', label: '组合' }, { value: 'seq', label: '时序(FF/LATCH)' }], function (v) {
        cell.isSequential = v === 'seq';
        if (cell.isSequential && !cell.seqElements.length) cell.seqElements.push(Model.createSeqSpec('FF'));
        if (!cell.isSequential) cell.seqElements = [];
        cb.rerender && cb.rerender();
      }));

      if (cell.isSequential) {
        var seqSec = el('div', 'gen-subsection');
        seqSec.appendChild(el('div', 'gen-subhead', 'ff/latch 状态变量'));
        for (var s = 0; s < cell.seqElements.length; s++) {
          (function (si) {
            var seq = cell.seqElements[si];
            var row = el('div', 'gen-seq-row');
            row.appendChild(selectInput(seq.kind, [{ value: 'FF', label: 'FF' }, { value: 'LATCH', label: 'LATCH' }], function (v) { seq.kind = v; cb.onChange && cb.onChange(); }));
            row.appendChild(el('span', null, 'Q:'));
            row.appendChild(textInput(seq.q, function (v) { seq.q = v; cb.onChange && cb.onChange(); }));
            row.appendChild(el('span', null, 'QN:'));
            row.appendChild(textInput(seq.qn, function (v) { seq.qn = v; cb.onChange && cb.onChange(); }));
            row.appendChild(el('span', null, 'clocked_on:'));
            row.appendChild(textInput(seq.clockedOn, function (v) { seq.clockedOn = v; cb.onChange && cb.onChange(); }));
            row.appendChild(el('span', null, 'next_state:'));
            row.appendChild(textInput(seq.nextState, function (v) { seq.nextState = v; cb.onChange && cb.onChange(); }));
            seqSec.appendChild(row);
          })(s);
        }
        body.appendChild(seqSec);
      }

      var pinsSec = el('div', 'gen-subsection');
      pinsSec.appendChild(el('div', 'gen-subhead', 'pins (' + cell.pins.length + ')'));
      var pinsList = el('div', 'gen-pins-list');
      pinsSec.appendChild(pinsList);
      function redrawPins() {
        pinsList.innerHTML = '';
        pinsSec.querySelector('.gen-subhead').textContent = 'pins (' + cell.pins.length + ')';
        for (var p = 0; p < cell.pins.length; p++) {
          renderPin(pinsList, cell, p, cb, redrawPins);
        }
        pinsList.appendChild(btn('+ 添加 pin', 'btn-ghost', function () {
          cell.pins.push(Model.createPinSpec('P' + (cell.pins.length + 1)));
          redrawPins(); cb.onChange && cb.onChange();
        }));
      }
      redrawPins();
      body.appendChild(pinsSec);

      var lkSec = el('div', 'gen-subsection');
      lkSec.appendChild(el('div', 'gen-subhead', 'leakage_power'));
      var lkList = el('div', 'gen-lk-list');
      lkSec.appendChild(lkList);
      function redrawLk() {
        lkList.innerHTML = '';
        for (var l = 0; l < cell.leakageGroups.length; l++) {
          (function (li) {
            var lk = cell.leakageGroups[li];
            var row = el('div', 'gen-lk-row');
            row.appendChild(el('span', null, 'when:'));
            row.appendChild(textInput(lk.when, function (v) { lk.when = v; cb.onChange && cb.onChange(); }));
            row.appendChild(el('span', null, 'value:'));
            row.appendChild(numInput(lk.value, function (v) { lk.value = v; cb.onChange && cb.onChange(); }));
            row.appendChild(btn('删除', 'btn-ghost', function () { cell.leakageGroups.splice(li, 1); redrawLk(); cb.onChange && cb.onChange(); }));
            lkList.appendChild(row);
          })(l);
        }
      }
      redrawLk();
      lkSec.appendChild(btn('+ 添加 leakage', 'btn-ghost', function () { cell.leakageGroups.push(Model.createLeakageSpec()); redrawLk(); cb.onChange && cb.onChange(); }));
      body.appendChild(lkSec);

      parent.appendChild(card);
    }

    function renderPin(parent, cell, idx, cb, redrawPins) {
      var pin = cell.pins[idx];
      var card = el('div', 'gen-pin-card');
      var head = el('div', 'gen-pin-head', 'pin #' + (idx + 1) + ': ' + (pin.name || '(未命名)'));
      head.appendChild(btn('删除 pin', 'btn-ghost', function () { cell.pins.splice(idx, 1); redrawPins(); cb.onChange && cb.onChange(); }));
      card.appendChild(head);
      var body = el('div', 'gen-pin-body');
      card.appendChild(body);

      field(body, 'name', textInput(pin.name, function (v) { pin.name = v; head.firstChild.textContent = 'pin #' + (idx + 1) + ': ' + (v || '(未命名)'); cb.onChange && cb.onChange(); }));
      field(body, 'direction', selectInput(pin.direction, [{ value: 'input', label: 'input' }, { value: 'output', label: 'output' }, { value: 'inout', label: 'inout' }], function (v) { pin.direction = v; cb.onChange && cb.onChange(); }));
      field(body, 'capacitance', numInput(pin.capacitance, function (v) { pin.capacitance = v; cb.onChange && cb.onChange(); }));
      field(body, 'function', textInput(pin.function, function (v) { pin.function = v; cb.onChange && cb.onChange(); }));
      field(body, 'clock', selectInput(pin.clock ? 'true' : 'false', [{ value: 'false', label: 'false' }, { value: 'true', label: 'true' }], function (v) { pin.clock = v === 'true'; cb.onChange && cb.onChange(); }));
      field(body, 'max_capacitance', numInput(pin.maxCapacitance, function (v) { pin.maxCapacitance = v; cb.onChange && cb.onChange(); }));
      field(body, 'max_transition', numInput(pin.maxTransition, function (v) { pin.maxTransition = v; cb.onChange && cb.onChange(); }));

      var tSec = el('div', 'gen-subsection');
      tSec.appendChild(el('div', 'gen-subhead', 'timing 弧 (' + pin.timing.length + ')'));
      var tList = el('div', 'gen-timing-list');
      tSec.appendChild(tList);
      function redrawTiming() {
        tList.innerHTML = '';
        tSec.querySelector('.gen-subhead').textContent = 'timing 弧 (' + pin.timing.length + ')';
        for (var t = 0; t < pin.timing.length; t++) {
          renderTiming(tList, cell, pin, t, cb, redrawTiming);
        }
        tList.appendChild(btn('+ 添加 timing 弧', 'btn-ghost', function () {
          pin.timing.push(Model.createTimingArcSpec());
          redrawTiming(); cb.onChange && cb.onChange();
        }));
      }
      redrawTiming();
      body.appendChild(tSec);
      parent.appendChild(card);
    }

    function renderTiming(parent, cell, pin, idx, cb, redrawTiming) {
      var arc = pin.timing[idx];
      var card = el('div', 'gen-timing-card');
      var head = el('div', 'gen-timing-head', 'timing #' + (idx + 1));
      head.appendChild(btn('删除', 'btn-ghost', function () { pin.timing.splice(idx, 1); redrawTiming(); cb.onChange && cb.onChange(); }));
      card.appendChild(head);
      var body = el('div', 'gen-timing-body');
      card.appendChild(body);

      var pinNameOptions = [{ value: '', label: '(空)' }];
      for (var i = 0; i < cell.pins.length; i++) pinNameOptions.push({ value: cell.pins[i].name, label: cell.pins[i].name });
      field(body, 'related_pin', selectInput(arc.relatedPin, pinNameOptions, function (v) { arc.relatedPin = v; cb.onChange && cb.onChange(); }));
      field(body, 'timing_type', selectInput(arc.timingType, [
        { value: 'combinational' }, { value: 'setup' }, { value: 'hold' }, { value: 'recovery' },
        { value: 'removal' }, { value: 'rising_edge' }, { value: 'falling_edge' },
        { value: 'width' }, { value: 'period' }, { value: 'min_pulse_width' }
      ], function (v) { arc.timingType = v; cb.onChange && cb.onChange(); }));
      field(body, 'timing_sense', selectInput(arc.timingSense, [
        { value: 'non_unate' }, { value: 'positive_unate' }, { value: 'negative_unate' }
      ], function (v) { arc.timingSense = v; cb.onChange && cb.onChange(); }));
      field(body, 'when', textInput(arc.when, function (v) { arc.when = v; cb.onChange && cb.onChange(); }));

      var tableKeys = [
        { key: 'cellRise', label: 'cell_rise' },
        { key: 'cellFall', label: 'cell_fall' },
        { key: 'riseTrans', label: 'rise_transition' },
        { key: 'fallTrans', label: 'fall_transition' }
      ];
      for (var ti = 0; ti < tableKeys.length; ti++) {
        (function (tk) {
          var lut = arc.tables[tk.key];
          var lutSec = el('div', 'gen-lut-section');
          lutSec.appendChild(el('div', 'gen-lut-head', tk.label));
          var lutBody = el('div', 'gen-lut-body');
          lutSec.appendChild(lutBody);

          field(lutBody, '来源', selectInput(lut.source, [
            { value: 'bool', label: '布尔函数估算' },
            { value: 'paste', label: '直接粘贴' },
            { value: 'ref', label: '参考库采样' }
          ], function (v) {
            lut.source = v;
            LutSource.resolve(lut, { cell: cell, pin: pin, refLib: cb.getRefLib && cb.getRefLib() });
            redrawLutBody();
            cb.onChange && cb.onChange();
          }));

          var lutDyn = el('div', 'gen-lut-dyn');
          lutBody.appendChild(lutDyn);
          function redrawLutBody() {
            lutDyn.innerHTML = '';
            if (lut.source === 'paste') {
              var sp = lut.sourcePaste;
              field(lutDyn, 'index_1', textareaInput(sp.index1Text, function (v) { sp.index1Text = v; LutSource.resolve(lut); cb.onChange && cb.onChange(); }, 2));
              field(lutDyn, 'index_2', textareaInput(sp.index2Text, function (v) { sp.index2Text = v; LutSource.resolve(lut); cb.onChange && cb.onChange(); }, 2));
              field(lutDyn, 'values', textareaInput(sp.valuesText, function (v) { sp.valuesText = v; LutSource.resolve(lut); cb.onChange && cb.onChange(); }, 6));
            } else if (lut.source === 'ref') {
              var sr = lut.sourceRef;
              var refLib = cb.getRefLib && cb.getRefLib();
              var cellOpts = [{ value: '', label: '(选 cell)' }];
              if (refLib) {
                var names = RefSampler.listRefCells(refLib);
                for (var ci = 0; ci < names.length; ci++) cellOpts.push({ value: names[ci], label: names[ci] });
              }
              field(lutDyn, '参考 cell', selectInput(sr.refCellName, cellOpts, function (v) { sr.refCellName = v; cb.onChange && cb.onChange(); }));
              field(lutDyn, '弧 pin', textInput(sr.arcPin, function (v) { sr.arcPin = v; cb.onChange && cb.onChange(); }));
              field(lutDyn, '弧 related_pin', textInput(sr.arcRelated, function (v) { sr.arcRelated = v; cb.onChange && cb.onChange(); }));
              field(lutDyn, '表类型', selectInput(sr.tableType, [
                { value: 'cellRise', label: 'cell_rise' }, { value: 'cellFall', label: 'cell_fall' },
                { value: 'riseTrans', label: 'rise_transition' }, { value: 'fallTrans', label: 'fall_transition' }
              ], function (v) { sr.tableType = v; cb.onChange && cb.onChange(); }));
              field(lutDyn, 'delay_scale', numInput(sr.delayScale, function (v) { sr.delayScale = v; cb.onChange && cb.onChange(); }));
              field(lutDyn, 'cap_scale', numInput(sr.capScale, function (v) { sr.capScale = v; cb.onChange && cb.onChange(); }));
              var applyBtn = btn('应用采样', 'btn-primary', function () {
                LutSource.resolve(lut, { cell: cell, pin: pin, refLib: refLib });
                cb.onChange && cb.onChange();
              });
              lutDyn.appendChild(applyBtn);
            } else {
              var sb = lut.sourceBool;
              field(lutDyn, '表达式(空则用 pin.function)', textInput(sb.expr, function (v) { sb.expr = v; cb.onChange && cb.onChange(); }));
              field(lutDyn, 'drive', numInput(sb.drive, function (v) { sb.drive = v; cb.onChange && cb.onChange(); }));
              var applyBtn2 = btn('估算生成', 'btn-primary', function () {
                LutSource.resolve(lut, { cell: cell, pin: pin });
                cb.onChange && cb.onChange();
              });
              lutDyn.appendChild(applyBtn2);
            }
            if (lut.warning) {
              var w = el('div', 'gen-lut-warn', '⚠ ' + lut.warning);
              lutDyn.appendChild(w);
            }
            if (lut.values && lut.values.length) {
              var info = el('div', 'gen-lut-info', '当前: ' + lut.values.length + '×' + (lut.values[0] ? lut.values[0].length : 0) + ' 表');
              lutDyn.appendChild(info);
            }
          }
          redrawLutBody();
          body.appendChild(lutSec);
        })(tableKeys[ti]);
      }
      parent.appendChild(card);
    }

    function applyErrors(root, errors) {
      var inputs = root.querySelectorAll('.gen-input, .gen-select, .gen-textarea');
      for (var i = 0; i < inputs.length; i++) inputs[i].classList.remove('error');
      if (!errors || !errors.length) return;
      for (var e = 0; e < errors.length; e++) {
        if (errors[e].level !== 'error') continue;
      }
    }

    return { bind: bind, applyErrors: applyErrors };
  })();
  LibGen.Form = Form;

  /* ============================================================
   * T10. Preview — 预览区渲染 (debounce + 虚拟滚动)
   * ============================================================ */
  var Preview = (function () {
    function render(text, container) {
      if (!container) return;
      container.innerHTML = '';
      var wrap = el('pre', 'gen-preview-pre');
      var code = el('code', 'gen-preview-code');
      var r = Highlighter.highlight(text, { maxLines: 0 });
      code.innerHTML = r.html;
      wrap.appendChild(code);
      container.appendChild(wrap);
    }
    function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }

    function scheduleRefresh(text, container) {
      var self = scheduleRefresh;
      clearTimeout(self._t);
      self._t = setTimeout(function () { render(text, container); }, 150);
    }

    return { render: render, scheduleRefresh: scheduleRefresh };
  })();
  LibGen.Preview = Preview;

  /* ============================================================
   * T11. Controller — 主控制器
   * ============================================================ */
  var Controller = (function () {
    var state = { spec: null, root: null, preview: null, errors: null, currentText: '', refLib: null };

    function toast(msg, kind) {
      var t = document.createElement('div');
      t.className = 'gen-toast' + (kind === 'error' ? ' gen-toast-error' : (kind === 'success' ? ' gen-toast-success' : ''));
      t.textContent = msg;
      t.style.cssText = 'position:fixed;top:70px;right:20px;z-index:99999;padding:10px 16px;border-radius:8px;' +
        'background:' + (kind === 'error' ? '#fee2e2' : (kind === 'success' ? '#d1fae5' : '#eff6ff')) + ';' +
        'color:' + (kind === 'error' ? '#b91c1c' : (kind === 'success' ? '#065f46' : '#1e293b')) + ';' +
        'font-size:13px;box-shadow:0 4px 12px rgba(15,23,42,.12);max-width:420px';
      document.body.appendChild(t);
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3500);
    }

    function downloadText(text, name) {
      var blob = new Blob([text], { type: 'application/octet-stream' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }

    function init(root, preview, errorsEl) {
      state.root = root;
      state.preview = preview;
      state.errors = errorsEl;
      state.spec = Model.createLibrarySpec();

      var cb = {
        onChange: function () { /* 实时预览关闭，按生成按钮触发 */ },
        rerender: function () { Form.bind(root, state.spec, cb); },
        getRefLib: function () { return state.refLib; }
      };
      state.cb = cb;
      Form.bind(root, state.spec, cb);

      bindToolbar();
    }

    function bindToolbar() {
      var genBtn = document.getElementById('btnGen');
      var dlBtn = document.getElementById('btnGenDownload');
      var sendBtn = document.getElementById('btnGenSend');
      var refBtn = document.getElementById('btnGenRef');
      var refInput = document.getElementById('btnGenRefFile');
      var importRefCellBtn = document.getElementById('btnGenImportRefCell');
      var exportCfgBtn = document.getElementById('btnGenExportCfg');
      var importCfgBtn = document.getElementById('btnGenImportCfg');
      var importCfgFile = document.getElementById('btnGenImportCfgFile');

      if (genBtn) genBtn.addEventListener('click', generate);
      if (dlBtn) dlBtn.addEventListener('click', download);
      if (sendBtn) sendBtn.addEventListener('click', sendToAnalyzer);
      if (importRefCellBtn) importRefCellBtn.addEventListener('click', showRefCellPicker);
      if (exportCfgBtn) exportCfgBtn.addEventListener('click', exportConfig);
      if (importCfgBtn && importCfgFile) {
        importCfgBtn.addEventListener('click', function () { importCfgFile.click(); });
        importCfgFile.addEventListener('change', function (e) {
          var f = e.target.files[0];
          if (f) importConfig(f);
          e.target.value = '';
        });
      }
      if (refBtn && refInput) {
        refBtn.addEventListener('click', function () { refInput.click(); });
        refInput.addEventListener('change', function (e) {
          var f = e.target.files[0];
          if (!f) return;
          var reader = new FileReader();
          reader.onload = function () {
            var r = RefSampler.loadRef(reader.result);
            if (r.ok) {
              state.refLib = r.lib;
              toast('参考库加载成功: ' + r.lib.name + ' (' + r.lib.cells.length + ' cells)', 'success');
              if (importRefCellBtn) importRefCellBtn.disabled = false;
            }
            else toast('参考库加载失败: ' + r.error, 'error');
          };
          reader.readAsText(f);
        });
      }
    }

    /* 从参考库选取 cell 导入为可编辑 cell */
    function showRefCellPicker() {
      if (!state.refLib) { toast('请先加载参考库', 'error'); return; }
      var names = RefSampler.listRefCells(state.refLib);
      var mask = document.createElement('div');
      mask.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.4);z-index:99998;display:flex;align-items:center;justify-content:center';
      var dlg = document.createElement('div');
      dlg.style.cssText = 'background:#fff;border-radius:10px;padding:16px;width:460px;max-height:75vh;display:flex;flex-direction:column;box-shadow:0 20px 50px rgba(0,0,0,.3);font-family:inherit';
      dlg.innerHTML = '<div style="font-weight:600;margin-bottom:10px;font-size:14px">从参考库「' + (state.refLib.name || '') + '」导入 cell 到表单改写</div>' +
        '<input class="gen-input gen-refsearch" placeholder="搜索 cell 名..." style="margin-bottom:8px">' +
        '<div class="gen-reflist" style="flex:1;overflow-y:auto;border:1px solid #e3e8f0;border-radius:6px;min-height:200px"></div>' +
        '<div style="margin-top:10px;color:#94a3b8;font-size:11px">点击 cell 名即导入到表单，可在表单中任意改写后生成</div>' +
        '<div style="margin-top:8px;text-align:right"><button class="btn btn-ghost gen-refcancel">取消</button></div>';
      mask.appendChild(dlg);
      document.body.appendChild(mask);
      var list = dlg.querySelector('.gen-reflist');
      var search = dlg.querySelector('.gen-refsearch');
      var cancelBtn = dlg.querySelector('.gen-refcancel');

      function render(filter) {
        list.innerHTML = '';
        var f = (filter || '').toLowerCase();
        var count = 0;
        for (var i = 0; i < names.length && count < 1000; i++) {
          if (f && names[i].toLowerCase().indexOf(f) < 0) continue;
          count++;
          (function (name) {
            var item = document.createElement('div');
            item.style.cssText = 'padding:6px 10px;cursor:pointer;border-bottom:1px solid #f1f5f9;font-size:12.5px;font-family:var(--mono)';
            item.textContent = name;
            item.addEventListener('mouseenter', function () { item.style.background = '#dbeafe'; });
            item.addEventListener('mouseleave', function () { item.style.background = ''; });
            item.addEventListener('click', function () {
              try {
                var refCell = RefSampler.findRefCell(state.refLib, name);
                if (!refCell) { toast('cell 不存在: ' + name, 'error'); return; }
                var cellSpec = RefSampler.cellToSpec(refCell);
                state.spec.cells.push(cellSpec);
                if (mask.parentNode) mask.parentNode.removeChild(mask);
                Form.bind(state.root, state.spec, state.cb);
                /* 滚动到 cell 列表底部, 让用户看到新导入的 cell */
                var wrap = state.root.closest('.gen-form-wrap') || state.root.parentElement;
                if (wrap) wrap.scrollTop = wrap.scrollHeight;
                toast('已导入 cell: ' + name + '（' + cellSpec.pins.length + ' pins），可在表单中改写', 'success');
              } catch (e) {
                if (mask.parentNode) mask.parentNode.removeChild(mask);
                toast('导入失败: ' + (e.message || e), 'error');
                console.error('导入 cell 失败', e);
              }
            });
            list.appendChild(item);
          })(names[i]);
        }
        if (!count) list.innerHTML = '<div style="padding:12px;color:#94a3b8;text-align:center">无匹配 cell</div>';
        else if (count >= 1000) {
          var more = document.createElement('div');
          more.style.cssText = 'padding:6px 10px;color:#94a3b8;font-size:11px;text-align:center';
          more.textContent = '… 仅显示前 1000 个，请用搜索缩小范围';
          list.appendChild(more);
        }
      }
      render('');
      search.addEventListener('input', function () { render(search.value); });
      cancelBtn.addEventListener('click', function () { if (mask.parentNode) mask.parentNode.removeChild(mask); });
      mask.addEventListener('click', function (e) { if (e.target === mask && mask.parentNode) mask.parentNode.removeChild(mask); });
      document.addEventListener('keydown', escHandler);
      function escHandler(e) { if (e.key === 'Escape' || e.keyCode === 27) { if (mask.parentNode) mask.parentNode.removeChild(mask); document.removeEventListener('keydown', escHandler); } }
    }

    /* 导出配置文件 (JSON) */
    function exportConfig() {
      if (!state.spec) { toast('无配置可导出', 'error'); return; }
      try {
        var json = JSON.stringify(state.spec, null, 2);
        var name = (state.spec.libraryName || 'generated') + '.gen.json';
        downloadText(json, name);
        toast('已导出配置: ' + name + ' (' + state.spec.cells.length + ' cells)', 'success');
      } catch (e) {
        toast('导出失败: ' + e.message, 'error');
      }
    }

    /* 导入配置文件 (JSON) */
    function importConfig(file) {
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var spec = JSON.parse(reader.result);
          if (!spec || typeof spec !== 'object' || !Array.isArray(spec.cells)) {
            throw new Error('不是有效的生成器配置文件');
          }
          if (!spec.templates) spec.templates = [];
          if (!spec.voltageMap) spec.voltageMap = [];
          if (!spec.operatingConditions) spec.operatingConditions = [];
          if (!spec.defines) spec.defines = [];
          state.spec = spec;
          Form.bind(state.root, state.spec, state.cb);
          toast('已导入配置: ' + file.name + ' (' + spec.cells.length + ' cells)', 'success');
        } catch (e) {
          toast('导入失败: ' + e.message, 'error');
        }
      };
      reader.onerror = function () { toast('文件读取失败', 'error'); };
      reader.readAsText(file);
    }

    function generate() {
      var errs = state.errors;
      errs.innerHTML = '';
      var v = Validator.validateSpec(state.spec);
      if (!v.ok) {
        renderErrors(v.errors);
        Form.applyErrors(state.root, v.errors);
        toast('校验失败: ' + v.errors.length + ' 个错误', 'error');
        return;
      }
      var ser;
      try { ser = Serializer.serialize(state.spec); }
      catch (e) { toast('序列化失败: ' + e.message, 'error'); return; }
      state.currentText = ser.text;
      Preview.render(ser.text, state.preview);
      toast('已生成 ' + ser.cellCount + ' 个 cell，正在校验自洽性…', 'success');

      Validator.validateSelfConsistency(ser.text).then(function (sc) {
        if (sc.ok) {
          toast('自洽性校验通过: parser 可完整解析', 'success');
          var dlBtn = document.getElementById('btnGenDownload');
          var sendBtn = document.getElementById('btnGenSend');
          if (dlBtn) dlBtn.disabled = false;
          if (sendBtn) sendBtn.disabled = false;
        } else {
          renderErrors([{ level: 'error', field: 'selfConsistency', msg: '生成文本无法被 parser 解析: ' + sc.error }]);
          toast('⚠ 自洽性校验失败: 生成文本无法解析', 'error');
        }
      });
    }

    function renderErrors(errors) {
      var box = state.errors;
      box.innerHTML = '';
      if (!errors.length) return;
      var list = el('ul', 'gen-error-list');
      for (var i = 0; i < errors.length; i++) {
        var li = el('li', 'gen-error-item' + (errors[i].level === 'warn' ? ' warn' : ''));
        li.textContent = '[' + errors[i].level + '] ' + errors[i].field + ': ' + errors[i].msg;
        list.appendChild(li);
      }
      box.appendChild(list);
    }
    function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }

    function download() {
      if (!state.currentText) { toast('请先生成', 'error'); return; }
      var name = (state.spec.libraryName || 'generated') + '.lib';
      downloadText(state.currentText, name);
      toast('已下载 ' + name, 'success');
    }

    function sendToAnalyzer() {
      if (!state.currentText) { toast('请先生成', 'error'); return; }
      if (state.currentText.length > 5e6) {
        toast('文本过大(>5MB)，请改用下载后手动上传至 analyzer', 'error');
        return;
      }
      try {
        sessionStorage.setItem('__gen_lib__', state.currentText);
        sessionStorage.setItem('__gen_lib_name__', (state.spec.libraryName || 'generated') + '.lib');
        location.href = 'index.html';
      } catch (e) {
        toast('sessionStorage 写入失败: ' + e.message, 'error');
      }
    }

    return { init: init, generate: generate, download: download, sendToAnalyzer: sendToAnalyzer,
             exportConfig: exportConfig, importConfig: importConfig, showRefCellPicker: showRefCellPicker };
  })();
  LibGen.Controller = Controller;
})(typeof self !== 'undefined' ? self : this);