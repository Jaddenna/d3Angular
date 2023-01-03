import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as d3 from 'd3';

interface EdgeRef {
  lineRef: SVGLineElement;
  endCircleRef: CircleRef;
}

interface CircleRef {
  circleElemenet: SVGCircleElement;
  isSelected: boolean;
  connections: EdgeRef[];
}

interface TreeNode {
  row: number;
  column: number;
  circle: CircleRef;
  childNodes: TreeNode[];
}

interface Tree {
  root: TreeNode;
}

@Component({
  selector: 'app-test',
  templateUrl: './test.component.html',
  styleUrls: ['./test.component.scss']
})
export class TestComponent implements OnInit {
  
  @ViewChild('chart', { static: true}) 
  private chartContainer?: ElementRef;
  private circles: CircleRef[] = [];

  left = -500;
  top = -500;
  width = 1000;
  height = 1000;

  constructor() { }

  ngOnInit(): void {
    const svg = d3.select(this.chartContainer?.nativeElement);

    svg
      .attr('viewBox', [this.left, this.top, this.width, this.height].join(' '))
      ;
  }

  addCircle(evt: MouseEvent) {
    const svg = d3.select(this.chartContainer?.nativeElement);
    const coords = d3.pointer( evt );
    const isCircle = (evt.target as Element).nodeName == 'circle';

    if (!isCircle) {
      const circleElemenet = svg.append('circle')
        .attr('r', 50)
        .attr('cx', coords[0])
        .attr('cy', coords[1])
        .node()!;

      this.circles.push({
        circleElemenet, 
        isSelected: false,
        connections: []
      });
    } else {
      const clickedCircle = evt.target as SVGCircleElement;
      const circleRef = this.circles
        .find((c) => c.circleElemenet === clickedCircle);

      if (circleRef !== null && circleRef !== undefined) {
        circleRef.isSelected = true;
      }

    }

    const selectedCircles = this.circles.filter(c => c.isSelected);

    if (selectedCircles.length == 2) {
      const existingConnection = selectedCircles[0]
        .connections
        .find(conn => conn.endCircleRef.circleElemenet === selectedCircles[1].circleElemenet);
      selectedCircles.forEach(c => c.isSelected = false);
      
      if (existingConnection === undefined) {
        const c1 = d3.select(selectedCircles[0].circleElemenet);
        const c2 = d3.select(selectedCircles[1].circleElemenet);

        const addedLine = svg.append('line')
          .attr('x1', c1.attr('cx'))
          .attr('x2', c2.attr('cx'))
          .attr('y1', c1.attr('cy'))
          .attr('y2', c2.attr('cy'))
          .attr('stroke', 'black');

        selectedCircles[0]
          .connections
          .push({lineRef: addedLine.node()!, endCircleRef: selectedCircles[1]});

        selectedCircles[1]
          .connections
          .push({lineRef: addedLine.node()!, endCircleRef: selectedCircles[0]});
      }
    }

    this.circles
      .forEach(c => {
        const curr = d3.select(c.circleElemenet);
        if (c.isSelected) {
          curr.attr('fill', 'red');
        } else {
          curr.attr('fill', 'black');
        }
      })
  }

  layout() {
    const width = this.width;
    const height = this.height;
    const x0 = this.left;
    const y0 = this.top;

    const leavesArr = this.getLeaveArray();

    const maxLeaves = d3.max(leavesArr, c => c.leaves) || 0;
    const circleWithMaxLeaves = leavesArr.find(c => c.leaves == maxLeaves)?.circleRef!;

    const columnWidth = width / maxLeaves;

    const columns = Array.from({length: maxLeaves}).map((n, i) => x0 + i * columnWidth + (columnWidth / 2));
    console.log(columns);

    let tree: Tree = {
      root: this.buildTree(circleWithMaxLeaves, 0, [])
    } 

    this.correctColumns(tree.root.childNodes);
    
    this.drawTreeNode(tree.root, columns);
    
  }

  drawTreeNode(treeNode: TreeNode, columns: number[]) {
    let circleNode = d3.select(treeNode.circle.circleElemenet);

    circleNode
      .attr('cx', columns[treeNode.column]);

    for (let i = 0; i < treeNode.childNodes.length; i++) {
      const childNode = treeNode.childNodes[i];
      this.drawTreeNode(childNode, columns);      
    }
  }

  correctColumns (treeNodes: TreeNode[]) {
    let nodesToEvaluate: TreeNode[] = []; 

    for (let i = 0; i < treeNodes.length; i++) {
      const childNode = treeNodes[i];
      childNode.column = i;
      nodesToEvaluate = nodesToEvaluate.concat(childNode.childNodes);
    }

    if (nodesToEvaluate.length > 0)
      this.correctColumns(nodesToEvaluate);
  }

  buildTree(rootCircle: CircleRef, row: number, visited: CircleRef[]): TreeNode {
    visited.push(rootCircle);
    let childTree: TreeNode[] = [];

    let connections = rootCircle
      .connections
      .filter(conn => visited.find(v => v.circleElemenet == conn.endCircleRef.circleElemenet) == undefined);

    for (let i = 0; i < connections.length; i++) {
      const childNodeConn = connections[i];

      let newNode = this.buildTree(childNodeConn.endCircleRef, row + 1, visited);
      childTree.push(newNode);

    }

    let node: TreeNode = {
      column: 0,
      row,
      circle: rootCircle,
      childNodes: childTree
    }

    return node;
  }

  getLeaves2 (circleRefs: CircleRef[], alreadyVisited: CircleRef[]): number {
    let nodesToEvaluate: CircleRef[] = []; 
    let filteredNodes = circleRefs
      .filter(cr => alreadyVisited.find(v => v.circleElemenet == cr.circleElemenet) == undefined);

    alreadyVisited = alreadyVisited.concat(filteredNodes);

    for (let i = 0; i < filteredNodes.length; i++) {
      const childNode = filteredNodes[i];
      nodesToEvaluate = nodesToEvaluate.concat(childNode.connections.map(conn => conn.endCircleRef));
    }

    if (nodesToEvaluate.length > 0)
      return this.getLeaves2(nodesToEvaluate, alreadyVisited);

    return 0;
  }

  getLeaveArray (): {
    circleRef: CircleRef,
    leaves: number
  }[] {
    let result = [];
    for(let i = 0; i < this.circles.length; i++) {
      const curr = this.circles[i];
      result.push({circleRef: curr, leaves: this.getLeaveNumber(curr, null, [])});
    }
    return result;
  }

  getLeaveNumber (currentCircle: CircleRef, lastCircle: CircleRef | null, alreadyVisited: CircleRef[]): number {
    let number = 0;
    alreadyVisited.push(currentCircle);

    // gar keine Verbindungen
    if (currentCircle.connections.length == 0) {
      return 0;
    }

    // Einzige Verbindung ist die zum vorherigem Knoten
    if (currentCircle.connections.length == 1 && currentCircle.connections[0].endCircleRef.circleElemenet === lastCircle?.circleElemenet) {
      return 1;
    }

    for (let i = 0; i < currentCircle.connections.length; i++) {
      const connection = currentCircle.connections[i];
      const visited = alreadyVisited.find(c => c.circleElemenet == connection.endCircleRef.circleElemenet);
      if (visited !== undefined)
        continue;

      number = number + this.getLeaveNumber(connection.endCircleRef, currentCircle, alreadyVisited);
    }
    return number;
  }

}
