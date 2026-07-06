#set page(margin: 1.5cm)
#set text(font: sys.inputs.at("sans-font"), size: 11pt)
#set par(justify: true)

#text(size: 14pt, weight: "bold")[
  Bibliography preview — #sys.inputs.at("style-label")
]
#v(0.8em)

#bibliography(
  "/data/bibliography.yaml",
  style: sys.inputs.at("style"),
  full: true,
)
