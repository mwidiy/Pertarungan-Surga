/*
 * File: js/effects/ExpandingRingEffect.js
 * Deskripsi: Komponen resep untuk efek cincin 2D yang mengembang.
 */

import * as THREE from 'three';

// --- PASTIKAN NAMA FILE INI ADALAH ExpandingRingEffect.js ---
// --- DAN PASTIKAN ADA 'export' DI SINI ---
export class ExpandingRingEffect {
    /**
     * @param {THREE.Scene} scene - Scene untuk menambahkan mesh.
     * @param {THREE.Vector3} startPosition - Posisi awal efek.
     * @param {number} color - Warna hex untuk material (misal: 0x00c0ff).
     */
    constructor(scene, startPosition, color) {
        this.scene = scene;

        const geometry = new THREE.RingGeometry(0.5, 1, 32);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide 
        });

        this.mesh = new THREE.Mesh(geometry, material);

        this.maxScale = 10;
        this.duration = 1.0; 
        this.age = 0;
        this.isFinished = false;

        this.mesh.position.copy(startPosition);
        this.mesh.position.y += 0.1; 
        this.mesh.rotation.x = -Math.PI / 2; 
        this.scene.add(this.mesh);
    }

    update(delta) {
        if (this.isFinished) return;

        this.age += delta;
        const progress = Math.min(this.age / this.duration, 1.0); 

        const scale = 1 + progress * (this.maxScale - 1); 
        this.mesh.scale.set(scale, scale, scale);

        this.mesh.material.opacity = 1.0 - progress;

        if (progress >= 1.0) {
            this.isFinished = true;
        }
    }

    destroy() {
       if (this.mesh.parent) {
            this.scene.remove(this.mesh);
       }
       if (this.mesh.geometry) {
            this.mesh.geometry.dispose();
       }
       if (this.mesh.material) {
           this.mesh.material.dispose();
       }
    }
}