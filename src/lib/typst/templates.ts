/** Typst source embedded here so previews do not depend on separate template files. */

export const ENTRY_CITATION_TEMPLATE = `#let compact = sys.inputs.at("compact") == "true"
#set page(
  margin: if compact { 1cm } else { 1.5cm },
  width: if compact { 9cm } else { 17cm },
  height: auto,
  header: text(
    size: if compact { 10pt } else { 12pt },
    fill: gray,
  )[Style: #sys.inputs.at("style-label")]
)

#set text(
  font: (
    sys.inputs.at("font-sans"),
    sys.inputs.at("font-serif"),
    "Noto Serif CJK JP",
    "Noto Serif CJK SC",
    "Noto Serif CJK TC",
    "Noto Serif CJK KR",
  ),
  size: if compact { 11pt } else { 12pt },
)

#let key = label(sys.inputs.at("entry-key"))
#let bib-style = if sys.inputs.at("csl") != "" {
  bytes(sys.inputs.at("csl"))
} else {
  sys.inputs.at("style")
}

According to~#cite(key), #lorem(5)~#cite(key, form: "prose").

#cite(key, form: "author") described it in the year #cite(key, form: "year").

#if not compact [
  #cite(key)#cite(key).

  #cite(key, supplement: [pp. 1--5]).
]

#hide[#bibliography(
  bytes(sys.inputs.at("yaml")),
  style: bib-style,
)]
`;

export const BIBLIOGRAPHY_FULL_TEMPLATE = `#set page(margin: 1.5cm, height: auto)
#set par(justify: true)
#set text(
  font: (
    sys.inputs.at("font-sans"),
    sys.inputs.at("font-serif"),
    "Noto Serif CJK JP",
    "Noto Serif CJK SC",
    "Noto Serif CJK TC",
    "Noto Serif CJK KR",
  ),
)

#bibliography(
  bytes(sys.inputs.at("yaml")),
  title: [Bibliography preview],
  full: true,
)
`;
