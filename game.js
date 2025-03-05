// Game variables
let scene, camera, renderer, mosquito, humans = [];
let clock = new THREE.Clock();
let bloodLevel = 50; // Starting blood level at 50%
let gameActive = false;
let keys = {};
let mosquitoSpeed = 0.1;
let mosquitoRotationSpeed = 0.05;
let humanAttackCooldown = 0;
let currentTarget = null;
let bloodSuckingSound, hitSound, gameMusic;
let impactEffects = []; // Array to store impact effects
const MAX_HUMANS = 5; // Maximum number of humans in the world
let bloodDrainTimer = 0; // Timer for blood drain
const BLOOD_DRAIN_RATE = 1; // Blood drain rate in % per second
let rocks = []; // Array to store thrown rocks

// DOM elements
const bloodLevelElement = document.getElementById('blood-level');
const bloodMeterFill = document.getElementById('blood-meter-fill');
const gameOverElement = document.getElementById('game-over');
const finalScoreElement = document.getElementById('final-score');
const instructionsElement = document.getElementById('instructions');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');

// Event listeners
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', restartGame);
document.addEventListener('keydown', (e) => keys[e.key] = true);
document.addEventListener('keyup', (e) => keys[e.key] = false);

// Initialize the game
function init() {
    try {
        // Create scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB); // Sky blue background
        
        // Create camera
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 5, 10);
        
        // Create renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        document.getElementById('game-container').appendChild(renderer.domElement);
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 200, 100);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        scene.add(directionalLight);
        
        // Create ground
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x228B22,  // Forest green
            side: THREE.DoubleSide
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);
        
        // Create mosquito
        createMosquito();
        
        // Create humans
        createHumans(5);
        
        // Create environment
        createEnvironment();
        
        // Handle window resize
        window.addEventListener('resize', onWindowResize);
        
        // Start animation loop
        animate();
        
        console.log("Game initialized successfully");
    } catch (error) {
        console.error("Error initializing game:", error);
    }
}

// Create mosquito character
function createMosquito() {
    // Mosquito body - using SphereGeometry and CylinderGeometry instead of CapsuleGeometry
    const bodyGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    
    // Add a cylinder to make the body more elongated
    const bodyExtensionGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.4, 16);
    const bodyExtension = new THREE.Mesh(bodyExtensionGeometry, bodyMaterial);
    bodyExtension.rotation.x = Math.PI / 2;
    bodyExtension.position.z = 0.1;
    
    // Mosquito wings
    const wingGeometry = new THREE.PlaneGeometry(0.5, 0.3);
    const wingMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xaaaaaa, 
        transparent: true, 
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    
    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
    leftWing.position.set(0.3, 0.1, 0);
    leftWing.rotation.y = Math.PI / 4;
    
    const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
    rightWing.position.set(-0.3, 0.1, 0);
    rightWing.rotation.y = -Math.PI / 4;
    
    // Mosquito proboscis (needle)
    const proboscisGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.4);
    const proboscisMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const proboscis = new THREE.Mesh(proboscisGeometry, proboscisMaterial);
    proboscis.position.set(0, 0, -0.4);
    proboscis.rotation.x = Math.PI / 2;
    
    // Create mosquito group
    mosquito = new THREE.Group();
    mosquito.add(body);
    mosquito.add(bodyExtension);
    mosquito.add(leftWing);
    mosquito.add(rightWing);
    mosquito.add(proboscis);
    
    mosquito.position.set(0, 2, 0);
    mosquito.userData = { type: 'mosquito', wingTime: 0 };
    
    scene.add(mosquito);
    
    // Position camera behind mosquito
    updateCameraPosition();
}

// Create human characters
function createHumans(count) {
    // Remove existing humans if recreating
    for (let i = humans.length - 1; i >= 0; i--) {
        scene.remove(humans[i]);
    }
    humans = [];
    
    for (let i = 0; i < count; i++) {
        createHuman();
    }
}

