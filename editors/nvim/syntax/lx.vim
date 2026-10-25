" lambda-jsx のハイライト
if exists("b:current_syntax")
  finish
endif

syn keyword lxKeyword module where import qualified as data type foreign
syn keyword lxBoolean True False
syn keyword lxOtherwise otherwise

" 名前
syn match lxConstructor "\<[A-Z][A-Za-z0-9_']*\>"
syn match lxQualified "\<[A-Z][A-Za-z0-9_']*\(\.[A-Z][A-Za-z0-9_']*\)*\.\ze[a-z_]"
syn match lxDefinition "^\s*\zs[a-z_][A-Za-z0-9_']*\ze\(\s\+[^=|:]*\)\?\s*\(=\|::\|$\)"
syn match lxField "\(\<[a-z_][A-Za-z0-9_']*\|)\)\@<=\.[a-z_][A-Za-z0-9_']*"
syn match lxGetter "(\zs\.[a-z_][A-Za-z0-9_']*\ze)"

" リテラル
syn region lxString start=+"+ skip=+\\.+ end=+"+ contains=lxEscape oneline
syn match lxEscape contained "\\[nt\"\\]"
syn match lxNumber "\<\d\+\(\.\d\+\)\?\>"

" 演算子と記号
syn match lxOperator "[-+*/<>=!&|:.\\^%$#@?~]\+"
syn match lxTypeSigOp "::\|->\|=>"
syn match lxGuard "^\s*\zs|"

" JSX（タグ名は大文字始まりが部品、小文字始まりが HTML 要素）
syn match lxJsxOpen "<\ze[A-Za-z>]" nextgroup=lxJsxComponent,lxJsxElement
syn match lxJsxClose "</\ze[A-Za-z>]" nextgroup=lxJsxComponent,lxJsxElement
syn match lxJsxComponent contained "[A-Z][A-Za-z0-9]*"
syn match lxJsxElement contained "[a-z][A-Za-z0-9]*"
syn match lxJsxEnd "/\?>"
syn match lxJsxAttr "\<[a-z][A-Za-z0-9-]*\ze={"
syn match lxJsxAttr "\<[a-z][A-Za-z0-9-]*\ze=\""

" コメント
syn keyword lxTodo contained TODO FIXME XXX
syn match lxLineComment "--.*$" contains=lxTodo,@Spell
syn region lxBlockComment start="{-" end="-}" contains=lxBlockComment,lxTodo,@Spell

hi def link lxKeyword Keyword
hi def link lxBoolean Boolean
hi def link lxOtherwise Keyword
hi def link lxConstructor Type
hi def link lxQualified Include
hi def link lxDefinition Function
hi def link lxField Identifier
hi def link lxGetter Identifier
hi def link lxString String
hi def link lxEscape SpecialChar
hi def link lxNumber Number
hi def link lxOperator Operator
hi def link lxTypeSigOp Operator
hi def link lxGuard Conditional
hi def link lxJsxOpen Delimiter
hi def link lxJsxClose Delimiter
hi def link lxJsxEnd Delimiter
hi def link lxJsxComponent Function
hi def link lxJsxElement Statement
hi def link lxJsxAttr Label
hi def link lxLineComment Comment
hi def link lxBlockComment Comment
hi def link lxTodo Todo

let b:current_syntax = "lx"
