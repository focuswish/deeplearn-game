import { Box } from './components/objects'
import * as THREE from 'three'
import { BASE_ASSET_URL } from './constants'

const healthbar = {
  id: 'ui-avatar',
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
}

const healthbarInner = {
  style: {
    width: '100%',
    height: '20px',
    backgroundImage: 'linear-gradient(90deg, #00C9FF 0%, #92FE9D 100%)'
  }
}

const selectedObject = {
  id: 'ui-target',
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
}

const selectedObjectInner = {
  id: 'ui-target-health',
  textContent: '100/100',     
  style: {
    textAlign: 'center',
    fontSize: '10px',
    color: '#333',
    marginTop: '35px'
  }
}

function Widget(avatar) {
  let bar = () => document.getElementById('ui-avatar')
  let div = () => document.getElementById('ui-target')

  if(!bar()) {
    this.create(healthbar).create(healthbarInner).reset()
  }
  if(!div()) {
    this.create(selectedObject).create(selectedObjectInner).reset()
  }

  this.cache = {}
  this.div = div()
  this.bar = bar()
  this.avatar = avatar;
}

Widget.prototype.reset = function() {
  this.element = null;
  return this;
}

Widget.prototype.set = function(element, props) {
  for (let key in props) {
    if (typeof props[key] === 'object') {
      this.set(element[key], props[key])
    } else {
      element[key] = props[key]
    }
  }

  return this;
}

  
Widget.prototype.create = function(props = {}, parent = null) {
  let mergedProps = {
    ...props,
  }
    
  let element = document.createElement('div')
  this.set.apply(this, [element, mergedProps])
  let container  = this.element ? this.element : document.querySelector('body')
  container.appendChild(element) 
    
  if(!this.element) {   
    this.element = element;
  }
    
  return this;
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

  let texture = new THREE.TextureLoader().load(BASE_ASSET_URL + 'gradient.jpg')
  scene.background = texture;

  let renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    preserveDrawingBuffer: true,
    alpha: true
  })

  renderer.setSize( 100, 100 )
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setClearColor(0x000000, 0.0)
  //renderer.domElement.style.backgroundImage = 'linear-gradient(0deg, #ACCBEE 0%, #E7F0FD 100%)'
  
  renderer.render(scene, camera)
  let url = renderer.domElement.toDataURL()
  renderer.forceContextLoss()
  scene = null;
  camera = null;
  
  return url;
}

Widget.prototype.target = function(mesh) {
  console.log(this)
  let { name } = mesh;
  let url;

  if(this.cache[name]) {
    url = this.cache[name];
  } else {
    url = meshToDataURL(mesh.clone())
    this.cache[name] = url;
  }
      
  if(mesh.userData.health) {
    this.div.childNodes[0].innerHTML = `${mesh.userData.health}/100`;
  }
  this.div.style.backgroundImage = `url(${url})`
  this.div.style.backgroundSize = 'cover'
  this.div.style.display = 'block'

  this.avatar.userData.selected = mesh.id    
}

Widget.prototype.untarget = function() {
  let elem1 = document.getElementById('ui-target-health');
  elem1.parentElement.removeChild(elem1);

  let elem2 = document.getElementById('ui-target')
  elem2.parentElement.removeChild(elem2);

  this.create(selectedObject).create(selectedObjectInner).reset()
  this.div = document.getElementById('ui-target')
}

Widget.prototype.update = function(mesh) {
  if(mesh.userData.health) {
    if(mesh.userData.id === this.avatar.userData.id) {
      this.bar.childNodes[0].style.width = `${mesh.userData.health}%`
    } else {
      this.div.childNodes[0].innerHTML = `${mesh.userData.health}/100`;      
    }
  }
}

export default function(avatar) {
    let widget = Object.create(Widget.prototype)
    Widget.apply(widget, [avatar])
    return widget;
}