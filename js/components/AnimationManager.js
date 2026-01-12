// js/components/AnimationManager.js
// (VERSI FINAL DENGAN PERBAIKAN NAMA IDLE)

import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { TGALoader } from 'three/examples/jsm/loaders/TGALoader.js';

/**
 * Mengelola loading model 3D, animasi, dan transisinya.
 */
export class AnimationManager {
    constructor(scene) {
        this.scene = scene;
        this.model = null;
        this.mixer = null;
        this.actions = {};
        this.activeAction = null;

        // Pastikan ini adalah nama animasi idle di modelmu (lowercase 'idle')
        this.idleActionName = 'idle'; 

        this._onFinished = this._onFinished.bind(this);
    }

    loadModel(filePath) {
        return new Promise((resolve, reject) => {
            
            const manager = new THREE.LoadingManager();
            manager.addHandler(/\.tga$/i, new TGALoader());

            manager.setURLModifier((url) => {
                if (url.includes('C:/Users/TilakParewa')) {
                    const filename = url.split(/[\\/]/).pop();
                    console.log(`Mengubah path: ${url} -> models/${filename}`);
                    return `models/${filename}`;
                }
                return url;
            });

            const loader = new FBXLoader(manager);
            
            loader.load(filePath, (fbx) => {
                this.model = fbx;
                this.model.scale.set(0.01, 0.01, 0.01);
                this.model.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                this.scene.add(this.model);
                this.mixer = new THREE.AnimationMixer(this.model);
                this.mixer.addEventListener('finished', this._onFinished);

                // Proses dan simpan semua klip animasi
                for (const clip of fbx.animations) {
                    console.log(`Menemukan klip animasi: ${clip.name}`);
                    const action = this.mixer.clipAction(clip);
                    this.actions[clip.name] = action;

                    // --- PERBAIKAN 1: Gunakan this.idleActionName ---
                    if (clip.name === this.idleActionName) {
                        // GOAL 1 & 3: Setel LoopOnce untuk loop manual + delay
                        action.setLoop(THREE.LoopOnce);
                        action.clampWhenFinished = true;
                        console.log(` -> ${clip.name} diatur ke LoopOnce (akan di-loop manual)`);

                        // GOAL 2: Membuat durasi animasi jadi 2 detik
                        const originalDuration = clip.duration;
                        const desiredDuration = 2.0; 
                        const timeScale = originalDuration / desiredDuration;
                        action.setEffectiveTimeScale(timeScale);
                        console.log(` -> Durasi ${clip.name} diubah jadi 2 detik (TimeScale: ${timeScale.toFixed(2)})`);

                    } else if (['Run'].includes(clip.name)) { // Ganti 'Run' jika nama animasi larimu beda
                        action.setLoop(THREE.LoopRepeat);
                        console.log(` -> ${clip.name} diatur ke LoopRepeat.`);
                    } else {
                        // Ini untuk animasi 'attack', 'punch', 'hit', dll.
                        action.setLoop(THREE.LoopOnce); 
                        action.clampWhenFinished = true;
                        console.log(` -> ${clip.name} diatur ke LoopOnce (animasi attack).`);
                    }
                }
 
                // Mainkan animasi default
                if (this.actions[this.idleActionName]) {
                    this.activeAction = this.actions[this.idleActionName];
                    this.activeAction.play();
                } else if (Object.keys(this.actions).length > 0) {
                    // Cadangan jika 'idle' tidak ada
                    const defaultActionName = Object.keys(this.actions)[0];
                    console.warn(`Animasi '${this.idleActionName}' tidak ditemukan. Memainkan animasi default: ${defaultActionName}`);
                    this.activeAction = this.actions[defaultActionName];
                    this.activeAction.play();
                }

                console.log("AnimationManager: Model loaded. Available actions:", Object.keys(this.actions));
                resolve();

            }, undefined, (error) => {
                console.error('An error happened while loading the model:', error);
                reject(error);
            });
        });
    }

    playAction(name, duration = 0.25) {
        if (!this.actions[name]) {
             console.warn(`Animasi "${name}" tidak ditemukan.`);
             return;
        }
        
        if (this.activeAction === this.actions[name] && this.activeAction.isRunning()) {
            return;
        }

        const previousAction = this.activeAction;
        this.activeAction = this.actions[name];

        if (previousAction && previousAction !== this.activeAction) {
            previousAction.fadeOut(duration);
        }

        // Selalu reset time scale ke 1 saat memulai animasi baru
        this.activeAction
            .reset()
            .setEffectiveTimeScale(1) 
            .setEffectiveWeight(1)
            .fadeIn(duration)
            .play();
        
        // Terapkan ulang time scale KHUSUS untuk 'idle' SETELAH di-play
        if (name === this.idleActionName) {
            const originalDuration = this.activeAction.getClip().duration;
            const desiredDuration = 2.0;
            const timeScale = originalDuration / desiredDuration;
            this.activeAction.setEffectiveTimeScale(timeScale);
        }
    }

    update(delta) {
        if (this.mixer) {
            this.mixer.update(delta);
        }
    }
    
    _onFinished(event) {
        
        // Cek apakah animasi yang selesai adalah 'idle'
        if (this.actions[this.idleActionName] && event.action === this.actions[this.idleActionName]) {
            
            // Loop manual idle dengan delay
            const minDelay = 2000; // 2 detik (ms)
            const maxDelay = 3000; // 3 detik (ms)
            const delay = Math.random() * (maxDelay - minDelay) + minDelay;
            
            setTimeout(() => {
                // Hanya mainkan 'idle' JIKA kita tidak sedang melakukan aksi lain
                if (this.activeAction === this.actions[this.idleActionName]) {
                    this.playAction(this.idleActionName, 0.1); 
                }
            }, delay);

        } 
        // --- PERBAIKAN 2: Gunakan this.idleActionName ---
        // Cek apakah ini animasi attack (bukan idle, loop 'once', dan ADA animasi idle)
        else if (event.action.loop === THREE.LoopOnce && this.actions[this.idleActionName]) {
            
            // Ya, ini animasi attack. Kembali ke 'idle'.
            this.playAction(this.idleActionName);
        }
    }
}