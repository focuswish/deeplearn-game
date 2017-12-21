import { Box } from './components/objects'
import * as THREE from 'three'
import { BASE_ASSET_URL } from './constants'

const uiHeroHealth = {
  parentNode: 'body',
  id: 'ui-hero-health',
  style: {
    position: 'absolute',
    right: '10px',
    top: '10px',
    width: '200px',
    backgroundImage: 'linear-gradient(0deg, #E6E9F0 0%, #EEF1F5 100%)',
    boxShadow: '0 16px 24px 2px rgba(0,0,0,0.14), 0 6px 30px 5px rgba(0,0,0,0.12), 0 8px 10px -5px rgba(0,0,0,0.3)'
  },
  dataset: {
    health: 100
  },
  childNodes: [{
    style: {
      width: '100%',
      height: '20px',
      backgroundImage: 'linear-gradient(90deg, #00C9FF 0%, #92FE9D 100%)'
    }
  }]
}

const uiHeroAbilities = {
  parentNode: 'body',  
  id: 'ui-hero-abilities',
  style: {
    position: 'absolute',
    right: '10px',
    top: '40px',
    width: '200px',
    display: 'flex'
  }
}

const uiHeroTarget = {
  parentNode: 'body',  
  id: 'ui-hero-target',
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
  childNodes: [{
    id: 'ui-hero-target-health',
    textContent: '100/100',     
    style: {
      textAlign: 'center',
      fontSize: '10px',
      color: '#333',
      marginTop: '35px'
    }
  }]
}

export default function UI() {}

UI.prototype.appendStylesheet = function() {
  let style : any = document.createElement("style");
  style.appendChild(document.createTextNode(""))
  
  document.head.appendChild(style);
  let sheet = style.sheet
  let rules = [];

  for (let i = 0; i < 10; i++) {
    let styles = `.ui-hero-ability-wrapper:nth-of-type(${i + 1}):before { content: "${i + 1}"; position: absolute; font-size: 8px; padding: 2px; }`
    sheet.insertRule(styles, i);
  }
  console.log(sheet)
}

UI.prototype.init = function(avatar, gradient) {
  this.appendStylesheet()

  let bar = () => document.getElementById(uiHeroHealth.id)
  let div = () => document.getElementById(uiHeroTarget.id)

  if(avatar && !bar()) {
    this.create(uiHeroHealth)
  }
  if(avatar && !div()) {
    this.create(uiHeroTarget)
  }

  this.cache = {}
  this.div = div()
  this.bar = bar()
  this.avatar = avatar;
  this.gradient = gradient;

  return this;
}

UI.prototype.reset = function() {
  this.element = null;
  return this;
}

UI.prototype.set = function(element, props) {
  for (let key in props) {
    if (typeof props[key] === 'object') {
      this.set(element[key], props[key])
    } else {
      element[key] = props[key]
    }
  }

  return this;
}

 
UI.prototype.create = function(props) {
  let { nodeName, parentNode, childNodes, ...rest} = props;
  let mergedProps = {
    ...rest
  }
      
  let element = document.createElement(nodeName || 'div')
  this.set.apply(this, [element, mergedProps])

  let container = document.querySelector('body')

  if(parentNode) {
    container = typeof parentNode === 'object' ? 
      parentNode : document.querySelector(parentNode)
  }

  container.appendChild(element) 

  if(childNodes) {
    childNodes.forEach(node => {
      this.create({...node, parentNode: element})
    })
  }  

  return this;
}

UI.prototype.registerWeapon = function(mesh) {
  let { name } = mesh;
  let url;

  if(this.cache[name]) {
    url = this.cache[name];
  } else {
    url = meshToDataURL(mesh.clone(), this.gradient, 20)
    this.cache[name] = url;
  }
  
  if(!document.getElementById(uiHeroAbilities.id)) {
    this.create(uiHeroAbilities)
  }

  this.create({
    parentNode: `#${uiHeroAbilities.id}`,
    className: 'ui-hero-ability-wrapper',
    style: {
      opacity: 1.0,
      backgroundColor: 'green'
    },  
    childNodes: [{
      id: mesh.name,
      style: {
        width: '20px',
        height: '20px',
        border: '1px solid #333',
        backgroundImage: `url(${url})`,
        backgroundSize: 'cover',
        display: 'block'
      }
    }]
  })
}
/*
    content: "1";
    position: absolute;
    font-size: 8px;
    padding: 2px;

*/
function meshToDataURL (mesh, gradient, size = 100) {
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
  
  scene.background = gradient;

  let renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    preserveDrawingBuffer: true,
    alpha: true
  })

  renderer.setSize( size, size )
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setClearColor(0x000000, 0.0)
  
  renderer.render(scene, camera)
  let url = renderer.domElement.toDataURL()
  renderer.forceContextLoss()
  scene = null;
  camera = null;
  
  return url;
}

UI.prototype.target = function(mesh) {
  let { name } = mesh;
  let url;

  if(this.cache[name]) {
    url = this.cache[name];
  } else {
    url = meshToDataURL(mesh.clone(), this.gradient)
    this.cache[name] = url;
  }
      
  if(mesh.userData.health) {
    this.div.childNodes[0].innerHTML = `${mesh.userData.health}/100`;
  }

  this.div.style.backgroundImage = `url(${url})`
  this.div.style.backgroundSize = 'cover'
  this.div.style.display = 'block'

  this.avatar.userData.target = mesh.id    
}

UI.prototype.untarget = function() {
  let elem1 = document.getElementById(uiHeroTarget.childNodes[0].id);
  elem1.parentElement.removeChild(elem1);

  let elem2 = document.getElementById(uiHeroTarget.id)
  elem2.parentElement.removeChild(elem2)

  this.create(uiHeroTarget)
  this.div = document.getElementById(uiHeroTarget.id)
}

UI.prototype.update = function(mesh) {
  if(mesh.userData.health) {
    if(mesh.userData.id === this.avatar.userData.id) {
      this.bar.childNodes[0].style.width = `${mesh.userData.health}%`
    } else {
      this.div.childNodes[0].innerHTML = `${mesh.userData.health}/100`;      
    }
  }
}

UI.prototype.welcomeScreen = function(onclick) {
  let uiContainer = this.create({
    id: 'ui-container',
    style: {
      position: 'absolute',
      transform: 'translate(-50%, 0)',
      top: '50%',
      left: '50%'
    },
    childNodes: [{
      nodeName: 'input',
      id: 'ui-avatar-name',
      placeholder: 'Your name',
      style: {
        width: '200px',
        height: '30px',
        backgroundColor: '#fafafa',
        border: 0,
        outline: 0,
        borderRadius: '3px',
        marginRight: '20px',
        padding: '0 8px',
      }
    }, {
      nodeName: 'button',
      textContent: 'Submit',
      style: {
        height: '30px',
        width: '90px',
        backgroundColor: 'fafafa',
        border: '1px solid #ddd',
        borderRadius: '3px'
      }
    }]
  })

  return this;
}