// Create a single human
function createHuman(remembersPlayer = false, position = null) {
    // Human body - using CylinderGeometry instead of CapsuleGeometry
    const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: Math.random() * 0xffffff  // Random color for each human
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    
    // Human head
    const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffdbac,  // Skin color
        transparent: true, // Enable transparency for color transitions
        opacity: 1.0
    }); 
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.1;
    head.castShadow = true;
    
    // Human arms - using CylinderGeometry instead of CapsuleGeometry
    const armGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.7, 16);
    const armMaterial = new THREE.MeshStandardMaterial({ color: bodyMaterial.color });
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(0.65, 0.2, 0);
    leftArm.rotation.z = -Math.PI / 6;
    leftArm.castShadow = true;
    
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(-0.65, 0.2, 0);
    rightArm.rotation.z = Math.PI / 6;
    rightArm.castShadow = true;
    
    // Add hands for better swatting animation
    const handGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const handMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac }); // Skin color
    
    const leftHand = new THREE.Mesh(handGeometry, handMaterial);
    leftHand.position.set(0, -0.4, 0);
    leftArm.add(leftHand);
    
    const rightHand = new THREE.Mesh(handGeometry, handMaterial);
    rightHand.position.set(0, -0.4, 0);
    rightArm.add(rightHand);
    
    // Group all parts together
    const humanGroup = new THREE.Group();
    humanGroup.add(body);
    humanGroup.add(head);
    humanGroup.add(leftArm);
    humanGroup.add(rightArm);
    
    // Set position
    if (position) {
        humanGroup.position.copy(position);
    } else {
        // Random position within bounds
        humanGroup.position.set(
            (Math.random() - 0.5) * 100,
            0,
            (Math.random() - 0.5) * 100
        );
    }
    
    // Add user data for behavior
    humanGroup.userData = {
        walkDirection: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize(),
        walkSpeed: 0.03 + Math.random() * 0.02, // Random speed
        changeDirectionTime: 0,
        bloodLevel: 100, // Full blood
        isAngry: false,
        remembersPlayer: remembersPlayer,
        attackCooldown: 0,
        isAttacking: false,
        attackAnimationTime: 0,
        detectionRange: remembersPlayer ? 15 : 5, // Larger detection range if they remember the player
        rockThrowCooldown: 0, // Cooldown for throwing rocks
        originalLeftArmRotation: leftArm.rotation.clone(), // Store original arm rotations for animations
        originalRightArmRotation: rightArm.rotation.clone()
    };
    
    // Add memory indicator if human remembers player
    if (remembersPlayer) {
        const memoryIndicator = createMemoryIndicator();
        memoryIndicator.position.y = 2;
        humanGroup.add(memoryIndicator);
    }
    
    // Add to scene and humans array
    scene.add(humanGroup);
    humans.push(humanGroup);
    
    return humanGroup;
}

// Create a visual indicator for humans that remember the player
function createMemoryIndicator() {
    const geometry = new THREE.TorusGeometry(0.2, 0.03, 16, 32);
    const material = new THREE.MeshBasicMaterial({ 
        color: 0xff0000,
        transparent: true,
        opacity: 0.7
    });
    const indicator = new THREE.Mesh(geometry, material);
    indicator.rotation.x = Math.PI / 2; // Make it horizontal
    return indicator;
}

// Create environment objects
function createEnvironment() {
    // Create trees
    for (let i = 0; i < 20; i++) {
        // Tree trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 3, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brown
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.castShadow = true;
        
        // Tree leaves
        const leavesGeometry = new THREE.ConeGeometry(2, 4, 8);
        const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x006400 }); // Dark green
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.y = 3.5;
        leaves.castShadow = true;
        
        // Create tree group
        const tree = new THREE.Group();
        tree.add(trunk);
        tree.add(leaves);
        
        // Random position
        const x = Math.random() * 90 - 45;
        const z = Math.random() * 90 - 45;
        tree.position.set(x, 0, z);
        
        scene.add(tree);
    }
    
    // Create houses
    for (let i = 0; i < 5; i++) {
        // House base
        const baseGeometry = new THREE.BoxGeometry(5, 3, 5);
        const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xD3D3D3 }); // Light gray
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.castShadow = true;
        
        // House roof
        const roofGeometry = new THREE.ConeGeometry(4, 2, 4);
        const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x8B0000 }); // Dark red
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = 2.5;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        
        // Create house group
        const house = new THREE.Group();
        house.add(base);
        house.add(roof);
        
        // Random position
        const x = Math.random() * 80 - 40;
        const z = Math.random() * 80 - 40;
        house.position.set(x, 1.5, z);
        
        scene.add(house);
    }
}

