import * as THREE from 'three'
import { BASE_ASSET_URL } from './constants'
import Terrain from './components/Terrain'

export default function Assets() {}

Assets.prototype.loadFonts = async function() {
  const loader = new THREE.FontLoader();
  const promise : any = new Promise((resolve, reject) => {
    loader.load('/fonts/helvetiker.json', font => resolve(font))
  })

  this._assets.font = await promise;
  return this;
}

Assets.prototype.loadTextures = async function() {
  const loader = new THREE.TextureLoader()
  const promise : any = new Promise((resolve, reject) => {
    loader.load(BASE_ASSET_URL + 'crate.jpg', texture => resolve(texture))
  })

  const texture = await promise;

  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipMapLinearFilter;

  this._assets.textures = {}
  this._assets.textures['box'] = texture;

  return this;
}

Assets.prototype.loadTerrain = async function() {
  this.terrain.geometry = new THREE.Geometry();    
  
  let heightmap = await fetch('/heightmap')
    .then(resp => resp.json())
    
  let terrain = Terrain({
    position: [0, 0, 0],
    color: 0x7cfc00,
    altitude: heightmap
  })
  
  this.tiles.push(terrain)
  this.scene.add(terrain)
  this.terrain.geometry.vertices = this.terrain.geometry.vertices.concat(
    terrain.geometry.vertices
  )
  
  return this;
}

Assets.prototype.load = function() {
  console.log('Assets.load', this)
  return Promise.all([
    this.assets.loadFonts.apply(this),
    this.assets.loadTextures.apply(this),
    this.assets.loadTerrain.apply(this)
  ])
} 