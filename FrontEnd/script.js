/* eslint-disable no-use-before-define */
import { nanoid } from 'https://cdn.jsdelivr.net/npm/nanoid@5/+esm';  // small UID helper

// ───────────────────────── Layout refs
const uploadZone   = q('#uploadZone');
const imageInput   = q('#imageInput');
const previewWrap  = q('#previewWrap');
const previewImg   = q('#previewImg');
const imgSizeLab   = q('#imgSize');
const inW = q('#inW'), inH = q('#inH'), inC = q('#inC');
const tiles        = qa('.tile');
const flow         = q('#flow');
const emptyHint    = q('#emptyHint');
const propsPane    = q('#props');
const propsForm    = q('#propsForm');
const layerCount   = q('#layerCount');
const paramCount   = q('#paramCount');

// Model graph
const graph = [];          // ordered array of nodes
const defaults = {         // baseline template per layer
  Conv2D:            { filters:32, kernel:[3,3], stride:[1,1], activation:'relu' },
  DepthwiseConv2D:   { kernel:[3,3], stride:[1,1], activation:'relu' },
  MaxPooling2D:      { pool:[2,2] },
  AveragePooling2D:  { pool:[2,2] },
  Flatten:           {},
  Dense:             { units:128, activation:'relu' },
  Dropout:           { rate:0.5 },
  BatchNormalization:{ momentum:0.99, epsilon:1e-3 }
};

// ──────────────── Image upload
uploadZone.addEventListener('click',()=>imageInput.click());
uploadZone.addEventListener('dragover', e=>{
  e.preventDefault(); uploadZone.classList.add('dragover');
});
uploadZone.addEventListener('dragleave', ()=>uploadZone.classList.remove('dragover'));
uploadZone.addEventListener('drop', e=>{
  e.preventDefault(); uploadZone.classList.remove('dragover');
  handleFile(e.dataTransfer.files[0]);
});
imageInput.addEventListener('change',()=>handleFile(imageInput.files[0]));

function handleFile(file){
  if(!file) return;
  const url = URL.createObjectURL(file);
  previewImg.src = url;
  previewWrap.hidden = false;

  const img = new Image();
  img.onload = ()=>{
    imgSizeLab.textContent = `${img.width}×${img.height}`;
    inW.value = img.width; inH.value = img.height; inC.value = 3;
  };
  img.src = url;
}

// ──────────────── Drag & drop layers
tiles.forEach(tile=>{
  tile.addEventListener('dragstart', e=>{
    e.dataTransfer.setData('layer', tile.dataset.type);
  });
});

flow.addEventListener('dragover', e=>{
  e.preventDefault();
  flow.classList.add('dropping');
});
flow.addEventListener('dragleave', ()=>flow.classList.remove('dropping'));
flow.addEventListener('drop', e=>{
  e.preventDefault(); flow.classList.remove('dropping');
  addLayer(e.dataTransfer.getData('layer'));
});

function addLayer(type){
  if(!type) return;
  emptyHint.remove();
  const node = { id:nanoid(6), type, props:{...defaults[type]} };
  graph.push(node);
  renderGraph();
}

// ──────────────── Render graph
function renderGraph(){
  flow.innerHTML = '';
  graph.forEach(node=>{
    const el = node.el = document.createElement('div');
    el.className = 'node';
    el.tabIndex = 0;
    el.innerHTML = `
      <strong>${node.type}</strong>
      <small>${summ(node.props)}</small>`;
    el.addEventListener('click', ()=>openProps(node));
    flow.appendChild(el);
  });
  layerCount.textContent = `${graph.length} layers`;
  paramCount.textContent = estParams();
}

// Rough parameter count (illustrative)
function estParams(){
  let p = 0;
  graph.forEach(n=>{
    if(n.type==='Conv2D') p += n.props.filters * n.props.kernel[0] * n.props.kernel[1] * (inC.value||3);
    if(n.type==='Dense')  p += (n.props.units||0) * 1; // simplified
  });
  return p.toLocaleString();
}

// ──────────────── Properties pane
function openProps(node){
  propsPane.hidden = false;
  propsForm.innerHTML = `<h3>${node.type}</h3>` +
    Object.entries(node.props).map(([k,v])=>{
      const val = Array.isArray(v)? v.join(','): v;
      return `<label>${k}<input data-k="${k}" value="${val}"></label>`;
    }).join('');
  propsForm.oninput = e=>{
    if(e.target.dataset.k){
      const key = e.target.dataset.k;
      const val = e.target.value.includes(',')
        ? e.target.value.split(',').map(Number)
        : (isNaN(e.target.value)? e.target.value : Number(e.target.value));
      node.props[key] = val;
      renderGraph();
    }
  };
}
q('#closeProps').onclick = ()=>propsPane.hidden = true;

// ──────────────── Helpers
function q(sel,ctx=document){return ctx.querySelector(sel);}
function qa(sel,ctx=document){return [...ctx.querySelectorAll(sel)];}
const summ = o=>Object.values(o).join(' / ');

// ──────────────── Export / code gen
q('#exportBtn').onclick = generateJSON;
q('#genCodeBtn').onclick = generateJSON;  // same for demo

function generateJSON(){
  if(!graph.length) return alert('Add at least one layer!');
  const input = [num(inW.value),num(inH.value),num(inC.value||3)];
  const model = { input_shape:input, layers:graph.map(n=>({ layer:n.type, ...n.props })) };
  showModal(model);
}
function num(v){return Number(v)||0;}

// ──────────────── Modal
const modal = q('#modal');
const modalCode = q('#modalCode');
q('#modalClose').onclick = ()=>modal.close();
q('#copyBtn').onclick = ()=>navigator.clipboard.writeText(modalCode.textContent);
q('#downloadBtn').onclick = ()=>{
  const blob = new Blob([modalCode.textContent],{type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'model.json';
  a.click();
};

function showModal(obj){
  modalCode.textContent = JSON.stringify(obj,null,2);
  modal.showModal();
}

// ──────────────── Theme toggle
q('#themeToggle').onclick = ()=>{
  document.body.classList.toggle('dark');
  q('#themeToggle span').classList.toggle('sun');
  q('#themeToggle span').classList.toggle('moon');
};
