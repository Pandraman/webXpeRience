export async function loadExperience(metadata) {
    console.log("Loading experience for:", metadata);

    try {
        // Validate metadata
        if (!metadata || !metadata.url) {
            throw new Error("Invalid metadata: 'url' is missing.");
        }

        // Store the original URL to prevent overwriting
        const scriptUrl = metadata.url; // Save the URL locally
        const scriptPath = `${scriptUrl}`;
        console.log(`Loading script: ${scriptPath}`);

        // Fetch and execute the script
        const response = await fetch(scriptPath);
        if (!response.ok) {
            throw new Error(`Failed to load script: ${response.statusText}`);
        }

        // Hide the lobby elements
        const lobbyMeshes = scene.meshes.filter(mesh => mesh.name.startsWith("lobby"));
        lobbyMeshes.forEach(mesh => {
            mesh.setEnabled(false); // Make the mesh invisible
        });
        const originalNavmesh = scene.meshes.find(mesh => mesh.name === "lobby_navmesh");
        // Hide the directional light
        const directionalLight = scene.lights.find(light => light.name === "lobby_dirLight");
        if (directionalLight) {
            directionalLight.setEnabled(false);
        }

        // Hide the skybox
        const skyBox = scene.meshes.find(mesh => mesh.name === "skyBox");
        if (skyBox) {
            skyBox.setEnabled(false);
        }

        const scriptContent = await response.text();

        // Pass the motionController and other objects to the script
        const motionController = scene.xrHelper?.input.controllers[0]?.motionController; // Example: Get the first motion controller
        if (!motionController) {
            console.warn("Motion controller is not available.");
        }

        // Add metadata to all existing objects in the scene
        console.log("appending metadata");
        scene.meshes.forEach(mesh => {
            mesh.metadata = { ...mesh.metadata, isExperienceObject: mesh.metadata?.isExperienceObject || false };
        });
        scene.lights.forEach(light => {
            light.metadata = { ...light.metadata, isExperienceObject: light.metadata?.isExperienceObject || false };
        });
        let xrHelper = scene.xrHelper;
        // Use Function constructor to pass variables to the script
        const scriptFunction = new Function("scene", "xrHelper","camera", "motionController", scriptContent);

        // Add metadata to new objects created during the experience
        const initialMeshCount = scene.meshes.length;
        const initialLightCount = scene.lights.length;

        scriptFunction(scene, xrHelper, scene.activeCamera, motionController);

        // Mark new meshes and lights as part of the experience
        scene.meshes.slice(initialMeshCount).forEach(mesh => {
            mesh.metadata = { isExperienceObject: true };
        });
        scene.lights.slice(initialLightCount).forEach(light => {
            light.metadata = { isExperienceObject: true };
        });

        addDeleteExperienceListener(lobbyMeshes, directionalLight, skyBox);
        console.log("Custom script executed successfully.");
    } catch (error) {
        console.error("Error loading experience:", error);
    }
}

function addDeleteExperienceListener(lobbyMeshes, directionalLight, skyBox) {
    console.log("addDeleteExperienceListener called.");

    // Keyboard listener for "Del" key
    window.addEventListener("keydown", (event) => {
        if (event.key === "Delete") {
            console.log("Delete key pressed.");
            deleteExperience(lobbyMeshes, directionalLight, skyBox);
        }
    });

    // Check if window.buttonStates exists and is an array
    if (window.buttonStates && Array.isArray(window.buttonStates)) {
        // Add a watcher for buttonStates[5]
        Object.defineProperty(window.buttonStates, "5", {
            set(value) {
                if (value === true) {
                    console.log("Button state 5 activated.");
                    deleteExperience(lobbyMeshes, directionalLight, skyBox);
                }
            },
            get() {
                return this._value;
            },
            configurable: true
        });
    } else {
        console.warn("window.buttonStates is not defined or not an array.");
    }
}



/**
 * Deletes the experience by re-enabling the lobby, directional light, and skybox.
 */
function deleteExperience(lobbyMeshes, directionalLight, skyBox) {
    console.log("Deleting experience and restoring the lobby.");

    // Re-enable the lobby elements
    lobbyMeshes.forEach(mesh => {
        mesh.setEnabled(true); // Make the mesh visible again
    });

    // Re-enable the directional light
    if (directionalLight) {
        directionalLight.setEnabled(true);
    }

    // Re-enable the skybox
    if (skyBox) {
        skyBox.setEnabled(true);
    }

    // Remove all meshes with metadata indicating they are part of the experience
    scene.meshes.forEach(mesh => {
        if (mesh.metadata?.isExperienceObject) {
            console.log(`Removing experience mesh: ${mesh.name}`);
            mesh.dispose(); // Dispose of the mesh
        }
    });

    // Remove all lights with metadata indicating they are part of the experience
    scene.lights.forEach(light => {
        if (light.metadata?.isExperienceObject) {
            console.log(`Removing experience light: ${light.name}`);
            light.dispose(); // Dispose of the light
        }
    });

    console.log("Experience deleted and lobby restored.");
}