import {
  findIndex,
  chunk,
  flatten
} from 'lodash'
import * as THREE from 'three'

export function getObjectById(ctx) {
  return function(id) {
    ctx.scene.children.find(child => 
      child.userData && 
      child.userData.id === id
    )
  }
}

export function getUnixTime() {
  return (new Date()).getTime() / 1000
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