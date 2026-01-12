import * as THREE from 'three';

/**
 * Komponen Arena.
 * Bertanggung jawab untuk membuat lantai dan grid visual arena.
 * Kelas ini hanya melakukan setup; ia tidak memiliki logika animasi atau update per frame.
 */
export class Arena {
    /**
     * Membuat instance Arena.
     * @param {THREE.Scene} scene - Scene Three.js utama tempat objek arena akan ditambahkan.
     */
    constructor(scene) {
        // Properti Internal: this.container akan menjadi grup untuk semua objek arena.
        this.container = new THREE.Group();

        // Membuat geometri dan material untuk lantai.
        const floorGeometry = new THREE.CylinderGeometry(20, 20, 0.5, 64); // radius 20, tinggi 0.5, 64 segmen
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a5568 // Warna abu-abu gelap
        });

        // Properti Internal: this.floor adalah mesh lantai.
        this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
        this.floor.receiveShadow = true; // Mengaktifkan penerimaan bayangan

        // Properti Internal: this.grid adalah helper visual.
        // Ukuran 40x40 agar pas dengan radius 20.
        this.grid = new THREE.GridHelper(40, 40);
        
        // Posisikan grid sedikit di atas permukaan lantai (tinggi lantai 0.5, maka permukaannya di y=0.25).
        // Ini untuk mencegah z-fighting (efek visual flicker).
        this.grid.position.y = 0.251;

        // Tambahkan lantai dan grid ke dalam wadah (container).
        this.container.add(this.floor);
        this.container.add(this.grid);

        // Tambahkan container utama ke scene yang dioper dari main.js.
        scene.add(this.container);
    }
}