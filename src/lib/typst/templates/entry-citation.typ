#set page(margin: 1.5cm)
#set text(font: sys.inputs.at("sans-font"), size: 11pt)

#text(size: 12pt, fill: gray)[Style: #sys.inputs.at("style-label")]
#v(0.5em)

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque
habitant morbi tristique senectus et netus #cite(
  label(sys.inputs.at("entry-key")),
  form: "prose",
).

#v(1.2em)
#bibliography("/data/bibliography.yaml", style: sys.inputs.at("style"))