// Update camera position to follow mosquito
function updateCameraPosition() {
    // Calculate offset based on mosquito's rotation
    const offset = new THREE.Vector3(0, 2, 5);
    offset.applyQuaternion(mosquito.quaternion);
    
    // Position camera behind mosquito
    camera.position.copy(mosquito.position).add(offset);
    camera.lookAt(mosquito.position);
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Start the game
function startGame() {
    try {
        instructionsElement.classList.add('hidden');
        gameActive = true;
        bloodLevel = 50; // Start with 50% blood
        updateUI();
        
        // Reset any existing rocks
        for (let i = rocks.length - 1; i >= 0; i--) {
            if (rocks[i]) {
                scene.remove(rocks[i]);
            }
        }
        rocks = [];
        
        // Reset impact effects
        for (let i = impactEffects.length - 1; i >= 0; i--) {
            const effect = impactEffects[i];
            if (effect.type === 'dust' && Array.isArray(effect.mesh)) {
                for (let j = 0; j < effect.mesh.length; j++) {
                    if (effect.mesh[j]) {
                        scene.remove(effect.mesh[j]);
                    }
                }
            } else if (effect.mesh) {
                scene.remove(effect.mesh);
            }
        }
        impactEffects = [];
        
        console.log("Game started successfully");
    } catch (error) {
        console.error("Error starting game:", error);
    }
}

// Restart the game
function restartGame() {
    try {
        gameOverElement.classList.add('hidden');
        
        // Reset game state
        bloodLevel = 50;
        updateUI();
        
        // Reset mosquito position
        mosquito.position.set(0, 5, 0);
        mosquito.rotation.set(0, 0, 0);
        
        // Reset humans
        createHumans(5);
        
        // Reset any existing rocks
        for (let i = rocks.length - 1; i >= 0; i--) {
            if (rocks[i]) {
                scene.remove(rocks[i]);
            }
        }
        rocks = [];
        
        // Reset impact effects
        for (let i = impactEffects.length - 1; i >= 0; i--) {
            const effect = impactEffects[i];
            if (effect.type === 'dust' && Array.isArray(effect.mesh)) {
                for (let j = 0; j < effect.mesh.length; j++) {
                    if (effect.mesh[j]) {
                        scene.remove(effect.mesh[j]);
                    }
                }
            } else if (effect.mesh) {
                scene.remove(effect.mesh);
            }
        }
        impactEffects = [];
        
        // Restart game
        gameActive = true;
        
        console.log("Game restarted successfully");
    } catch (error) {
        console.error("Error restarting game:", error);
    }
}

// Update UI elements
function updateUI() {
    bloodLevelElement.textContent = bloodLevel;
    
    // Update blood meter fill
    bloodMeterFill.style.width = `${bloodLevel}%`;
    
    // Change blood meter color based on level
    if (bloodLevel < 25) {
        bloodMeterFill.style.background = 'linear-gradient(to right, #400000, #8b0000)';
    } else if (bloodLevel < 50) {
        bloodMeterFill.style.background = 'linear-gradient(to right, #8b0000, #ff0000)';
    } else {
        bloodMeterFill.style.background = 'linear-gradient(to right, #ff0000, #ff5555)';
    }
    
    // Update mosquito appearance based on blood level
    updateMosquitoAppearance();
}

// Update mosquito appearance based on blood level
function updateMosquitoAppearance() {
    // Get mosquito body (first child)
    const body = mosquito.children[0];
    if (body && body.material) {
        // Change color based on blood level (red when full, pale when empty)
        const redValue = Math.min(0.8, 0.2 + (bloodLevel / 100) * 0.6);
        body.material.color.setRGB(redValue, 0.1, 0.1);
        
        // Change size based on blood level
        const scale = 0.7 + (bloodLevel / 100) * 0.3;
        mosquito.scale.set(scale, scale, scale);
    }
}

// Handle mosquito movement
function handleMosquitoMovement(delta) {
    if (!gameActive) return;
    
    // Forward/backward movement
    if (keys['ArrowUp']) {
        mosquito.translateZ(-mosquitoSpeed);
    }
    if (keys['ArrowDown']) {
        mosquito.translateZ(mosquitoSpeed);
    }
    
    // Rotation
    if (keys['ArrowLeft']) {
        mosquito.rotation.y += mosquitoRotationSpeed;
    }
    if (keys['ArrowRight']) {
        mosquito.rotation.y -= mosquitoRotationSpeed;
    }
    
    // Up/down movement - changed from Shift/Control to W/S
    if (keys['w'] || keys['W']) {
        mosquito.position.y += mosquitoSpeed;
    }
    if (keys['s'] || keys['S']) {
        mosquito.position.y -= mosquitoSpeed;
    }
    
    // Keep mosquito within bounds
    mosquito.position.y = Math.max(0.5, Math.min(10, mosquito.position.y));
    mosquito.position.x = Math.max(-50, Math.min(50, mosquito.position.x));
    mosquito.position.z = Math.max(-50, Math.min(50, mosquito.position.z));
    
    // Animate wings
    const leftWing = mosquito.children[2];
    const rightWing = mosquito.children[3];
    
    mosquito.userData.wingTime += delta * 20;
    const wingAngle = Math.sin(mosquito.userData.wingTime) * Math.PI / 4;
    
    leftWing.rotation.y = Math.PI / 4 + wingAngle;
    rightWing.rotation.y = -Math.PI / 4 - wingAngle;
    
    // Update camera position
    updateCameraPosition();
    
    // Check for blood sucking
    if (keys[' ']) {
        tryToSuckBlood();
    }
}

// Handle human movement and behavior
function handleHumans(delta) {
    // Check if we need to replace any humans
    if (humans.length < MAX_HUMANS) {
        const humansToAdd = MAX_HUMANS - humans.length;
        for (let i = 0; i < humansToAdd; i++) {
            // 30% chance the new human remembers the player if player has sucked blood before
            const remembersPlayer = bloodLevel > 0 && Math.random() < 0.3;
            createHuman(remembersPlayer);
        }
    }
    
    for (let i = humans.length - 1; i >= 0; i--) {
        const human = humans[i];
        const userData = human.userData;
        
        // Handle walking
        if (!userData.isAngry) {
            userData.changeDirectionTime += delta;
            
            // Change direction randomly
            if (userData.changeDirectionTime > 5) {
                userData.walkDirection = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
                userData.changeDirectionTime = 0;
            }
            
            // Move human
            human.position.x += userData.walkDirection.x * userData.walkSpeed;
            human.position.z += userData.walkDirection.z * userData.walkSpeed;
            
            // Rotate human to face walking direction
            human.rotation.y = Math.atan2(userData.walkDirection.x, userData.walkDirection.z);
            
            // Keep human within bounds
            human.position.x = Math.max(-50, Math.min(50, human.position.x));
            human.position.z = Math.max(-50, Math.min(50, human.position.z));
            
            // Check if human remembers player and player is nearby
            if (userData.remembersPlayer) {
                const distanceToPlayer = mosquito.position.distanceTo(human.position);
                const heightDifference = mosquito.position.y - human.position.y;
                
                // Check if mosquito is above the human (for rock throwing)
                if (heightDifference > 3 && distanceToPlayer < userData.detectionRange && userData.rockThrowCooldown <= 0) {
                    // Throw a rock at the mosquito
                    throwRockAtMosquito(human);
                    userData.rockThrowCooldown = 3 + Math.random() * 2; // Random cooldown between 3-5 seconds
                }
                
                // Normal detection for close range
                if (distanceToPlayer < userData.detectionRange && heightDifference < 3) {
                    // Human recognizes the mosquito and becomes angry
                    userData.isAngry = true;
                    userData.attackCooldown = 0.5; // Quick initial reaction
                    
                    // Visual feedback - flash head red briefly
                    const head = human.children[1];
                    if (head && head.material) {
                        head.material.color.set(0xff0000);
                        setTimeout(() => {
                            if (head && head.material) {
                                head.material.color.set(0xffdbac);
                            }
                        }, 200);
                    }
                    
                    console.log("Human recognized the mosquito!");
                }
            }
        }
        
        // Handle angry humans
        if (userData.isAngry) {
            // Face the mosquito
            const direction = new THREE.Vector3().subVectors(mosquito.position, human.position);
            human.rotation.y = Math.atan2(direction.x, direction.z);
            
            // Move toward the mosquito when angry
            const normalizedDirection = direction.clone().normalize();
            human.position.x += normalizedDirection.x * (userData.walkSpeed * 1.5); // Move faster when angry
            human.position.z += normalizedDirection.z * (userData.walkSpeed * 1.5);
            
            // Keep human within bounds
            human.position.x = Math.max(-50, Math.min(50, human.position.x));
            human.position.z = Math.max(-50, Math.min(50, human.position.z));
            
            // Attack cooldown
            userData.attackCooldown -= delta;
            
            if (userData.attackCooldown <= 0 && !userData.isAttacking) {
                // Attack the mosquito
                attackMosquito(human);
                userData.attackCooldown = 2; // Reset cooldown
            }
            
            // If human is too far from mosquito, stop being angry (unless they remember the player)
            const distanceToPlayer = mosquito.position.distanceTo(human.position);
            if (distanceToPlayer > 10 && !userData.remembersPlayer) {
                userData.isAngry = false;
            }
            
            // Check if mosquito is high above but still in range (for rock throwing)
            const heightDifference = mosquito.position.y - human.position.y;
            
            if (heightDifference > 3 && distanceToPlayer < userData.detectionRange && userData.rockThrowCooldown <= 0) {
                // Throw a rock at the mosquito
                throwRockAtMosquito(human);
                userData.rockThrowCooldown = 3 + Math.random() * 2; // Random cooldown between 3-5 seconds
            }
        }
        
        // Regenerate blood over time
        if (userData.bloodLevel < 100) {
            userData.bloodLevel += delta * 2;
            
            // No longer angry if blood level is above 50% (but still remembers player)
            if (userData.bloodLevel > 50 && userData.isAngry && !userData.remembersPlayer) {
                userData.isAngry = false;
                
                // Reset head color if it was changed
                const head = human.children[1];
                if (head && head.material) {
                    head.material.color.set(0xffdbac); // Reset to normal skin color
                }
            }
        }
        
        // If human has no blood left, replace them
        if (userData.bloodLevel <= 0) {
            // Remove this human
            scene.remove(human);
            humans.splice(i, 1);
            
            // Create a new human that remembers the player
            createHuman(true);
        }
        
        // Update rock throw cooldown
        if (userData.rockThrowCooldown > 0) {
            userData.rockThrowCooldown -= delta;
        }
    }
}

// Try to suck blood from nearby humans
function tryToSuckBlood() {
    for (let human of humans) {
        const distance = mosquito.position.distanceTo(human.position);
        
        // Check if mosquito is close enough to human
        if (distance < 2) {
            const userData = human.userData;
            
            // Check if human has blood to suck
            if (userData.bloodLevel > 0) {
                // Suck blood
                userData.bloodLevel -= 1;
                bloodLevel = Math.min(100, bloodLevel + 2); // Gain 2% blood per suck, max 100%
                updateUI();
                
                // Human now remembers the mosquito
                userData.remembersPlayer = true;
                
                // If this human doesn't have a memory indicator, add one
                if (!human.children.find(child => child.geometry && child.geometry.type === 'TorusGeometry')) {
                    const memoryIndicator = createMemoryIndicator();
                    memoryIndicator.position.y = 1.6; // Position above head
                    human.add(memoryIndicator);
                }
                
                // Make human angry if too much blood is sucked
                if (userData.bloodLevel < 30 && !userData.isAngry) {
                    userData.isAngry = true;
                    userData.attackCooldown = 1; // Initial attack delay
                    console.log("Human is now angry!");
                }
                
                // Visual feedback - make human slightly transparent based on blood level
                const opacity = 0.5 + (userData.bloodLevel / 200);
                human.children.forEach(part => {
                    if (part.material && part.material.opacity !== undefined) {
                        part.material.opacity = opacity;
                        part.material.transparent = true;
                    }
                });
                
                break; // Only suck blood from one human at a time
            }
        }
    }
}

// Human attacks mosquito
function attackMosquito(human) {
    try {
        const distance = mosquito.position.distanceTo(human.position);
        
        // Check if mosquito is within attack range
        if (distance < 3) {
            // Get the human's head (should be the second child in the group)
            const head = human.children[1];
            if (!head || !head.material) {
                console.error("Head not found on human or missing material");
                return;
            }
            
            const originalHeadColor = head.material.color.clone();
            
            // Visual warning - turn head red before attacking
            head.material.color.set(0xff0000); // Bright red
            
            // Get arm references
            const leftArm = human.children[2];
            const rightArm = human.children[3];
            
            // Check if arms exist
            if (!leftArm || !rightArm) {
                console.error("Arms not found on human");
                return;
            }
            
            // Initialize original rotations if they don't exist
            if (!human.userData.originalLeftArmRotation) {
                human.userData.originalLeftArmRotation = leftArm.rotation.clone();
            }
            if (!human.userData.originalRightArmRotation) {
                human.userData.originalRightArmRotation = rightArm.rotation.clone();
            }
            
            // Start attack animation
            human.userData.isAttacking = true;
            human.userData.attackAnimationTime = 0;
            
            // Delay the actual attack to give player time to react
            setTimeout(() => {
                // Calculate hit chance based on distance
                const hitChance = 1 - (distance / 3);
                
                // Get updated distance (player might have moved)
                const updatedDistance = mosquito.position.distanceTo(human.position);
                
                if (updatedDistance < 3 && Math.random() < hitChance) {
                    // Mosquito is hit
                    bloodLevel = Math.max(0, bloodLevel - 15); // Lose 15% blood when hit
                    updateUI();
                    console.log("Mosquito hit! Blood level: " + bloodLevel);
                    
                    // Visual feedback - flash screen red
                    document.body.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
                    setTimeout(() => {
                        document.body.style.backgroundColor = '';
                    }, 100);
                    
                    // Create impact effect
                    createImpactEffect(mosquito.position.clone());
                    
                    // Mosquito reaction animation
                    mosquitoHitReaction();
                    
                    // Check if game over
                    if (bloodLevel <= 0) {
                        gameOver();
                    }
                } else {
                    console.log("Human missed the mosquito!");
                }
                
                // Reset head color after attack
                if (head && head.material) {
                    head.material.color.copy(originalHeadColor);
                }
                
            }, 500); // 500ms warning time before attack
        }
    } catch (error) {
        console.error("Error in attackMosquito:", error);
    }
}

// Create impact effect at the point of hit
function createImpactEffect(position) {
    // Create a star-shaped impact effect
    const impactGeometry = new THREE.BufferGeometry();
    const vertices = [];
    
    // Create star shape
    for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        const radius = i % 2 === 0 ? 0.2 : 0.4;
        vertices.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    }
    
    impactGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    
    const impactMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const impact = new THREE.Line(impactGeometry, impactMaterial);
    
    // Position the impact effect
    impact.position.copy(position);
    
    // Add to scene and to our array for tracking
    scene.add(impact);
    impactEffects.push({
        mesh: impact,
        createdTime: clock.getElapsedTime(),
        lifetime: 0.5 // Effect lasts for 0.5 seconds
    });
}

