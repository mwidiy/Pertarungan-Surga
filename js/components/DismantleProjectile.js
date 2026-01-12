// js/components/DismantleProjectile.js

import * as THREE from 'three';

export class DismantleProjectile {
    /**
     * @param {THREE.Scene} scene 
     * @param {THREE.Vector3} startPosition 
     * @param {THREE.Vector3} direction 
     * @param {Player} targetPlayer 
     * @param {number} damage 
     * @param {number} speed 
     */
    constructor(scene, startPosition, direction, targetPlayer, damage = 20, speed = 25) {
        this.scene = scene;
        this.direction = direction.clone(); // Simpan arah tembak
        this.targetPlayer = targetPlayer;
        this.damage = damage;
        this.speed = speed;
        this.lifetime = 3.0; // Detik sebelum hilang jika tidak kena
        this.age = 0;
        this.hit = false; // Status apakah sudah mengenai target

        // --- Visual Sederhana: Garis Merah Tipis ---
        const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
        const points = [];
        points.push(new THREE.Vector3(0, 0, 0));
        points.push(new THREE.Vector3(0, 0, -1.5)); // Panjang garis 1.5 unit
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        
        this.mesh = new THREE.Line(geometry, material);
        this.mesh.position.copy(startPosition);
        // Arahkan garis sesuai arah tembakan
        this.mesh.lookAt(startPosition.clone().add(direction)); 

        this.scene.add(this.mesh);
    }

    update(delta) {
        // Jika sudah kena atau umur habis, return false (untuk dihapus)
        if (this.hit || this.age > this.lifetime) {
            return false;
        }

        this.age += delta;

        // Gerakkan projectile lurus ke depan
        const moveDistance = this.speed * delta;
        this.mesh.position.addScaledVector(this.direction, moveDistance);

        // --- Deteksi Tabrakan Sederhana (Jarak) ---
        if (this.targetPlayer && this.targetPlayer.model && !this.targetPlayer.isEliminated) {
            const distanceToPlayer = this.mesh.position.distanceTo(this.targetPlayer.model.position);
            const playerRadius = 1.0; // Perkiraan radius player (sesuaikan)
            
            if (distanceToPlayer < playerRadius) {
                console.log("Dismantle Hit Player!");
                this.targetPlayer.takeDamage(this.damage);
                this.hit = true; // Tandai sudah kena
                
                // Sembunyikan mesh langsung saat kena
                this.mesh.visible = false; 
                // Bisa tambahkan efek hit di sini (VFXManager)
                return false; // Langsung minta dihapus
            }
        }

        // Jika belum kena dan masih hidup, return true
        return true; 
    }

    destroy() {
        // Fungsi cleanup (dipanggil oleh main1.js saat filter)
        if (this.mesh) {
            if (this.mesh.parent) this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            this.mesh = null;
        }
    }
}