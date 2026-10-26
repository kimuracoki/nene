" Tufa のハイライト
if exists("b:current_syntax")
  finish
endif

syn keyword tufaKeyword module where import qualified as data type foreign
syn keyword tufaBoolean True False
syn keyword tufaOtherwise otherwise

" 名前
syn match tufaConstructor "\<[A-Z][A-Za-z0-9_']*\>"
syn match tufaQualified "\<[A-Z][A-Za-z0-9_']*\(\.[A-Z][A-Za-z0-9_']*\)*\.\ze[a-z_]"
syn match tufaDefinition "^\s*\zs[a-z_][A-Za-z0-9_']*\ze\(\s\+[^=|:]*\)\?\s*\(=\|::\|$\)"
syn match tufaField "\(\<[a-z_][A-Za-z0-9_']*\|)\)\@<=\.[a-z_][A-Za-z0-9_']*"
syn match tufaGetter "(\zs\.[a-z_][A-Za-z0-9_']*\ze)"

" リテラル
syn region tufaString start=+"+ skip=+\\.+ end=+"+ contains=tufaEscape oneline
syn match tufaEscape contained "\\[nt\"\\]"
syn match tufaNumber "\<\d\+\(\.\d\+\)\?\>"

" 演算子と記号
syn match tufaOperator "[-+*/<>=!&|:.\\^%$#@?~]\+"
syn match tufaTypeSigOp "::\|->\|=>"
syn match tufaGuard "^\s*\zs|"

" JSX（タグ名は大文字始まりが部品、小文字始まりが HTML 要素）
syn match tufaJsxOpen "<\ze[A-Za-z>]" nextgroup=tufaJsxComponent,tufaJsxElement
syn match tufaJsxClose "</\ze[A-Za-z>]" nextgroup=tufaJsxComponent,tufaJsxElement
syn match tufaJsxComponent contained "[A-Z][A-Za-z0-9]*"
syn match tufaJsxElement contained "[a-z][A-Za-z0-9]*"
syn match tufaJsxEnd "/\?>"
syn match tufaJsxAttr "\<[a-z][A-Za-z0-9-]*\ze={"
syn match tufaJsxAttr "\<[a-z][A-Za-z0-9-]*\ze=\""

" コメント
syn keyword tufaTodo contained TODO FIXME XXX
syn match tufaLineComment "--.*$" contains=tufaTodo,@Spell
syn region tufaBlockComment start="{-" end="-}" contains=tufaBlockComment,tufaTodo,@Spell

hi def link tufaKeyword Keyword
hi def link tufaBoolean Boolean
hi def link tufaOtherwise Keyword
hi def link tufaConstructor Type
hi def link tufaQualified Include
hi def link tufaDefinition Function
hi def link tufaField Identifier
hi def link tufaGetter Identifier
hi def link tufaString String
hi def link tufaEscape SpecialChar
hi def link tufaNumber Number
hi def link tufaOperator Operator
hi def link tufaTypeSigOp Operator
hi def link tufaGuard Conditional
hi def link tufaJsxOpen Delimiter
hi def link tufaJsxClose Delimiter
hi def link tufaJsxEnd Delimiter
hi def link tufaJsxComponent Function
hi def link tufaJsxElement Statement
hi def link tufaJsxAttr Label
hi def link tufaLineComment Comment
hi def link tufaBlockComment Comment
hi def link tufaTodo Todo

" style ブロック（1 列目の style から、次に 1 列目から始まる行の手前まで）は CSS として色をつける
unlet! b:current_syntax
syn include @tufaCss syntax/css.vim
unlet! b:current_syntax
syn region tufaStyle matchgroup=tufaKeyword start="^style\s*$" end="^\ze\S" contains=@tufaCss keepend

let b:current_syntax = "tufa"
