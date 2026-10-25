-- lambda-jsx を nvim で使うための設定
--
--   vim.opt.rtp:append("/path/to/lambda-jsx/editors/nvim")
--   require("lambda_jsx").setup()
--
-- ハイライト（syntax/lx.vim）と、言語サーバー（エラー表示・型のホバー・定義へ移動）を有効にする。
-- nvim 0.11 以降が必要。

local M = {}

function M.setup(opts)
  opts = opts or {}
  local here = debug.getinfo(1, "S").source:sub(2)
  local repo = vim.fn.fnamemodify(here, ":p:h:h:h:h")
  local server = opts.server or (repo .. "/src/lsp.ts")

  vim.filetype.add({ extension = { lx = "lx" } })

  vim.lsp.config("lambda_jsx", {
    cmd = { opts.node or "node", server },
    filetypes = { "lx" },
    root_markers = { "package.json", ".git" },
  })
  vim.lsp.enable("lambda_jsx")
end

return M
