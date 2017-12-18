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

export function SpriteTile(mesh) {
  let camera = new THREE.PerspectiveCamera( 70, 1, 0.01, 10 );
  camera.position.z = 2;
  camera.position.y = -1;
  camera.lookAt(0, 0, 0);
  camera.up.set(0, 0, 1);
  let scene = new THREE.Scene();
  let light = new THREE.HemisphereLight(0xfffafa, 0x000000, 0.7)
  
  scene.background = new THREE.Color(0xdddddd)
  //mesh.geometry.computeBoundingSphere();
  //let radius = mesh.geometry.boundingSphere.radius;

  //mesh.rotation.x += Math.PI / 8
  //mesh.rotation.y += Math.PI / 8
  //mesh.scale.set(radius * 24, radius * 24, radius * 24)
  mesh.position.set(-0.1,-0.1,0)
  //mesh.geometry.normalize()
  //console.log(mesh)
  scene.add(light)
  scene.add(mesh)
  
  let renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    preserveDrawingBuffer: true 
  })

  renderer.setSize( 100, 100 )
  renderer.setPixelRatio( window.devicePixelRatio );
  
  renderer.render(scene, camera)
  let url = renderer.domElement.toDataURL()
  console.log(url)
  return url
}

export function healthBar() {
  let bar = Widget().create({
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
  //let innerDiv = bar.element.children[0]
  //let evt = new CustomEvent('update', detail)
  //innerDiv.dispatchEvent(evt);
}

export function heroSelection() {

   let selected = Widget().create({
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
   })

   return function select(mesh) {
    console.log('select() - mesh',mesh)
    let url = SpriteTile(mesh)
    console.log(url)
    selected.element.style.backgroundImage = `url(${url})`
    selected.element.style.backgroundSize = 'cover'
    selected.element.style.display = 'block'
   }
}