// Mosquito reaction when hit
function mosquitoHitReaction() {
    // Save original color
    const originalColor = mosquito.children[0].material.color.clone();
    
    // Change color to red
    mosquito.children.forEach(child => {
        if (child.material && child.material.color) {
            child.material.color.set(0xff0000);
        }
    });
    
    // Add a small random displacement
    const originalPosition = mosquito.position.clone();
    const displacement = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
    );
    mosquito.position.add(displacement);
    
    // Reset after a short time
    setTimeout(() => {
        mosquito.children.forEach(child => {
            if (child.material && child.material.color) {
                child.material.color.copy(originalColor);
            }
        });
        mosquito.position.copy(originalPosition);
    }, 200);
}

// Update human attack animations
function updateHumanAnimations(delta) {
    for (let human of humans) {
        try {
            const userData = human.userData;
            
            if (userData.isAttacking) {
                userData.attackAnimationTime += delta * 5; // Control animation speed
                
                // Get arm references
                const leftArm = human.children[2];
                const rightArm = human.children[3];
                
                // Check if arms exist
                if (!leftArm || !rightArm) {
                    userData.isAttacking = false;
                    continue;
                }
                
                // Initialize original rotations if they don't exist
                if (!userData.originalLeftArmRotation) {
                    userData.originalLeftArmRotation = leftArm.rotation.clone();
                }
                if (!userData.originalRightArmRotation) {
                    userData.originalRightArmRotation = rightArm.rotation.clone();
                }
                
                if (userData.attackAnimationTime < 1) {
                    // Wind up phase - raise arms
                    const windUpProgress = userData.attackAnimationTime;
                    leftArm.rotation.z = userData.originalLeftArmRotation.z - (Math.PI / 2) * windUpProgress;
                    rightArm.rotation.z = userData.originalRightArmRotation.z + (Math.PI / 2) * windUpProgress;
                } else if (userData.attackAnimationTime < 1.5) {
                    // Swat phase - swing arms quickly
                    const swatProgress = (userData.attackAnimationTime - 1) * 2; // 0 to 1 in 0.5 seconds
                    leftArm.rotation.z = userData.originalLeftArmRotation.z - (Math.PI / 2) + Math.PI * swatProgress;
                    rightArm.rotation.z = userData.originalRightArmRotation.z + (Math.PI / 2) - Math.PI * swatProgress;
                } else {
                    // Reset arms and end animation
                    leftArm.rotation.z = userData.originalLeftArmRotation.z;
                    rightArm.rotation.z = userData.originalRightArmRotation.z;
                    userData.isAttacking = false;
                }
            }
        } catch (error) {
            console.error("Error in updateHumanAnimations:", error);
            // Reset the attacking state to prevent further errors
            if (human && human.userData) {
                human.userData.isAttacking = false;
            }
        }
    }
}

