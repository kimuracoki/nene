// JSON との変換と HTTP。Json・Http モジュールを使うアプリにだけ入る（compiler.ts の bundle）
Object.assign(
  $rt,
  (() => {
    const { Just, Nothing, Ok, Err } = $rt;

    // ---- JSON ----
    // コンパイラが型から作った記述（dec: JSON の値 → Nene の値、enc: その逆）で変換する

    class JsonError extends Error {}
    const describe = (v) => (v === undefined ? "なし" : JSON.stringify(v));
    const expected = (what, v, path) => {
      throw new JsonError(`${path || "全体"}: ${what}を期待しましたが、${describe(v)} でした`);
    };
    const plain = (what, ok) => ({ dec: (v, path) => (ok(v) ? v : expected(what, v, path)), enc: (x) => x });
    const json = {
      int: plain("整数", Number.isInteger),
      float: plain("数値", (v) => typeof v === "number"),
      string: plain("文字列", (v) => typeof v === "string"),
      bool: plain("true か false ", (v) => typeof v === "boolean"),
      unit: { unit: true, dec: () => null, enc: () => null },
      // 型の決まらない部分（Nothing や [] の中身）。値は入らないので、JSON から読むことはない
      never: { dec: (v, path) => expected("値なし", v, path), enc: () => null },
      list: (d) => ({
        dec: (v, path) => (Array.isArray(v) ? v.map((x, i) => d.dec(x, `${path}[${i}]`)) : expected("配列", v, path)),
        enc: (xs) => xs.map(d.enc),
      }),
      tuple: (ds) => ({
        dec: (v, path) =>
          Array.isArray(v) && v.length === ds.length ? ds.map((d, i) => d.dec(v[i], `${path}[${i}]`)) : expected(`${ds.length} 個の要素の配列`, v, path),
        enc: (xs) => ds.map((d, i) => d.enc(xs[i])),
      }),
      // null とフィールドがないことを Nothing とみなす
      maybe: (d) => ({
        optional: true,
        dec: (v, path) => (v === null || v === undefined ? Nothing : Just(d.dec(v, path))),
        enc: (m) => (m.$ === "Just" ? d.enc(m.a[0]) : null),
      }),
      record: (fields) => ({
        dec: (v, path) => {
          if (typeof v !== "object" || v === null || Array.isArray(v)) return expected("オブジェクト", v, path);
          const out = {};
          for (const [k, d] of Object.entries(fields)) {
            const where = path ? `${path}.${k}` : k;
            if (!(k in v) && !d.optional) throw new JsonError(`${where}: フィールドがありません`);
            out[k.replace(/'/g, "$q")] = d.dec(v[k], where);
          }
          return out;
        },
        enc: (r) => Object.fromEntries(Object.entries(fields).map(([k, d]) => [k, d.enc(r[k.replace(/'/g, "$q")])])),
      }),
      // 引数のないコンストラクタだけの data 型は、コンストラクタの名前の文字列
      enumeration: (names) => ({
        dec: (v, path) => (names.includes(v) ? { $: v } : expected(names.map((n) => `"${n}"`).join("・") + " のどれか", v, path)),
        enc: (x) => x.$,
      }),
      // Dict String a は、キーを並べたオブジェクト
      dict: (d) => ({
        dec: (v, path) => {
          if (typeof v !== "object" || v === null || Array.isArray(v)) return expected("オブジェクト", v, path);
          const pairs = Object.keys(v).sort().map((k) => [k, d.dec(v[k], path ? `${path}.${k}` : k)]);
          return { $: "Dict", a: [pairs] };
        },
        enc: (m) => Object.fromEntries(m.a[0].map(([k, x]) => [k, d.enc(x)])),
      }),
    };

    const decodeJson = (d, text) => {
      if (d.unit) return Ok(null);
      let v;
      try {
        v = JSON.parse(text);
      } catch {
        return Err("JSON として読めませんでした");
      }
      try {
        return Ok(d.dec(v, ""));
      } catch (e) {
        if (e instanceof JsonError) return Err(e.message);
        throw e;
      }
    };

    // ---- HTTP ----

    const http = (method, url, body, d, toMsg) => (dispatch) => {
      const init = { method, headers: { Accept: "application/json" } };
      if (body !== undefined) {
        init.headers["Content-Type"] = "application/json";
        init.body = body;
      }
      fetch(url, init).then(
        async (res) => {
          if (!res.ok) return dispatch(toMsg(Err({ $: "BadStatus", a: [res.status] })));
          const result = decodeJson(d, await res.text());
          dispatch(toMsg(result.$ === "Ok" ? result : Err({ $: "BadBody", a: [result.a[0]] })));
        },
        () => dispatch(toMsg(Err({ $: "NetworkError" }))),
      );
    };

    return { json, decodeJson, http };
  })(),
);
