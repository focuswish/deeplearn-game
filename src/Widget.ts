import { Box } from './components/objects'
import * as THREE from 'three'
import { BASE_ASSET_URL } from './constants'

export function Widget() {
  let widget : any = {}
  
  const set = (element, props) => {
    
    for (let key in props) {
      if (typeof props[key] === 'object') {
        set(element[key], props[key])
      } else {
        element[key] = props[key]
      }
    }

    return widget;
  }
  
  widget.update = (widget, data) => {
    set(widget, data)    
  }
  
  widget.handleUpdate = (e) => {
  	let { detail } = e;
    let dataset = {
      ...detail
    }
    
    let style : any = {}
    
    if(dataset.health) {
      style.width = `${dataset.health}%`; 
    }
    
    set(e.srcElement, {dataset, style})
  }

  widget.create = (props = {}, parent = null) => {

    let mergedProps = {
      ...props,
    }
    
    let element = document.createElement('div')
    set(element, mergedProps)
    let container  = widget.element ? widget.element : document.querySelector('body')
    container.appendChild(element) 
    
    if(!widget.element) {   
      widget.element = element;
    }
    
    element.addEventListener('update', widget.handleUpdate)
     
    return widget;
  }
  
  return widget

}

function meshToDataURL (mesh) {
  let camera = new THREE.PerspectiveCamera( 70, 1, 0.01, 10 );
  camera.position.z = 1;
  camera.position.y = -1;
  camera.lookAt(0, 0, 0);
  camera.up.set(0, 0, 1);
  
  let scene = new THREE.Scene();
  let light = new THREE.HemisphereLight(0xffffff, 0x000000, 0.7)

  mesh.position.set(0,0,0)
  mesh.scale.set(1.2, 1.2, 1.2)

  scene.add(light)
  scene.add(mesh)
  
  let renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    preserveDrawingBuffer: true,
    alpha: true
  })

  renderer.setClearColor( 0x191970 )
  renderer.setSize( 100, 100 )
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.render(scene, camera)

  return renderer.domElement.toDataURL()
}

Widget.prototype.UI = function() {
  this.cache = {}

  this.bar = Widget().create({
    id: 'healthbar',
    style: {
      position: 'absolute',
      right: '10px',
      top: '10px',
      width: '200px',
      backgroundColor: '#fafafa',
      boxShadow: '0 16px 24px 2px rgba(0,0,0,0.14), 0 6px 30px 5px rgba(0,0,0,0.12), 0 8px 10px -5px rgba(0,0,0,0.3)'
    },
    dataset: {
      health: 100
    }
  }).create({
    style: {
      width: '100%',
      height: '20px',
      backgroundColor: 'green'
    }
  })
  let detail = {
  	detail: {
    	health: 95
    }
  }

  this.createTargetBox = () => Widget().create({
    id: 'selected-object',
    style: {
       position: 'absolute',
      left: '10px',
      top: '10px',
      width: '50px',
      height: '50px',
      backgroundColor: '#ddd',
      boxShadow: '0 16px 24px 2px rgba(0,0,0,0.14), 0 6px 30px 5px rgba(0,0,0,0.12), 0 8px 10px -5px rgba(0,0,0,0.3)',
      display: 'none'
    },
  }).create({
    id: 'creature-health',
    textContent: '100/100',     
    style: {
      textAlign: 'center',
      fontSize: '10px',
      color: '#333',
      marginTop: '35px'
    }
  }).element

  this.selected = document.querySelector('#creature-health') || this.createTargetBox()

  this.target = (mesh, avatar) => {
    let { name } = mesh;
    let url;
  
    if(this.cache[name]) {
      url = this.cache[name];
    } else {
      url = meshToDataURL(mesh.clone())
      this.cache[name] = url;
    }
        
    if(mesh.userData.health) {
      this.selected.childNodes[0].innerHTML = `${mesh.userData.health}/100`;
    }
    this.selected.style.backgroundImage = `url(${url})`
    this.selected.style.backgroundSize = 'cover'
    this.selected.style.display = 'block'
  
    avatar.userData.selected = mesh.id    
  }

  this.untarget = () => {
    let elem = document.getElementById('creature-health');
    elem.parentElement.removeChild(elem);
    this.selected = document.getElementById('creature-health') || this.createTargetBox()
  }

  this.update = (mesh) => {
    if(mesh.userData.health) {
      this.selected.innerHTML = `${mesh.userData.health}/100`;
    }
  }

  return this;
}
