// components/Player.js (VERSI GABUNGAN - DENGAN SKILL "BLUE" & "PUNCH")
// (activateBlueSkill diperbarui untuk menerima playerControls)

import * as THREE from 'three';
import { AnimationManager } from './AnimationManager.js';
import { GravityOrb } from '../skills/GravityOrb.js';

export class Player {
    // --- PERUBAHAN 1: Terima vfxManager di constructor ---
    constructor(scene, keyboardControls, vfxManager) { // Tambahkan vfxManager
        this.scene = scene;
        this.keyboardControls = keyboardControls;
        // --- Simpan referensi vfxManager ---
        this.vfxManager = vfxManager; // Kita butuh ini untuk efek visual punch
        this.moveSpeed = 5;
        this.arenaRadius = 20;

        this.animationManager = new AnimationManager(this.scene);

        // Properti Fisika (Dari kode lama)
        this.velocity = new THREE.Vector3();
        this.gravity = -20;
        this.jumpForce = 8;
        this.isGrounded = true;

        // Properti Combat (Serangan Dasar 'E' - Dari kode lama)
        this.isAttacking = false;
        this.attackDuration = 0.4;
        this.attackCooldown = 0.6;
        this.attackRange = 2.5;
        this.attackDamage = 10;
        this._attackTime = 0;
        this._cooldownTime = 0;

        // --- TAMBAHKAN 2: Properti Punch ('Y') --- (Dari kode baru)
        this.isPunching = false;         // Status apakah sedang memukul
        this.punchDuration = 0.2;        // Durasi "animasi" visual punch (detik)
        this.punchCooldown = 0.8;        // Waktu jeda antar pukulan (detik)
        this.punchRange = 1.8;           // Jangkauan pukulan (lebih pendek dari attack biasa)
        this.punchDamage = 15;           // Damage pukulan
        this._punchTime = 0;             // Timer durasi visual punch
        this._punchCooldownTimer = 0;    // Timer cooldown punch

        // Properti HP (Dari kode lama)
        this.maxHp = 250; // (Sesuai kode lama kamu)
        this.currentHp = this.maxHp;

        // Properti Status Eliminasi (Dari kode lama)
        this.isEliminated = false;

        // Properti Skill "Blue" (Dari kode lama)
        this.blueSkill = null;
        this.blueSkillCooldown = 15.0;
        this._blueSkillTimer = 0;
    }

    async initialize(modelPath) {
        await this.animationManager.loadModel(modelPath);
        console.log("Player initialized. Model is now ready to be used.");
        
        // Reset HP saat inisialisasi
        this.currentHp = this.maxHp;
        this.isEliminated = false;
        
        // Reset timer skill saat mulai
        this._blueSkillTimer = 0;
        // Reset cooldown punch juga (dari kode baru)
        this._punchCooldownTimer = 0; 
    }
    
    get model() {
        return this.animationManager.model;
    }

    /**
     * Mengurangi HP player sejumlah 'amount'.
     * @param {number} amount - Jumlah damage yang diterima.
     */
    takeDamage(amount) {
        // (Fungsi utuh dari kode lama)
        if (this.isEliminated) return;

        this.currentHp -= amount;
        console.log(`Player took ${amount} damage. HP remaining: ${this.currentHp}/${this.maxHp}`);

        if (this.currentHp <= 0) {
            this.currentHp = 0;
            this.eliminate();
        }
        
        // this.animationManager.playAction('HitReact');
    }

    /**
     * Menangani logika saat HP player habis.
     */
    eliminate() {
        // (Fungsi utuh dari kode lama)
        if (this.isEliminated) return; 

        this.isEliminated = true;
        console.log("Player eliminated!");

        // this.animationManager.playAction('Death', 0.1);
        
        if (this.model) {
            // this.model.visible = false; 
        }
    }

    jump() {
        // (Fungsi utuh dari kode lama)
        if (this.isEliminated || !this.isGrounded) return;
        this.velocity.y = this.jumpForce;
        this.isGrounded = false;
    }

    attack(enemies) {
        // (Fungsi dari kode lama, di-update dengan check 'isPunching' dari kode baru)
        
        // Cek kondisi: tidak kalah, tidak sedang attack, TIDAK SEDANG PUNCH, dan cooldown selesai
        if (this.isEliminated || this.isAttacking || this.isPunching || this._cooldownTime > 0) return; 

        this.isAttacking = true;
        this._attackTime = this.attackDuration;
        this._cooldownTime = this.attackCooldown;
        
        this.animationManager.playAction('mixamo.com'); // Pastikan nama animasi benar

        // Deteksi musuh
        for (const enemy of enemies) {
            if (this.model && enemy.mesh) { 
                const distance = this.model.position.distanceTo(enemy.mesh.position);
                if (distance <= this.attackRange) {
                    console.log(`Basic Attack Hit enemy! Dealing ${this.attackDamage} damage.`);
                    if (enemy.takeDamage) { 
                        enemy.takeDamage(this.attackDamage);
                    }
                }
            }
        }
    }

