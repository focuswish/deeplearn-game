import * as THREE from 'three'
import { BASE_ASSET_URL } from '../constants'

function Terrain (params) {

  Object.assign(this, {
    color: 0xE1A95F, 
    asset: null, 
    flat: false,
    position: [0, 0, 0],
    worldSize: 100,
    segments: 100,
  }, params)

  //let sand = new THREE.Color(0xE1A95F)
  //let dirt = new THREE.Color(0xD2B48C)
  this.matrix = [
    this.worldSize,
    this.worldSize,
    this.segments,
    this.segments
  ]
  
}

Terrain.prototype.generate = function() {
  let material = new THREE.MeshStandardMaterial ({
    color: this.color,    
    flatShading: true,
    metalness: 0,
    vertexColors: THREE.FaceColors,
  })

  let geometry = new THREE.PlaneGeometry(...this.matrix);  

  if(this.heightmap) {

    let index = 0;
    
    for (let i = 0; i <= this.segments; i++) { 
      for (let j = 0; j <= this.segments; j++) { 
        let alt = this.heightmap[i][j];
        geometry.vertices[index].setZ(alt)  
        index++;
      } 
    }
  }

  this.mesh = new THREE.Mesh(
    geometry, 
    material
  )

  this.mesh.geometry.translate(...this.position)
  return this;
}

export default Terrain