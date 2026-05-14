// diagram.js — 純 SVG 樹狀文法圖繪製

const NODE_W = 80;   // 節點寬度
const NODE_H = 34;   // 節點高度
const H_GAP = 16;    // 水平間距
const V_GAP = 56;    // 垂直間距（層與層之間）
const PAD_X = 20;    // 左右邊距
const PAD_Y = 20;    // 上下邊距

const COLORS = {
  default:       { fill: '#f8fafc', stroke: '#cbd5e1', text: '#1e2a3a' },
  particle:      { fill: '#f5e6c8', stroke: '#d4b483', text: '#7c5c1e' },
  'grammar-point': { fill: '#dbeafe', stroke: '#93c5fd', text: '#1d4ed8' },
  verb:          { fill: '#fce7f3', stroke: '#f9a8d4', text: '#831843' },
  adjective:     { fill: '#f0fdf4', stroke: '#86efac', text: '#166534' },
  branch:        { fill: '#e0e7ff', stroke: '#a5b4fc', text: '#3730a3' }, // 非葉節點
};

/**
 * 計算以某節點為根的子樹寬度（葉節點數量 * 單位寬）
 */
function subtreeWidth(node) {
  if (!node.children || node.children.length === 0) {
    return NODE_W + H_GAP;
  }
  return node.children.reduce((sum, c) => sum + subtreeWidth(c), 0);
}

/**
 * 為每個節點計算 x（水平中心）和 y（頂邊），遞歸展開
 * @param {Object} node
 * @param {number} x - 這棵子樹的可用起始 x
 * @param {number} y - 這一層的 y 座標
 */
function layoutTree(node, x, y) {
  const sw = subtreeWidth(node);
  node._cx = x + sw / 2;  // 水平中心
  node._cy = y;

  if (node.children && node.children.length > 0) {
    let childX = x;
    for (const child of node.children) {
      layoutTree(child, childX, y + NODE_H + V_GAP);
      childX += subtreeWidth(child);
    }
  }
}

/**
 * 取得節點顯示文字
 */
function nodeLabel(node) {
  return node.text !== undefined ? node.text : node.label;
}

/**
 * 取得節點顏色設定
 */
function nodeColor(node) {
  if (node.children && node.children.length > 0) return COLORS.branch;
  return COLORS[node.type] || COLORS.default;
}

/**
 * 收集所有節點與邊（扁平化）
 */
function collectNodes(node, result = []) {
  result.push(node);
  if (node.children) node.children.forEach(c => collectNodes(c, result));
  return result;
}

function collectEdges(node, result = []) {
  if (node.children) {
    for (const child of node.children) {
      result.push({ from: node, to: child });
      collectEdges(child, result);
    }
  }
  return result;
}

/**
 * 計算整棵樹需要的 SVG 尺寸
 */
function treeSize(root) {
  const nodes = collectNodes(root);
  const maxX = Math.max(...nodes.map(n => n._cx + NODE_W / 2));
  const maxY = Math.max(...nodes.map(n => n._cy + NODE_H));
  return { width: maxX + PAD_X, height: maxY + PAD_Y };
}

/**
 * 主函式：渲染樹狀圖到 #grammarTree
 * @param {Object} treeData - 從 API 回傳的 tree 物件
 */
function renderDiagram(treeData) {
  const svg = document.getElementById('grammarTree');
  svg.innerHTML = '';

  // 計算佈局
  layoutTree(treeData, PAD_X, PAD_Y);
  const { width, height } = treeSize(treeData);

  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  const edges = collectEdges(treeData);
  const nodes = collectNodes(treeData);

  // 先畫邊（在節點下方）
  for (const { from, to } of edges) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const x1 = from._cx;
    const y1 = from._cy + NODE_H;
    const x2 = to._cx;
    const y2 = to._cy;
    // 貝茲曲線
    const cy = (y1 + y2) / 2;
    line.setAttribute('d', `M${x1},${y1} C${x1},${cy} ${x2},${cy} ${x2},${y2}`);
    line.setAttribute('class', 'tree-edge');
    svg.appendChild(line);
  }

  // 再畫節點
  for (const node of nodes) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const color = nodeColor(node);
    const label = nodeLabel(node);

    // 背景矩形
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', node._cx - NODE_W / 2);
    rect.setAttribute('y', node._cy);
    rect.setAttribute('width', NODE_W);
    rect.setAttribute('height', NODE_H);
    rect.setAttribute('rx', 6);
    rect.setAttribute('ry', 6);
    rect.setAttribute('fill', color.fill);
    rect.setAttribute('stroke', color.stroke);
    rect.setAttribute('stroke-width', 1.5);
    g.appendChild(rect);

    // 文字
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', node._cx);
    text.setAttribute('y', node._cy + NODE_H / 2);
    text.setAttribute('class', 'tree-node-text');
    text.setAttribute('fill', color.text);
    text.textContent = label;
    g.appendChild(text);

    svg.appendChild(g);
  }
}