// Update rocks physics
function updateRocks(delta) {
    const currentTime = clock.getElapsedTime();
    
    for (let i = rocks.length - 1; i >= 0; i--) {
        const rock = rocks[i];
        // Skip if rock is undefined or has been removed
        if (!rock || !rock.userData) {
            rocks.splice(i, 1);
            continue;
        }
        
        const userData = rock.userData;
        
        // Apply gravity to velocity
        userData.velocity.y -= userData.gravity;
        
        // Move rock according to velocity
        rock.position.add(userData.velocity);
        
        // Rotate rock for visual effect
        rock.rotation.x += 0.1;
        rock.rotation.y += 0.15;
        
        // Check for collision with mosquito
        if (mosquito && rock.position.distanceTo(mosquito.position) < 0.5) {
            // Mosquito is hit by rock
            bloodLevel = Math.max(0, bloodLevel - 10); // Lose 10% blood when hit by rock
            updateUI();
            console.log("Mosquito hit by rock! Blood level: " + bloodLevel);
            
            // Visual feedback
            document.body.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
            setTimeout(() => {
                document.body.style.backgroundColor = '';
            }, 100);
            
            // Create impact effect
            createImpactEffect(mosquito.position.clone());
            
            // Mosquito reaction animation
            mosquitoHitReaction();
            
            // Check if game over
            if (bloodLevel <= 0) {
                gameOver();
            }
            
            // Remove the rock
            scene.remove(rock);
            rocks.splice(i, 1);
            continue;
        }
        
        // Check if rock hit the ground
        if (rock.position.y <= 0) {
            // Create small dust effect
            createDustEffect(rock.position.clone());
            
            // Remove the rock
            scene.remove(rock);
            rocks.splice(i, 1);
            continue;
        }
        
        // Check if rock lifetime is over
        if (currentTime - userData.createdTime > userData.lifetime) {
            scene.remove(rock);
            rocks.splice(i, 1);
        }
    }
}

