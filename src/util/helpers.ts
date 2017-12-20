import {
  findIndex,
  chunk,
  flatten
} from 'lodash'
import * as THREE from 'three'

function Helper() {}

Helper.prototype.getSelected = function() {
  return this.avatar.userData.selected ? 
  this.scene.getObjectById(this.avatar.userData.selected) : null
}

export function getObjectById(ctx) {
  return function(id) {
    ctx.scene.children.find(child => 
      child.userData && 
      child.userData.id === id
    )
  }
}

Helper.prototype.getZ = function (x, y) {
  let { terrain: { geometry: { vertices } } } = this;
    
  let index = findIndex(vertices, { 
    x: Math.round(x),
    y: Math.round(y)
  })

  let z = vertices[index] ? vertices[index].z : 0

  return z;
}

Helper.prototype.randomPositionOnTerrain = function() {
  let x = Math.round(Math.random() * 100) - 50
  let y = Math.round(Math.random() * 100) - 50
  let z = Helper.prototype.getZ.apply(this, [x, y])
  return [x, y, z]
}

export async function loadFont() {
  let loader = new THREE.FontLoader();
  return new Promise((resolve, reject) => {
    loader.load('/fonts/helvetiker.json', font => resolve(font))
  })
}

export function getUnixTime() {
  return new Date().getTime() / 1000
}

export function segment(matrix, vertices) {  
  let n = Math.sqrt(vertices.length)

  let offset = (n - 10) / 10;
  let [x, y] = matrix;
  
  x *= offset;
  y *= offset;

  let rows = chunk(vertices, n)

  let out = flatten(
    rows
    .slice(x, x + offset)
    .map(row => row.slice(y, y + offset))
  )

  return out
}

export function segmentTopography(topography, matrix) {
  let offset = Math.sqrt(topography.length - 1) // 10

  let [x, y] = matrix;
  x *= offset;
  y *= offset;
  
  offset += 1;
  let out = flatten(
    topography
    .slice(y, y + offset)
    .reverse()
    .map(row => row.slice(x, x + offset))
  )

  return out;
}


export default Helper