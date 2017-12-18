
import * as THREE from 'three'
import * as CANNON from 'cannon'

function Tree() {
  let ctx : any= {}
  
  ctx.tree = new THREE.Object3D();
  ctx.sides = 8
  ctx.tiers = 6;
  
  function tighten(tier) {
  	let { vertices } = ctx.geometry
    let sides = ctx.sides;
    let vertexIndex;
    let vertexVector = new THREE.Vector3();
    let midPointVector = vertices[0].clone();
    let offset;

    for (let i = 0; i < sides; i++) {
      vertexIndex = (tier * sides) + 1;
      vertexVector = vertices[i + vertexIndex].clone();
      midPointVector.y = vertexVector.y;
      offset = vertexVector.sub(midPointVector);
      offset.normalize().multiplyScalar(0.06);
      vertices[i + vertexIndex].sub(offset);
    }
  }

  function expand(
    tier, 
    scalarMultiplier, 
    odd = false
    ) {
    let vertices = ctx.geometry.vertices;
    let sides = ctx.sides;
    let vertexIndex;
    let vertexVector = new THREE.Vector3();
    let midPointVector = vertices[0].clone();
    let offset;
    
    for (var i = 0; i < sides; i++) {
      vertexIndex = (tier * sides) + 1;
      vertexVector = vertices[i + vertexIndex].clone();
      midPointVector.y = vertexVector.y;
      offset = vertexVector.sub(midPointVector);

      if (i % 2 !== 0) {
        offset.normalize().multiplyScalar(scalarMultiplier / 6);
        vertices[i + vertexIndex].add(offset);
      } else {
        offset.normalize().multiplyScalar(scalarMultiplier);
        vertices[i + vertexIndex].add(offset);
        vertices[i + vertexIndex].y = vertices[i + vertexIndex + sides].y + 0.05;
      }
    }
  }
  
  function createTop() {
    ctx.top = new THREE.Mesh(ctx.geometry, ctx.material);
    ctx.top.castShadow = true;
    ctx.top.receiveShadow = false;
    ctx.top.position.y = 0.9;
    ctx.top.rotation.y = (Math.random() * (Math.PI));
    ctx.top.name = 'tree/top'
    return ctx;
  }
  
  function createTrunk() { 
    ctx.trunk = new THREE.Mesh(
    	new THREE.CylinderGeometry(0.1, 0.1, 0.5),
      new THREE.MeshStandardMaterial({
        color: 0x886633,
        flatShading: true
    	})
    )
    ctx.trunk.position.y = 0.25;
    ctx.trunk.name = 'tree/trunk'
    return ctx;
  }

  function createCannonBody() {
    // radiusTop  radiusBottom  height  numSegments 
    let cylinder = new CANNON.Cylinder ()
    
  }

  function create() {
    let scalarMultiplier = (Math.random() * (0.25 - 0.1)) + 0.05;
    let midPointVector = new THREE.Vector3();
    let vertexVector = new THREE.Vector3();
    ctx.geometry = new THREE.ConeGeometry(0.5, 1, ctx.sides, ctx.tiers);
    ctx.material = new THREE.MeshStandardMaterial({
      color: 0x33ff33,
      flatShading: true
    });

    midPointVector = ctx.geometry.vertices[0].clone();
    let currentTier = 0;
    let vertexIndex;
    
    expand(0, scalarMultiplier, false);
    tighten(1);
    expand(2, scalarMultiplier * 1.1, true);
    tighten(3);
    expand(4, scalarMultiplier * 1.2, false);
    tighten(5);
  
    ctx.tree.add(createTrunk().trunk);
    ctx.tree.add(createTop().top);
    ctx.tree.name = 'tree'

    return ctx;
  }
  
  return create().tree
}


export default Tree;