// Create dust effect when rock hits ground
function createDustEffect(position) {
    // Make a copy of the position to avoid modifying the original
    const dustPosition = position.clone();
    dustPosition.y = 0.05; // Slightly above ground
    
    // Create particles for dust
    const particleCount = 8;
    const particles = [];
    
    for (let i = 0; i < particleCount; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.05, 4, 4);
        const particleMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xd2b48c, // Tan/dust color
            transparent: true,
            opacity: 0.7
        });
        
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        particle.position.copy(dustPosition);
        
        // Random horizontal spread
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.1 + Math.random() * 0.2;
        particle.position.x += Math.cos(angle) * radius;
        particle.position.z += Math.sin(angle) * radius;
        
        // Random upward velocity
        particle.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.02,
                0.02 + Math.random() * 0.03,
                (Math.random() - 0.5) * 0.02
            ),
            gravity: 0.001,
            lifetime: 0.5 + Math.random() * 0.5,
            createdTime: clock.getElapsedTime()
        };
        
        scene.add(particle);
        particles.push(particle);
    }
    
    // Add to impact effects array for tracking
    impactEffects.push({
        mesh: particles,
        createdTime: clock.getElapsedTime(),
        lifetime: 1, // Effect lasts for 1 second
        type: 'dust'
    });
}

