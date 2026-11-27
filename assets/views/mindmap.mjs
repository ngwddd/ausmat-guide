export {mountMindmap as mount} from '../mindmap.mjs';
export const className = 'mindmap-view';

function page(en) {
  const t = (english,chinese) => en ? english : chinese;
  const label = t('Knowledge map','知识导图');
  return `<header class="note-head">
    <h1 id="mmTitle">${label}</h1>
    <p id="stat" class="meta"></p>
  </header>
  <div class="mm-toolbar">
    <input id="search" type="search" aria-label="${t('Search topics','搜索知识点')}" placeholder="${t('Search topics','搜索知识点')}">
    <div class="mm-actions">
      <button id="btnExpand" type="button">${t('Expand all','全部展开')}</button>
      <button id="btnCollapse" type="button">${t('Collapse all','全部收起')}</button>
      <button id="btnFit" type="button">${t('Fit view','适应窗口')}</button>
    </div>
    <div class="mm-zoom">
      <button id="mapZoomOut" type="button" aria-label="${t('Zoom out','缩小')}">−</button>
      <button id="mapZoomIn" type="button" aria-label="${t('Zoom in','放大')}">+</button>
    </div>
  </div>
  <p id="mm-search-status" class="status" role="status"></p>
  <p id="map-gesture" class="hint">${t('Drag to move. Use the zoom buttons or pinch to zoom.','拖动查看。用按钮或双指缩放。')}</p>
  <div id="canvasWrap">
    <svg id="svg" tabindex="0" role="group" aria-label="${label}" aria-describedby="map-gesture"><g id="viewport"></g></svg>
  </div>
  <aside id="side" class="panel">
    <h2 id="sideTitle">${t('Explore a topic','探索知识点')}</h2>
    <p id="sideBody">${t('Select a node to see its details.','点选节点查看说明。')}</p>
    <div id="legend" aria-label="${t('Subjects','科目')}"></div>
  </aside>
  <div id="printOutline" class="print-only"></div>`;
}

export default {en:page(true),zh:page(false)};
