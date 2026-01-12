// js/skills/GravityOrb.js
// (Ini adalah versi yang sudah benar, menggunakan PlayerControls)

import * as THREE from 'three';

export class GravityOrb {
    /**
     * @param {THREE.Scene} scene
     * @param {THREE.Vector3} startPosition 
     * @param {Array<Enemy>} enemies 
     * @param {VFXManager} vfxManager 
     * @param {PlayerControls} playerControls // <-- Sudah benar menerima PlayerControls
     * @param {THREE.Camera} camera 
     */
    constructor(scene, startPosition, enemies, vfxManager, playerControls, camera) { 
        this.scene = scene;
        this.enemies = enemies;
        this.vfxManager = vfxManager;
        // --- Sudah benar menyimpan PlayerControls ---
        this.playerControls = playerControls; 
        this.camera = camera; 

        // Properti Skill
        this.duration = 10.0; 
        this.age = 0;
        this.gravityRadius = 10.0; 
        this.gravityStrength = 50.0; 
        this.spinSpeed = 5.0;     
        this.damagePerSecond = 5;  
        this.moveSpeed = 8.0;     
        this.explosionRadius = 8.0;
        this.explosionDamage = 40;
        this.isFinished = false;

        // Visual Orb
        const geometry = new THREE.SphereGeometry(1.0, 32, 16); 
        const material = new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.7 }); 
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(startPosition);
        // (Saya biarkan y-offset ini, asumsikan spawnPos dari Player sudah di ground)
        // Jika spawnPos sudah di y=1.5, mungkin ini perlu 0
        this.mesh.position.y += 1.5; 
        this.scene.add(this.mesh);
    }

    update(delta) {
        if (this.isFinished) return;
        this.age += delta;

        // --- Logika Gerakan Orb (Gunakan Stik Kanan - Sudah Benar) ---
        const moveDirection = new THREE.Vector3();
        const cameraForward = new THREE.Vector3();
        this.camera.getWorldDirection(cameraForward);
        cameraForward.y = 0; 
        cameraForward.normalize();
        const cameraRight = new THREE.Vector3().crossVectors(this.camera.up, cameraForward).normalize();

        // Ambil input dari stik kanan (state.look)
        const lookInput = this.playerControls.state.look;

        // Terapkan gerakan berdasarkan input stik kanan
        moveDirection.addScaledVector(cameraForward, -lookInput.y); // Balik sumbu Y stik
        moveDirection.addScaledVector(cameraRight, lookInput.x);

        // Terapkan gerakan jika ada input
        if (moveDirection.lengthSq() > 0.01) { // (Threshold)
            moveDirection.normalize();
            this.mesh.position.addScaledVector(moveDirection, this.moveSpeed * delta);
        }
        
        // Rotasi visual orb
        this.mesh.rotation.y += 0.5 * delta;
        this.mesh.rotation.x += 0.3 * delta;

        // Logika Gravitasi & Damage Musuh
        this.enemies.forEach(enemy => {
            if (!enemy.isEliminated && enemy.mesh.visible) {
                const distance = this.mesh.position.distanceTo(enemy.mesh.position);
                
                if (distance <= this.gravityRadius) {
                    // Tarik musuh
                    const direction = new THREE.Vector3().subVectors(this.mesh.position, enemy.mesh.position);
                    // direction.y = 0; // Hanya tarik di sumbu XZ
                    const pullForce = this.gravityStrength / (distance * distance + 1.0); // Makin dekat makin kuat
                    
                    // (Catatan: Ini memindahkan musuh secara langsung, 
                    // mungkin perlu diubah ke sistem velocity jika musuh punya fisika)
                    enemy.mesh.position.addScaledVector(direction.normalize(), pullForce * delta);

                    // Berikan damage per detik
                    // (Kita gunakan cara sederhana: damage * delta)
                    enemy.takeDamage(this.damagePerSecond * delta);
                }
            }
        });

        // Cek Durasi & Ledakan
        if (this.age >= this.duration) {
            this.explode();
            this.isFinished = true;
        }
    }

    explode() {
        console.log("Orb Explodes!");
        
        // Mainkan VFX ledakan di posisi orb
        if (this.vfxManager) {
            // (Asumsi kamu punya vfx bernama 'explosion' atau ganti namanya)
            this.vfxManager.play('infinityAura', this.mesh.position, { 
                color: 0x00aaff, 
                duration: 0.5, 
                maxScale: this.explosionRadius * 1.5 // Sesuaikan skala VFX
            });
        }

        // Berikan damage ledakan ke musuh
        this.enemies.forEach(enemy => {
             if (!enemy.isEliminated && enemy.mesh.visible) {
                const distance = this.mesh.position.distanceTo(enemy.mesh.position);
                if (distance <= this.explosionRadius) {
                    console.log(`Explosion hits enemy, dealing ${this.explosionDamage} damage.`);
                    enemy.takeDamage(this.explosionDamage);
                    // TODO: Tambahkan efek knockback jika ada
                }
            }
        });
    }

    destroy() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            this.mesh = null;
        }
    }
}