// Function to make a human throw a rock at the mosquito
function throwRockAtMosquito(human) {
    try {
        // Get the human's right arm (should be the fourth child)
        const rightArm = human.children[3]; 
        if (!rightArm) {
            console.error("Right arm not found on human");
            return;
        }
        
        // Get the hand (should be the first child of the arm)
        const rightHand = rightArm.children[0]; 
        if (!rightHand) {
            console.error("Right hand not found on arm");
            return;
        }
        
        // Calculate world position of the hand
        const handPosition = new THREE.Vector3();
        rightHand.getWorldPosition(handPosition);
        
        // Create a rock at the hand position, targeting the mosquito
        createRock(handPosition, mosquito.position.clone());
        
        // Visual feedback - animation for throwing
        const originalRotation = rightArm.rotation.z;
        
        // Quick arm movement for throwing animation
        const throwAnimation = () => {
            // Raise arm
            rightArm.rotation.z = Math.PI / 2;
            
            // Then throw
            setTimeout(() => {
                rightArm.rotation.z = -Math.PI / 4;
                
                // Return to original position
                setTimeout(() => {
                    rightArm.rotation.z = originalRotation;
                }, 300);
            }, 200);
        };
        
        throwAnimation();
        
        console.log("Human threw a rock at the mosquito!");
    } catch (error) {
        console.error("Error in throwRockAtMosquito:", error);
    }
}

