/*
 * File: js/components/VFXManager.js
 * Deskripsi: Manajer untuk me-load, memunculkan, dan mengupdate efek visual.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ExpandingRingEffect } from '../effects/ExpandingRingEffect.js';
import { ModelEffect } from '../effects/ModelEffect.js'; 

export class VFXManager {
    constructor(scene) {
        this.scene = scene;
        this.activeEffects = [];
        this.loader = new GLTFLoader();
        this.preloadedAssets = {}; 
    }

    async init() {
        console.log("VFXManager: Mulai me-load aset VFX...");
        try {
            const gltf = await this.loader.loadAsync('models/ring.gltf');
            
            // --- PERUBAHAN 1: Simpan scene DAN animasinya ---
            this.preloadedAssets.ring = {
                scene: gltf.scene, 
                animations: gltf.animations // Simpan array animasinya!
            };
            
            console.log(`VFXManager: Aset VFX 'ring.gltf' berhasil di-load. Ditemukan ${gltf.animations.length} animasi.`);

        } catch (error) {
            console.error("VFXManager: Gagal me-load aset 'ring.gltf'", error);
        }
    }

    play(effectName, position, options = {}) {
        switch (effectName) {
            case 'infinityAura':
                // ... (kode ini tetap sama)
                const color = options.color || 0x00c0ff;
                const ringEffect = new ExpandingRingEffect(this.scene, position, color);
                this.activeEffects.push(ringEffect);
                break;

            case 'skillRing': 
                const ringAsset = this.preloadedAssets.ring; // Ambil aset yang sudah di-load
                if (!ringAsset || !ringAsset.scene) {
                    console.error("VFXManager: Aset 'ring' belum di-load!");
                    return;
                }
                
                // --- PERUBAHAN 2: Berikan scene DAN animasi ke ModelEffect ---
                const modelEffect = new ModelEffect(
                    this.scene, 
                    position, 
                    ringAsset.scene,       // Berikan model scene-nya
                    ringAsset.animations   // Berikan array animasinya
                );
                this.activeEffects.push(modelEffect);
                break;

            default:
                console.warn(`VFXManager: Efek bernama "${effectName}" tidak ditemukan.`);
        }
    }

    update(delta) {
        // ... (Fungsi update tidak perlu diubah)
        for (let i = this.activeEffects.length - 1; i >= 0; i--) {
            const effect = this.activeEffects[i];
            effect.update(delta);
            if (effect.isFinished) {
                effect.destroy();
                this.activeEffects.splice(i, 1);
            }
        }
    }
}