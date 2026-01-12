// js/components/Enemy.js (VERSI DIPERBARUI - Visual Domain Baru)

import * as THREE from 'three';
// --- Hapus import ExpandingRingEffect ---
// import { ExpandingRingEffect } from '../effects/ExpandingRingEffect.js'; 

let enemyIdCounter = 0;

export class Enemy {
    constructor(scene, targetPlayer, spawnProjectileCallback, config = {}) {
        this.scene = scene;
        this.targetPlayer = targetPlayer; 
        this.spawnProjectileCallback = spawnProjectileCallback; 
        
        // --- Konfigurasi ---
        this.id = `enemy-${enemyIdCounter++}`;
        this.config = config; 
        this.maxHp = config.hp || 50; 
        this.currentHp = this.maxHp;
        this.isEliminated = false;
        this.size = config.size || 2; 

        // --- Properti AI & State ---
        this.state = 'CHASING'; 
        this.moveSpeed = config.moveSpeed || 0; 
        this.strafeSpeed = (config.moveSpeed || 0) * 0.7; 
        this.strafeDirection = 1; 
        this.strafeTimer = 0; 
        this.minChaseDistance = config.minChaseDistance || 5; 
        this.maxChaseDistance = config.maxChaseDistance || 30; 

        // --- Properti Serangan Melee (Punch) ---
        this.attackType = config.attackType || 'ranged'; 
        this.meleeRange = config.meleeRange || 2.5; 
        this.meleeDamage = config.meleeDamage || 15; 
        this.meleeCooldown = config.meleeCooldown || 1.5; 
        this.timeSinceLastMelee = Math.random() * this.meleeCooldown;
        this.isMeleeAttacking = false;
        this.meleeAttackDuration = 0.3; 
        this._meleeAttackTimer = 0;

        // --- Properti Serangan "Dismantle" (Ranged Slash) ---
        this.canUseDismantle = config.canUseDismantle || false;
        this.dismantleDamage = config.dismantleDamage || 20;
        this.dismantleCooldown = config.dismantleCooldown || 4.0;
        this.timeSinceLastDismantle = Math.random() * this.dismantleCooldown;
        this.dismantleRange = config.dismantleRange || 25; 

        // --- Properti "Domain Expansion" (Malevolent Shrine - Simplified AoE) ---
        this.canUseDomain = config.canUseDomain || false;
        this.domainTriggerHp = config.domainTriggerHp || 0.5; 
        this.domainDuration = 5.0; 
        this.domainCooldown = 30.0; 
        this.domainRadius = 15.0; // Radius area Domain
        this.domainDamagePerSecond = 10; 
        this.timeSinceLastDomain = this.domainCooldown; 
        this._domainTimer = 0;
        
        // --- PERUBAHAN NAMA PROPERTI ---
        this.domainVisual = null; // <-- Ganti nama dari domainActiveEffect
        this.domainRangeIndicator = null; // <-- Untuk visual jangkauan

        // --- Mesh (Tidak berubah) ---
        const color = config.color || 0xdc2626; 
        const geometry = new THREE.BoxGeometry(this.size, this.size, this.size);
        const material = new THREE.MeshStandardMaterial({ color: color });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.y = this.size / 2; 
        this.mesh.castShadow = true;
        this.scene.add(this.mesh);
    }

    takeDamage(amount) {
        if (this.isEliminated) return;
        this.currentHp -= amount;
        console.log(`Enemy ${this.id} took ${amount} damage. HP: ${this.currentHp}/${this.maxHp}`);
        if (this.currentHp <= 0) {
            this.currentHp = 0;
            this.eliminate();
        }
    }

    eliminate() {
       if (this.isEliminated) return;
        this.isEliminated = true;
        console.log(`Enemy ${this.id} eliminated!`);
        // Hentikan Domain jika sedang aktif
        if (this.state === 'USING_DOMAIN') {
            this.endDomainExpansion();
        }
        if (this.mesh) {
            this.mesh.visible = false; 
        }
    }

