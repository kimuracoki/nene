" Nene のハイライト
if exists("b:current_syntax")
  finish
endif

syn keyword neneKeyword module where import qualified as data type foreign
syn keyword neneBoolean True False
syn keyword neneOtherwise otherwise

" 名前
syn match neneConstructor "\<[A-Z][A-Za-z0-9_']*\>"
syn match neneQualified "\<[A-Z][A-Za-z0-9_']*\(\.[A-Z][A-Za-z0-9_']*\)*\.\ze[a-z_]"
syn match neneDefinition "^\s*\zs[a-z_][A-Za-z0-9_']*\ze\(\s\+[^=|:]*\)\?\s*\(=\|::\|$\)"
syn match neneField "\(\<[a-z_][A-Za-z0-9_']*\|)\)\@<=\.[a-z_][A-Za-z0-9_']*"
syn match neneGetter "(\zs\.[a-z_][A-Za-z0-9_']*\ze)"

" リテラル
syn region neneString start=+"+ skip=+\\.+ end=+"+ contains=neneEscape oneline
syn match neneEscape contained "\\[nt\"\\]"
syn match neneNumber "\<\d\+\(\.\d\+\)\?\>"

" 演算子と記号
syn match neneOperator "[-+*/<>=!&|:.\\^%$#@?~]\+"
syn match neneTypeSigOp "::\|->\|=>"
syn match neneGuard "^\s*\zs|"

" JSX（タグ名は大文字始まりが部品、小文字始まりが HTML 要素）
syn match neneJsxOpen "<\ze[A-Za-z>]" nextgroup=neneJsxComponent,neneJsxElement
syn match neneJsxClose "</\ze[A-Za-z>]" nextgroup=neneJsxComponent,neneJsxElement
syn match neneJsxComponent contained "[A-Z][A-Za-z0-9]*"
syn match neneJsxElement contained "[a-z][A-Za-z0-9]*"
syn match neneJsxEnd "/\?>"
syn match neneJsxAttr "\<[a-z][A-Za-z0-9-]*\ze={"
syn match neneJsxAttr "\<[a-z][A-Za-z0-9-]*\ze=\""

" コメント
syn keyword neneTodo contained TODO FIXME XXX
syn match neneLineComment "--.*$" contains=neneTodo,@Spell
syn region neneBlockComment start="{-" end="-}" contains=neneBlockComment,neneTodo,@Spell

hi def link neneKeyword Keyword
hi def link neneBoolean Boolean
hi def link neneOtherwise Keyword
hi def link neneConstructor Type
hi def link neneQualified Include
hi def link neneDefinition Function
hi def link neneField Identifier
hi def link neneGetter Identifier
hi def link neneString String
hi def link neneEscape SpecialChar
hi def link neneNumber Number
hi def link neneOperator Operator
hi def link neneTypeSigOp Operator
hi def link neneGuard Conditional
hi def link neneJsxOpen Delimiter
hi def link neneJsxClose Delimiter
hi def link neneJsxEnd Delimiter
hi def link neneJsxComponent Function
hi def link neneJsxElement Statement
hi def link neneJsxAttr Label
hi def link neneLineComment Comment
hi def link neneBlockComment Comment
hi def link neneTodo Todo

" style ブロック（1 列目の style から、次に 1 列目から始まる行の手前まで）は CSS として色をつける
unlet! b:current_syntax
syn include @neneCss syntax/css.vim
unlet! b:current_syntax
syn region neneStyle matchgroup=neneKeyword start="^style\s*$" end="^\ze\S" contains=@neneCss keepend

let b:current_syntax = "nene"
