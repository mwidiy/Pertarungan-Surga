/*
 * File: js/components/VFXManager.js
 * Deskripsi: Manajer untuk me-load, memunculkan, dan mengupdate efek visual.
 */

import * as THREE from 'three';
// --- PERUBAHAN 1: Impor GLTFLoader ---
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ExpandingRingEffect } from '../effects/ExpandingRingEffect.js';

// --- PERUBAHAN 2: Impor resep ModelEffect ---
// Kita butuh resep ini untuk bisa menampilkan model 3D sebagai efek.
// Pastikan kamu sudah membuat file 'ModelEffect.js' dari instruksi kita sebelumnya.
import { ModelEffect } from '../effects/ModelEffect.js'; 

export class VFXManager {
    /**
     * @param {THREE.Scene} scene - Scene utama game.
     */
    constructor(scene) {
        this.scene = scene;
        this.activeEffects = []; // Array untuk semua efek aktif
        
        // --- PERUBAHAN 3: Siapkan loader dan cache ---
        this.loader = new GLTFLoader();
        this.preloadedAssets = {}; // "Cache" untuk menyimpan aset 3D yang sudah di-load
    }

    /**
     * --- PERUBAHAN 4: Fungsi init() untuk me-load aset 3D ---
     * Fungsi ini harus dipanggil dari main1.js saat inisialisasi.
     * Kita ganti 'efek_ledakan.glb' dengan 'ring.gltf'
     */
    async init() {
        console.log("VFXManager: Mulai me-load aset VFX...");
        
        try {
            // Load efek cincin 3D kamu
            const gltf = await this.loader.loadAsync('models/ring.gltf');
            
            // Simpan modelnya ke dalam "cache" kita
            this.preloadedAssets.ring = gltf.scene; 
            
            console.log("VFXManager: Aset VFX 'ring.gltf' berhasil di-load.");

        } catch (error) {
            console.error("VFXManager: Gagal me-load aset 'ring.gltf'", error);
        }
        
        // Kamu bisa tambahkan loadAsync lain di sini untuk efek skill lainnya
    }

    /**
     * Factory untuk memutar efek visual.
     * @param {string} effectName - Nama efek yang akan diputar.
     * @param {THREE.Vector3} position - Posisi di mana efek akan muncul.
     * @param {object} options - Opsi tambahan (misal: { color: 0xff0000 }).
     */
    play(effectName, position, options = {}) {
        switch (effectName) {
            // Ini adalah resep CINCIN 2D (dari kode pertamamu)
            case 'infinityAura':
                const color = options.color || 0x00c0ff;
                const ringEffect = new ExpandingRingEffect(this.scene, position, color);
                this.activeEffects.push(ringEffect);
                break;

            // --- PERUBAHAN 5: Case baru untuk memutar efek 3D 'ring.gltf' ---
            // Kamu akan memanggil ini dari main1.js: vfxManager.play('skillRing', ...)
            case 'skillRing': 
                // Cek apakah asetnya sudah siap di cache
                if (!this.preloadedAssets.ring) {
                    console.error("VFXManager: Aset 'ring' belum di-load! Pastikan init() sudah dipanggil.");
                    return;
                }
                
                // Buat efek baru dengan MENG-KLONING aset yang sudah ada
                // Ini menggunakan 'ModelEffect.js'
                const modelEffect = new ModelEffect(
                    this.scene, 
                    position, 
                    this.preloadedAssets.ring // Berikan model yang sudah di-load
                );
                this.activeEffects.push(modelEffect);
                break;

            default:
                console.warn(`VFXManager: Efek bernama "${effectName}" tidak ditemukan.`);
        }
    }

    /**
     * Update semua efek yang sedang aktif.
     * @param {number} delta - Waktu delta dari frame terakhir.
     */
    update(delta) {
        // Loop secara terbalik agar aman saat menghapus item (splice)
        for (let i = this.activeEffects.length - 1; i >= 0; i--) {
            const effect = this.activeEffects[i];
            effect.update(delta);

            // Cek jika sudah selesai
            if (effect.isFinished) {
                effect.destroy(); // Hancurkan efek
                this.activeEffects.splice(i, 1); // Hapus dari array
            }
        }
    }
}