    update(delta) {
        if (this.isEliminated) return; 

        // Update semua timer cooldown
        this.timeSinceLastMelee += delta;
        this.timeSinceLastDismantle += delta;
        this.timeSinceLastDomain += delta;

        // Update timer animasi melee
        if (this._meleeAttackTimer > 0) {
            this._meleeAttackTimer -= delta;
            if (this._meleeAttackTimer <= 0) { this.isMeleeAttacking = false; this.mesh.scale.x = 1; }
        }

        // Pastikan target valid
        if (!this.targetPlayer || !this.targetPlayer.model || this.targetPlayer.isEliminated) {
            this.state = 'IDLE'; 
            return; 
        }
        const targetPosition = this.targetPlayer.model.position;
        const distanceToTarget = this.mesh.position.distanceTo(targetPosition);

        // Selalu hadap player
        if (!this.isMeleeAttacking) { 
             this.mesh.lookAt(targetPosition);
        }

        // --- Finite State Machine (FSM) Sederhana untuk AI ---
        
        // State: USING_DOMAIN (Prioritas Tertinggi)
        if (this.state === 'USING_DOMAIN') {
            this._domainTimer -= delta;
            // Berikan damage AoE ke player
            if (distanceToTarget <= this.domainRadius) {
                 this.targetPlayer.takeDamage(this.domainDamagePerSecond * delta);
            }
            // Cek durasi selesai
            if (this._domainTimer <= 0) {
                this.endDomainExpansion(); // Keluar dari state Domain
            }
            return; // Tidak melakukan hal lain selama Domain aktif
        }

        // Cek Trigger Domain Expansion
        if (this.canUseDomain && 
            this.timeSinceLastDomain >= this.domainCooldown && 
            (this.currentHp / this.maxHp) <= this.domainTriggerHp) 
        {
            this.startDomainExpansion();
            return; // Langsung masuk state Domain
        }

        // Cek Jarak & Tentukan Aksi/State Selanjutnya
        
        if (distanceToTarget > this.maxChaseDistance) {
            this.state = 'IDLE'; 
        } 
        else if (this.canUseDismantle && 
                 distanceToTarget <= this.dismantleRange && 
                 this.timeSinceLastDismantle >= this.dismantleCooldown) 
        {
            this.state = 'ATTACKING_DISMANTLE';
        }
        else if (this.attackType.includes('melee') && 
                 distanceToTarget <= this.meleeRange && 
                 this.timeSinceLastMelee >= this.meleeCooldown) 
        {
            this.state = 'ATTACKING_MELEE';
        }
        else if ((this.attackType.includes('melee') && distanceToTarget > this.minChaseDistance) || 
                 (this.attackType === 'ranged' && distanceToTarget < this.maxChaseDistance))
        {
             if (this.strafeTimer <= 0 && Math.random() < 0.05) {
                 this.state = 'EVADING';
                 this.strafeTimer = Math.random() * 1.0 + 0.5; 
                 this.strafeDirection = Math.random() < 0.5 ? 1 : -1; 
             } else {
                 this.state = 'CHASING';
             }
        }
        else {
             this.state = 'CHASING'; 
        }

        // --- Eksekusi Aksi Berdasarkan State ---
        switch (this.state) {
            case 'CHASING':
                if (this.moveSpeed > 0) {
                    const direction = new THREE.Vector3().subVectors(targetPosition, this.mesh.position).normalize();
                    this.mesh.position.x += direction.x * this.moveSpeed * delta;
                    this.mesh.position.z += direction.z * this.moveSpeed * delta;
                }
                break;
            
            case 'EVADING':
                 if (this.strafeTimer > 0) {
                      this.strafeTimer -= delta;
                      const right = new THREE.Vector3();
                      this.mesh.getWorldDirection(right); 
                      right.cross(new THREE.Vector3(0, 1, 0)); 
                      this.mesh.position.addScaledVector(right, this.strafeSpeed * this.strafeDirection * delta);
                 } else {
                      this.state = 'CHASING'; 
                 }
                 break;

            case 'ATTACKING_MELEE':
                this.attackMelee(); 
                this.state = 'CHASING'; 
                break;

            case 'ATTACKING_DISMANTLE':
                this.attackDismantle(targetPosition); 
                this.state = 'CHASING'; 
                break;
            
            case 'IDLE':
                 break;
        }
    }

