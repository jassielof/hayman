/** Typst source embedded here so previews do not depend on separate template files. */

export const DEFAULT_ENTRY_CITATION_BODY = `- According to~#cite(key, form: "prose"), Typst is awesome~#cite(key).
- #cite(key, form: "author") described in the year #cite(key, form: "year").
- Multiple citations~#cite(key)#cite(key).
- With supplements~#cite(key, supplement: [pp. 1--5]).`;

const ENTRY_BODY_PLACEHOLDER = '// __HAYMAN_ENTRY_PREVIEW_BODY__';

export const ENTRY_CITATION_TEMPLATE = `#let compact = sys.inputs.at("compact") == "true"
#set page(
  margin: if compact { 0.5cm } else { 1cm },
  width: if compact { 10cm } else { 20cm },
  height: auto,
  header: text(
    size: if compact { 10pt } else { 12pt },
    fill: gray,
  )[Style: #sys.inputs.at("style-label")]
)

#set text(
  size: if compact { 13pt } else { 12pt },
)

#let key = label(sys.inputs.at("entry-key"))
#let bib-style = if sys.inputs.at("csl") != "" {
  "style.csl"
} else {
  sys.inputs.at("style")
}

${ENTRY_BODY_PLACEHOLDER}

#bibliography(
  "bibliography.yml",
  style: bib-style,
)
`;

export function buildEntryCitationTemplate(body: string) {
  return ENTRY_CITATION_TEMPLATE.replace(ENTRY_BODY_PLACEHOLDER, body);
}

export const BIBLIOGRAPHY_FULL_TEMPLATE = `#set page(margin: 1cm, height: auto)

#let bib-style = if sys.inputs.at("csl") != "" {
  "style.csl"
} else {
  sys.inputs.at("style")
}

#bibliography(
  "bibliography.yml",
  full: true,
  style: bib-style,
)
`;
