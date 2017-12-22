declare function World(): void;
declare global  {
    interface Window {
        camera: any;
        Terrain: any;
        Sprite: any;
        World: any;
    }
}
export default World;
export {};
