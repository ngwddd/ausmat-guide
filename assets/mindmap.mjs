import {tree} from './mindmap-data.mjs';

const ns = 'http://www.w3.org/2000/svg';
const minZoom = 0.45;
const nodeGap = 10;
const columnGap = 48;
const textLimit = 228;
const padding = 13;
const svg = (tag, attrs) => {
  const shape = document.createElementNS(ns, tag);
  for (const [name, value] of Object.entries(attrs)) shape.setAttribute(name, value);
  return shape;
};

export async function mountMindmap({root, lang, signal}) {
  const en = lang === 'en';
  const t = (english, chinese) => en ? english : chinese;
  const translated = en ? (await import('./mindmap-i18n.mjs')).dictionary : {};
  if (signal.aborted) return;

  const byId = id => root.querySelector('#' + id);
  const watch = (target, event, listener, options) => target.addEventListener(event, listener, {...options, signal});
  const viewport = byId('viewport');
  const canvas = byId('canvasWrap');
  const diagram = byId('svg');
  const lineLayer = svg('g', {'aria-hidden':'true'});
  const nodeLayer = svg('g', {});
  viewport.append(lineLayer, nodeLayer);
  const search = byId('search');
  const searchStatus = byId('mm-search-status');
  const ctx = document.createElement('canvas').getContext('2d');
  const all = [];
  const diagramRoot = model(tree);
  const view = {x:22,y:20,k:1};
  const size = {width:canvas.clientWidth,height:canvas.clientHeight};
  const attached = new Set();
  let visible, bounds, frame = 0, revision = 0;
  let matches = null;
  let moved = false;

  function model(source, parent = null, prefix = '') {
    const path = prefix ? prefix + '/' + source.name : source.name;
    const translation = translated[path];
    const node = {
      id:all.length, name:translation?.name ?? source.name, note:translation?.note ?? source.note,
      color:source.color ?? parent?.color ?? '#2f6fed', parent, depth:parent ? parent.depth+1 : 0,
      open:false, children:[],
    };
    node.search = (node.name + ' ' + (node.note ?? '')).toLowerCase();
    all.push(node);
    node.children = (source.children ?? []).map(child => model(child, node, path));
    return node;
  }

  function measure(node) {
    if (node.lines) return;
    ctx.font = (node.depth <= 1 ? '600 13px ' : '400 12.5px ') + 'system-ui, sans-serif';
    const width = value => ctx.measureText(value).width;
    const lines = [];
    let line = '';
    for (const token of node.name.match(/\S+\s*|\s+/gu) ?? [node.name]) {
      if (width(line + token) <= textLimit) { line += token; continue; }
      if (line.trim()) { lines.push(line.trim()); line = ''; }
      if (width(token.trim()) <= textLimit) { line = token; continue; }
      for (const char of token) {
        if (line && width(line + char) > textLimit) { lines.push(line.trim()); line = ''; }
        line += char;
      }
    }
    if (line.trim()) lines.push(line.trim());
    node.lines = lines.slice(0,3);
    if (lines.length > 3) {
      let last = node.lines[2];
      while (width(last + '…') > textLimit) last = last.slice(0,-1);
      node.lines[2] = last.trimEnd() + '…';
    }
    node.w = Math.max(46,...node.lines.map(width)) + 2*padding + (node.children.length ? 15 : 0);
    node.h = 34 + (node.lines.length-1)*16;
  }

  function arrange() {
    visible = [];
    const widths = [];
    function visit(node) {
      measure(node);
      visible.push(node);
      widths[node.depth] = Math.max(widths[node.depth] ?? 0,node.w);
      if (node.open) node.children.forEach(visit);
    }
    visit(diagramRoot);
    let left = 0;
    const columns = widths.map(width => {
      const x = left;
      left += width + columnGap;
      return x;
    });
    let cursor = 0;
    function place(node) {
      node.x = columns[node.depth];
      if (node.open && node.children.length) {
        const top = cursor;
        node.children.forEach(place);
        node.y = (top + cursor - nodeGap)/2;
      } else {
        node.y = cursor + node.h/2;
        cursor += node.h + nodeGap;
      }
    }
    place(diagramRoot);
    bounds = {width:left-columnGap, height:cursor-nodeGap};
    revision++;
    byId('stat').textContent = t(visible.length + ' visible topics', visible.length + ' 个可见主题');
    schedule();
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(draw);
  }
  signal.addEventListener('abort', () => cancelAnimationFrame(frame), {once:true});

  function createShapes(node) {
    const g = svg('g', {class:'node-g','data-node':node.id,role:'button',tabindex:'0','aria-label':node.name});
    if (node.depth <= 1) g.classList.add('map-major');
    g.style.setProperty('--branch-color',node.color);
    g.append(svg('rect',{class:'node-rect',width:node.w,height:node.h,rx:7}));
    for (const [index, line] of node.lines.entries()) {
      const label = svg('text',{class:'node-label',x:padding,y:node.h/2+(index-(node.lines.length-1)/2)*16});
      label.textContent = line;
      g.append(label);
    }
    if (node.children.length) {
      node.badge = svg('text',{class:'badge',x:node.w-12,y:node.h/2,'text-anchor':'middle'});
      g.append(node.badge);
    }
    node.element = g;
    if (node.parent) node.edge = svg('path',{class:'map-link',stroke:node.color});
    node.drawnRevision = -1;
  }

  function draw() {
    frame = 0;
    viewport.setAttribute('transform',`translate(${view.x} ${view.y}) scale(${view.k})`);
    const margin = 96;
    const left = (-view.x-margin)/view.k;
    const right = (size.width-view.x+margin)/view.k;
    const top = (-view.y-margin)/view.k;
    const bottom = (size.height-view.y+margin)/view.k;
    const next = new Set();
    for (const node of visible) {
      const showNode = node.x+node.w >= left && node.x <= right && node.y+node.h/2 >= top && node.y-node.h/2 <= bottom;
      const p = node.parent;
      const showEdge = p && p.x+p.w <= right && node.x >= left && Math.min(p.y,node.y) <= bottom && Math.max(p.y,node.y) >= top;
      if (!showNode && !showEdge) continue;
      next.add(node);
      if (!node.element) createShapes(node);
      if (node.drawnRevision !== revision) {
        node.element.setAttribute('transform',`translate(${node.x} ${node.y-node.h/2})`);
        node.element.classList.toggle('dim',Boolean(matches && !matches.has(node)));
        node.element.classList.toggle('hit',Boolean(matches?.has(node)));
        if (node.badge) {
          node.badge.textContent = node.open ? '−' : '+';
          node.element.setAttribute('aria-expanded',node.open);
        }
        if (p) {
          const from = p.x + p.w;
          const bend = (from+node.x)/2;
          node.edge.setAttribute('d',`M${from},${p.y} C${bend},${p.y} ${bend},${node.y} ${node.x},${node.y}`);
        }
        node.drawnRevision = revision;
      }
      if (showNode && !node.element.parentNode) nodeLayer.append(node.element);
      else if (!showNode) node.element.remove();
      if (showEdge && !node.edge.parentNode) lineLayer.append(node.edge);
      else if (!showEdge) node.edge?.remove();
    }
    for (const node of attached) {
      if (next.has(node)) continue;
      node.element.remove();
      node.edge?.remove();
      attached.delete(node);
    }
    for (const node of next) attached.add(node);
  }

  function center(node) {
    view.x = size.width/2-(node.x+node.w/2)*view.k;
    view.y = size.height/2-node.y*view.k;
    schedule();
  }
  function fit() {
    const scale = Math.min((size.width-44)/bounds.width,(size.height-44)/bounds.height,1);
    view.k = Math.max(minZoom,scale);
    if (scale < minZoom) {
      view.x = 22;
      view.y = size.height/2-diagramRoot.y*view.k;
    } else {
      view.x = (size.width-bounds.width*view.k)/2;
      view.y = (size.height-bounds.height*view.k)/2;
    }
    schedule();
  }
  function showDetail(node) {
    byId('sideTitle').textContent = node.name;
    if (node.note) {
      byId('sideBody').textContent = node.note;
      return;
    }
    const path = [];
    for (let entry = node; entry; entry = entry.parent) path.unshift(entry.name);
    byId('sideBody').textContent = path.join(' › ');
  }
  function toggle(event) {
    if (event.type === 'click' && moved) return;
    const group = event.target.closest('[data-node]');
    if (!group) return;
    const node = all[Number(group.dataset.node)];
    if (node.children.length) {
      const {x,y} = node;
      node.open = !node.open;
      arrange();
      view.x += (x-node.x)*view.k;
      view.y += (y-node.y)*view.k;
    }
    showDetail(node);
  }
  watch(nodeLayer,'click',toggle);
  watch(diagram,'keydown',event => {
    if (event.target !== diagram && ['Enter',' '].includes(event.key)) {
      event.preventDefault();
      toggle(event);
      return;
    }
    const pan = {ArrowLeft:[40,0],ArrowRight:[-40,0],ArrowUp:[0,40],ArrowDown:[0,-40]}[event.key];
    if (!pan) return;
    event.preventDefault();
    view.x += pan[0];
    view.y += pan[1];
    schedule();
  });

  watch(byId('btnExpand'),'click',() => {
    for (const node of all) node.open = Boolean(node.children.length);
    arrange();
    fit();
  });
  watch(byId('btnCollapse'),'click',() => {
    for (const node of all) node.open = false;
    search.value = '';
    searchStatus.textContent = '';
    matches = null;
    arrange();
    fit();
  });
  watch(byId('btnFit'),'click',fit);
  function zoom(scale,x,y) {
    const next = Math.max(minZoom,Math.min(3,scale));
    view.x = x-(x-view.x)*next/view.k;
    view.y = y-(y-view.y)*next/view.k;
    view.k = next;
    schedule();
  }
  watch(byId('mapZoomIn'),'click',() => zoom(view.k*1.25,size.width/2,size.height/2));
  watch(byId('mapZoomOut'),'click',() => zoom(view.k/1.25,size.width/2,size.height/2));

  watch(search,'input',() => {
    const query = search.value.trim().toLowerCase();
    const found = query ? all.filter(node => node.search.includes(query)) : [];
    matches = found.length ? new Set(found) : null;
    searchStatus.textContent = !query ? '' : found.length ? t(found.length+' matching topics',found.length+' 个匹配主题') : t('No matching topics.','没有匹配的知识点。');
    for (const node of found) {
      for (let parent = node.parent; parent; parent = parent.parent) parent.open = true;
    }
    arrange();
    if (found[0]) center(found[0]);
  });

  for (const node of diagramRoot.children) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button';
    button.style.setProperty('--branch-color',node.color);
    button.textContent = node.name;
    watch(button,'click',() => {
      diagramRoot.open = true;
      node.open = true;
      arrange();
      center(node);
      showDetail(node);
    });
    byId('legend').append(button);
  }

  const pointers = new Map();
  const pair = () => {
    const [a,b] = pointers.values();
    return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))};
  };
  watch(diagram,'pointerdown',event => {
    if (event.button !== 0 || pointers.size === 2) return;
    if (!pointers.size) moved = false;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY});
    if (pointers.size === 2) moved = true;
  });
  watch(diagram,'pointermove',event => {
    const p = pointers.get(event.pointerId);
    if (!p) return;
    if (!moved && Math.hypot(event.clientX-p.startX,event.clientY-p.startY) < 5) return;
    moved = true;
    if (!diagram.hasPointerCapture(event.pointerId)) diagram.setPointerCapture(event.pointerId);
    const oldPair = pointers.size === 2 ? pair() : null;
    view.x += oldPair ? 0 : event.clientX-p.x;
    view.y += oldPair ? 0 : event.clientY-p.y;
    p.x = event.clientX;
    p.y = event.clientY;
    if (oldPair) {
      const next = pair();
      const rect = diagram.getBoundingClientRect();
      view.x += next.x-oldPair.x;
      view.y += next.y-oldPair.y;
      zoom(view.k*next.d/oldPair.d,next.x-rect.left,next.y-rect.top);
    }
    schedule();
  });
  for (const event of ['pointerup','pointercancel']) {
    watch(window,event,e => pointers.delete(e.pointerId));
  }
  watch(diagram,'wheel',event => {
    event.preventDefault();
    const rect = diagram.getBoundingClientRect();
    zoom(view.k*(event.deltaY<0 ? 1.12 : 1/1.12),event.clientX-rect.left,event.clientY-rect.top);
  },{passive:false});
  const resize = new ResizeObserver(([entry]) => {
    size.width = entry.contentRect.width;
    size.height = entry.contentRect.height;
    schedule();
  });
  resize.observe(canvas);
  signal.addEventListener('abort',() => resize.disconnect(),{once:true});

  watch(window,'beforeprint',() => {
    const outline = document.createDocumentFragment();
    for (const node of visible) {
      const item = document.createElement('article');
      item.style.marginInlineStart = Math.min(node.depth,4)*12 + 'px';
      const title = document.createElement('strong');
      title.textContent = node.name;
      item.append(title);
      if (node.note) {
        const note = document.createElement('p');
        note.textContent = node.note;
        item.append(note);
      }
      outline.append(item);
    }
    byId('printOutline').replaceChildren(outline);
  });

  arrange();
  view.y = 30;
}
