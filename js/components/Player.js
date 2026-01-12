// components/Player.js (VERSI GABUNGAN - DENGAN SKILL "BLUE", "PUNCH", & ENERGI GAIB)

import * as THREE from 'three';
import { AnimationManager } from './AnimationManager.js';
import { GravityOrb } from '../skills/GravityOrb.js';

export class Player {
    constructor(scene, keyboardControls, vfxManager) {
        this.scene = scene;
        this.keyboardControls = keyboardControls;
        this.vfxManager = vfxManager; 
        this.moveSpeed = 5;
        this.arenaRadius = 20;

        this.animationManager = new AnimationManager(this.scene);

        // Properti Fisika (Tidak Berubah)
        this.velocity = new THREE.Vector3();
        this.gravity = -20;
        this.jumpForce = 8;
        this.isGrounded = true;

        // Properti Combat (Serangan Dasar 'E' - Tidak Berubah)
        this.isAttacking = false;
        this.attackDuration = 0.4;
        this.attackCooldown = 0.6;
        this.attackRange = 2.5;
        this.attackDamage = 10;
        this._attackTime = 0;
        this._cooldownTime = 0;

        // Properti Punch ('Y') (Tidak Berubah)
        this.isPunching = false;         
        this.punchDuration = 0.2;        
        this.punchCooldown = 0.8;        
        this.punchRange = 1.8;           
        this.punchDamage = 15;           
        this._punchTime = 0;             
        this._punchCooldownTimer = 0;    

        // Properti HP (Tidak Berubah)
        this.maxHp = 250; 
        this.currentHp = this.maxHp;
        this.isEliminated = false;

        // --- TAMBAHKAN 1: Properti Energi Gaib ---
        this.maxCursedEnergy = 100; // Maksimal energi
        this.currentCursedEnergy = this.maxCursedEnergy; // Mulai penuh
        this.cursedEnergyRegenRate = 8; // Energi pulih per detik

        // --- TAMBAHKAN 2: Biaya Skill ---
        this.blueSkillCost = 40; // Biaya skill Blue

        // Properti Skill "Blue" (Timer cooldown tetap ada)
        this.blueSkill = null;
        this.blueSkillCooldown = 15.0; // Cooldown tetap ada
        this._blueSkillTimer = 0;
    }

    async initialize(modelPath) {
        await this.animationManager.loadModel(modelPath);
        console.log("Player initialized. Model is now ready to be used.");
        
        // Reset HP & Energi
        this.currentHp = this.maxHp;
        this.currentCursedEnergy = this.maxCursedEnergy; // Reset energi juga
        this.isEliminated = false;
        
        // Reset cooldowns
        this._blueSkillTimer = 0;
        this._punchCooldownTimer = 0; 
    }
    
    get model() {
        return this.animationManager.model;
    }

    takeDamage(amount) {
        if (this.isEliminated) return;

        this.currentHp -= amount;
        console.log(`Player took ${amount} damage. HP remaining: ${this.currentHp}/${this.maxHp}`);

        if (this.currentHp <= 0) {
            this.currentHp = 0;
            this.eliminate();
        }
    }

    eliminate() {
        if (this.isEliminated) return; 
        this.isEliminated = true;
        console.log("Player eliminated!");
        // ... (logika animasi kematian)
    }

    jump() {
        if (this.isEliminated || !this.isGrounded) return;
        this.velocity.y = this.jumpForce;
        this.isGrounded = false;
    }

