/** Typst source embedded here so previews do not depend on separate template files. */

export const ENTRY_CITATION_TEMPLATE = `#let compact = sys.inputs.at("compact") == "true"
#let page-width = if compact { 9cm } else { 17cm }
#set page(
  margin: if compact { 1cm } else { 1.5cm },
  width: page-width,
  height: auto,
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

#text(
  size: if compact { 10pt } else { 12pt },
  fill: gray,
)[Style: #sys.inputs.at("style-label")]

#let key = label(sys.inputs.at("entry-key"))
#let bib-style = if sys.inputs.at("csl") != "" {
  bytes(sys.inputs.at("csl"))
} else {
  sys.inputs.at("style")
}

#if compact {
  #lorem(6)
  #cite(key)

  #lorem(4)
  #cite(key, form: "prose")

  #bibliography(
    bytes(sys.inputs.at("yaml")),
    style: bib-style,
    title: [References],
  )
} else {
  #lorem(12)
  #cite(key, form: "prose")

  #lorem(8)
  #cite(key)

  #lorem(8)
  #cite(key, form: "author")

  #lorem(8)
  #cite(key, form: "year")

  #lorem(8)
  #cite(key, form: "full")

  #bibliography(
    bytes(sys.inputs.at("yaml")),
    style: bib-style,
    title: [References],
  )
}
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

#let bib-style = if sys.inputs.at("csl") != "" {
  bytes(sys.inputs.at("csl"))
} else {
  sys.inputs.at("style")
}

#bibliography(
  bytes(sys.inputs.at("yaml")),
  style: bib-style,
  title: [Bibliography preview — #sys.inputs.at("style-label")],
  full: true,
)
`;
