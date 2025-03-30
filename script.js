

camera.position = new BABYLON.Vector3(0, 2, -4);

// Create the sun
const light = new BABYLON.HemisphericLight("skyLight", new BABYLON.Vector3(0, 1, 0), scene);
light.diffuse = new BABYLON.Color3(0.5, 0.7, 1.0); // Sky color
light.groundColor = new BABYLON.Color3(1, 1, 1);

// Create a skybox
const skySphere = BABYLON.MeshBuilder.CreateSphere("skySphere", { diameter: 1000, segments: 32 }, scene);
const skySphereMaterial = new BABYLON.StandardMaterial("skySphereMaterial", scene);
skySphereMaterial.backFaceCulling = false; // Render the inside of the sphere
skySphereMaterial.disableLighting = true; // Ignore lighting for the skybox

// Create a gradient texture
const dynamicTexture = new BABYLON.DynamicTexture("gradientTexture", { width: 512, height: 512 }, scene, false);
const ctx = dynamicTexture.getContext();

// Create a vertical gradient
const gradient = ctx.createLinearGradient(0, 0, 0, 512);
gradient.addColorStop(0, "#87CEEB"); // Light blue (top of the sky)
gradient.addColorStop(1, "#FFFFFF"); // White (horizon)
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 512, 512);

// Apply the gradient texture to the sky sphere
dynamicTexture.update();
skySphereMaterial.emissiveTexture = dynamicTexture;
skySphere.material = skySphereMaterial;

// Ensure the camera's far clipping plane is beyond the skybox size
camera.maxZ = 2000;

// Create a green ground plane
const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 100, height: 100 }, scene);
const groundMaterial = new BABYLON.StandardMaterial("groundMaterial", scene);
groundMaterial.diffuseColor = new BABYLON.Color3(0, 1, 0); // Green color
ground.material = groundMaterial;
