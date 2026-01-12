/*
 * File: js/effects/ModelEffect.js
 * Deskripsi: Resep untuk efek visual yang menggunakan model 3D dan animasinya.
 */

import * as THREE from 'three';

export class ModelEffect {
    /**
     * @param {THREE.Scene} scene - Scene untuk menambahkan mesh.
     * @param {THREE.Vector3} startPosition - Posisi awal efek.
     * @param {THREE.Object3D} preloadedModel - Model 3D yang sudah di-load.
     * @param {Array<THREE.AnimationClip>} preloadedAnimations - Array animasi yang sudah di-load.
     */
    constructor(scene, startPosition, preloadedModel, preloadedAnimations) {
        this.scene = scene;

        // Clone modelnya
        this.model = preloadedModel.clone();
        this.model.position.copy(startPosition);
        this.model.scale.set(1, 1, 1); // Sesuaikan skala jika perlu
        this.scene.add(this.model);

        // --- PERUBAHAN 1: Setup Animasi ---
        this.mixer = null; // Akan dibuat jika ada animasi
        this.action = null; // Untuk menyimpan action animasi yang aktif

        // Cek apakah ada animasi yang diberikan
        if (preloadedAnimations && preloadedAnimations.length > 0) {
            // Buat AnimationMixer untuk model yang di-clone
            this.mixer = new THREE.AnimationMixer(this.model);
            
            // Ambil animasi pertama dari array (atau cari berdasarkan nama jika tahu)
            const clip = preloadedAnimations[0]; 
            this.action = this.mixer.clipAction(clip);
            
            // Atur properti animasi (sesuaikan sesuai kebutuhan)
            this.action.setLoop(THREE.LoopOnce); // Mainkan sekali saja
            this.action.clampWhenFinished = true; // Berhenti di frame terakhir
            this.action.play(); // Mulai mainkan animasi
            
            // Kita set durasi efek sama dengan durasi animasi
            this.duration = clip.duration; 
        } else {
            // Jika tidak ada animasi, set durasi default
            this.duration = 1.0; // Efek hidup 1 detik jika tidak ada animasi
        }

        // Properti lifecycle
        this.age = 0;
        this.isFinished = false;
    }

    update(delta) {
        if (this.isFinished) return;

        this.age += delta;
        const progress = Math.min(this.age / this.duration, 1.0);

        // --- PERUBAHAN 2: Update Mixer ---
        // Ini penting untuk menjalankan animasi di setiap frame
        if (this.mixer) {
            this.mixer.update(delta);
        }

        // Contoh animasi tambahan (jika diperlukan, misal fade out)
        // ...

        // Lifecycle check
        if (progress >= 1.0) {
            // Jika menggunakan LoopOnce, kita bisa juga cek apakah animasinya sudah selesai
            // if (!this.action || !this.action.isRunning()) {
                 this.isFinished = true;
            // }
        }
    }

    destroy() {
        // Hentikan animasi jika ada
        if(this.action) {
            this.action.stop();
        }
        // Hapus model dari scene
        if (this.model.parent) {
             this.scene.remove(this.model);
        }
        // TODO: Bersihkan memori (dispose)
    }
}