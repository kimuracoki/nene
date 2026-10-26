// Nene のランタイム。仮想 DOM、レイアウトタグ、style ブロックの CSS の読み込み、The Elm Architecture の実行を受け持つ
const $rt = (() => {
  // ---- 値 ----

  const lazy = (f) => {
    let state = 0; // 0: 未計算, 1: 計算中, 2: 計算済み
    let value;
    return () => {
      if (state === 2) return value;
      if (state === 1) throw new Error("nene: 値の定義が自分自身を参照しています");
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
  const fail = (name) => new Error(`nene: ${name} のどのパターンにも合いませんでした`);
  const Just = (x) => ({ $: "Just", a: [x] });
  const Nothing = { $: "Nothing" };
  const defaults = {};
  const Ok = (x) => ({ $: "Ok", a: [x] });
  const Err = (e) => ({ $: "Err", a: [e] });

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

  // scope は、style ブロックを持つファイルで書いたタグに付く印のクラス
  const h = (tag, attrs, children, scope) => ({
    t: "el",
    tag,
    attrs,
    key: attrs.key,
    cls: [attrs.class, scope].filter(Boolean).join(" "),
    children: norm(children),
  });

  const scope = (name, v) => ({ ...v, cls: v.cls ? `${v.cls} ${name}` : name });

  const frag = (children) => ({ t: "frag", children: norm(children) });

  // ---- レイアウトタグで使う値 ----

  const tag = (v) => v.$;
  const SPACE = { None: "0", XS: "4px", S: "8px", M: "16px", L: "24px", XL: "32px" };
  const ALIGN = { Start: "flex-start", Center: "center", End: "flex-end", Stretch: "stretch" };
  const JUSTIFY = { Start: "flex-start", Center: "center", End: "flex-end", Stretch: "space-between" };

  // ---- CSS の生成（同じ宣言には同じクラスを使い回す） ----

  // ページに入れる順番を固定する: リセット → レイアウトタグ用 → 各ファイルの style ブロック。
  // 後のものほど優先されるので、利用者の CSS がいちばん強い
  const hasDocument = typeof document !== "undefined";
  const styleElement = (name) => {
    if (!hasDocument) return null;
    const el = document.createElement("style");
    el.setAttribute("data-nene", name);
    document.head.appendChild(el);
    return el;
  };
  const baseStyle = styleElement("base");
  const layoutStyle = styleElement("layout");
  const userStyle = styleElement("components");
  const classes = new Map();

  const addRule = (rule) => {
    if (layoutStyle) layoutStyle.sheet.insertRule(rule, layoutStyle.sheet.cssRules.length);
  };

  // style ブロックの CSS（コンパイラがクラス名を部品ごとに書き換えたもの）
  const css = (text) => {
    if (userStyle) userStyle.textContent += text + "\n";
  };

  const BREAKPOINT = { XS: 360, S: 480, M: 768, L: 1024, XL: 1280 };

  // narrow は「画面幅が狭いときに上書きする宣言」。[幅, 宣言] の組
  const classFor = (base, hover, narrow = null) => {
    const key = `${base}|${hover}|${narrow ? narrow.join(":") : ""}`;
    let cls = classes.get(key);
    if (cls) return cls;
    cls = `nene${classes.size}`;
    classes.set(key, cls);
    if (!hasDocument) return cls;
    if (base) addRule(`.${cls}{${base}}`);
    if (hover) addRule(`.${cls}:hover{${hover}}`);
    if (narrow) addRule(`@media (max-width: ${narrow[0] - 0.02}px){.${cls}{${narrow[1]}}}`);
    return cls;
  };


  // 狭い画面での並び方
  const collapseDecls = (kind, p) => {
    const width = p.collapse ? BREAKPOINT[tag(p.collapse)] : undefined;
    if (!width) return null;
    if (kind === "row") return [width, "flex-direction:column;align-items:stretch"];
    if (kind === "grid") return [width, "grid-template-columns:minmax(0,1fr)"];
    return null;
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
    cls: [kind === "stack" ? "nene-stack" : "", classFor(layoutDecls(kind, props), "", collapseDecls(kind, props)), props.class]
      .filter(Boolean)
      .join(" "),
    children: norm(children),
  });

  const spacer = () => ({ t: "el", tag: "div", attrs: {}, key: undefined, cls: classFor("flex:1 1 auto", ""), children: [] });

  // ---- DOM への反映 ----

  const EVENTS = {
    onClick: "click",
    onDoubleClick: "dblclick",
    onSubmit: "submit",
    onFocus: "focus",
    onBlur: "blur",
    onMouseEnter: "mouseenter",
    onMouseLeave: "mouseleave",
    onInput: "input",
    onChange: "change",
    onCheck: "change",
  };
  // DOM のプロパティとして持つ属性（属性を書き換えるだけでは、画面上の状態が変わらないもの）
  // PROPS は描くたびに model の値へ合わせる。BOOLS は値が変わったときだけ変える。
  // open（details・dialog）と popover は、ユーザーが開け閉めした状態を、model が変わらない限り保つ
  const PROPS = { value: "value", checked: "checked", selected: "selected", disabled: "disabled", readonly: "readOnly", muted: "muted" };
  const BOOLS = new Set(["required", "multiple", "hidden", "autofocus", "controls", "autoplay", "loop", "playsinline", "reversed", "novalidate", "open", "popover"]);

  // vars={{ barWidth = "40%" }} → --bar-width: 40%
  const varName = (field) => `--${field.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
  const setVars = (el, oldVars, newVars) => {
    for (const k of Object.keys(oldVars ?? {})) if (!newVars || !(k in newVars)) el.style.removeProperty(varName(k));
    for (const [k, v] of Object.entries(newVars ?? {})) if (!oldVars || oldVars[k] !== v) el.style.setProperty(varName(k), v);
  };

  const createRenderer = (dispatch) => {
    const listen = (el, name) => {
      el.$nene ??= {};
      if (name in el.$nene) return;
      el.addEventListener(EVENTS[name], (ev) => {
        const handler = el.$nene[name];
        if (handler === undefined) return;
        if (name === "onSubmit") ev.preventDefault();
        if (name === "onClick") ev.stopPropagation();
        if (name === "onInput" || name === "onChange") dispatch(handler(ev.target.value));
        else if (name === "onCheck") dispatch(handler(ev.target.checked));
        else dispatch(handler);
      });
    };

    // /about や /photo.jpg のような、アプリの一番上から書いたパスには、置き場所（base）を付け足す
    const URL_ATTRS = new Set(["href", "src", "poster"]);

    const setAttr = (el, name, value, old) => {
      if (name === "class" || name === "key") return;
      if (name === "vars") {
        setVars(el, old, value);
      } else if (name in EVENTS) {
        listen(el, name);
        el.$nene[name] = value;
      } else if (name in PROPS) {
        if (el[PROPS[name]] !== value) el[PROPS[name]] = value;
      } else if (BOOLS.has(name)) {
        if (value) el.setAttribute(name, "");
        else el.removeAttribute(name);
      } else if (URL_ATTRS.has(name)) {
        el.setAttribute(name, withBase(value));
      } else {
        el.setAttribute(name, String(value));
      }
    };

    const removeAttr = (el, name, old) => {
      if (name === "vars") {
        setVars(el, old, null);
      } else if (name in EVENTS) {
        if (el.$nene) el.$nene[name] = undefined;
      } else if (name in PROPS) {
        el[PROPS[name]] = name === "value" ? "" : false;
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
      for (const k of Object.keys(oldV.attrs)) if (!(k in newV.attrs)) removeAttr(dom, k, oldV.attrs[k]);
      for (const [k, val] of Object.entries(newV.attrs)) {
        if (k in EVENTS || k in PROPS || oldV.attrs[k] !== val) setAttr(dom, k, val, oldV.attrs[k]);
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

  // ---- 最小限のリセット ----
  // 見た目（色・文字の大きさなど）は利用者の CSS に任せる。ここでは、ブラウザごとの違いをならすだけ

  const BASE_CSS = `
:root { --space-xs: 4px; --space-s: 8px; --space-m: 16px; --space-l: 24px; --space-xl: 32px; }
*, *::before, *::after { box-sizing: border-box; margin: 0; }
img { display: block; max-width: 100%; }
button, input, textarea, select { font: inherit; color: inherit; }
button { cursor: pointer; }
.nene-stack > * { grid-area: 1 / 1; }
`;
  if (baseStyle) baseStyle.textContent = BASE_CSS;

  // ---- サブスクリプション ----

  // key が同じあいだは購読を続け、メッセージを作る関数だけを最新のものに差し替える
  const sub = (key, toMsg, start) => ({ $sub: true, key, toMsg, start });

  const flattenSubs = (s, out = []) => {
    if (s === null || s === undefined) return out;
    if (Array.isArray(s)) s.forEach((x) => flattenSubs(x, out));
    else out.push(s);
    return out;
  };

  // ---- URL ----
  // base はアプリを置いた場所（/ や /repo/）。アプリの中で扱うパスは、いつも base から見たもの

  let base = "/";
  let env = {};
  let onNavigate = null;

  // ビルドの設定。Vite の import.meta.env から、モジュールを読み込む前に渡される
  const configure = (options) => {
    base = options.base ?? "/";
    env = options.env ?? {};
  };

  const envValue = (name) => {
    const v = env[`NENE_${name}`];
    return v === undefined ? Nothing : Just(String(v));
  };

  const withBase = (url) => (url.startsWith("/") && !url.startsWith("//") ? base + url.slice(1) : url);
  const inApp = (pathname) => pathname.startsWith(base) || pathname === base.slice(0, -1);

  const currentUrl = () => {
    const u = new URL(location.href);
    return {
      path: u.pathname.slice(base.length - 1).split("/").filter(Boolean).map(decodeURIComponent),
      query: [...u.searchParams.entries()],
      hash: decodeURIComponent(u.hash.replace(/^#/, "")),
    };
  };

  // 画面が移ったら、描いたあとで #… の要素か一番上へスクロールする。戻る・進むでは、前にいた位置へ戻す
  let pendingScroll = null;

  const restoreScroll = () => {
    const target = pendingScroll;
    pendingScroll = null;
    if (target === null || typeof window.scrollTo !== "function") return;
    if (target !== "top") return window.scrollTo(target[0], target[1]);
    const id = decodeURIComponent(location.hash.slice(1));
    const el = id ? document.getElementById(id) : null;
    if (el) el.scrollIntoView();
    else window.scrollTo(0, 0);
  };

  const go = (url, replace) => {
    if (replace) {
      history.replaceState(history.state, "", url);
    } else {
      history.replaceState({ ...history.state, scroll: [window.scrollX, window.scrollY] }, "");
      history.pushState({}, "", url);
      pendingScroll = "top";
    }
    if (onNavigate) onNavigate();
  };

  // Nav.pushUrl などから。url はアプリの中のパス
  const navigate = (url, replace) => go(withBase(url), replace);

  // ---- アプリの実行 ----

  const run = (config, root) => {

    let model = config.init;
    let pending = false;
    let current = [];
    const running = new Map(); // key → { sub, stop }

    const runCmd = (cmd) => {
      if (cmd === null || cmd === undefined) return;
      if (Array.isArray(cmd)) cmd.forEach(runCmd);
      else queueMicrotask(() => cmd(dispatch));
    };

    const updateSubs = () => {
      const next = new Map(flattenSubs(config.subscriptions(model)).map((s) => [s.key, s]));
      for (const [key, r] of running) {
        if (!next.has(key)) {
          r.stop();
          running.delete(key);
        }
      }
      for (const [key, s] of next) {
        const r = running.get(key);
        if (r) {
          r.sub = s;
        } else {
          const entry = { sub: s, stop: () => {} };
          entry.stop = s.start((value) => dispatch(entry.sub.toMsg(value))) ?? (() => {});
          running.set(key, entry);
        }
      }
    };

    const dispatch = (msg) => {
      model = config.update(msg)(model);
      runCmd(config.effect(msg)(model));
      updateSubs();
      if (!pending) {
        pending = true;
        requestAnimationFrame(draw);
      }
    };

    const renderer = createRenderer(dispatch);
    const draw = () => {
      pending = false;
      const next = norm([config.view(model)]);
      renderer.patchChildren(root, current, next);
      current = next;
      restoreScroll();
    };

    if (config.onUrlChange) {
      const changed = () => dispatch(config.onUrlChange(currentUrl()));
      onNavigate = changed;
      history.scrollRestoration = "manual";
      window.addEventListener("popstate", () => {
        pendingScroll = history.state?.scroll ?? [0, 0];
        changed();
      });
      // 同じサイト内のリンクは、ページを読み直さずに URL だけ変える
      document.addEventListener("click", (ev) => {
        const a = ev.target instanceof Element ? ev.target.closest("a[href]") : null;
        if (!a || ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
        if (a.target && a.target !== "_self") return;
        const url = new URL(a.href, location.href);
        if (url.origin !== location.origin || !inApp(url.pathname) || a.hasAttribute("download")) return;
        ev.preventDefault();
        go(url.pathname + url.search + url.hash, false);
      });
    }

    root.replaceChildren();
    updateSubs();
    draw();
    runCmd(config.onStart);
    if (config.onUrlChange) dispatch(config.onUrlChange(currentUrl()));
  };

  return {
    lazy, eq, append, compose, idiv, show, fail, Just, Nothing, Ok, Err, defaults,
    h, frag, layout, spacer, run, sub, navigate, css, scope, configure, envValue,
    // テスト用
    norm,
  };
})();
