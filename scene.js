
import gameList from './list.js';
import { loadExperience } from './loadExperience.js';
// Babylon.js setup
const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const scene = new BABYLON.Scene(engine);
window.scene = scene;
let camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, 2, -4), scene);
camera.attachControl(canvas, true);
// Add a directional light
camera.speed = 0.4

const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");


// Enable first-person controls
camera.keysUp.push(87);    // W
camera.keysDown.push(83);  // S
camera.keysLeft.push(65);  // A
camera.keysRight.push(68); // D 

// const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
camera.minZ = 0.1;


engine.runRenderLoop(() => {
    scene.render();
});


async function loadHDRIAsync(scene) {
    console.log("Loading HDRI...");
    const hdrTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("./assets/env.env", scene);
    scene.environmentTexture = hdrTexture;
    
    // Create the skybox
    const skybox = scene.createDefaultSkybox(hdrTexture, true, 1000);
    skybox.rotation = new BABYLON.Vector3(0, BABYLON.Tools.ToRadians(70), 0); // Rotate the skybox
    console.log("HDRI loaded.");
}

async function loadGLBAsync(scene) {
    console.log("Loading GLB...");
    return new Promise((resolve, reject) => {
        BABYLON.SceneLoader.ImportMesh("", "assets/", "lobby.glb", scene, function (meshes) {
            meshes.forEach(mesh => {
                shadowGenerator.addShadowCaster(mesh);
                mesh.receiveShadows = true;
                mesh.name = "lobby_" + mesh.name;
                mesh.isPickable = false; // Make the visible mesh not raycasted

                if (mesh.material && mesh.material.name === "glass") {
                    mesh.material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND; // Enable alpha blending
                    mesh.material.alpha = 0.2; // Set alpha value for transparency
                }
                if (mesh.material && mesh.material.name === "concrete") {
                    mesh.material.roughness = 1.0;
                }
            });
            console.log("GLB loaded.");
            resolve();
        }, null, (scene, message, exception) => {
            console.error("Error loading GLB:", message, exception);
            reject(exception);
        });
    });
}

// Main function to load assets asynchronously
async function loadAssets(scene) {
    try {
        // Load HDRI and GLB asynchronously
        await Promise.all([loadHDRIAsync(scene), loadGLBAsync(scene)]);

        // Remove temporary background once assets are loaded
        scene.clearColor = new BABYLON.Color4(0, 0, 0, 0); // Transparent background
        console.log("All assets loaded.");
    } catch (error) {
        console.error("Error loading assets:", error);
    }
}

// areaLight
function createLight(position, rotation, color, name, scene){
    const box = BABYLON.MeshBuilder.CreateBox("box" + name, {width: 3, height: 6, depth: 0.01});
    const lightMaterial = new BABYLON.StandardMaterial();
    lightMaterial.disableLighting = true;
    lightMaterial.emissiveColor = color;
    box.material =  lightMaterial;

    box.position = position
    box.rotation = rotation;
    box.scaling.set(2.025,.25,.25);

    // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
    var light = new BABYLON.RectAreaLight("light" + name, new BABYLON.Vector3(0, 0, 0), 3, 6, scene);
    light.parent = box;
    light.specular = color;
    light.diffuse = color;

    // Default intensity is 1. Let's dim the light a small amount
    light.intensity = 0.7;
    return box;
}


// inspector
// scene.debugLayer.show();

createLight(new BABYLON.Vector3(0.55,2.7, -7), new BABYLON.Vector3(BABYLON.Tools.ToRadians(-90),0,0), new BABYLON.Color3(1,.98,.9), "toplight", scene)

const directionalLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(0.33, -0.07, -0.97), scene);
directionalLight.autoCalcShadowZBounds = true;
directionalLight.intensity = 5.0;





loadAssets(scene);



//// HOLOGRAMS
const hologramMaterial = new BABYLON.StandardMaterial("hologram", scene);
hologramMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.8, 1); // Glowing blue
hologramMaterial.alpha = 0.3; // Semi-transparent

const glowLayer = new BABYLON.GlowLayer("glow", scene);
glowLayer.intensity = 0.5; // Adjust the glow intensity

function getRandomInRange(min, max) {
    return Math.random() * (max - min) + min;
}
Object.values(gameList).forEach((game, index) => {
    // Generate random position within the specified range
    const position = new BABYLON.Vector3(
        getRandomInRange(-2.5, 2.7), // X range
        getRandomInRange(0.5, 2),   // Y range
        getRandomInRange(-3.5, 3.7) // Z range
    );

    // Generate random radius for the sphere
    const radius = getRandomInRange(0.05, 0.4);

    // Create the sphere (planet)
    const planet = BABYLON.MeshBuilder.CreateSphere(`planet_${index}`, { diameter: radius * 2 }, scene);
    planet.position = position;

    // Assign the "hologram" material
    planet.material = hologramMaterial;

    // Optional: Add metadata to the planet for debugging or interaction
    planet.metadata = {
        name: game.name,
        author: game.author,
        url: game.url,
        genres: game.genres
    };

    const textBlock = new BABYLON.GUI.TextBlock();
    textBlock.text = `${game.name}\nby ${game.author}`;
    textBlock.color = "white";
    textBlock.fontSize = 25;
    textBlock.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    textBlock.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;

    // Attach the text to the planet's position
    const plane = BABYLON.MeshBuilder.CreatePlane(`label_${index}`, { size: 3 }, scene);
    plane.position = position.add(new BABYLON.Vector3(0, radius + 0.2, 0)); // Position above the planet
    plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL; // Make the text always face the camera
    plane.isPickable = false;
    const labelTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(plane, 512, 512);
    labelTexture.addControl(textBlock);

    // Add an action to make the planet disappear when selected
    planet.actionManager = new BABYLON.ActionManager(scene);
    planet.actionManager.registerAction(
        new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPickTrigger, // Trigger when the planet is clicked/touched
            function () {
                console.log(`Planet selected: ${game.name}`);
                loadExperience(planet.metadata);
            }
        )
    );


    // Log the planet's metadata
    console.log(`Created planet for game: ${game.name}`, planet.metadata);
});