    // (Asumsi attack biasa tidak pakai energi)
    attack(enemies) {
        if (this.isEliminated || this.isAttacking || this.isPunching || this._cooldownTime > 0) return; 

        this.isAttacking = true;
        this._attackTime = this.attackDuration;
        this._cooldownTime = this.attackCooldown;
        
        this.animationManager.playAction('mixamo.com'); 

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

    // (Asumsi punch tidak pakai energi)
    punch(enemies) {
        if (this.isEliminated || this.isPunching || this.isAttacking || this._punchCooldownTimer > 0) return; 

        console.log("Player punches!");
        this.isPunching = true;
        this._punchTime = this.punchDuration; 
        this._punchCooldownTimer = this.punchCooldown; 

        if (this.model && this.vfxManager) {
            const forward = new THREE.Vector3();
            this.model.getWorldDirection(forward);
            const effectPos = this.model.position.clone().addScaledVector(forward, this.punchRange * 0.7); 
            effectPos.y = this.model.position.y + 1.0; 
            this.vfxManager.play('infinityAura', effectPos, { 
                color: 0xffffff, 
                duration: 0.15, 
                maxScale: 1.5   
            });
        }
        
        for (const enemy of enemies) {
            if (this.model && enemy.mesh && !enemy.isEliminated && enemy.mesh.visible) { 
                const distance = this.model.position.distanceTo(enemy.mesh.position);
                if (distance <= this.punchRange) { 
                    console.log(`Punch Hit enemy! Dealing ${this.punchDamage} damage.`);
                    if (enemy.takeDamage) {
                        enemy.takeDamage(this.punchDamage); 
                    }
                }
            }
        }
    }

    // --- UBAH 1: Modifikasi Cek Kondisi Skill Blue ---
    canActivateBlueSkill() {
        // Tambahkan cek energi
        return !this.isEliminated && 
               this._blueSkillTimer <= 0 && 
               this.currentCursedEnergy >= this.blueSkillCost; 
    }

    /**
     * @param {Array<Enemy>} enemies
     * @param {VFXManager} vfxManager
     * @param {PlayerControls} playerControls 
     * @param {THREE.Camera} camera
     * @returns {GravityOrb | null} 
     */
    activateBlueSkill(enemies, vfxManager, playerControls, camera) { 
        if (this.canActivateBlueSkill()) { // Cek sudah termasuk energi
            this._blueSkillTimer = this.blueSkillCooldown; // Reset cooldown
            // --- TAMBAHKAN 3: Konsumsi Energi ---
            this.currentCursedEnergy -= this.blueSkillCost; 
            console.log(`Activating Blue Skill! Energy left: ${this.currentCursedEnergy.toFixed(0)}/${this.maxCursedEnergy}`);

            // ... (Logika spawnPos & return new GravityOrb tidak berubah)
             console.log("[Player.js] Camera object received:", camera); 
             console.log("[Player.js] PlayerControls object received:", playerControls); 
             const forward = new THREE.Vector3();
             if (!this.model) { return null; } // Safety check
             this.model.getWorldDirection(forward);
             const spawnPos = this.model.position.clone().addScaledVector(forward, 3);
             spawnPos.y = this.model.position.y + 1.5; 
             return new GravityOrb(this.scene, spawnPos, enemies, vfxManager, playerControls, camera); 
        } else if (this.currentCursedEnergy < this.blueSkillCost) {
             console.log("Not enough Cursed Energy for Blue Skill!"); // Pesan jika energi kurang
        }
        return null; 
    }


    update(delta) {
        if (this.isEliminated) {
            if (this.animationManager) this.animationManager.update(delta);
            return;
        }

        if (!this.model) return;
        this.animationManager.update(delta);

        // --- TAMBAHKAN 4: Regenerasi Energi Gaib ---
        if (this.currentCursedEnergy < this.maxCursedEnergy) {
            this.currentCursedEnergy += this.cursedEnergyRegenRate * delta;
            // Pastikan tidak melebihi maks
            this.currentCursedEnergy = Math.min(this.currentCursedEnergy, this.maxCursedEnergy);
        }

        // --- Update Cooldowns (Tidak Berubah) ---
        if (this._blueSkillTimer > 0) this._blueSkillTimer -= delta;
        
        if (this._punchCooldownTimer > 0) this._punchCooldownTimer -= delta;
        if (this._punchTime > 0) {
            this._punchTime -= delta;
            if (this._punchTime <= 0) {
                this.isPunching = false; 
            }
        }
        
        if (this._cooldownTime > 0) this._cooldownTime -= delta;
        if (this._attackTime > 0) {
            this._attackTime -= delta;
            if (this._attackTime <= 0) this.isAttacking = false;
        }

        // Logika gravitasi & ground check (Tidak Berubah)
        this.velocity.y += this.gravity * delta;
        this.model.position.y += this.velocity.y * delta;

        if (this.model.position.y <= 0) {
            this.model.position.y = 0;
            this.velocity.y = 0;
            this.isGrounded = true;
        }
        
        this.enforceArenaBoundary();
    }

    enforceArenaBoundary() {
        if (!this.model) return;
        const positionXZ = new THREE.Vector2(this.model.position.x, this.model.position.z);
        if (positionXZ.length() > this.arenaRadius) {
            positionXZ.normalize().multiplyScalar(this.arenaRadius);
            this.model.position.x = positionXZ.x;
            this.model.position.z = positionXZ.y;
        }
    }
}