    // --- TAMBAHKAN 3: Fungsi PUNCH ('Y') --- (Fungsi utuh dari kode baru)
    /**
     * Menjalankan serangan pukulan.
     * @param {Array<Enemy>} enemies - Daftar musuh untuk dideteksi.
     */
    punch(enemies) {
        // Cek kondisi: tidak kalah, tidak sedang punch, TIDAK SEDANG ATTACK BIASA, dan cooldown selesai
        if (this.isEliminated || this.isPunching || this.isAttacking || this._punchCooldownTimer > 0) return; 

        console.log("Player punches!");
        this.isPunching = true;
        this._punchTime = this.punchDuration; // Mulai timer "animasi"
        this._punchCooldownTimer = this.punchCooldown; // Mulai timer cooldown

        // --- VISUAL PUNCH SEDERHANA ---
        if (this.model && this.vfxManager) {
            const forward = new THREE.Vector3();
            this.model.getWorldDirection(forward);
            const effectPos = this.model.position.clone().addScaledVector(forward, this.punchRange * 0.7); 
            effectPos.y = this.model.position.y + 1.0; 

            // Ganti 'infinityAura' jika kamu punya nama efek vfx lain
            this.vfxManager.play('infinityAura', effectPos, { 
                color: 0xffffff, 
                duration: 0.15, 
                maxScale: 1.5   
            });
        }
        
        // --- LOGIKA DAMAGE PUNCH ---
        for (const enemy of enemies) {
            if (this.model && enemy.mesh && !enemy.isEliminated && enemy.mesh.visible) { 
                const distance = this.model.position.distanceTo(enemy.mesh.position);
                // Gunakan punchRange
                if (distance <= this.punchRange) { 
                    console.log(`Punch Hit enemy! Dealing ${this.punchDamage} damage.`);
                    if (enemy.takeDamage) {
                        enemy.takeDamage(this.punchDamage); // Gunakan punchDamage
                    }
                }
            }
        }
        
        // TODO: Mainkan animasi punch jika ada
        // this.animationManager.playAction('PunchAnimationName'); 
    }

    canActivateBlueSkill() {
        // (Fungsi utuh dari kode lama)
        return !this.isEliminated && this._blueSkillTimer <= 0;
    }

    // --- FUNGSI YANG DIPERBARUI ---
    /**
     * @param {Array<Enemy>} enemies - Array musuh
     * @param {VFXManager} vfxManager
     * @param {PlayerControls} playerControls // <-- PARAMETER BARU
     * @param {THREE.Camera} camera
     * @returns {GravityOrb | null} Instance orb baru atau null jika cooldown
     */
    activateBlueSkill(enemies, vfxManager, playerControls, camera) { // <-- PARAMETER DIPERBARUI
        if (this.canActivateBlueSkill()) {
            this._blueSkillTimer = this.blueSkillCooldown;
            console.log("Activating Blue Skill!");

            // --- Tambahkan Log Untuk Memastikan ---
            console.log("[Player.js] Camera object received:", camera); 
            console.log("[Player.js] PlayerControls object received:", playerControls); 

            // Tentukan posisi spawn orb
            const forward = new THREE.Vector3();
            // Pastikan model sudah ada sebelum mengaksesnya
            if (!this.model) {
                console.error("Player model not ready for skill activation.");
                return null; 
            }
            this.model.getWorldDirection(forward);
            const spawnPos = this.model.position.clone().addScaledVector(forward, 3);
            spawnPos.y = this.model.position.y + 1.5; 

            // --- PERBAIKI ARGUMEN SAAT MEMBUAT GravityOrb ---
            // Argumen ke-5 sekarang adalah playerControls, ke-6 adalah camera
            return new GravityOrb(this.scene, spawnPos, enemies, vfxManager, playerControls, camera); 
        }
        return null; 
    }
    // --- AKHIR FUNGSI YANG DIPERBARUI ---


    update(delta) {
        // (Fungsi dari kode lama, di-update dengan timer punch dari kode baru)
        
        if (this.isEliminated) {
            if (this.animationManager) this.animationManager.update(delta);
            return;
        }

        if (!this.model) return;
        this.animationManager.update(delta);

        // Update Cooldown Skill "Blue" (Dari kode lama)
        if (this._blueSkillTimer > 0) {
            this._blueSkillTimer -= delta;
        }

        // --- TAMBAHKAN 4: Update Cooldown & Timer PUNCH --- (Dari kode baru)
        if (this._punchCooldownTimer > 0) this._punchCooldownTimer -= delta;
        if (this._punchTime > 0) {
            this._punchTime -= delta;
            if (this._punchTime <= 0) {
                this.isPunching = false; // Selesai "animasi" punch
            }
        }

        // Logika gravitasi & ground check (Dari kode lama)
        this.velocity.y += this.gravity * delta;
        this.model.position.y += this.velocity.y * delta;

        if (this.model.position.y <= 0) {
            this.model.position.y = 0;
            this.velocity.y = 0;
            this.isGrounded = true;
        }

        // Update timer combat (Attack Biasa 'E' - Dari kode lama)
        if (this._cooldownTime > 0) this._cooldownTime -= delta;
        if (this._attackTime > 0) {
            this._attackTime -= delta;
            if (this._attackTime <= 0) this.isAttacking = false;
        }
        
        this.enforceArenaBoundary();
    }

    enforceArenaBoundary() {
        // (Fungsi utuh dari kode lama)
        if (!this.model) return;
        const positionXZ = new THREE.Vector2(this.model.position.x, this.model.position.z);
        if (positionXZ.length() > this.arenaRadius) {
            positionXZ.normalize().multiplyScalar(this.arenaRadius);
            this.model.position.x = positionXZ.x;
            this.model.position.z = positionXZ.y;
        }
    }
}