/// EXTRA PLANETS (DECO)
const extraPlanetCount = Math.floor(getRandomInRange(10, 20)); // Random number between 10 and 20

for (let i = 0; i < extraPlanetCount; i++) {
    // Generate random position within the specified range
    const position = new BABYLON.Vector3(
        getRandomInRange(-5, 5), // X range
        getRandomInRange(0.5, 3), // Y range
        getRandomInRange(-5, 5) // Z range
    );

    // Generate random radius for the sphere
    const radius = getRandomInRange(0.05, 0.2); // Smaller size for extra planets

    // Create the sphere (extra planet)
    const extraPlanet = BABYLON.MeshBuilder.CreateSphere(`extra_planet_${i}`, { diameter: radius * 2 }, scene);
    extraPlanet.position = position;

    // Assign the "hologram" material
    extraPlanet.material = hologramMaterial;

    // Optional: Add metadata to identify these as extra planets (if needed)
    extraPlanet.metadata = { isExtraPlanet: true };

    // Log the creation of the extra planet
    // console.log(`Created extra planet: extra_planet_${i}`);
}



// Enable shadows
const shadowGenerator = new BABYLON.ShadowGenerator(1024, directionalLight);
// shadowGenerator.useExponentialShadowMap = true; // Use soft shadows
shadowGenerator.usePercentageCloserFiltering = true;
shadowGenerator.filteringQuality = BABYLON.ShadowGenerator.QUALITY_HIGH; // Options: LOW, MEDIUM, HIGH
shadowGenerator.bias = 0.0005; // Reduce shadow acne (artifacts)
shadowGenerator.normalBias = 0.05; // Offset shadows to avoid artifacts
directionalLight.shadowEnabled = true;




// OPENXR WITH NAVMESH

BABYLON.SceneLoader.ImportMesh("", "assets/", "navmesh.obj", scene, function (meshes) {
    const navmesh = meshes[0]; // Assuming the navmesh is the first mesh loaded
    navmesh.isVisible = false;

    // Initialize XR experience with teleportation
    scene.createDefaultXRExperienceAsync({
        floorMeshes: [navmesh]
    }).then((xrHelper) => {
        scene.xrHelper = xrHelper;
        console.log("WebXR enabled with teleportation oder so", xrHelper);



        // Track the B button state for newly added controllers
        xrHelper.input.onControllerAddedObservable.add((controller) => {
            setupButtonTracking(controller);
        });

        xrHelper.baseExperience.onStateChangedObservable.add((state) => {
            if (state === BABYLON.WebXRState.IN_XR) {
                camera = xrHelper.baseExperience.camera; // Update the camera reference
            } else if (state === BABYLON.WebXRState.NOT_IN_XR) {
                camera = scene.activeCamera; // Revert to the original camera
            }
        });

    }).catch((error) => {
        console.error("Error enabling WebXR", error);
    });
});

// Define a global array to track the state of all buttons
window.buttonStates = []; // Attach to the `window` object for global access

// Function to set up button tracking
function setupButtonTracking(controller) {
    console.log("Setting up button tracking for controller:", controller);

    controller.onMotionControllerInitObservable.add((motionController) => {
        console.log("Motion Controller initialized:", motionController);

        // Access the Gamepad object directly
        const gamepad = motionController.gamepadObject;
        if (gamepad && gamepad.buttons.length > 0) {

            // Initialize the global buttonStates array
            window.buttonStates = new Array(gamepad.buttons.length).fill(false);

            // Poll for button state changes
            setInterval(() => {
                // Update the global buttonStates array
                gamepad.buttons.forEach((button, index) => {
                    window.buttonStates[index] = button.pressed;
                });

            }, 100); // Check every 100ms
        } else {
            console.warn("Gamepad or buttons not available.");
        }
    });
}
/// SKYBOX
// const hdrTexture = new BABYLON.HDRCubeTexture("./assets/env.hdr", scene, 512);
// scene.environmentTexture = hdrTexture;
// const skybox = scene.createDefaultSkybox(hdrTexture, true, 1000);
// skybox.rotation = new BABYLON.Vector3(0, BABYLON.Tools.ToRadians(70), 0); // Rotate the skybox

directionalLight.shadowMinZ = 1; // Minimum distance for shadows
directionalLight.shadowMaxZ = 1500; // Maximum distance for shadows

scene.meshes.forEach(mesh => {
    mesh.name = `lobby_${mesh.name}`;
});

scene.lights.forEach(light => {
    light.name = `lobby_${light.name}`;
});

scene.materials.forEach(material => {
    material.name = `lobby_${material.name}`;
});

scene.textures.forEach(texture => {
    texture.name = `lobby_${texture.name}`;
});


window.addEventListener("resize", () => engine.resize());

