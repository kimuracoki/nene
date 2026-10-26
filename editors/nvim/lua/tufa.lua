-- Tufa を nvim で使うための設定
--
--   vim.opt.rtp:append("/path/to/Tufa/editors/nvim")
--   require("tufa").setup()
--
-- 有効になるもの:
--   - ハイライト（syntax/tufa.vim。言語サーバーが動いているときは、その解析結果で色を上書きする）
--   - 言語サーバー: エラー表示、K で型の表示、gd で定義へ移動、補完
--
-- 補完は、nvim-cmp や blink.cmp が入っていればそちらに任せ、なければ nvim 標準の補完を使う。
-- nvim 0.11 以降が必要。
--
-- lazy.nvim なら（GitHub に置いた場合）:
--   {
--     "<ユーザー名>/Tufa",
--     config = function(plugin)
--       vim.opt.rtp:append(plugin.dir .. "/editors/nvim")
--       require("tufa").setup()
--     end,
--   }

local M = {}

-- 言語サーバーの色分けを、syntax/tufa.vim と同じ系統の色にそろえる
local function link_highlights()
  local links = {
    ["@lsp.type.class.tufa"] = "Function", -- 部品のタグ <Button>
    ["@lsp.type.macro.tufa"] = "Statement", -- HTML 要素のタグ <div>
    ["@lsp.type.enumMember.tufa"] = "Type", -- コンストラクタ
    ["@lsp.type.type.tufa"] = "Type",
    ["@lsp.type.namespace.tufa"] = "Include", -- List. などのモジュール名
    ["@lsp.type.property.tufa"] = "Identifier", -- フィールドと属性
  }
  for group, target in pairs(links) do
    vim.api.nvim_set_hl(0, group, { link = target, default = true })
  end
end

-- 言語サーバーの起動コマンドを決める。
--   1. setup で cmd を指定していればそれ
--   2. プロジェクトの node_modules/.bin/tufa（npm install した Tufa）
--   3. このプラグイン自身のソース（git から入れた場合。Node 23.6 以上で動く）
--   4. PATH にある tufa（npm install -g Tufa）
local function server_cmd(opts, root)
  if opts.cmd then
    return opts.cmd
  end
  local npm = root and (root .. "/node_modules/.bin/tufa")
  if npm and vim.fn.executable(npm) == 1 then
    return { npm, "lsp" }
  end
  local here = debug.getinfo(1, "S").source:sub(2)
  local source = vim.fn.fnamemodify(here, ":p:h:h:h:h") .. "/src/lsp.ts"
  if vim.fn.filereadable(source) == 1 then
    return { "node", source }
  end
  return { "tufa", "lsp" }
end

function M.setup(opts)
  opts = opts or {}

  vim.filetype.add({ extension = { tufa = "tufa" } })
  link_highlights()
  vim.api.nvim_create_autocmd("ColorScheme", { callback = link_highlights })

  vim.api.nvim_create_autocmd("FileType", {
    pattern = "tufa",
    callback = function(args)
      local root = vim.fs.root(args.buf, { "package.json", ".git" })
      vim.lsp.start({ name = "tufa", cmd = server_cmd(opts, root), root_dir = root }, { bufnr = args.buf })
    end,
  })

  local external = package.loaded["cmp"] ~= nil or package.loaded["blink.cmp"] ~= nil
  local builtin = opts.completion
  if builtin == nil then
    builtin = not external
  end
  if builtin then
    vim.api.nvim_create_autocmd("LspAttach", {
      callback = function(args)
        local client = vim.lsp.get_client_by_id(args.data.client_id)
        if client and client.name == "tufa" then
          vim.lsp.completion.enable(true, client.id, args.buf, { autotrigger = true })
        end
      end,
    })
  end
end

return M
