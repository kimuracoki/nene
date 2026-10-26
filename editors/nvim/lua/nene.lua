-- Nene を nvim で使うための設定
--
--   vim.opt.rtp:append("/path/to/Nene/editors/nvim")
--   require("nene").setup()
--
-- 有効になるもの（キーは nvim の標準のもの）:
--   - ハイライト（syntax/nene.vim。言語サーバーが動いているときは、その解析結果で色を上書きする）
--   - エラー表示、K で型、gd で定義へ、grr で参照一覧、grn で名前の一括変更、gra でコードアクション、
--     gO でアウトライン、挿入モードの <C-s> で引数のヒント、gq で整形、補完
--   - 言語サーバーによる折りたたみ（宣言・where・JSX の要素など）
--
-- setup の設定:
--   format_on_save = true   保存するときに整形する（nene fmt と同じ）
--   folding = false         折りたたみを言語サーバーに任せない
--   completion = false      nvim 標準の補完を使わない（nvim-cmp や blink.cmp があれば、はじめから使わない）
--   cmd = { ... }           言語サーバーの起動コマンド
--
-- nvim 0.11 以降が必要。
--
-- lazy.nvim なら:
--   {
--     "kimuracoki/nene",
--     config = function(plugin)
--       vim.opt.rtp:append(plugin.dir .. "/editors/nvim")
--       require("nene").setup()
--     end,
--   }

local M = {}

-- 言語サーバーの色分けを、syntax/nene.vim と同じ系統の色にそろえる
local function link_highlights()
  local links = {
    ["@lsp.type.class.nene"] = "Function", -- 部品のタグ <Button>
    ["@lsp.type.macro.nene"] = "Statement", -- HTML 要素のタグ <div>
    ["@lsp.type.enumMember.nene"] = "Type", -- コンストラクタ
    ["@lsp.type.type.nene"] = "Type",
    ["@lsp.type.namespace.nene"] = "Include", -- List. などのモジュール名
    ["@lsp.type.property.nene"] = "Identifier", -- フィールドと属性
  }
  for group, target in pairs(links) do
    vim.api.nvim_set_hl(0, group, { link = target, default = true })
  end
end

-- 言語サーバーの起動コマンドを決める。
--   1. setup で cmd を指定していればそれ
--   2. プロジェクトの node_modules/.bin/nene（npm install した Nene）
--   3. このプラグイン自身のソース（git から入れた場合。Node 23.6 以上で動く）
--   4. PATH にある nene（npm install -g Nene）
local function server_cmd(opts, root)
  if opts.cmd then
    return opts.cmd
  end
  local npm = root and (root .. "/node_modules/.bin/nene")
  if npm and vim.fn.executable(npm) == 1 then
    return { npm, "lsp" }
  end
  local here = debug.getinfo(1, "S").source:sub(2)
  local source = vim.fn.fnamemodify(here, ":p:h:h:h:h") .. "/src/lsp.ts"
  if vim.fn.filereadable(source) == 1 then
    return { "node", source }
  end
  return { "nene", "lsp" }
end

function M.setup(opts)
  opts = opts or {}

  vim.filetype.add({ extension = { nn = "nene" } })
  link_highlights()
  vim.api.nvim_create_autocmd("ColorScheme", { callback = link_highlights })

  vim.api.nvim_create_autocmd("FileType", {
    pattern = "nene",
    callback = function(args)
      local root = vim.fs.root(args.buf, { "package.json", ".git" })
      vim.lsp.start({ name = "nene", cmd = server_cmd(opts, root), root_dir = root }, { bufnr = args.buf })
    end,
  })

  local external = package.loaded["cmp"] ~= nil or package.loaded["blink.cmp"] ~= nil
  local builtin = opts.completion
  if builtin == nil then
    builtin = not external
  end

  vim.api.nvim_create_autocmd("LspAttach", {
    callback = function(args)
      local client = vim.lsp.get_client_by_id(args.data.client_id)
      if not client or client.name ~= "nene" then
        return
      end
      if builtin then
        vim.lsp.completion.enable(true, client.id, args.buf, { autotrigger = true })
      end
      if opts.folding ~= false then
        for _, win in ipairs(vim.fn.win_findbuf(args.buf)) do
          vim.wo[win][0].foldmethod = "expr"
          vim.wo[win][0].foldexpr = "v:lua.vim.lsp.foldexpr()"
          vim.wo[win][0].foldlevel = 99 -- 開いた時点では畳まない
        end
      end
      if opts.format_on_save then
        vim.api.nvim_create_autocmd("BufWritePre", {
          buffer = args.buf,
          callback = function()
            vim.lsp.buf.format({ bufnr = args.buf, name = "nene" })
          end,
        })
      end
    end,
  })
end

return M
