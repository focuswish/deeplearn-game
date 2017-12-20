export function Sprite(ctx) {

  function create(mesh, name, id) {
    mesh.name = name
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = {
      selectable: true,
      health: 100,
      id,
    }

    //mesh.onAfterRender = update(mesh, {})
  }

  function update(mesh, data) {
    mesh.userData = {
      ...mesh.userData,
      ...data
    }

    if(mesh.userData.heatlth && 
      mesh.userData.health <= 0
    ) {
     ctx.scene.remove(mesh) 
    }
     
    let { selected } = ctx.avatar.userData;

    if(selected && 
      selected === mesh.id
    ) {
      //

    }
  }
}