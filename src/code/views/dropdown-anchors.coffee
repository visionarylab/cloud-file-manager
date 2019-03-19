{svg, g, rect, polygon} = React.DOM

DefaultAnchor =
  # Hamburger icon
  (svg {className: 'default-anchor', version: '1.1', width: 33, height: 18, viewBox: '0 0 33 18', enableBackground: 'new 0 0 33 18'},
    (g {},
      (rect {x: 2, y: 3, width: 16, height: 2})
      (rect {x: 2, y: 8, width: 16, height: 2})
      (rect {x: 2, y: 13, width: 16, height: 2})
      (polygon (points: "21,7 25,13 29,7"))
    )
  )

TriangleOnlyAnchor =
  (svg {className: 'triangle-only-anchor', version: '1.1', width: 8, height: 18, viewBox: '0 0 8 18', enableBackground: 'new 0 0 33 18'},
    (polygon (points: "0,7 4,13 8,7"))
  )

module.exports =
  DefaultAnchor: DefaultAnchor
  TriangleOnlyAnchor: TriangleOnlyAnchor
