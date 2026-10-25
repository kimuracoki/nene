// lambda-jsx のランタイム。仮想 DOM、Style から CSS への変換、The Elm Architecture の実行を受け持つ
const $rt = (() => {
  // ---- 値 ----

  const lazy = (f) => {
    let state = 0; // 0: 未計算, 1: 計算中, 2: 計算済み
    let value;
    return () => {
      if (state === 2) return value;
      if (state === 1) throw new Error("lambda-jsx: 値の定義が自分自身を参照しています");
      state = 1;
      value = f();
      state = 2;
      return value;
    };
  };

  const eq = (a, b) => {
    if (a === b) return true;
    if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
    if (Array.isArray(a)) {
      if (!Array.isArray(b) || a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) if (!eq(a[i], b[i])) return false;
      return true;
    }
    const ka = Object.keys(a);
    if (ka.length !== Object.keys(b).length) return false;
    for (const k of ka) if (!eq(a[k], b[k])) return false;
    return true;
  };

  const append = (a, b) => (typeof a === "string" ? a + b : a.concat(b));
  const compose = (f, g) => (x) => f(g(x));
  const idiv = (a, b) => (b === 0 ? 0 : Math.trunc(a / b));
  const show = (x) => (typeof x === "boolean" ? (x ? "True" : "False") : String(x));
  const fail = (name) => new Error(`lambda-jsx: ${name} のどのパターンにも合いませんでした`);
  const Just = (x) => ({ $: "Just", a: [x] });
  const Nothing = { $: "Nothing" };
  const defaults = {};

  // ---- 仮想 DOM ----

  const text = (s) => ({ t: "text", text: s });

  const norm = (children, out = []) => {
    for (const c of children) {
      if (typeof c === "string") out.push(text(c));
      else if (Array.isArray(c)) norm(c, out);
      else if (c.t === "frag") norm(c.children, out);
      else out.push(c);
    }
    return out;
  };

  const h = (tag, attrs, children) => ({
    t: "el",
    tag,
    attrs,
    key: attrs.key,
    cls: attrs.style ? styleClass(attrs.style, "") : "",
    children: norm(children),
  });

  const frag = (children) => ({ t: "frag", children: norm(children) });

  // ---- デザイントークン ----

  const tag = (v) => v.$;
  const SPACE = { None: "0", XS: "4px", S: "8px", M: "16px", L: "24px", XL: "32px" };
  const RADIUS = { None: "0", XS: "2px", S: "4px", M: "8px", L: "16px", XL: "9999px" };
  const FONT = { None: "inherit", XS: "12px", S: "14px", M: "16px", L: "20px", XL: "28px" };
  const SHADOW = {
    None: "none",
    XS: "0 1px 2px rgba(15,23,42,.08)",
    S: "0 1px 3px rgba(15,23,42,.12), 0 1px 2px rgba(15,23,42,.06)",
    M: "0 4px 12px rgba(15,23,42,.12)",
    L: "0 10px 24px rgba(15,23,42,.14)",
    XL: "0 20px 48px rgba(15,23,42,.18)",
  };
  const color = (v) => (tag(v) === "Transparent" ? "transparent" : `var(--lx-${tag(v).toLowerCase()})`);
  const ALIGN = { Start: "flex-start", Center: "center", End: "flex-end", Stretch: "stretch" };
  const JUSTIFY = { Start: "flex-start", Center: "center", End: "flex-end", Stretch: "space-between" };

  const length = (v, axis) => {
    switch (tag(v)) {
      case "Fill":
        return axis === "width" ? "width:100%;flex:1 1 0%;min-width:0" : "height:100%";
      case "Shrink":
        return `${axis}:auto;flex:0 0 auto`;
      case "Px":
        return `${axis}:${v.a[0]}px;flex:0 0 auto`;
    }
    return "";
  };

  const styleDecls = (s) => {
    const d = [];
    if (s.padding) d.push(`padding:${SPACE[tag(s.padding)]}`);
    if (s.paddingX) d.push(`padding-left:${SPACE[tag(s.paddingX)]};padding-right:${SPACE[tag(s.paddingX)]}`);
    if (s.paddingY) d.push(`padding-top:${SPACE[tag(s.paddingY)]};padding-bottom:${SPACE[tag(s.paddingY)]}`);
    if (s.width) d.push(length(s.width, "width"));
    if (s.height) d.push(length(s.height, "height"));
    if (s.background) d.push(`background:${color(s.background)}`);
    if (s.color) d.push(`color:${color(s.color)}`);
    if (s.border) d.push(`border:1px solid ${color(s.border)}`);
    if (s.radius) d.push(`border-radius:${RADIUS[tag(s.radius)]}`);
    if (s.shadow) d.push(`box-shadow:${SHADOW[tag(s.shadow)]}`);
    if (s.font) d.push(`font-size:${FONT[tag(s.font)]}`);
    if (s.weight) d.push(`font-weight:${tag(s.weight) === "Bold" ? 700 : 400}`);
    return d.join(";");
  };

  // ---- CSS の生成（同じ宣言には同じクラスを使い回す） ----

  let sheet = null;
  const classes = new Map();

  const addRule = (rule) => {
    if (!sheet) {
      const el = document.createElement("style");
      el.setAttribute("data-lambda-jsx", "");
      document.head.appendChild(el);
      sheet = el.sheet;
    }
    sheet.insertRule(rule, sheet.cssRules.length);
  };

  const classFor = (base, hover) => {
    const key = `${base}|${hover}`;
    let cls = classes.get(key);
    if (cls) return cls;
    cls = `lx${classes.size}`;
    classes.set(key, cls);
    if (typeof document === "undefined") return cls;
    const transition = hover ? ";transition:background-color .15s,box-shadow .15s,color .15s,border-color .15s" : "";
    if (base || transition) addRule(`.${cls}{${base}${transition}}`);
    if (hover) addRule(`.${cls}:hover:not(:disabled){${hover}}`);
    return cls;
  };

  const styleClass = (style, extra) => {
    const base = [extra, styleDecls(style)].filter(Boolean).join(";");
    const hover = style.hover ? styleDecls(style.hover) : "";
    if (!base && !hover) return "";
    return classFor(base, hover);
  };

  // ---- レイアウトタグ ----

  const layoutDecls = (kind, p) => {
    const gap = p.gap ? `gap:${SPACE[tag(p.gap)]}` : "";
    switch (kind) {
      case "row":
      case "column":
        return [
          `display:flex;flex-direction:${kind}`,
          gap,
          `align-items:${ALIGN[tag(p.align)]}`,
          `justify-content:${JUSTIFY[tag(p.justify)]}`,
          p.wrap ? "flex-wrap:wrap" : "",
        ].filter(Boolean).join(";");
      case "grid":
        return [`display:grid;grid-template-columns:repeat(${Math.max(1, p.columns)},minmax(0,1fr))`, gap].filter(Boolean).join(";");
      case "stack":
        return `display:grid;align-items:${ALIGN[tag(p.align)]};justify-items:${ALIGN[tag(p.justify)]}`;
      case "scroll":
        return tag(p.direction) === "Horizontal" ? "overflow-x:auto;overflow-y:hidden;max-width:100%" : "overflow-y:auto;max-height:100%";
    }
    return "";
  };

  const layout = (kind) => (props) => (children) => ({
    t: "el",
    tag: "div",
    attrs: {},
    key: undefined,
    cls: [kind === "stack" ? "lx-stack" : "", styleClass(props.style, layoutDecls(kind, props))].filter(Boolean).join(" "),
    children: norm(children),
  });

  const spacer = () => ({ t: "el", tag: "div", attrs: {}, key: undefined, cls: classFor("flex:1 1 auto", ""), children: [] });

  // ---- DOM への反映 ----

  const EVENTS = { onClick: "click", onSubmit: "submit", onInput: "input", onCheck: "change" };

  const createRenderer = (dispatch) => {
    const listen = (el, name) => {
      el.$lx ??= {};
      if (name in el.$lx) return;
      el.addEventListener(EVENTS[name], (ev) => {
        const handler = el.$lx[name];
        if (handler === undefined) return;
        if (name === "onSubmit") ev.preventDefault();
        if (name === "onClick") ev.stopPropagation();
        if (name === "onInput") dispatch(handler(ev.target.value));
        else if (name === "onCheck") dispatch(handler(ev.target.checked));
        else dispatch(handler);
      });
    };

    const setAttr = (el, name, value) => {
      if (name === "style" || name === "key") return;
      if (name in EVENTS) {
        listen(el, name);
        el.$lx[name] = value;
      } else if (name === "value") {
        if (el.value !== value) el.value = value;
      } else if (name === "checked" || name === "disabled") {
        el[name] = value;
      } else {
        el.setAttribute(name, value);
      }
    };

    const removeAttr = (el, name) => {
      if (name in EVENTS) {
        if (el.$lx) el.$lx[name] = undefined;
      } else if (name === "checked" || name === "disabled") {
        el[name] = false;
      } else if (name === "value") {
        el.value = "";
      } else {
        el.removeAttribute(name);
      }
    };

    const render = (v) => {
      if (v.t === "text") return document.createTextNode(v.text);
      const el = document.createElement(v.tag);
      if (v.cls) el.className = v.cls;
      for (const [k, val] of Object.entries(v.attrs)) setAttr(el, k, val);
      for (const c of v.children) el.appendChild(render(c));
      return el;
    };

    const patch = (parent, oldV, newV, dom) => {
      if (oldV.t !== newV.t || (newV.t === "el" && oldV.tag !== newV.tag)) {
        const fresh = render(newV);
        parent.replaceChild(fresh, dom);
        return fresh;
      }
      if (newV.t === "text") {
        if (oldV.text !== newV.text) dom.nodeValue = newV.text;
        return dom;
      }
      if (oldV.cls !== newV.cls) dom.className = newV.cls;
      for (const k of Object.keys(oldV.attrs)) if (!(k in newV.attrs)) removeAttr(dom, k);
      for (const [k, val] of Object.entries(newV.attrs)) {
        if (k in EVENTS || k === "value" || k === "checked" || oldV.attrs[k] !== val) setAttr(dom, k, val);
      }
      patchChildren(dom, oldV.children, newV.children);
      return dom;
    };

    const patchChildren = (dom, oldC, newC) => {
      const keyed = newC.length > 0 && newC.every((c) => c.key !== undefined) && oldC.every((c) => c.key !== undefined);
      if (keyed) {
        const old = new Map(oldC.map((c, i) => [c.key, { v: c, dom: dom.childNodes[i] }]));
        const doms = newC.map((c) => {
          const o = old.get(c.key);
          if (!o) return render(c);
          old.delete(c.key);
          return patch(dom, o.v, c, o.dom);
        });
        for (const o of old.values()) o.dom.remove();
        doms.forEach((d, i) => {
          if (dom.childNodes[i] !== d) dom.insertBefore(d, dom.childNodes[i] ?? null);
        });
        return;
      }
      const common = Math.min(oldC.length, newC.length);
      for (let i = 0; i < common; i++) patch(dom, oldC[i], newC[i], dom.childNodes[i]);
      for (let i = common; i < newC.length; i++) dom.appendChild(render(newC[i]));
      for (let i = oldC.length - 1; i >= common; i--) dom.removeChild(dom.childNodes[i]);
    };

    return { patchChildren };
  };

  // ---- アプリの実行 ----

  const BASE_CSS = [
    ":root{--lx-primary:#3563e9;--lx-success:#1f9d55;--lx-warning:#c27c0e;--lx-danger:#d93f3f;--lx-text:#1f2328;--lx-muted:#6b7280;--lx-surface:#ffffff;--lx-background:#f3f4f6;--lx-border:#d0d5dd}",
    "*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}",
    "body{font-family:system-ui,-apple-system,'Hiragino Sans','Noto Sans JP',sans-serif;font-size:16px;line-height:1.5;color:var(--lx-text);background:var(--lx-background)}",
    "ul,ol{list-style:none}",
    "button,input,textarea{font:inherit;color:inherit}",
    "button{background:none;border:none;cursor:pointer;text-align:inherit}",
    "button:disabled{opacity:.45;cursor:default}",
    "input,textarea{min-width:0}",
    "img{display:block;max-width:100%}",
    "h1{font-size:28px;line-height:1.3}",
    "h2{font-size:20px;line-height:1.3}",
    "h3{font-size:16px}",
    "a{color:var(--lx-primary)}",
    ".lx-stack>*{grid-area:1/1}",
  ];

  const run = (program, root) => {
    for (const rule of BASE_CSS) addRule(rule);
    let model;
    let pending = false;
    let current = [];
    const step = (result) => {
      if (program.kind === "sandbox") {
        model = result;
      } else {
        model = result[0];
        runCmd(result[1]);
      }
    };
    const runCmd = (cmd) => {
      if (cmd === null || cmd === undefined) return;
      if (Array.isArray(cmd)) cmd.forEach(runCmd);
      else queueMicrotask(() => cmd(dispatch));
    };
    const dispatch = (msg) => {
      step(program.update(msg)(model));
      if (!pending) {
        pending = true;
        requestAnimationFrame(draw);
      }
    };
    const renderer = createRenderer(dispatch);
    const draw = () => {
      pending = false;
      const next = norm([program.view(model)]);
      renderer.patchChildren(root, current, next);
      current = next;
    };
    root.replaceChildren();
    step(program.init);
    draw();
  };

  return {
    lazy, eq, append, compose, idiv, show, fail, Just, Nothing, defaults,
    h, frag, layout, spacer, run,
    // テスト用
    styleDecls, norm,
  };
})();