// Create a rock for throwing
function createRock(position, targetPosition) {
    try {
        // Rock geometry and material
        const rockGeometry = new THREE.DodecahedronGeometry(0.15, 0);
        const rockMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x7d7d7d,
            roughness: 0.9
        });
        const rock = new THREE.Mesh(rockGeometry, rockMaterial);
        rock.castShadow = true;
        
        // Position the rock at the human's hand
        rock.position.copy(position);
        
        // Calculate direction to target (with some randomness for inaccuracy)
        const direction = new THREE.Vector3().subVectors(targetPosition, position).normalize();
        
        // Add some vertical arc to the throw
        direction.y += 0.5;
        direction.normalize();
        
        // Add some randomness to the throw
        direction.x += (Math.random() - 0.5) * 0.2;
        direction.z += (Math.random() - 0.5) * 0.2;
        
        // Create a copy of the direction for velocity (since normalize modifies the vector)
        const velocity = direction.clone().multiplyScalar(0.2);
        
        // Rock data
        rock.userData = {
            velocity: velocity, // Speed of the rock
            gravity: 0.005, // Gravity effect
            createdTime: clock.getElapsedTime(),
            lifetime: 5 // Rock disappears after 5 seconds
        };
        
        // Add to scene and rocks array
        scene.add(rock);
        rocks.push(rock);
        
        return rock;
    } catch (error) {
        console.error("Error in createRock:", error);
        return null;
    }
}

// Update impact effects
function updateImpactEffects(delta) {
    const currentTime = clock.getElapsedTime();
    
    for (let i = impactEffects.length - 1; i >= 0; i--) {
        const effect = impactEffects[i];
        
        if (effect.type === 'dust') {
            // Handle dust particles
            const particles = effect.mesh;
            
            // Check if particles is an array before iterating
            if (Array.isArray(particles)) {
                for (let j = 0; j < particles.length; j++) {
                    const particle = particles[j];
                    
                    // Check if particle still exists
                    if (particle && particle.userData) {
                        // Apply gravity
                        particle.userData.velocity.y -= particle.userData.gravity;
                        
                        // Move particle
                        particle.position.add(particle.userData.velocity);
                        
                        // Fade out
                        const age = currentTime - effect.createdTime;
                        const fadeStart = effect.lifetime * 0.5;
                        
                        if (age > fadeStart) {
                            const fadeAmount = 1 - ((age - fadeStart) / (effect.lifetime - fadeStart));
                            particle.material.opacity = 0.7 * fadeAmount;
                        }
                    }
                }
            }
        } else if (effect.mesh) {
            // Handle standard impact effect (star shape)
            // Scale down over time
            const age = currentTime - effect.createdTime;
            const scale = 1 - (age / effect.lifetime);
            effect.mesh.scale.set(scale, scale, scale);
        }
        
        // Remove effect if lifetime is over
        if (currentTime - effect.createdTime > effect.lifetime) {
            if (effect.type === 'dust' && Array.isArray(effect.mesh)) {
                // Remove all particles
                for (let j = 0; j < effect.mesh.length; j++) {
                    const particle = effect.mesh[j];
                    if (particle) {
                        scene.remove(particle);
                    }
                }
            } else if (effect.mesh) {
                scene.remove(effect.mesh);
            }
            
            impactEffects.splice(i, 1);
        }
    }
}

// Game over
function gameOver() {
    gameActive = false;
    finalScoreElement.textContent = bloodLevel;
    gameOverElement.classList.remove('hidden');
}

// Animation loop
function animate() {
    // Always request the next frame, even if game is not active
    requestAnimationFrame(animate);
    
    try {
        // Only process game logic if game is active
        if (!gameActive) {
            // Just render the scene when game is not active
            renderer.render(scene, camera);
            return;
        }
        
        const delta = clock.getDelta();
        
        // Handle blood drain over time
        bloodDrainTimer += delta;
        if (bloodDrainTimer >= 1) { // Every second
            bloodLevel = Math.max(0, bloodLevel - BLOOD_DRAIN_RATE);
            updateUI();
            bloodDrainTimer = 0;
            
            // Check if game over
            if (bloodLevel <= 0) {
                gameOver();
                return;
            }
        }
        
        // Update mosquito appearance based on blood level
        updateMosquitoAppearance();
        
        // Handle mosquito movement
        handleMosquitoMovement(delta);
        
        // Handle humans
        handleHumans(delta);
        
        // Update rocks
        updateRocks(delta);
        
        // Update human animations
        updateHumanAnimations(delta);
        
        // Update impact effects
        updateImpactEffects(delta);
        
        // Update camera position
        updateCameraPosition();
        
        // Render scene
        renderer.render(scene, camera);
    } catch (error) {
        console.error("Error in animation loop:", error);
        // Still try to render the scene even if there was an error
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    }
}

// Initialize the game
init(); 