    attackMelee() {
        if (this.isEliminated || !this.targetPlayer || this.isMeleeAttacking) return;

        console.log(`Enemy ${this.id} punches player!`);
        this.isMeleeAttacking = true;
        this._meleeAttackTimer = this.meleeAttackDuration;
        this.timeSinceLastMelee = 0; 

        this.mesh.scale.x = 1.2; 
        setTimeout(() => { if (this.mesh) this.mesh.scale.x = 1; }, this.meleeAttackDuration * 1000 * 0.8);

        this.targetPlayer.takeDamage(this.meleeDamage); 
    }

    attackDismantle(targetPosition) {
        if (this.isEliminated) return;
        console.log(`Enemy ${this.id} uses Dismantle!`);
        this.timeSinceLastDismantle = 0; 

        const originalColor = this.mesh.material.color.getHex();
        this.mesh.material.color.set(0xffffff); 
        setTimeout(() => { if(this.mesh) this.mesh.material.color.set(originalColor); }, 200);

        const direction = new THREE.Vector3()
            .subVectors(targetPosition, this.mesh.position)
            .normalize();
        this.spawnProjectileCallback(this.mesh.position.clone(), direction, {
             type: 'dismantle', 
             damage: this.dismantleDamage, 
             speed: 25 
        }); 
    }

    // --- FUNGSI DOMAIN YANG DIPERBARUI ---
    startDomainExpansion() {
        console.log(`Enemy ${this.id} activates Domain Expansion!`);
        this.state = 'USING_DOMAIN';
        this._domainTimer = this.domainDuration;
        this.timeSinceLastDomain = 0; 

        // --- VISUAL DOMAIN BARU: BOLA LONJONG ---
        // 1. Buat Bentuk Dasar (Sphere)
        const domainGeo = new THREE.SphereGeometry(1, 32, 16); // Radius awal 1
        // 2. Buat Material Semi-Transparan Gelap
        const domainMat = new THREE.MeshBasicMaterial({
            color: 0x1a0000, // Merah sangat gelap
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide // Terlihat dari dalam
        });
        this.domainVisual = new THREE.Mesh(domainGeo, domainMat);
        
        // 3. Posisikan di kaki Bos (Y=0)
        this.domainVisual.position.copy(this.mesh.position);
        this.domainVisual.position.y = 0.1; // Sedikit di atas tanah
        
        // 4. Buat Lonjong dan Besar (Scale X dan Z lebih besar dari Y)
        const scaleXZ = this.domainRadius * 1.5; // Skala horizontal
        const scaleY = this.domainRadius * 0.8; // Skala vertikal (lebih pendek)
        this.domainVisual.scale.set(scaleXZ, scaleY, scaleXZ); 
        
        this.scene.add(this.domainVisual);

        // --- VISUAL INDIKATOR JANGKAUAN (Opsional) ---
        // Contoh: Torus (Donat) di tanah
        const indicatorGeo = new THREE.TorusGeometry(this.domainRadius, 0.1, 8, 48); // Radius besar, tabung tipis
        const indicatorMat = new THREE.MeshBasicMaterial({ color: 0xff0000, opacity: 0.7, transparent: true }); // Merah terang
        this.domainRangeIndicator = new THREE.Mesh(indicatorGeo, indicatorMat);
        this.domainRangeIndicator.position.copy(this.mesh.position);
        this.domainRangeIndicator.position.y = 0.2; // Sedikit di atas domain
        this.domainRangeIndicator.rotation.x = Math.PI / 2; // Rebahkan torus
        this.scene.add(this.domainRangeIndicator);
    }

    endDomainExpansion() {
        console.log(`Enemy ${this.id} Domain Expansion ends.`);
        this.state = 'CHASING'; 
        // Hancurkan visual domain & indikator
        if (this.domainVisual) {
            if (this.domainVisual.parent) this.scene.remove(this.domainVisual);
            this.domainVisual.geometry.dispose();
            this.domainVisual.material.dispose();
            this.domainVisual = null;
        }
        if (this.domainRangeIndicator) {
             if (this.domainRangeIndicator.parent) this.scene.remove(this.domainRangeIndicator);
             this.domainRangeIndicator.geometry.dispose();
             this.domainRangeIndicator.material.dispose();
             this.domainRangeIndicator = null;
        }
    }
}