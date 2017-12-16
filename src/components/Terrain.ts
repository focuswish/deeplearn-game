import * as THREE from 'three'
import { BASE_ASSET_URL } from '../constants'

function Terrain (params = {}) {
  let terrain : any = {
    color: 0xE1A95F, 
    asset: null, 
    flat: false,
    position: [0, 0, 0],
    altitude: null,
    ...params
  }
  
  let texture;

  if(terrain.asset) {
    texture = new THREE.TextureLoader().load(BASE_ASSET_URL + terrain.asset); 
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(64, 64);
  }
  let sand = new THREE.Color(0xE1A95F)
  let dirt = new THREE.Color(0xD2B48C)
  let colorArray = sand.toArray()

  let material = new THREE.MeshStandardMaterial ({
    color: terrain.color,    
    flatShading: true,
    metalness: 0,
    vertexColors: THREE.FaceColors,
    map: texture ? texture : null
  })

  let matrix = [100, 100, 100, 100]
  let rows = matrix[2]
  let columns = matrix[3]

  let geometry = new THREE.PlaneGeometry(...matrix);  
  if(terrain.altitude) {

    let index = 0;
    
    for (let i = 0; i <= rows; i++) { 
      for (let j = 0; j <= columns; j++) { 
        let alt = terrain.altitude[i][j];
        //let alt = 0;
        geometry.vertices[index].setZ(alt)  
        index++;
      } 
    }
  }


  let mesh = new THREE.Mesh(
    geometry, 
    material
  )

  mesh.geometry.translate(...terrain.position)
  return mesh;
}

export default Terrain