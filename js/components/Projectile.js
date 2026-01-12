import * as THREE from 'three';

/**
 * Komponen Projectile.
 * Objek dinamis yang bergerak lurus, mendeteksi tabrakan,
 * dan memiliki siklus hidup yang terbatas.
 */
export class Projectile {
    /**
     * Membuat instance Proyektil.
     * @param {THREE.Scene} scene - Scene utama.
     * @param {THREE.Vector3} startPosition - Posisi awal proyektil.
     * @param {THREE.Vector3} direction - Vektor arah gerak proyektil.
     * @param {Player} target - Objek Player yang menjadi target.
     */
    constructor(scene, startPosition, direction, target) {
        this.scene = scene;
        this.direction = direction;
        this.target = target;

        // Properti Internal
        this.speed = 25;
        this.lifetime = 3; // Akan hilang setelah 3 detik
        this.age = 0;
        this.hit = false; // Flag untuk menandakan apakah mengenai target

        // Membuat Mesh
        const geometry = new THREE.SphereGeometry(0.3, 16, 8);
        const material = new THREE.MeshStandardMaterial({ color: 0xfab005 }); // Warna kuning
        this.mesh = new THREE.Mesh(geometry, material);
        
        // Posisikan dan tambahkan ke scene
        this.mesh.position.copy(startPosition);
        this.scene.add(this.mesh);
    }

    /**
     * Metode update yang dipanggil di setiap frame.
     * @param {number} delta - Waktu sejak frame terakhir.
     * @returns {boolean} - false jika proyektil harus dihancurkan, true jika masih aktif.
     */
    update(delta) {
        // 1. Cek Lifetime
        this.age += delta;
        if (this.age > this.lifetime) {
            return false; // Mati karena sudah tua
        }

        // 2. Logika Efek "Infinity"
        let currentSpeed = this.speed;
        const distanceToTarget = this.mesh.position.distanceTo(this.target.mesh.position);
        const infinityRadius = 5; // Jarak di mana Infinity mulai aktif
        const playerRadius = 1.5; // Radius hitbox pemain

        if (this.target.isInfinityActive && distanceToTarget < infinityRadius) {
            // Memperlambat proyektil secara eksponensial saat mendekat
            const normalizedDistance = (distanceToTarget - playerRadius) / (infinityRadius - playerRadius);
            currentSpeed *= Math.max(0, normalizedDistance);
        }

        // 3. Logika Gerak
        this.mesh.position.addScaledVector(this.direction, currentSpeed * delta);

        // 4. Logika Deteksi Tabrakan
        if (this.mesh.position.distanceTo(this.target.mesh.position) < playerRadius) {
            this.hit = true;
            return false; // Mati karena mengenai target
        }
        
        return true; // Tetap hidup
    }
}