"use client";
import * as go from "gojs";
import { ReactDiagram } from "gojs-react";

const dummyMindMap = {
  nodes: [
    { key: 1, text: "Main Topic", category: "root" },
    { key: 2, text: "Subtopic 1", category: "section" },
    { key: 3, text: "Subtopic 2", category: "section" },
    { key: 4, text: "Detail A", category: "topic" },
    { key: 5, text: "Detail B", category: "topic" }
  ],
  links: [
    { from: 1, to: 2 },
    { from: 1, to: 3 },
    { from: 2, to: 4 },
    { from: 3, to: 5 }
  ]
};

function initDiagram() {
  const $ = go.GraphObject.make;
  const diagram = $(go.Diagram, {
    "undoManager.isEnabled": true,
    layout: $(go.TreeLayout, {
      angle: 90,
      layerSpacing: 35,
      alignment: go.TreeLayout.AlignmentStart
    }),
    model: $(go.GraphLinksModel, {
      linkKeyProperty: "key"
    })
  });
  const rootTemplate = $(go.Node, "Auto",
    $(go.Shape, "RoundedRectangle", { fill: "#5B4B8A", stroke: "black" }),
    $(go.TextBlock, { margin: 8, stroke: "white", font: "14px sans-serif" }, new go.Binding("text", "text"))
  );
  const sectionTemplate = $(go.Node, "Auto",
    $(go.Shape, "RoundedRectangle", { fill: "#7B5EA7", stroke: "black" }),
    $(go.TextBlock, { margin: 8, stroke: "white", font: "14px sans-serif" }, new go.Binding("text", "text"))
  );
  const topicTemplate = $(go.Node, "Auto",
    $(go.Shape, "RoundedRectangle", { fill: "#9C7BC0", stroke: "black" }),
    $(go.TextBlock, { margin: 8, stroke: "white", font: "14px sans-serif" }, new go.Binding("text", "text"))
  );
  diagram.nodeTemplateMap.add("root", rootTemplate);
  diagram.nodeTemplateMap.add("section", sectionTemplate);
  diagram.nodeTemplateMap.add("topic", topicTemplate);
  diagram.nodeTemplate = $(go.Node, "Auto",
    $(go.Shape, "RoundedRectangle", { fill: "#BDBDBD", stroke: "black" }),
    $(go.TextBlock, { margin: 8, stroke: "black", font: "14px sans-serif" }, new go.Binding("text", "text"))
  );
  diagram.linkTemplate =
    $(go.Link,
      { routing: go.Link.Orthogonal },
      $(go.Shape, { strokeWidth: 1.5, stroke: "#5B4B8A" })
    );
  return diagram;
}

export default function ClientMindmap() {
  return (
    <div style={{ minHeight: 400, border: '2px solid blue' }}>
      <ReactDiagram
        initDiagram={initDiagram}
        style={{ width: '100%', height: '400px', background: '#fff' }}
        nodeDataArray={dummyMindMap.nodes}
        linkDataArray={dummyMindMap.links}
      />
    </div>
  );
} 