import * as THREE from 'three'

export default function Context() {
  this.scene = new THREE.Scene()
  this.scene.background = new THREE.Color(0x191970)
  this.scene.fog = new THREE.FogExp2( 0x000000, 0.0025 * 50);

  this.camera = new THREE.PerspectiveCamera(
    75, 
    window.innerWidth / window.innerHeight, 
    0.1, 
    1000
  );  

  this.tilt = -4;
  this.zoom = 2;

  this.camera.position.x = 0;
  this.camera.position.y = this.tilt
  this.camera.position.z = this.zoom
  this.camera.lookAt(0, 0, 0);
  this.camera.up.set(0, 0, 1);
  
  THREE.Object3D.DefaultUp.set(0, 0, 1)
  this.renderer = new THREE.WebGLRenderer()
  this.ws = new WebSocket(location.origin.replace(/^http/, 'ws'));
  this.terrain = {}

  this.renderer.setPixelRatio( window.devicePixelRatio );
  this.renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(this.renderer.domElement);

  this.data = {}
  this.tiles = []
  this.controls = {}

  const base : any = {
    store: {},
    cameraViewProjectionMatrix: new THREE.Matrix4(),
    frustum: new THREE.Frustum(),
    nearby: []
  }
  
  this._base = base;
  this._assets = {}
}
